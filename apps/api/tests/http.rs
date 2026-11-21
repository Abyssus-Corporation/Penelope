//! HTTP integration tests that do not require a running database.
//!
//! `GET /readyz` talks to Postgres and is ignored here. Run it with
//! `cargo test -p api -- --ignored` after `docker compose up -d db`
//! and a valid `DATABASE_URL`.

use std::time::{Duration, Instant};

use api::{db, openapi, state::AppState};
use axum::{
    body::Body,
    http::{Method, Request, StatusCode, header},
};
use tower::ServiceExt;

const PUBLIC_GET_PATHS: &[&str] = &["/healthz", "/readyz"];

const SECURITY_CSP: &str = "default-src 'none'; frame-ancestors 'none'";

fn test_app() -> axum::Router {
    let pool = db::lazy_pool("postgres://penelope:penelope@127.0.0.1:5432/penelope")
        .expect("test database URL should parse");
    api::app(AppState { pool })
}

async fn request(method: Method, path: &str) -> axum::http::Response<Body> {
    test_app()
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("router should respond")
}

fn assert_security_headers(response: &axum::http::Response<Body>) {
    assert_eq!(
        response
            .headers()
            .get(header::X_CONTENT_TYPE_OPTIONS)
            .map(|v| v.as_bytes()),
        Some(&b"nosniff"[..]),
        "X-Content-Type-Options",
    );
    assert_eq!(
        response
            .headers()
            .get(header::CONTENT_SECURITY_POLICY)
            .map(|v| v.as_bytes()),
        Some(SECURITY_CSP.as_bytes()),
        "Content-Security-Policy",
    );
}

fn is_public_get(path: &str) -> bool {
    PUBLIC_GET_PATHS.contains(&path)
}

#[tokio::test]
async fn healthz_returns_ok() {
    let response = request(Method::GET, "/healthz").await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_security_headers(&response);
}

#[tokio::test]
async fn unauthenticated_request_to_a_known_route_is_unauthorized() {
    let response = request(Method::GET, "/projects").await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_security_headers(&response);
}

#[tokio::test]
async fn unknown_route_is_unauthorized_not_not_found() {
    let response = request(Method::GET, "/this-route-does-not-exist").await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_ne!(response.status(), StatusCode::NOT_FOUND);
    assert_security_headers(&response);
}

#[tokio::test]
async fn path_variations_of_protected_routes_are_unauthorized() {
    for path in [
        "//projects",
        "/PROJECTS",
        "/%68ealthz",
        "/healthz/../projects",
    ] {
        let response = request(Method::GET, path).await;
        assert_eq!(
            response.status(),
            StatusCode::UNAUTHORIZED,
            "expected 401 for {path}"
        );
        assert_ne!(response.status(), StatusCode::NOT_FOUND, "{path}");
    }
}

#[tokio::test]
async fn head_and_options_on_a_protected_route_are_unauthorized() {
    for method in [Method::HEAD, Method::OPTIONS] {
        let response = request(method.clone(), "/projects").await;
        assert_eq!(
            response.status(),
            StatusCode::UNAUTHORIZED,
            "expected 401 for {method} /projects"
        );
    }
}

#[tokio::test]
async fn documented_non_public_operations_require_auth() {
    let spec = openapi::spec();
    for (path, item) in &spec.paths.paths {
        let operations = [
            (Method::GET, item.get.is_some()),
            (Method::PUT, item.put.is_some()),
            (Method::POST, item.post.is_some()),
            (Method::DELETE, item.delete.is_some()),
            (Method::OPTIONS, item.options.is_some()),
            (Method::HEAD, item.head.is_some()),
            (Method::PATCH, item.patch.is_some()),
            (Method::TRACE, item.trace.is_some()),
        ];
        for (http_method, present) in operations {
            if !present {
                continue;
            }
            if http_method == Method::GET && is_public_get(path) {
                continue;
            }
            let response = request(http_method.clone(), path).await;
            assert_eq!(
                response.status(),
                StatusCode::UNAUTHORIZED,
                "expected 401 for {http_method} {path} (documented, not public)"
            );
        }
    }
}

/// Requires a running Postgres (`docker compose up -d db`) and `DATABASE_URL`.
#[tokio::test]
#[ignore = "requires a running Postgres; start with `docker compose up -d db`"]
async fn readyz_returns_ok_when_the_database_is_reachable() {
    dotenvy::dotenv().ok();
    let database_url =
        std::env::var("DATABASE_URL").expect("DATABASE_URL must be set for this ignored test");
    let pool = db::connect_pool(&database_url)
        .await
        .expect("should connect to postgres");
    db::run_migrations(&pool)
        .await
        .expect("migrations should apply");
    let app = api::app(AppState { pool });
    let response = app
        .oneshot(
            Request::builder()
                .uri("/readyz")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("router should respond");
    assert_eq!(response.status(), StatusCode::OK);
    assert_security_headers(&response);
}

#[tokio::test]
async fn trailing_slash_on_healthz_is_unauthorized() {
    let response = request(Method::GET, "/healthz/").await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_ne!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn readyz_returns_unavailable_when_the_database_does_not_respond() {
    let pool = db::lazy_pool("postgres://penelope:penelope@10.255.255.1:5432/penelope")
        .expect("test database URL should parse");
    let app = api::app(AppState { pool });
    let started = Instant::now();
    let response = app
        .oneshot(
            Request::builder()
                .uri("/readyz")
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("router should respond");
    let elapsed = started.elapsed();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    assert!(
        elapsed < Duration::from_secs(4),
        "readiness probe hung for {elapsed:?}"
    );
}
