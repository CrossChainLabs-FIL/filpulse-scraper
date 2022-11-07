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

CREATE INDEX IF NOT EXISTS idx_releases ON releases(id);