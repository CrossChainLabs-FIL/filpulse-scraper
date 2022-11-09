CREATE MATERIALIZED VIEW IF NOT EXISTS tab_issues_view
AS
with
  issues_data as (SELECT
        issue_number,
        CASE WHEN length(title) > 50 THEN concat(substring(title, 1, 50), '...') ELSE title END as title,
        html_url,
        issue_state,
        dev_name,
        avatar_url,
        repo,
        organisation,
        updated_at
    FROM issues),
     assignees as (SELECT issue_number, repo, organisation, '[["' || string_agg(concat_ws('","',dev_name,avatar_url), '"],["') || '"]]' AS assignees
                   FROM   issues_assignees
                   GROUP  BY issue_number, repo, organisation)
    SELECT
        issues_data.issue_number,
        title,
        html_url,
        issue_state,
        dev_name,
        avatar_url,
        issues_data.repo,
        issues_data.organisation,
        COALESCE(assignees.assignees, '[]') as assignees,
        updated_at
FROM issues_data
LEFT JOIN assignees ON assignees.issue_number = issues_data.issue_number AND assignees.repo = issues_data.repo AND assignees.organisation = issues_data.organisation
ORDER BY updated_at DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_issues_view ON tab_issues_view(issue_number, repo, organisation);

CREATE INDEX IF NOT EXISTS idx_tab_tab_issues_view_dev_name ON tab_issues_view(dev_name);
CREATE INDEX IF NOT EXISTS idx_tab_tab_issues_view_repo ON tab_issues_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_tab_issues_view_organisation ON tab_issues_view(organisation);