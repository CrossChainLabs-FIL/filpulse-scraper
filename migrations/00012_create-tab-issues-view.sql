CREATE MATERIALIZED VIEW IF NOT EXISTS tab_issues_view
AS
with
  issues_data as (SELECT
        number,
        CASE WHEN length(title) > 50 THEN concat(substring(title, 1, 50), '...') ELSE title END as title,
        html_url,
        state,
        dev_name,
        avatar_url,
        repo,
        organisation,
        updated_at
    FROM issues
    WHERE is_pr = false),
     assignees as (SELECT number, repo, organisation, '[["' || string_agg(concat_ws('","',dev_name,avatar_url), '"],["') || '"]]' AS assignees
                   FROM   issues_assignees
                   GROUP  BY number, repo, organisation),
     participants as (SELECT number, repo, organisation, '[["' || string_agg(concat_ws('","',dev_name,avatar_url), '"],["') || '"]]' AS participants
                   FROM   issues_comments
                   GROUP  BY number, repo, organisation)
    SELECT
        issues_data.number,
        title,
        html_url,
        state,
        dev_name,
        avatar_url,
        issues_data.repo,
        issues_data.organisation,
        COALESCE(assignees.assignees, '[]') as assignees,
        COALESCE(participants.participants, '[]') as participants,
        updated_at
FROM issues_data
LEFT JOIN assignees ON assignees.number = issues_data.number AND assignees.repo = issues_data.repo AND assignees.organisation = issues_data.organisation
LEFT JOIN participants ON participants.number = issues_data.number AND participants.repo = issues_data.repo AND participants.organisation = issues_data.organisation
ORDER BY updated_at DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_issues_view ON tab_issues_view(number, repo, organisation);

CREATE INDEX IF NOT EXISTS idx_tab_tab_issues_view_dev_name ON tab_issues_view(dev_name);
CREATE INDEX IF NOT EXISTS idx_tab_tab_issues_view_repo ON tab_issues_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_tab_issues_view_organisation ON tab_issues_view(organisation);