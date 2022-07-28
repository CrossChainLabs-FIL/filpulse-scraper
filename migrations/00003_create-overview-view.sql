CREATE MATERIALIZED VIEW IF NOT EXISTS overview_view
AS
    with
        contributors_data as (
            with
                prs as ( SELECT DISTINCT dev_name FROM prs),
                devs as ( SELECT DISTINCT dev_name FROM devs)
                SELECT * FROM prs  UNION ALL
                SELECT * FROM devs),


            commits as ( SELECT sum(contributions) as commits FROM devs_contributions),
            repos as (SELECT count(repo) as repos FROM repos),
            contributors as (SELECT count(DISTINCT dev_name) as contributors FROM contributors_data),
            prs as (SELECT count(pr_number) as prs FROM prs),
            issues_open as (SELECT COUNT(id) as issues_open FROM issues WHERE issue_state = 'open'),
            issues_closed as (SELECT COUNT(id) as issues_closed FROM issues WHERE issue_state = 'closed')

    SELECT  commits.commits, repos.repos, contributors.contributors, prs.prs, issues_open.issues_open, issues_closed.issues_closed FROM commits, repos, contributors, prs, issues_open, issues_closed
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_overview_view ON overview_view(commits, repos, contributors, prs, issues_open, issues_closed);