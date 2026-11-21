pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod openapi;
pub mod routes;
pub mod state;

use std::time::Duration;

use axum::{
    Router,
    http::{HeaderValue, StatusCode, header},
    middleware,
};
use tower_http::{
    limit::RequestBodyLimitLayer, set_header::SetResponseHeaderLayer, timeout::TimeoutLayer,
    trace::TraceLayer,
};

use crate::state::AppState;

/// Maximum accepted request body size (1 MiB).
pub const REQUEST_BODY_LIMIT: usize = 1024 * 1024;

/// Request timeout applied to every route, including probes.
pub const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

/// Build the HTTP router.
///
/// Public probes live on their own router. Everything else, including the
/// fallback for unknown paths, is unauthorized until real auth exists.
/// Public routes are selected by being mounted on the public router, not by
/// comparing path strings.
pub fn app(state: AppState) -> Router {
    let public = routes::health::router().with_state(state.clone());

    let protected = routes::projects::router()
        .route_layer(middleware::from_fn(auth::require_auth))
        .with_state(state);

    public
        .merge(protected)
        .fallback(auth::unauthorized)
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
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
        .layer(TraceLayer::new_for_http())
}
