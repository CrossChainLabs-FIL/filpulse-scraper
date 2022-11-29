CREATE MATERIALIZED VIEW IF NOT EXISTS tab_releases_view
AS
    with latest as (SELECT repo, organisation, max(published_at) as published_at, 'Latest' as status FROM releases GROUP BY repo, organisation)
    SELECT
        releases.id,
        CASE WHEN length(name) > 50 THEN concat(substring(name, 1, 50), '...') ELSE name END as name,
        tag_name,
        dev_name,
        avatar_url,
        COALESCE(releases.published_at, created_at) AS updated_at,
        CASE WHEN draft is true THEN 'Draft' ELSE CASE WHEN prerelease is true THEN 'Pre-release' ELSE COALESCE(latest.status, 'Released') END END AS state,
        releases.repo,
        releases.organisation
    FROM releases
    LEFT JOIN latest ON latest.published_at = releases.published_at AND latest.repo = releases.repo AND latest.organisation = releases.organisation
    ORDER BY updated_at DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_releases_view ON tab_releases_view(id, repo, organisation);

CREATE INDEX IF NOT EXISTS idx_tab_releases_view_dev_name ON tab_releases_view(dev_name);
CREATE INDEX IF NOT EXISTS idx_tab_releases_view_repo ON tab_releases_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_releases_view_organisation ON tab_releases_view(organisation);