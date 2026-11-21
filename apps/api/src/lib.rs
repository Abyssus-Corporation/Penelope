pub mod auth;
pub mod config;
pub mod db;
pub mod error;
pub mod openapi;
pub mod routes;
pub mod state;

use axum::{Router, middleware};
use tower_http::trace::TraceLayer;

use crate::state::AppState;

/// Build the HTTP router, with deny-by-default auth wrapping every route.
pub fn app(state: AppState) -> Router {
    Router::new()
        .merge(routes::router())
        .with_state(state)
        .layer(middleware::from_fn(auth::deny_by_default))
        .layer(TraceLayer::new_for_http())
}
