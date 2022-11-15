CREATE MATERIALIZED VIEW IF NOT EXISTS participants_view
AS
with
  watchlist_data as (SELECT * FROM watchlist),
  participants_list as (SELECT number, repo, organisation, dev_name, avatar_url FROM issues_assignees UNION
                                SELECT number, repo, organisation, dev_name, avatar_url FROM issues_comments UNION
                                SELECT number, repo, organisation, dev_name, avatar_url FROM issues),
  participants as (SELECT
      number,
      repo,
      organisation,
      dev_name,
      avatar_url
FROM   participants_list)
SELECT
        DISTINCT dev_name, user_id,
        avatar_url,
        watchlist_data.repo,
        watchlist_data.organisation
FROM watchlist_data
LEFT JOIN participants ON participants.number = watchlist_data.number
                         AND participants.repo = watchlist_data.repo
                         AND participants.organisation = watchlist_data.organisation

WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_view ON participants_view(user_id, dev_name);
CREATE INDEX IF NOT EXISTS idx_participants_view_user_id ON participants_view(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_view_dev_name ON participants_view(dev_name);
