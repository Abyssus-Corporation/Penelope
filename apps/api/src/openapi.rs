use utoipa::{
    Modify, OpenApi,
    openapi::security::{Http, HttpAuthScheme, SecurityScheme},
};

use crate::{
    error::ErrorBody,
    routes::{
        health::{HealthResponse, ReadyResponse},
        projects::{GitProvider, LastCommit, Project, ProjectRepo, Service, ServiceStatus},
    },
};

/// Generated OpenAPI document for the Penelope API.
#[derive(OpenApi)]
#[openapi(
    info(
        title = "Penelope API",
        version = "0.0.1",
        description = "Self-hosted deployment platform API"
    ),
    paths(
        crate::routes::health::healthz,
        crate::routes::health::readyz,
        crate::routes::projects::list_projects,
    ),
    components(schemas(
        HealthResponse,
        ReadyResponse,
        ErrorBody,
        Project,
        Service,
        ServiceStatus,
        ProjectRepo,
        GitProvider,
        LastCommit,
    )),
    tags(
        (name = "ops", description = "Liveness and readiness probes"),
        (name = "projects", description = "Project management")
    ),
    modifiers(&SecurityAddon)
)]
pub struct ApiDoc;

/// Insert the future bearer-token security scheme so protected paths can
/// reference it before real authentication exists.
struct SecurityAddon;

impl Modify for SecurityAddon {
    fn modify(&self, openapi: &mut utoipa::openapi::OpenApi) {
        let components = openapi.components.get_or_insert_default();
        components.add_security_scheme(
            "bearer",
            SecurityScheme::Http(Http::new(HttpAuthScheme::Bearer)),
        );
    }
}

pub fn spec() -> utoipa::openapi::OpenApi {
    ApiDoc::openapi()
}
