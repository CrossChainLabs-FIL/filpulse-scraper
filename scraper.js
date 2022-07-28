const config = require('./config');
const axios = require('axios');
const cliProgress = require('cli-progress');
const { compareAsc, subDays } = require('date-fns');
const { INFO, ERROR, WARNING, STATUS } = require('./logs');
const { DB } = require('./db');

let db = new DB();

const PER_PAGE = 100;
const SCRAPE_LIMIT = 1;

const blacklisted_organizations = config.scraper.blacklisted_organizations;
const blacklisted_repos = config.scraper.blacklisted_repos;
const whitelisted_organizations = config.scraper.whitelisted_organizations;
const whitelisted_repos = config.scraper.whitelisted_repos;

class Scraper {
    constructor(api, token_list) {
        this.api = api;
        this.token_list = token_list;
        this.token_list_index = 0;
        
        this.remaining_requests = 0;
        this.search_remaining_requests = 0;
        this.reset_time = 0;
        this.stop = false;

        if (token_list?.length) {
            this.token = token_list[0];
        }
    }

    GetRecentCommitsDate(date) {
        let result = date;
        let recent_commits_date = subDays(new Date(), config.scraper.recent_commits_days);
        if (compareAsc(recent_commits_date, date) == 1) {
            result = recent_commits_date;
        }

        return result;
    }

    GetNextToken() {
        if (this.token_list_index < this.token_list.length - 1) {
            this.token_list_index++;
        } else {
            this.token_list_index = 0;
        }

        INFO(`GetNextToken index ${this.token_list_index}`);

        this.token = this.token_list[this.token_list_index];
    }

    async Get(url, params, verbose = false) {
        let response = undefined;

        try {
            if (this.token) {
                response = await axios.get(url, {
                    headers: {
                        Accept: 'application/vnd.github.v3+json',
                        Authorization: `token ${this.token}`,
                    },
                    timeout: 10000,
                    params
                });
            } else {
                response = await axios.get(url, { timeout: 10000, params });
            }
    
            if (verbose) {
                INFO(`Get ${url} -> ${JSON.stringify(params)}`);
            }
            
        } catch (e) {
            ERROR(`Get ${url} -> ${JSON.stringify(params)} error: ${e}`);
        }

        return response;
    }

    async UpdateRateLimit() {
        if (this.remaining_requests < SCRAPE_LIMIT + 5) {
            this.GetNextToken();
            const resp = await this.Get(this.api + 'rate_limit');

            if (resp?.data?.rate) {
                const resetTime = new Date(resp?.data?.rate?.reset * 1000);
                this.remaining_requests = resp?.data?.rate?.remaining;
                this.reset_time =  Math.round(resetTime.getTime() / 1000);

                INFO(`UpdateRateLimit: remaining_requests ${this.remaining_requests}`);
            } else {
                ERROR(`UpdateRateLimit: get rate limit status ${resp?.status}`);
            }

            if (this.remaining_requests < SCRAPE_LIMIT + 5) {
                const now = new Date()
                const secondsSinceEpoch = Math.round(now.getTime() / 1000);

                const sleep_duration_sec = this.reset_time - secondsSinceEpoch + 1;
                const pause = (timeout) => new Promise(res => setTimeout(res, timeout * 1000));

                INFO(`UpdateRateLimit: sleep for ${sleep_duration_sec} seconds`);
                await pause(sleep_duration_sec);

                const resp = await this.Get(this.api + 'rate_limit');

                if (resp?.data?.rate) {
                    this.remaining_requests = resp?.data?.rate?.remaining;
                    this.reset_time = resp?.data?.rate?.reset;

                    INFO(`UpdateRateLimit: remaining_requests ${this.remaining_requests}`);
                } else {
                    ERROR(`UpdateRateLimit: get rate limit status ${resp?.status}`);
                }
            }
        }
    }

    async GetWithRateLimitCheck(url, params, verbose = false) {
        await this.UpdateRateLimit();

        if (this.remaining_requests < 1) {
            return undefined;
        }

        this.remaining_requests -= 1;

        return await this.Get(url, params, verbose);
    }

    async GetOrganizationRepos(org) {
        let result = [];

        if (!org) {
            return;
        }

        INFO(`GetOrganizationRepos[${org}]`);

        try {
            let have_items = false;
            let page = 1;

            do {
                

                const respRepos = await this.GetWithRateLimitCheck(
                    this.api + 'orgs/' + org + '/repos',
                    {
                        per_page: PER_PAGE,
                        page: page,
                    });

                if (respRepos?.data.length === PER_PAGE) {
                    have_items = true;
                    page++;
                } else {
                    have_items = false;
                }

                respRepos?.data.forEach(repo => {
                    result.push(repo.name);
                });

            } while (have_items);

        } catch (e) {
            ERROR(`GetOrganizationRepos: ${e}`);
        }

        return result;
    }

