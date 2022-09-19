CREATE MATERIALIZED VIEW IF NOT EXISTS tab_commits_view
AS
    with
         commits as ( SELECT dev_name, repo, organisation, commit_hash, commit_date, message FROM commits),
         user_commits as (SELECT commits.dev_name, repo, organisation, commit_hash, commit_date, avatar_url, message FROM commits INNER JOIN devs ON commits.dev_name = devs.dev_name)

    SELECT * FROM user_commits ORDER BY commit_date DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_commits_view ON tab_commits_view(dev_name, repo, organisation, commit_hash);

CREATE INDEX IF NOT EXISTS idx_tab_commits_view_dev_name ON tab_commits_view(dev_name);
CREATE INDEX IF NOT EXISTS idx_tab_commits_view_repo ON tab_commits_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_commits_view_organisation ON tab_commits_view(organisation);
CREATE INDEX IF NOT EXISTS idx_tab_commits_view_commit_hash ON tab_commits_view(commit_hash);
CREATE INDEX IF NOT EXISTS idx_tab_commits_view_message ON tab_commits_view(left(message,10));