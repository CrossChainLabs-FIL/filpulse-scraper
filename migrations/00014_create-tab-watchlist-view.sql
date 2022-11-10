CREATE MATERIALIZED VIEW IF NOT EXISTS tab_watchlist_view
AS
with
  watchlist_data as (SELECT * FROM watchlist),
  participants_list as (SELECT number, repo, organisation, dev_name, avatar_url FROM issues_assignees UNION
                                SELECT number, repo, organisation, dev_name, avatar_url FROM issues_comments UNION
                                SELECT number, repo, organisation, dev_name, avatar_url FROM issues),
  participants as (SELECT number, repo, organisation, '[["' || string_agg(concat_ws('","',dev_name,avatar_url), '"],["') || '"]]' AS participants
                   FROM   participants_list
                   GROUP  BY number, repo, organisation),
  watchlist as (
     SELECT
        user_id,
        watchlist_data.number,
        title,
        html_url,
        issues.state,
        dev_name,
        avatar_url,
        watchlist_data.repo,
        watchlist_data.organisation,
        participants.participants,
        issues.is_pr,
        updated_at,
        viewed_at
FROM watchlist_data
LEFT JOIN issues ON issues.number = watchlist_data.number
                         AND issues.repo = watchlist_data.repo
                         AND issues.organisation = watchlist_data.organisation
LEFT JOIN participants ON participants.number = watchlist_data.number
                         AND participants.repo = watchlist_data.repo
                         AND participants.organisation = watchlist_data.organisation
)

SELECT * FROM watchlist
ORDER BY updated_at DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_watchlist_view ON tab_watchlist_view(user_id, number, repo, organisation);
