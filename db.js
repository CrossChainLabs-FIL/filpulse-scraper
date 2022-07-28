const { Pool } = require("pg");
const config = require('./config');
const { WARNING } = require('./logs');


// Type parser to use for timestamp without time zone
// This will keep node-pg from parsing the value into a Date object and give you the raw timestamp string instead.
var types = require('pg').types;
types.setTypeParser(1114, function(stringValue) {
  return stringValue;
})

function FormatNull(t) {
    if (JSON.stringify(t) == 'null') {
        return t;
    } else {
        return '\'' + t + '\'';
    }
}

function FormatText(t) {
    return t.replace(/'/g, "''");
}

class DB {

    constructor() {
        this.pool = new Pool(config.database);
    }

    async Query(query, log) {
        let result = undefined;
        try {
            result = await this.pool.query(query);
        } catch (err) {
            WARNING(`[${log}] ${query} -> ${err}`)
        }

        return result;
    }

    async RefreshView(view) {
        try {
            await this.pool.query(
                `REFRESH MATERIALIZED VIEW CONCURRENTLY ${view} WITH DATA;`
            );
        } catch (err) {
            WARNING(`[RefreshView] ${view} -> ${err}`)
        }
    }

    async SaveRepos(repos) {
        for (let i = 0; i < repos.length; i++) {
            try {
                let repo = repos[i];
                let values = `'${repo.repo}', \
                        '${repo.organisation}',\
                        '${repo.repo_type}',\
                        '${repo.dependencies}'`;

                await this.Query(`
                    INSERT INTO repos_list (repo, organisation, repo_type, dependencies) \
                        SELECT ${values} WHERE NOT EXISTS (SELECT 1 FROM repos_list WHERE repo='${repo.repo}' AND organisation='${repo.organisation}');`,
                        'SaveRepos');

            } catch (err) {
                WARNING(`[SaveRepos] -> ${err}`)
            }
        }
    }

    async SaveRepoInfo(repo) {
        try {
            let values = `'${repo.repo}', \
                        '${repo.organisation}',\
                        '${repo.repo_type}',\
                        '${repo.stars}',\
                        '${repo.default_branch}',\
                        '${repo.languages}',\
                        '${repo.dependencies}',\
                        '${repo.owner_type}',\
                        ${FormatNull(repo.created_at)},\
                        ${FormatNull(repo.updated_at)},\
                        ${FormatNull(repo.pushed_at)}`;

            await this.Query(`
                UPDATE repos SET stars='${repo.stars}', default_branch='${repo.default_branch}', languages='${repo.languages}', \
                        dependencies='${repo.dependencies}', updated_at='${repo.updated_at}', pushed_at='${repo.pushed_at}'\
                    WHERE repo='${repo.repo}' AND organisation='${repo.organisation}'; \
                INSERT INTO repos (repo, organisation, repo_type, stars, default_branch, languages, dependencies, owner_type, created_at, updated_at, pushed_at) \
                    SELECT ${values} WHERE NOT EXISTS (SELECT 1 FROM repos WHERE repo='${repo.repo}' AND organisation='${repo.organisation}');`,
                    'SaveRepoInfo');

        } catch (err) {
            WARNING(`[SaveRepoInfo] -> ${err}`)
        }
    }

    async SaveBranch(branch) {
        try {
            let values = `'${branch.repo}', \
                        '${branch.organisation}',\
                        '${branch.branch}',\
                        ${FormatNull(branch.latest_commit_date)}`;

            await this.Query(`
                UPDATE branches SET latest_commit_date=${FormatNull(branch.latest_commit_date)} \
                    WHERE repo='${branch.repo}' AND organisation='${branch.organisation}' AND branch='${branch.branch}'; \
                INSERT INTO branches (repo, organisation, branch, latest_commit_date) \
                    SELECT ${values} WHERE NOT EXISTS (SELECT 1 FROM branches WHERE repo='${branch.repo}' AND organisation='${branch.organisation}' AND branch='${branch.branch}');`,
                    'SaveBranch');

        } catch (err) {
            WARNING(`[SaveBranch] -> ${err}`)
        }
    }

    async SaveDevs(devs) {
        let query = '';
        
        for (let i = 0; i < devs.length; i++) {
            try {
                let dev = devs[i];
                let values = `'${dev.id}', \
                        '${dev.dev_name}', \
                        '${dev.avatar_url}'`;

                query += `\
                UPDATE devs SET avatar_url='${dev.avatar_url}' \
                    WHERE dev_name='${dev.dev_name}'; \
                INSERT INTO devs (id, dev_name, avatar_url) \
                    SELECT ${values} WHERE NOT EXISTS (SELECT 1 FROM devs WHERE dev_name='${dev.dev_name}');`;
                    

            } catch (err) {
                WARNING(`[SaveDevs] -> ${err}`)
            }
        }

        await this.Query(query,'SaveDevs');
    }

    async SaveContributions(devs) {
        let query = '';

        for (let i = 0; i < devs.length; i++) {
            try {
                let dev = devs[i];
                let values = `'${dev.dev_name}', \
                        '${dev.repo}', \
                        '${dev.organisation}', \
                        '${dev.contributions}'`;


                query += `\
                UPDATE devs_contributions SET contributions='${dev.contributions}' \
                    WHERE dev_name='${dev.dev_name}' AND repo='${dev.repo}' AND organisation='${dev.organisation}'; \
                INSERT INTO devs_contributions (dev_name, repo, organisation, contributions) \
                    SELECT ${values} WHERE NOT EXISTS (SELECT 1 FROM devs_contributions WHERE dev_name='${dev.dev_name}' AND repo='${dev.repo}' AND organisation='${dev.organisation}');`;
                    

            } catch (err) {
                WARNING(`[SaveContributions] -> ${err}`)
            }
        }

        await this.Query(query, 'SaveContributions');
    }

    async SaveCommits(commits) {
        let query = '';

        for (let i = 0; i < commits.length; i++) {
            try {
                let commit = commits[i];
                let values = `'${commit.commit_hash}', \
                            ${FormatNull(commit.dev_id)},\
                            ${FormatNull(commit.dev_name)},\
                            '${commit.repo}',\
                            '${commit.organisation}',\
                            '${commit.branch}',\
                            ${FormatNull(commit.commit_date)},
                            '${FormatText(commit.message)}'`;

                query += `\
                    INSERT INTO commits (commit_hash, dev_id, dev_name, repo, organisation, branch, commit_date, message) \
                        SELECT ${values} WHERE NOT EXISTS (SELECT 1 FROM commits WHERE commit_hash='${commit.commit_hash}');`;
                        

            } catch (err) {
                WARNING(`[SaveCommits] -> ${err}`)
            }
        }

        await this.Query(query, 'SaveCommits');
    }

    async SavePRs(prs) {
        let query = '';

        for (let i = 0; i < prs.length; i++) {
            try {
                let pr = prs[i];
                let values = `'${pr.id}', \
                        '${pr.pr_number}',\
                        '${FormatText(pr.title)}',\
                        '${pr.html_url}',\
                        '${pr.pr_state}',\
                        ${FormatNull(pr.created_at)},\
                        ${FormatNull(pr.updated_at)},\
                        ${FormatNull(pr.closed_at)},\
                        ${FormatNull(pr.merged_at)},\
                        '${pr.repo}',\
                        '${pr.organisation}',\
                        '${pr.dev_name}'`;

                query += `\
                    UPDATE prs SET title='${FormatText(pr.title)}',\
                                pr_state='${pr.pr_state}', \
                                updated_at=${FormatNull(pr.updated_at)}, \
                                closed_at=${FormatNull(pr.closed_at)}, \
                                merged_at=${FormatNull(pr.merged_at)} \
                        WHERE id='${pr.id}' AND repo='${pr.repo}' AND organisation='${pr.organisation}'; \
                    INSERT INTO prs (id, pr_number, title, html_url, pr_state, created_at, updated_at, closed_at, merged_at, repo, organisation, dev_name) \
                            SELECT ${values} WHERE NOT EXISTS (SELECT 1 FROM prs WHERE id='${pr.id}' AND repo='${pr.repo}' AND organisation='${pr.organisation}');`;
                    

            } catch (err) {
                WARNING(`[SavePRs] -> ${err}`)
            }
        }

        await this.Query(query, 'SavePRs');
    }

    async SaveIssues(issues) {
        let query = '';
        
        for (let i = 0; i < issues.length; i++) {
            try {
                let issue = issues[i];
                let values = `'${issue.id}', \
                        '${issue.issue_number}',\
                        '${FormatText(issue.title)}',\
                        '${issue.html_url}',\
                        '${issue.issue_state}',\
                        ${FormatNull(issue.created_at)},\
                        ${FormatNull(issue.updated_at)},\
                        ${FormatNull(issue.closed_at)},\
                        '${issue.repo}',\
                        '${issue.organisation}',\
                        '${issue.dev_name}'`;

                query += `\
                    UPDATE issues SET title='${FormatText(issue.title)}',\
                                issue_state='${issue.issue_state}', \
                                updated_at=${FormatNull(issue.updated_at)}, \
                                closed_at=${FormatNull(issue.closed_at)} \
                        WHERE id='${issue.id}' AND repo='${issue.repo}' AND organisation='${issue.organisation}'; \
                    INSERT INTO issues (id, issue_number, title, html_url, issue_state, created_at, updated_at, closed_at, repo, organisation, dev_name) \
                            SELECT ${values} WHERE NOT EXISTS (SELECT 1 FROM issues WHERE id='${issue.id}' AND repo='${issue.repo}' AND organisation='${issue.organisation}');`;
                    

            } catch (err) {
                WARNING(`[SaveIssues] -> ${err}`)
            }
        }

         await this.Query(query, 'SaveIssues');
    }
}

module.exports = {
    DB
}