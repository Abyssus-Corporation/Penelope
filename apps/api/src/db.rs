use std::time::Duration;

use sqlx::{PgPool, postgres::PgPoolOptions};

/// Time limit for acquiring a connection, including opening a new one.
///
/// sqlx defaults to 30s, which would make `/readyz` hang on a dead database.
const ACQUIRE_TIMEOUT: Duration = Duration::from_secs(2);

fn pool_options() -> PgPoolOptions {
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(ACQUIRE_TIMEOUT)
}

/// Open a Postgres pool and connect immediately. Used at process boot.
pub async fn connect_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    pool_options().connect(database_url).await
}

/// Parse `database_url` into a pool that connects on first use.
///
/// Safe for tests that never touch the database. The acquire timeout still
/// applies on first use, so a readiness probe cannot block for 30s.
pub fn lazy_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    pool_options().max_connections(1).connect_lazy(database_url)
}

/// Apply sqlx migrations from `apps/api/migrations`.
pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}
