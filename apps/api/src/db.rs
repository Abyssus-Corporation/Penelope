use sqlx::{PgPool, postgres::PgPoolOptions};

/// Open a Postgres pool and connect immediately. Used at process boot.
pub async fn connect_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
}

/// Parse `database_url` into a pool that connects on first use.
///
/// Safe for tests that never touch the database.
pub fn lazy_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(1)
        .connect_lazy(database_url)
}

/// Apply sqlx migrations from `apps/api/migrations`.
pub async fn run_migrations(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}
