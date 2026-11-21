use axum::{Json, Router, routing::get};
use serde::Serialize;
use utoipa::ToSchema;

use crate::state::AppState;

/// Mirrors the frontend `Project` type. Persistence of services and the
/// optional Git repo is left to follow-up work.
#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub services: Vec<Service>,
    pub deployed_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub repo: Option<ProjectRepo>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct Service {
    pub name: String,
    pub status: ServiceStatus,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub enum ServiceStatus {
    Running,
    Building,
    Failed,
    Sleeping,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRepo {
    pub provider: GitProvider,
    pub owner: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_commit: Option<LastCommit>,
}

#[derive(Debug, Serialize, ToSchema)]
pub enum GitProvider {
    #[serde(rename = "github")]
    GitHub,
    #[serde(rename = "gitlab")]
    GitLab,
    #[serde(rename = "bitbucket")]
    Bitbucket,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LastCommit {
    pub id: String,
    pub message: String,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/projects", get(list_projects))
}

/// Placeholder list handler. The deny-by-default auth layer rejects unauthenticated
/// calls with 401; the body is reachable only after real auth lands.
#[utoipa::path(
    get,
    path = "/projects",
    tag = "projects",
    security(("bearer" = [])),
    responses(
        (status = 200, description = "Project list", body = [Project]),
        (status = 401, description = "Authentication required", body = crate::error::ErrorBody)
    )
)]
pub async fn list_projects() -> Json<Vec<Project>> {
    Json(Vec::new())
}
