use anyhow::Context;
use api::{config::Config, db, state::AppState};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let config = Config::from_env().context("failed to load configuration")?;
    let pool = db::connect_pool(&config.database_url)
        .await
        .context("failed to connect to postgres")?;
    db::run_migrations(&pool)
        .await
        .context("failed to run database migrations")?;

    let listener = tokio::net::TcpListener::bind(config.bind_address)
        .await
        .with_context(|| format!("failed to bind {}", config.bind_address))?;

    tracing::info!(addr = %config.bind_address, "api listening");
    axum::serve(listener, api::app(AppState { pool }))
        .await
        .context("server error")?;
    Ok(())
}
