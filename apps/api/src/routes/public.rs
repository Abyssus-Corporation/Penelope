use std::time::Duration;

use axum::{Json, Router, extract::State, routing::get};
use serde::Serialize;
use sqlx::{Connection, postgres::PgConnection};
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
const READY_CHECK_TIMEOUT: Duration = Duration::from_secs(3);

/// Short one-shot connect used only to explain a failed probe (refused, DNS).
const DIAGNOSTIC_CONNECT_TIMEOUT: Duration = Duration::from_millis(200);

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
            warn_readiness_failure(Some(&error), &state.pool).await;
            Err(AppError::Unavailable("database is unreachable".to_string()))
        }
        Err(_) => {
            warn_readiness_failure(None, &state.pool).await;
            Err(AppError::Unavailable("database is unreachable".to_string()))
        }
    }
}

/// Log the sqlx error and, when it is just a pool timeout, a short direct
/// connect so refused connections and DNS failures are visible.
async fn warn_readiness_failure(error: Option<&sqlx::Error>, pool: &sqlx::PgPool) {
    match diagnose_connect(pool).await {
        Some(cause) => match error {
            Some(error) => {
                tracing::warn!(error = %error, cause = %cause, "readiness check failed");
            }
            None => {
                tracing::warn!(cause = %cause, "readiness check timed out");
            }
        },
        None => match error {
            Some(error) => {
                tracing::warn!(error = %error, "readiness check failed");
            }
            None => {
                tracing::warn!("readiness check timed out");
            }
        },
    }
}

async fn diagnose_connect(pool: &sqlx::PgPool) -> Option<sqlx::Error> {
    let options = pool.connect_options();
    match tokio::time::timeout(
        DIAGNOSTIC_CONNECT_TIMEOUT,
        PgConnection::connect_with(options.as_ref()),
    )
    .await
    {
        Ok(Err(error)) => Some(error),
        Ok(Ok(connection)) => {
            let _ = connection.close().await;
            None
        }
        Err(_) => None,
    }
}
