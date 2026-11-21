use std::{fs, path::PathBuf};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let spec = api::openapi::spec();
    let out =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../packages/api-types/openapi.json");
    if let Some(parent) = out.parent() {
        fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(&spec)?;
    fs::write(&out, format!("{json}\n"))?;
    println!("wrote {}", out.display());
    Ok(())
}
