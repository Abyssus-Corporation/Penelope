//! HTTP integration tests that do not require a running database.
//!
//! `GET /readyz` talks to Postgres and is ignored here. Run it with
//! `cargo test -p api -- --ignored` after `docker compose up -d db`
//! and a valid `DATABASE_URL`.

use api::{db, state::AppState};
use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use tower::ServiceExt;

fn test_app() -> axum::Router {
    let pool = db::lazy_pool("postgres://penelope:penelope@127.0.0.1:5432/penelope")
        .expect("test database URL should parse");
    api::app(AppState { pool })
}

async fn get(path: &str) -> axum::http::Response<Body> {
    test_app()
        .oneshot(
            Request::builder()
                .uri(path)
                .body(Body::empty())
                .expect("request should build"),
        )
        .await
        .expect("router should respond")
}

#[tokio::test]
async fn healthz_returns_ok() {
    let response = get("/healthz").await;
    assert_eq!(response.status(), StatusCode::OK);
}

#[tokio::test]
async fn unauthenticated_request_to_a_known_route_is_unauthorized() {
    let response = get("/projects").await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn unknown_route_is_unauthorized_not_not_found() {
    let response = get("/this-route-does-not-exist").await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_ne!(response.status(), StatusCode::NOT_FOUND);
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
}