    IsBlacklisted(repo, org) {
        let result = false;

        if (blacklisted_organizations && blacklisted_organizations.find(o => o == org)) {
            result = true;
        } else {
            if (blacklisted_repos && blacklisted_repos.find(r => r == (org + '/' + repo))) {
                result = true;
            }
        }

        if (result) {
            WARNING(`IsBlacklisted: ${org}/${repo}`);
        }

        return result;
    }

    async IsValidRepo(repo, org) {
        let result = false;
        let repo_full_name = org + '/' + repo;

        try {
            const respGeneralInfo = await this.GetWithRateLimitCheck(this.api + 'repos/' + repo_full_name);

            if (respGeneralInfo?.data?.id) {
                result = true;
            }
        } catch (e) {
            ERROR(`IsValidRepo: ${repo_full_name} -> ${e}`);
        }

        return result;
    }

    async GetWhitelistedRepos() {
        let repos = [];

        try {
            for (let i = 0; i < whitelisted_organizations.length; i++) {
                let org = whitelisted_organizations[i];
                let org_repos = await this.GetOrganizationRepos(org);
                org_repos.forEach(repo => {
                    if (!this.IsBlacklisted(repo, org)) {
                        repos.push({
                            repo: repo,
                            organisation: org,
                            repo_type: 'whitelisted',
                            dependencies: '[]'
                        });
                    }
                })
            }

            if (whitelisted_repos?.length > 0) {
                for (let i = 0; i < whitelisted_repos.length; i++) {
                    let repo_full_name = whitelisted_repos[i];
                    let split = repo_full_name.split('/');
                    let org = split[0];
                    let repo = split[1];

                    if (org && repo && !this.IsBlacklisted(repo, org)) {
                        let isValidRepo = await this.IsValidRepo(repo, org);

                        if (isValidRepo) {
                            repos.push({
                                repo: repo,
                                organisation: org,
                                repo_type: 'whitelisted',
                                dependencies: '[]'
                            });
                        }
                    }
                };
            }

            await db.SaveRepos(repos);

        } catch (e) {
            console.log(e);
            ERROR(`GetWhitelistedRepos: ${e}`);
        }

    }

    async GetRepoInfo(repo, org, dependencies, repo_type) {
        let result = undefined;
        let repo_full_name = org + '/' + repo;
        let requests = this.remaining_requests;

        INFO(`GetRepoInfo [${org}/${repo}]`);

        try {
            const respGeneralInfo = await this.GetWithRateLimitCheck(this.api + 'repos/' + repo_full_name);
            const respLanguages = await this.GetWithRateLimitCheck(this.api + 'repos/' + repo_full_name +'/languages');

            let main_language = '';
            let main_language_lines_max = 0;
            let main_language_lines_sum = 0;

            for (const [key, value] of Object.entries(respLanguages?.data)) {
                if (main_language_lines_max < value) {
                    main_language = key;
                    main_language_lines_max = value;
                }

                main_language_lines_sum += value;
            }

            if (main_language && main_language_lines_sum) {
                main_language += ' ';
                main_language += (Math.round((main_language_lines_max / main_language_lines_sum) * 100)).toString();
                main_language += '%';
            }

            result = {
                repo: repo,
                organisation: org,
                repo_type: repo_type,
                stars : respGeneralInfo?.data?.stargazers_count,
                default_branch: respGeneralInfo?.data?.default_branch,
                created_at: respGeneralInfo?.data?.created_at,
                updated_at: respGeneralInfo?.data?.updated_at,
                pushed_at: respGeneralInfo?.data?.pushed_at,
                owner_type: respGeneralInfo?.data?.owner?.type,
                languages : JSON.stringify(respLanguages?.data),
                dependencies: JSON.stringify(dependencies),
                forks: respGeneralInfo?.data?.forks,
                main_language: main_language,
            }

            await db.SaveRepoInfo(result);

        } catch (e) {
            ERROR(`GetRepoInfo: ${e}`);
        }

        requests = requests - this.remaining_requests;

        INFO(`GetRepoInfo [${org}/${repo}] done (used requests: ${requests})`);
    }

