CREATE MATERIALIZED VIEW IF NOT EXISTS tab_issues_view
AS
    SELECT
        issue_number,
        title,
        html_url,
        issue_state,
        dev_name,
        avatar_url,
        repo,
        organisation,
        updated_at
    FROM issues
    ORDER BY updated_at DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_issues_view ON tab_issues_view(issue_number, repo, organisation);

CREATE INDEX IF NOT EXISTS idx_tab_tab_issues_view_dev_name ON tab_issues_view(dev_name);
CREATE INDEX IF NOT EXISTS idx_tab_tab_issues_view_repo ON tab_issues_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_tab_issues_view_organisation ON tab_issues_view(organisation);