CREATE MATERIALIZED VIEW IF NOT EXISTS tab_releases_view
AS
    SELECT
        id,
        CASE WHEN length(name) > 50 THEN concat(substring(name, 1, 50), '...') ELSE name END as name,
        dev_name,
        avatar_url,
        CASE WHEN published_at is not null THEN published_at ELSE created_at END AS updated_at,
        CASE WHEN draft is true THEN 'Draft' ELSE CASE WHEN prerelease is true THEN 'Pre-release' ELSE 'Released' END END AS state,
        repo,
        organisation
    FROM releases
    ORDER BY updated_at DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_releases_view ON tab_releases_view(id, repo, organisation);

CREATE INDEX IF NOT EXISTS idx_tab_releases_view_dev_name ON tab_releases_view(dev_name);
CREATE INDEX IF NOT EXISTS idx_tab_releases_view_repo ON tab_releases_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_releases_view_organisation ON tab_releases_view(organisation);