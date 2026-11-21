pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod openapi;
pub mod project_name;
pub mod routes;
pub mod state;

use std::{fmt, time::Duration};

use axum::{
    Router,
    http::{HeaderValue, Request, Response, StatusCode, header},
    middleware,
    response::IntoResponse,
};
use tower_http::{
    classify::{
        ClassifiedResponse, ClassifyResponse, MakeClassifier, NeverClassifyEos,
        ServerErrorsFailureClass,
    },
    limit::RequestBodyLimitLayer,
    set_header::SetResponseHeaderLayer,
    timeout::TimeoutLayer,
    trace::TraceLayer,
};

use crate::{error::AppError, state::AppState};

/// Maximum accepted request body size (1 MiB).
pub const REQUEST_BODY_LIMIT: usize = 1024 * 1024;

/// Request timeout applied to every route, including probes.
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// HTTP service returned by [`app`]. A `Router` layer cannot strip `Allow`
/// because Axum injects it in the top-level `RouteFuture`.
pub type App =
    tower::util::MapResponse<Router, fn(axum::response::Response) -> axum::response::Response>;

/// Build the HTTP router.
///
/// Public probes live on their own router. Everything else, including the
/// fallback for unknown paths, is unauthorized until real auth exists.
/// Public routes are selected by being mounted on the public router, not by
/// comparing path strings.
///
/// There is no CORS layer: the API is same-origin behind Caddy at `/api`.
/// Cross-origin browsers must not see `Access-Control-Allow-Origin`.
pub fn app(state: AppState) -> App {
    let public = routes::public::router().with_state(state.clone());

    let protected = routes::projects::router()
        .route_layer(middleware::from_fn(auth::require_auth))
        .layer(SetResponseHeaderLayer::overriding(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store"),
        ))
        .with_state(state);

    let router = public
        .merge(protected)
        .fallback(auth::unauthorized)
        // 503, not 408 or 504: the client already sent the request; this
        // process is aborting its own handler, not a gateway waiting on upstream.
        .layer(TimeoutLayer::with_status_code(
            StatusCode::SERVICE_UNAVAILABLE,
            REQUEST_TIMEOUT,
        ))
        .layer(RequestBodyLimitLayer::new(REQUEST_BODY_LIMIT))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::CONTENT_SECURITY_POLICY,
            HeaderValue::from_static("default-src 'none'; frame-ancestors 'none'"),
        ))
        .layer(TraceLayer::new(HttpTraceClassifier::default()));

    // Axum's top-level RouteFuture inserts `Allow` *after* Router layers run.
    // Wrap outside the Router so 401s do not leak allowed methods.
    tower::ServiceBuilder::new()
        .map_response(
            hide_protected_surface as fn(axum::response::Response) -> axum::response::Response,
        )
        .service(router)
}

/// Drop `Allow` from 401s (and turn 405 into 401) so method lists are not leaked.
fn hide_protected_surface(response: axum::response::Response) -> axum::response::Response {
    if response.status() == StatusCode::METHOD_NOT_ALLOWED {
        let mut unauthorized = AppError::Unauthorized.into_response();
        unauthorized.headers_mut().remove(header::ALLOW);
        return unauthorized;
    }
    let mut response = response;
    if response.status() == StatusCode::UNAUTHORIZED {
        response.headers_mut().remove(header::ALLOW);
    }
    response
}

/// Trace classifier that does not treat probe 503s as failures.
///
/// `/readyz` already emits `tracing::warn!` when the database is down; the
/// default `TraceLayer` would also log ERROR for the 503.
#[derive(Clone, Copy, Default)]
struct HttpTraceClassifier {
    probe: bool,
}

impl MakeClassifier for HttpTraceClassifier {
    type Classifier = Self;
    type FailureClass = ServerErrorsFailureClass;
    type ClassifyEos = NeverClassifyEos<ServerErrorsFailureClass>;

    fn make_classifier<B>(&self, req: &Request<B>) -> Self::Classifier {
        let path = req.uri().path();
        Self {
            probe: path == "/healthz" || path == "/readyz",
        }
    }
}

impl ClassifyResponse for HttpTraceClassifier {
    type FailureClass = ServerErrorsFailureClass;
    type ClassifyEos = NeverClassifyEos<ServerErrorsFailureClass>;

    fn classify_response<B>(
        self,
        res: &Response<B>,
    ) -> ClassifiedResponse<Self::FailureClass, Self::ClassifyEos> {
        let status = res.status();
        if self.probe && status == StatusCode::SERVICE_UNAVAILABLE {
            return ClassifiedResponse::Ready(Ok(()));
        }
        if status.is_server_error() {
            ClassifiedResponse::Ready(Err(ServerErrorsFailureClass::StatusCode(status)))
        } else {
            ClassifiedResponse::Ready(Ok(()))
        }
    }

    fn classify_error<E>(self, error: &E) -> Self::FailureClass
    where
        E: fmt::Display + 'static,
    {
        ServerErrorsFailureClass::Error(error.to_string())
    }
}
