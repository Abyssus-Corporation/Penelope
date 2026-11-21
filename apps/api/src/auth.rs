use axum::{extract::Request, middleware::Next, response::Response};

use crate::error::AppError;

/// Hook for the future session or token authenticator.
///
/// Today this always returns [`AppError::Unauthorized`]. When real
/// authentication lands, validate the request here and, on success, insert
/// an identity into request extensions before calling the next service.
fn authenticate(_request: &Request) -> Result<(), AppError> {
    Err(AppError::Unauthorized)
}

/// Route layer applied only to the protected router. Public routes never
/// pass through this function; there is no path-string allowlist.
pub async fn require_auth(request: Request, next: Next) -> Result<Response, AppError> {
    authenticate(&request)?;
    Ok(next.run(request).await)
}

/// Fallback for unmatched routes: 401, so the API surface is not leaked.
pub async fn unauthorized() -> AppError {
    AppError::Unauthorized
}
