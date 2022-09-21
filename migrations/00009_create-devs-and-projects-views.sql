CREATE MATERIALIZED VIEW IF NOT EXISTS devs_view
AS
    SELECT * FROM devs
WITH DATA;

CREATE MATERIALIZED VIEW IF NOT EXISTS projects_view
AS
    SELECT repo, organisation FROM repos
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_devs_view ON devs_view(dev_name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_view ON projects_view(repo,organisation);
CREATE INDEX IF NOT EXISTS idx_repo_projects_view ON projects_view(repo);
CREATE INDEX IF NOT EXISTS idx_organisation_projects_view ON projects_view(organisation);