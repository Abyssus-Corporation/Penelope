//! Project name rules, mirrored from the dashboard validator.

/// Maximum length of a project name, after trimming whitespace.
pub const PROJECT_NAME_MAX_LENGTH: usize = 48;

/// Why a project name was rejected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectNameError {
    /// Empty or whitespace-only.
    Required,
    /// Longer than [`PROJECT_NAME_MAX_LENGTH`].
    TooLong,
    /// Does not match `/^[a-z0-9][a-z0-9._-]*$/i`.
    Invalid,
}

/// Trim `raw_name` and check it against the dashboard rule:
/// `/^[a-z0-9][a-z0-9._-]*$/i`, at most 48 characters.
pub fn validate_project_name(raw_name: &str) -> Result<&str, ProjectNameError> {
    let name = raw_name.trim();
    if name.is_empty() {
        return Err(ProjectNameError::Required);
    }
    if name.chars().count() > PROJECT_NAME_MAX_LENGTH {
        return Err(ProjectNameError::TooLong);
    }
    if !is_allowed_project_name(name) {
        return Err(ProjectNameError::Invalid);
    }
    Ok(name)
}

fn is_allowed_project_name(name: &str) -> bool {
    let mut chars = name.chars();
    match chars.next() {
        Some(first) if first.is_ascii_alphanumeric() => {
            chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-'))
        }
        _ => false,
    }
}

#[cfg(test)]
mod tests {
    use super::{PROJECT_NAME_MAX_LENGTH, ProjectNameError, validate_project_name};

    #[test]
    fn accepts_names_that_match_the_dashboard_pattern() {
        for name in [
            "web",
            "API",
            "a",
            "9lives",
            "my-app",
            "my_app",
            "my.app",
            "v2.0_beta-1",
        ] {
            assert_eq!(validate_project_name(name), Ok(name), "{name}");
        }
    }

    #[test]
    fn trims_whitespace_before_validating() {
        assert_eq!(validate_project_name("  my-app  "), Ok("my-app"));
    }

    #[test]
    fn rejects_a_blank_name() {
        assert_eq!(validate_project_name(""), Err(ProjectNameError::Required));
        assert_eq!(
            validate_project_name("   "),
            Err(ProjectNameError::Required)
        );
    }

    #[test]
    fn rejects_names_over_the_max_length() {
        let at_limit = "a".repeat(PROJECT_NAME_MAX_LENGTH);
        let too_long = "a".repeat(PROJECT_NAME_MAX_LENGTH + 1);
        assert_eq!(validate_project_name(&at_limit), Ok(at_limit.as_str()));
        assert_eq!(
            validate_project_name(&too_long),
            Err(ProjectNameError::TooLong)
        );
    }

    #[test]
    fn rejects_invalid_characters_and_leading_symbols() {
        for name in ["my project", "-api", ".dot", "_under", "foo/bar", "bad!"] {
            assert_eq!(
                validate_project_name(name),
                Err(ProjectNameError::Invalid),
                "{name}"
            );
        }
    }
}
