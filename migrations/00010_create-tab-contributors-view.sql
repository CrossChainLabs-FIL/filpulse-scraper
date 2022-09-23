CREATE MATERIALIZED VIEW IF NOT EXISTS tab_contributors_view
AS
with
         contributions as ( SELECT dev_name, repo, organisation, contributions FROM devs_contributions),
         user_issues as (SELECT
                                 dev_name,
                                 repo,
                                 organisation,
                                 count(id) as issues,
                                 COUNT(CASE WHEN issue_state = 'open' THEN id END) AS open_issues,
                                 COUNT(CASE WHEN issue_state = 'closed' THEN id END) AS closed_issues
             FROM issues
             GROUP BY dev_name, repo, organisation),
        user_prs as (SELECT
                                 dev_name,
                                 repo,
                                 organisation,
                                 COUNT(CASE WHEN pr_state = 'open' THEN id END) AS open_prs,
                                 COUNT(CASE WHEN pr_state = 'closed' AND merged_at is not null THEN id END) AS merged_prs
             FROM prs
             GROUP BY dev_name, repo, organisation),
         data as (SELECT
                                 contributions.dev_name,
                                 contributions.repo,
                                 contributions.organisation,
                                 contributions.contributions,
                                 COALESCE(user_issues.open_issues, 0) as open_issues,
                                 COALESCE(user_issues.closed_issues, 0) as closed_issues,
                                 COALESCE(user_prs.open_prs, 0) as open_prs,
                                 COALESCE(user_prs.merged_prs, 0) as merged_prs
         FROM contributions
         LEFT JOIN user_issues ON contributions.dev_name = user_issues.dev_name AND contributions.repo = user_issues.repo AND contributions.organisation = user_issues.organisation
         LEFT JOIN user_prs ON contributions.dev_name = user_prs.dev_name AND contributions.repo = user_prs.repo AND contributions.organisation = user_prs.organisation
        )

    SELECT *  FROM data ORDER BY contributions DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_contributors_view ON tab_contributors_view(dev_name, repo, organisation);

CREATE INDEX IF NOT EXISTS idx_tab_contributors_view_dev_name ON tab_contributors_view(dev_name);
CREATE INDEX IF NOT EXISTS idx_tab_contributors_view_repo ON tab_contributors_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_contributors_view_organisation ON tab_contributors_view(organisation);