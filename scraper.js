const axios = require('axios');
const { INFO, ERROR } = require('./logs');

class Scraper {
    constructor(api, token) {
        this.api = api;
        this.token = token;
        this.remaining_requests = 0;
        this.reset_time = 0;
    }

    async Get(url) {
        INFO(`Get ${url}`)
        let response;
        if (this.token) {
            response = await axios.get(url, {
                headers: {
                    Authorization: `token ${this.token}`,
                }
            });
        } else {
            response = await axios.get(url);
        }

        return response;
    }

    async UpdateRateLimit() {
        if (this.remaining_requests < 1) {
            const seconds_since_epoch = Math.round((new Date()).getTime() / 1000);

            if (this.reset_time < seconds_since_epoch) {
                const resp = await this.Get(this.api + 'rate_limit');

                if (resp?.data?.rate) {
                    this.remaining_requests = resp?.data?.rate?.remaining;
                    this.reset_time = resp?.data?.rate?.reset;

                    INFO(`UpdateRateLimit: remaining_requests ${this.remaining_requests}`);
                } else {
                    ERROR(`UpdateRateLimit: get rate limit status ${resp?.status}`);
                }
            } else {
                const sleep_duration_sec = this.reset_time - seconds_since_epoch + 1;
                const pause = (timeout) => new Promise(res => setTimeout(res, timeout * 1000));


                INFO(`UpdateRateLimit: sleep for ${sleep_duration_sec} seconds`);
                await pause(sleep_duration_sec);
            }
        }
    }

    async GetWithRateLimitCheck(url) {
        await this.UpdateRateLimit();

        if (this.remaining_requests < 1) {
            return undefined;
        }

        this.remaining_requests -= 1;

        return await this.Get(url);
    }

    async GetRepoInfo(repo, org) {
        let result = undefined;

        const respGeneralInfo = await this.GetWithRateLimitCheck(this.api + 'repos/' + org + '/' + repo);
        const respLanguages = await this.GetWithRateLimitCheck(this.api + 'repos/' + org + '/' + repo +'/languages');

        try {
            result = {
                full_name : respGeneralInfo?.data?.full_name,
                stars : respGeneralInfo?.data?.stargazers_count,
                languages : respLanguages?.data,
            }

        } catch (e) {
            ERROR(`GetRepoInfo: ${e}`);
        }

        return result
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
}

module.exports = {
    Scraper
};

(async () => {
    const config = require('./config');
    const scraper = new Scraper(config.scraper.github_api, config.scraper.github_token);

    for( let i = 0; i < 100; i++) {
        const result = await scraper.GetRepoInfo('filecoin-project', 'lotus');
        console.log(result);
    }
}

)(); 