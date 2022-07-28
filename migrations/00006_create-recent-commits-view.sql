CREATE MATERIALIZED VIEW IF NOT EXISTS recent_commits_view
AS
    with
         commits as ( SELECT dev_name, repo, organisation, commit_hash, commit_date, message FROM commits WHERE commit_date > NOW() - INTERVAL '7 days'),
         user_commits as (SELECT commits.dev_name, repo, organisation, commit_hash, commit_date, avatar_url, message FROM commits INNER JOIN devs ON commits.dev_name = devs.dev_name)

    SELECT * FROM user_commits ORDER BY commit_date DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_recent_commits_view ON recent_commits_view(dev_name, repo, organisation, commit_hash, commit_date, avatar_url, message);