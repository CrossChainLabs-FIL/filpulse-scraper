CREATE MATERIALIZED VIEW IF NOT EXISTS tab_prs_view
AS
    SELECT
        number,
        CASE WHEN length(title) > 50 THEN concat(substring(title, 1, 50), '...') ELSE title END as title,
        html_url,
        dev_name,
        avatar_url,
        repo,
        organisation,
        state,
        updated_at
    FROM issues
    WHERE is_pr = true
    ORDER BY updated_at DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_prs_view ON tab_prs_view(number, repo, organisation);

CREATE INDEX IF NOT EXISTS idx_tab_tab_prs_view_dev_name ON tab_prs_view(dev_name);
CREATE INDEX IF NOT EXISTS idx_tab_tab_prs_view_repo ON tab_prs_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_tab_prs_view_organisation ON tab_prs_view(organisation);