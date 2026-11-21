use sqlx::PgPool;

/// Shared state for HTTP handlers.
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
}
