use std::time::Duration;

use sqlx::{PgPool, postgres::PgPoolOptions};

/// Time limit for acquiring a connection, including opening a new one.
///
/// sqlx defaults to 30s, which would make `/readyz` hang on a dead database.
const ACQUIRE_TIMEOUT: Duration = Duration::from_secs(2);

/// How many times boot will try to open the pool before giving up.
const BOOT_CONNECT_ATTEMPTS: u32 = 5;

const BOOT_RETRY_BASE: Duration = Duration::from_millis(200);
const BOOT_RETRY_CAP: Duration = Duration::from_secs(2);

fn pool_options() -> PgPoolOptions {
    PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(ACQUIRE_TIMEOUT)
}

/// Delay after the n-th failed attempt (0-based), exponential with a cap.
pub fn boot_retry_delay(failed_attempts: u32) -> Duration {
    BOOT_RETRY_BASE
        .saturating_mul(2u32.saturating_pow(failed_attempts))
        .min(BOOT_RETRY_CAP)
}

/// Open a Postgres pool, retrying a few times with exponential backoff.
pub async fn connect_pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    let mut attempt = 1;
    loop {
        tracing::info!(
            attempt,
            of = BOOT_CONNECT_ATTEMPTS,
            "connecting to postgres"
        );
        match pool_options().connect(database_url).await {
            Ok(pool) => return Ok(pool),
            Err(error) if attempt < BOOT_CONNECT_ATTEMPTS => {
                let delay = boot_retry_delay(attempt - 1);
                tracing::warn!(
                    attempt,
                    of = BOOT_CONNECT_ATTEMPTS,
                    error = %error,
                    retry_in = ?delay,
                    "postgres connect failed"
                );
                tokio::time::sleep(delay).await;
                attempt += 1;
            }
            Err(error) => {
                tracing::warn!(
                    attempt,
                    of = BOOT_CONNECT_ATTEMPTS,
                    error = %error,
                    "postgres connect failed; giving up"
                );
                return Err(error);
            }
        }
    }
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

#[cfg(test)]
mod tests {
    use super::{BOOT_RETRY_CAP, boot_retry_delay};
    use std::time::Duration;

    #[test]
    fn boot_retry_delay_doubles_until_the_cap() {
        assert_eq!(boot_retry_delay(0), Duration::from_millis(200));
        assert_eq!(boot_retry_delay(1), Duration::from_millis(400));
        assert_eq!(boot_retry_delay(2), Duration::from_millis(800));
        assert_eq!(boot_retry_delay(3), Duration::from_millis(1600));
        assert_eq!(boot_retry_delay(4), BOOT_RETRY_CAP);
        assert_eq!(boot_retry_delay(8), BOOT_RETRY_CAP);
    }
}