    async GetRepoContributors(repo, org) {
        let repo_full_name = org + '/' + repo;
        let requests = this.remaining_requests;

        INFO(`GetRepoContributors [${org}/${repo}]`);

        try {
            let have_items = false;
            let page = 1;

            do {
                let result = [];

                const respContributors = await this.GetWithRateLimitCheck(
                    this.api + 'repos/' + repo_full_name + '/contributors',
                    {
                        per_page: PER_PAGE,
                        page: page,
                    });

                if (respContributors?.data.length === PER_PAGE) {
                    have_items = true;
                    page++;
                } else {
                    have_items = false;
                }

                respContributors?.data.forEach(contributor => {
                    if (contributor?.type === 'User') {
                        result.push({
                            id: contributor?.id,
                            dev_name: contributor?.login,
                            repo: repo,
                            organisation: org,
                            avatar_url: contributor?.avatar_url,
                            contributions: contributor?.contributions,
                        })
                    }
                });

                await db.SaveDevs(result);
                await db.SaveContributions(result);
            } while (have_items);

        } catch (e) {
            ERROR(`GetRepoContributors: ${e}`);
        }

        requests = requests - this.remaining_requests;

        INFO(`GetRepoContributors [${org}/${repo}] done (used requests: ${requests})`);
    }

    async GetRepoBranches(repo, org, default_branch) {
        let result = [];
        let repo_full_name = org + '/' + repo;

        let requests = this.remaining_requests;

        INFO(`GetRepoBranches [${org}/${repo}]`);

        if (default_branch) {
            result.push(default_branch);
        }

        try {
            let have_items = false;
            let page = 1;

            do {
                const respBranches = await this.GetWithRateLimitCheck(
                    this.api + 'repos/' + repo_full_name + '/branches',
                    {
                        per_page: PER_PAGE,
                        page: page,
                    });

                if (respBranches?.data.length === PER_PAGE) {
                    have_items = true;
                    page++;
                } else {
                    have_items = false;
                }

                respBranches?.data.forEach(branch => {
                    if (branch.name != default_branch) {
                        result.push(branch.name);
                    }
                });
            } while (have_items);

        } catch (e) {
            ERROR(`GetRepoBranches: ${e}`);
        }

        requests = requests - this.remaining_requests;

        INFO(`GetRepoBranches [${org}/${repo}] done (used requests: ${requests})`);

        return result;

    }

    async GetRepoCommits(repo, org) {
        let commitsSet = new Set();
        let repo_full_name = org + '/' + repo;
        let requests = this.remaining_requests;
        
        let recent_commits_date = subDays(new Date(), config.scraper.recent_commits_days);

        const default_branch_result = await db.Query(`SELECT default_branch FROM repos WHERE repo='${repo}' AND organisation='${org}';`);
        const default_branch = default_branch_result?.rows[0]?.default_branch;

        let branches = await this.GetRepoBranches(repo, org, default_branch);

        INFO(`GetRepoCommits [${org}/${repo}] branches ${branches.length}`);

        let progress = 0;
        let total_progress = branches.length;
        const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
        progressBar.start(branches.length, 0);
        
        if (branches.length) {
            var branchesSlice = branches;
            while (branchesSlice.length) {
                await Promise.all(branchesSlice.splice(0, SCRAPE_LIMIT).map(async (branch) => {
                    try {
                        let since = undefined;
                        let have_items = false;
                        let page = 1;
    
                        const latest_commit_date_result = await db.Query(`SELECT latest_commit_date FROM branches WHERE repo='${repo}' AND organisation='${org}' AND branch='${branch}';`);
                        if (latest_commit_date_result?.rows[0]?.latest_commit_date) {
                            since = this.GetRecentCommitsDate(new Date(latest_commit_date_result?.rows[0]?.latest_commit_date)).toISOString();
                        } else {
                            since = recent_commits_date.toISOString();
                        }
    
                        let latest_commit_timestamp = undefined;
                        let latest_commit_date = null;
                        if (since) {
                            latest_commit_timestamp = new Date(since);
                            latest_commit_date = since;
                        }
    
                        do {
                            let result = [];
    
                            let params = {
                                per_page: PER_PAGE,
                                page: page,
                                sha: branch,
                            };
    
                            if (since) {
                                params.since = since;
                            }
    
                            const respCommits = await this.GetWithRateLimitCheck(
                                this.api + 'repos/' + repo_full_name + '/commits',
                                params);
    
                            if (respCommits?.data.length === PER_PAGE) {
                                have_items = true;
                                page++;
                            } else {
                                have_items = false;
                            }
    
                            respCommits?.data.forEach(commit => {
                                if (!latest_commit_timestamp) {
                                    if (commit?.commit?.committer?.date) {
                                        latest_commit_timestamp = new Date(commit?.commit?.committer?.date);
                                        latest_commit_date = commit?.commit?.committer?.date;
                                    }
                                } else {
                                    if (commit?.commit?.committer?.date) {
                                        const new_commit_timestamp = new Date(commit?.commit?.committer?.date);
                                        if (new_commit_timestamp > latest_commit_timestamp) {
                                            latest_commit_timestamp = new_commit_timestamp;
                                            latest_commit_date = commit?.commit?.committer?.date;
                                        }
                                    }
                                }
    
                                if (commit.sha && !commitsSet.has(commit.sha)) {
                                    commitsSet.add(commit.sha);
                                    result.push({
                                        commit_hash: commit.sha,
                                        dev_id: commit?.author?.id ? commit?.author?.id : null,
                                        dev_name: commit?.author?.login ? commit?.author?.login : null,
                                        repo: repo,
                                        organisation: org,
                                        branch: branch,
                                        commit_date: commit?.commit?.committer?.date,
                                        message: commit?.commit?.message
                                    })
                                }
                            });
    
                            await db.SaveCommits(result);
                        } while (have_items);
    
                        await db.SaveBranch({
                            repo: repo,
                            organisation: org,
                            branch: branch,
                            latest_commit_date: latest_commit_date
                        });
    
                    } catch (e) {
                        ERROR(`GetRepoCommits: ${e}`);
                    }
                }));

                progress += SCRAPE_LIMIT;
                if (progress > total_progress) {
                    progress = total_progress;
                }

                progressBar.update(progress);
            }
        }

        progressBar.stop();

        requests = requests - this.remaining_requests;

        INFO(`GetRepoCommits [${org}/${repo}] done (used requests: ${requests})`);
    }

