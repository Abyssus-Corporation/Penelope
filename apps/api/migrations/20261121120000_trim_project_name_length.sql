-- Require a non-blank name and measure length after trimming, matching the
-- dashboard validator (max 48). The character-class rule is enforced in
-- `crate::project_name` when a create route lands.
ALTER TABLE projects
    DROP CONSTRAINT projects_name_length,
    ADD CONSTRAINT projects_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 48);
