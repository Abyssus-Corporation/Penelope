use axum::{Json, Router, extract::State, routing::get};
use serde::Serialize;
use utoipa::ToSchema;

use crate::{error::AppError, state::AppState};

#[derive(Debug, Serialize, ToSchema)]
pub struct HealthResponse {
    pub status: &'static str,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ReadyResponse {
    pub status: &'static str,
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/healthz", get(healthz))
        .route("/readyz", get(readyz))
}

/// Liveness probe. Does not touch the database.
#[utoipa::path(
    get,
    path = "/healthz",
    tag = "ops",
    responses(
        (status = 200, description = "Process is live", body = HealthResponse)
    )
)]
pub async fn healthz() -> Json<HealthResponse> {
    Json(HealthResponse { status: "ok" })
}

/// Upper bound for the readiness probe, including connection acquire.
const READY_CHECK_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(3);

/// Readiness probe. Succeeds only when the database accepts a query.
#[utoipa::path(
    get,
    path = "/readyz",
    tag = "ops",
    responses(
        (status = 200, description = "Process is ready to serve traffic", body = ReadyResponse),
        (status = 503, description = "Database is unreachable", body = crate::error::ErrorBody)
    )
)]
pub async fn readyz(State(state): State<AppState>) -> Result<Json<ReadyResponse>, AppError> {
    let check = sqlx::query("SELECT 1").execute(&state.pool);
    match tokio::time::timeout(READY_CHECK_TIMEOUT, check).await {
        Ok(Ok(_)) => Ok(Json(ReadyResponse { status: "ready" })),
        Ok(Err(error)) => {
            tracing::warn!(error = %error, "readiness check failed");
            Err(AppError::Unavailable("database is unreachable".to_string()))
        }
        Err(_) => {
            tracing::warn!("readiness check timed out");
            Err(AppError::Unavailable("database is unreachable".to_string()))
        }
    }
}