    async GetRepoPRs(repo, org) {
        let repo_full_name = org + '/' + repo;
        let requests = this.remaining_requests;

        INFO(`GetRepoPRs [${org}/${repo}]`);

        try {
            let result = [];
            let have_items = false;
            let page = 1;

            do {
                let params = {
                    per_page: PER_PAGE,
                    page: page,
                    state: 'all',
                };

                const respPRs = await this.GetWithRateLimitCheck(
                    this.api + 'repos/' + repo_full_name + '/pulls', params);

                if (respPRs?.data.length === PER_PAGE) {
                    have_items = true;
                    page++;
                } else {
                    have_items = false;
                }

                respPRs?.data.forEach(pr => {
                    result.push({
                        id: pr?.id,
                        pr_number: pr?.number,
                        title: pr?.title,
                        html_url: pr?.html_url,
                        pr_state: pr?.state,
                        created_at: pr?.created_at,
                        updated_at: pr?.updated_at,
                        closed_at: pr?.closed_at,
                        merged_at:  pr?.merged_at,
                        repo: repo,
                        organisation: org,
                        dev_name: pr?.user?.login,
                    });
                });

                await db.SavePRs(result);
            } while (have_items);

        } catch (e) {
            ERROR(`GetRepoPRs: ${e}`);
        }

        requests = requests - this.remaining_requests;

        INFO(`GetRepoPRs [${org}/${repo}] done (used requests: ${requests})`);
    }

    async GetRepoIssues(repo, org) {
        let repo_full_name = org + '/' + repo;
        let requests = this.remaining_requests;
        let since = undefined;

        const latest_issue_date = await db.Query(`SELECT MAX(updated_at) FROM issues WHERE repo='${repo}' AND organisation='${org}';`);
        if (latest_issue_date?.rows[0]?.max) {
            since = new Date(latest_issue_date?.rows[0]?.max).toISOString();
        }

        if (since) {
            INFO(`GetRepoIssues [${org}/${repo}] updated since ${since}`);
        } else {
            INFO(`GetRepoIssues [${org}/${repo}]`);
        }

        try {
            let result = [];
            let have_items = false;
            let page = 1;

            do {
                let params = {
                    per_page: PER_PAGE,
                    page: page,
                    state: 'all',
                };

                if (since) {
                    params.since = since;
                }

                const respIssues = await this.GetWithRateLimitCheck(
                    this.api + 'repos/' + repo_full_name + '/issues', params);

                if (respIssues?.data.length === PER_PAGE) {
                    have_items = true;
                    page++;
                } else {
                    have_items = false;
                }

                respIssues?.data.forEach(issue => {
                    result.push({
                        id: issue?.id,
                        issue_number: issue?.number,
                        title: issue?.title,
                        html_url: issue?.html_url,
                        issue_state: issue?.state,
                        created_at: issue?.created_at,
                        updated_at: issue?.updated_at,
                        closed_at: issue?.closed_at,
                        repo: repo,
                        organisation: org,
                        dev_name: issue?.user?.login,
                    });
                });

                await db.SaveIssues(result);
            } while (have_items);

        } catch (e) {
            ERROR(`GetRepoIssues: ${e}`);
        }

        requests = requests - this.remaining_requests;

        INFO(`GetRepoIssues [${org}/${repo}] done (used requests: ${requests})`);
    }

