CREATE INDEX IF NOT EXISTS idx_watchlist2 ON watchlist(number, user_id, repo, organisation);

CREATE INDEX IF NOT EXISTS idx_tab_commits_view_commit_date ON tab_commits_view(commit_date);


CREATE INDEX IF NOT EXISTS idx_tab_prs_view_title ON tab_prs_view(left(title,10));
CREATE INDEX IF NOT EXISTS idx_tab_prs_view_state ON tab_prs_view(state);
CREATE INDEX IF NOT EXISTS idx_tab_prs_view_updated_at ON tab_prs_view(updated_at);

CREATE INDEX IF NOT EXISTS idx_tab_issues_view_number ON tab_issues_view(number);
CREATE INDEX IF NOT EXISTS idx_tab_issues_view_title ON tab_issues_view(left(title,10));
CREATE INDEX IF NOT EXISTS idx_tab_issues_view_state ON tab_issues_view(state);
CREATE INDEX IF NOT EXISTS idx_tab_issues_view_updated_at ON tab_issues_view(updated_at);
CREATE INDEX IF NOT EXISTS idx_tab_issues_view_assignees ON tab_issues_view(left(assignees,10));

CREATE INDEX IF NOT EXISTS idx_tab_releases_view_state ON tab_releases_view(state);

CREATE INDEX IF NOT EXISTS idx_tab_watchlist_view_number ON tab_watchlist_view(number);
CREATE INDEX IF NOT EXISTS idx_tab_watchlist_view_user_id ON tab_watchlist_view(user_id);
CREATE INDEX IF NOT EXISTS idx_tab_watchlist_view_repo ON tab_watchlist_view(repo);
CREATE INDEX IF NOT EXISTS idx_tab_watchlist_view_organisation ON tab_watchlist_view(organisation);
