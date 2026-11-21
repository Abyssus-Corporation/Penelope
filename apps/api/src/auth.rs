use axum::{extract::Request, middleware::Next, response::Response};

use crate::error::AppError;

/// Paths that skip authentication. Everything else is denied by default.
const PUBLIC_PATHS: &[&str] = &["/healthz", "/readyz"];

fn is_public(path: &str) -> bool {
    let path = path.trim_end_matches('/');
    PUBLIC_PATHS.contains(&path)
}

/// Hook for the future session or token authenticator.
///
/// Today this always returns [`AppError::Unauthorized`]. When real
/// authentication lands, validate the request here and, on success, insert
/// an identity into request extensions before calling the next service.
fn authenticate(_request: &Request) -> Result<(), AppError> {
    Err(AppError::Unauthorized)
}

/// Deny-by-default layer: public paths pass through; every other request
/// must pass [`authenticate`] or receive 401.
pub async fn deny_by_default(request: Request, next: Next) -> Result<Response, AppError> {
    if is_public(request.uri().path()) {
        return Ok(next.run(request).await);
    }
    authenticate(&request)?;
    Ok(next.run(request).await)
}
