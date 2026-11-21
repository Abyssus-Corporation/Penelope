use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::Serialize;
use utoipa::ToSchema;

/// JSON error body returned by the API.
#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorBody {
    pub error: String,
    pub message: String,
}

/// Application error type, converted into a JSON response.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("authentication required")]
    Unauthorized,
    #[error("{0}")]
    Unavailable(String),
    #[error(transparent)]
    Database(#[from] sqlx::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized", self.to_string()),
            AppError::Unavailable(reason) => (
                StatusCode::SERVICE_UNAVAILABLE,
                "unavailable",
                reason.clone(),
            ),
            AppError::Database(_) => {
                tracing::error!(error = %self, "database error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal",
                    "an internal error occurred".to_string(),
                )
            }
        };

        (
            status,
            Json(ErrorBody {
                error: code.to_string(),
                message,
            }),
        )
            .into_response()
    }
}
