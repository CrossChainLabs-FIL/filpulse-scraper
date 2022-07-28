CREATE MATERIALIZED VIEW IF NOT EXISTS commits_view
AS
    with
        commits as ( SELECT date_trunc('month', commit_date)::date AS month, count(commit_hash) as commits FROM commits GROUP BY month)

    SELECT commits.commits, commits.month FROM commits ORDER BY month
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_commits_view ON commits_view(month);