    async GetReposList() {
        let result = [];
        try {
            let repo_list = await db.Query('SELECT * FROM repos_list;');
            if (repo_list?.rows) {
                result = repo_list?.rows;
            }

        } catch (e) {
            ERROR(`GetReposList: ${e}`);
        }

        return result;
    }

    async GetRepoStatus(repo, org) {
        let repo_full_name = org + '/' + repo;

        INFO(`GetRepoStatus [${org}/${repo}]`);

        let result = {
            updated: true,
            pushed: true
        };

        try {
            let repo_list = await db.Query(`SELECT updated_at,pushed_at FROM repos WHERE repo='${repo}' AND organisation='${org}'`);
            if (repo_list?.rows) {
                const updated_at = repo_list?.rows[0]?.updated_at;
                const pushed_at = repo_list?.rows[0]?.pushed_at;

                if (updated_at && pushed_at) {
                    const respGeneralInfo = await this.GetWithRateLimitCheck(this.api + 'repos/' + repo_full_name);

                    let updated_timestamp_db = new Date(updated_at);
                    let pushed_timestamp_db = new Date(pushed_at);
                    let updated_timestamp_api = new Date(respGeneralInfo?.data?.updated_at);
                    let pushed_timestamp_api = new Date(respGeneralInfo?.data?.pushed_at);
        
                    if (updated_timestamp_db.getTime() === updated_timestamp_api.getTime()) {
                        result.updated = false;
                    }

                    if (pushed_timestamp_db.getTime() === pushed_timestamp_api.getTime()) {
                        result.pushed = false;
                    }
                }
            }

        } catch (e) {
            ERROR(`GetRepoStatus: ${e}`);
        }

        return result;
    }

    UpdateDependencies(repo_item, dep) {
        if (!repo_item || !repo_item.dependencies) {
            ERROR(`UpdateDependencies: invalid repo item ${repo_item}`);
            return undefined;
        }

        let dependencies = repo_item.dependencies;

        let have_dep = false;

        for ( const d of dependencies ) {
            if (d === dep ) {
                have_dep = true;
            }
        }

        if (!have_dep) {
            dependencies.push(dep);
        }

        let updated_repo_item = {
            repo: repo_item.repo,
            organisation: repo_item.organisation,
            repo_type: repo_item.repo_type,
            dependencies: dependencies,
        }

        return updated_repo_item;
    }

    async Run() {
        STATUS('Scraping');

        await this.GetWhitelistedRepos();

        const repos = await this.GetReposList();
    
        for (let i = 0; i < repos.length; i++) {
            const repo = repos[i].repo;
            const org = repos[i].organisation;
            const repo_type = repos[i].repo_type;
            const dependencies = repos[i].dependencies;

            STATUS(`Scraping [${org}/${repo}] ${i+1} of ${repos.length} repos`);

            let status = await this.GetRepoStatus(repo, org);

            if (status.pushed) {
                await this.GetRepoCommits(repo, org);
                await this.GetRepoPRs(repo, org);
            }

            if (status.updated) {
                await this.GetRepoContributors(repo, org);
                await this.GetRepoIssues(repo, org);
                await this.GetRepoInfo(repo, org, dependencies, repo_type);
            }

            if (!status.pushed && !status.updated) {
                INFO(`Skip Scraping [${org}/${repo}] no updates`);
            } else {
                INFO(`Refresh views`);
                await db.RefreshView('overview_view');
                await db.RefreshView('top_contributors_view');
                await db.RefreshView('commits_view');
                await db.RefreshView('active_contributors_view');
                await db.RefreshView('recent_commits_view');
                INFO(`Refresh views done`);
            }
        }

        STATUS('Scraping completed');
    }

    async Stop() {
        INFO('GitHubScraper stopping');
        this.stop = true;
    }
}

module.exports = {
    Scraper
};