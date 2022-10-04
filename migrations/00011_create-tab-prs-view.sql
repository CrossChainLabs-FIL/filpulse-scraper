CREATE MATERIALIZED VIEW IF NOT EXISTS tab_prs_view
AS
    SELECT
        pr_number,
        title,
        html_url,
        dev_name,
        avatar_url,
        repo,
        organisation,
        pr_state,
        CASE WHEN pr_state = 'closed' AND merged_at is not null THEN true ELSE false END AS is_merged,
        updated_at
    FROM prs
    ORDER BY updated_at DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_prs_view ON tab_prs_view(pr_number, repo, organisation);

CREATE INDEX IF NOT EXISTS idx_tab_tab_prs_view_dev_name ON tab_prs_view(dev_name);
CREATE INDEX IF NOT EXISTS idx_tab_tab_prs_view_repo ON tab_prs_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_tab_prs_view_organisation ON tab_prs_view(organisation);