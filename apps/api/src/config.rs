use std::{env, net::SocketAddr};

/// Process configuration loaded from the environment.
#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
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
    /// Read `DATABASE_URL` (required) and `BIND_ADDRESS` (default `0.0.0.0:3000`).
    pub fn from_env() -> Result<Self, ConfigError> {
        let database_url = env::var("DATABASE_URL").map_err(|_| ConfigError::Missing {
            name: "DATABASE_URL",
        })?;
        let bind = env::var("BIND_ADDRESS").unwrap_or_else(|_| "0.0.0.0:3000".to_string());
        let bind_address = bind
            .parse()
            .map_err(|_| ConfigError::InvalidBindAddress(bind))?;
        Ok(Self {
            database_url,
            bind_address,
        })
    }
}
