-- Minimal `projects` table, aligned with the frontend `Project` type:
-- `id` and `name` are strings (the dashboard uses slug-style ids), and
-- `deployed_at` stores the last deployment timestamp (the UI formats it
-- as a relative string). Services and the optional Git repo belong in
-- follow-up migrations.
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    deployed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT projects_id_format CHECK (id ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
    CONSTRAINT projects_name_length CHECK (char_length(name) <= 48)
);

CREATE UNIQUE INDEX projects_name_lower_idx ON projects (lower(name));
