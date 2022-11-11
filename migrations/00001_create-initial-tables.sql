CREATE TYPE repo_type AS ENUM ('whitelisted', 'dependent', 'fork');

CREATE TABLE IF NOT EXISTS repos_list
(
    repo text NOT NULL,
    organisation text NOT NULL,
    repo_type repo_type DEFAULT 'whitelisted' NOT NULL,
    dependencies jsonb,
    UNIQUE (repo, organisation)
);

CREATE TABLE IF NOT EXISTS repos
(
    repo text NOT NULL,
    organisation text NOT NULL,
    repo_type repo_type DEFAULT 'whitelisted' NOT NULL,
    stars int,
    default_branch text,
    languages jsonb,
    dependencies jsonb,
    owner_type text,
    created_at Timestamptz,
    updated_at Timestamptz,
    pushed_at Timestamptz,
    UNIQUE (repo, organisation)
);

CREATE TABLE IF NOT EXISTS devs
(
    id bigint,
    dev_name text NOT NULL,
    avatar_url text,
    UNIQUE (dev_name)
);

CREATE TABLE IF NOT EXISTS branches
(
    repo text NOT NULL,
    organisation text NOT NULL,
    branch text NOT NULL,
    latest_commit_date Timestamptz,
    UNIQUE (repo, organisation, branch)
);

CREATE TABLE IF NOT EXISTS commits
(
    commit_hash text NOT NULL,
    dev_id bigint,
    dev_name text,
    repo text NOT NULL,
    organisation text NOT NULL,
    branch text NOT NULL,
    commit_date Timestamptz,
    message text,
    UNIQUE (commit_hash)
);

CREATE TABLE IF NOT EXISTS devs_contributions
(
    dev_name text,
    repo text NOT NULL,
    organisation text NOT NULL,
    contributions bigint,
    UNIQUE (repo, organisation, dev_name)
);

CREATE TABLE IF NOT EXISTS issues
(
    number int NOT NULL,
    title text NOT NULL,
    html_url text NOT NULL,
    is_pr boolean,
    state text NOT NULL,
    created_at Timestamptz,
    updated_at Timestamptz,
    closed_at Timestamptz,
    repo text NOT NULL,
    organisation text NOT NULL,
    dev_name text NOT NULL,
    avatar_url text,
    UNIQUE (number, repo, organisation)
);

CREATE TABLE IF NOT EXISTS issues_comments
(
    id int NOT NULL,
    number int NOT NULL,
    html_url text NOT NULL,
    created_at Timestamptz,
    updated_at Timestamptz,
    repo text NOT NULL,
    organisation text NOT NULL,
    dev_name text NOT NULL,
    avatar_url text,
    UNIQUE(id, repo, organisation)
);

CREATE TABLE IF NOT EXISTS issues_assignees
(
    number int NOT NULL,
    dev_name text NOT NULL,
    avatar_url text,
    repo text NOT NULL,
    organisation text NOT NULL,
    UNIQUE (dev_name, number, repo, organisation)
);

CREATE TABLE IF NOT EXISTS issues_events
(
    number int NOT NULL,
    dev_name text NOT NULL,
    avatar_url text,
    repo text NOT NULL,
    organisation text NOT NULL,
    created_at Timestamptz,
    UNIQUE (dev_name, number, repo, organisation)
);

CREATE TABLE IF NOT EXISTS releases
(
    id bigint NOT NULL,
    tag_name text,
    name text,
    draft boolean,
    prerelease boolean,
    created_at Timestamptz,
    published_at Timestamptz,
    repo text NOT NULL,
    organisation text NOT NULL,
    dev_name text NOT NULL,
    avatar_url text,
    UNIQUE (id)
);

CREATE TABLE IF NOT EXISTS users
(
    id SERIAL NOT NULL,
    username text NOT NULL UNIQUE,
    avatar_url text NOT NULL,
    created TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY ("id")
);


CREATE TABLE IF NOT EXISTS watchlist
(
    user_id SERIAL NOT NULL,
    number int NOT NULL,
    repo text NOT NULL,
    organisation text NOT NULL,
    viewed_at Timestamptz DEFAULT now(),

    UNIQUE (number, repo, organisation, user_id)
);


