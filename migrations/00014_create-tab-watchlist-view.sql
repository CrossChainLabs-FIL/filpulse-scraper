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
  comments as (SELECT number, repo, organisation, COUNT(number) as comments
                FROM   issues_comments
                GROUP BY number, repo, organisation),
  new_comments as (SELECT
              user_id,
              watchlist.number,
              watchlist.repo,
              watchlist.organisation,
              watchlist.viewed_at,
              COUNT(ic.id) as new_comments
              FROM watchlist
              LEFT JOIN issues_comments ic on watchlist.number = ic.number
                         AND watchlist.repo = ic.repo
                         AND watchlist.organisation = ic.organisation
                         AND watchlist.viewed_at < ic.updated_at
              GROUP BY user_id, watchlist.number, watchlist.repo, watchlist.organisation, viewed_at),

  watchlist as (
     SELECT
        watchlist_data.user_id,
        watchlist_data.number,
        CASE WHEN length(title) > 50 THEN concat(substring(title, 1, 50), '...') ELSE title END as title,
        html_url,
        issues.state,
        dev_name,
        avatar_url,
        watchlist_data.repo,
        watchlist_data.organisation,
        participants.participants,
        comments.comments,
        new_comments.new_comments,
        issues.is_pr,
        created_at,
        updated_at,
        watchlist_data.viewed_at
FROM watchlist_data
LEFT JOIN issues ON issues.number = watchlist_data.number
                         AND issues.repo = watchlist_data.repo
                         AND issues.organisation = watchlist_data.organisation
LEFT JOIN participants ON participants.number = watchlist_data.number
                         AND participants.repo = watchlist_data.repo
                         AND participants.organisation = watchlist_data.organisation
LEFT JOIN comments ON comments.number = watchlist_data.number
                         AND comments.repo = watchlist_data.repo
                         AND comments.organisation = watchlist_data.organisation
LEFT JOIN new_comments ON new_comments.number = watchlist_data.number
                         AND new_comments.repo = watchlist_data.repo
                         AND new_comments.organisation = watchlist_data.organisation
                         AND new_comments.user_id = watchlist_data.user_id
)

SELECT * FROM watchlist
ORDER BY updated_at DESC
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tab_watchlist_view ON tab_watchlist_view(number, user_id, repo, organisation);

CREATE OR REPLACE FUNCTION refresh_watchlist_view()
  RETURNS TRIGGER LANGUAGE plpgsql
  AS $$
  BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tab_watchlist_view;
  RETURN NULL;
  END $$;

  CREATE TRIGGER refresh_watchlist_view
  AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
  ON watchlist
  FOR EACH STATEMENT
  EXECUTE PROCEDURE refresh_watchlist_view();
