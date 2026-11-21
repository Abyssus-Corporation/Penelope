use std::{env, net::SocketAddr};

use secrecy::SecretString;

/// Process configuration loaded from the environment.
///
/// `database_url` is a [`SecretString`] so `Debug` does not leak the password.
#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: SecretString,
    pub bind_address: SocketAddr,
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("missing required environment variable `{name}`")]
    Missing { name: &'static str },
    #[error("invalid BIND_ADDRESS `{0}`")]
    InvalidBindAddress(String),
}

impl Config {
    /// Read `DATABASE_URL` (required) and `BIND_ADDRESS` (default `127.0.0.1:3000`).
    pub fn from_env() -> Result<Self, ConfigError> {
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| ConfigError::Missing {
                name: "DATABASE_URL",
            })
            .map(SecretString::from)?;
        let bind = env::var("BIND_ADDRESS").unwrap_or_else(|_| "127.0.0.1:3000".to_string());
        let bind_address = bind
            .parse()
            .map_err(|_| ConfigError::InvalidBindAddress(bind))?;
        Ok(Self {
            database_url,
            bind_address,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::SocketAddr;

    #[test]
    fn debug_redacts_the_database_password() {
        let config = Config {
            database_url: SecretString::from(
                "postgres://penelope:s3cret-password@127.0.0.1:5432/penelope",
            ),
            bind_address: "127.0.0.1:3000".parse::<SocketAddr>().unwrap(),
        };
        let rendered = format!("{config:?}");
        assert!(
            !rendered.contains("s3cret-password"),
            "Debug leaked the database password: {rendered}"
        );
    }
}
