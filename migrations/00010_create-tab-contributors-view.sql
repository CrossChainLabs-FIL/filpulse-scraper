CREATE MATERIALIZED VIEW IF NOT EXISTS tab_contributors_view
AS
with
         contributions as ( SELECT dev_name, repo, organisation, contributions FROM devs_contributions),
         user_issues as (SELECT
                                 dev_name,
                                 repo,
                                 organisation,
                                 count(number) as issues,
                                 COUNT(CASE WHEN state = 'open' THEN number END) AS open_issues,
                                 COUNT(CASE WHEN state = 'closed' THEN number END) AS closed_issues
             FROM issues
             WHERE is_pr = false
             GROUP BY dev_name, repo, organisation),
        user_prs as (SELECT
                                 dev_name,
                                 repo,
                                 organisation,
                                 COUNT(CASE WHEN state = 'open' THEN number END) AS open_prs,
                                 COUNT(CASE WHEN state = 'closed' THEN number END) AS closed_prs
             FROM issues
             WHERE is_pr = true
             GROUP BY dev_name, repo, organisation),
         data as (SELECT
                                 contributions.dev_name,
                                 devs.avatar_url,
                                 contributions.repo,
                                 contributions.organisation,
                                 contributions.contributions,
                                 COALESCE(user_issues.open_issues, 0) as open_issues,
                                 COALESCE(user_issues.closed_issues, 0) as closed_issues,
                                 COALESCE(user_prs.open_prs, 0) as open_prs,
                                 COALESCE(user_prs.closed_prs, 0) as closed_prs
         FROM contributions
         LEFT JOIN user_issues ON contributions.dev_name = user_issues.dev_name AND contributions.repo = user_issues.repo AND contributions.organisation = user_issues.organisation
         LEFT JOIN user_prs ON contributions.dev_name = user_prs.dev_name AND contributions.repo = user_prs.repo AND contributions.organisation = user_prs.organisation
         LEFT JOIN devs ON contributions.dev_name = devs.dev_name
        )

    SELECT *  FROM data ORDER BY contributions DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_contributors_view ON tab_contributors_view(dev_name, repo, organisation);

CREATE INDEX IF NOT EXISTS idx_tab_contributors_view_dev_name ON tab_contributors_view(dev_name);
CREATE INDEX IF NOT EXISTS idx_tab_contributors_view_repo ON tab_contributors_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_contributors_view_organisation ON tab_contributors_view(organisation);