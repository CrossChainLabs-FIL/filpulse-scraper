CREATE MATERIALIZED VIEW IF NOT EXISTS overview_view
AS
    with
            commits as ( SELECT sum(contributions) as commits FROM devs_contributions),
            repos as (SELECT count(repo) as repos FROM repos),
            contributors as (SELECT count(DISTINCT dev_name) as contributors FROM devs),
            prs as (SELECT count(number) as prs FROM issues WHERE is_pr = true ),
            issues_open as (SELECT COUNT(number) as issues_open FROM issues WHERE is_pr = false AND state = 'open'),
            issues_closed as (SELECT COUNT(number) as issues_closed FROM issues WHERE is_pr = false AND state = 'closed')

    SELECT  commits.commits, repos.repos, contributors.contributors, prs.prs, issues_open.issues_open, issues_closed.issues_closed FROM commits, repos, contributors, prs, issues_open, issues_closed
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_overview_view ON overview_view(commits, repos, contributors, prs, issues_open, issues_closed);