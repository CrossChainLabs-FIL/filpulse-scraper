const config = require('./config');
const { INFO, ERROR } = require('./logs');
const { Migrations } = require('./migrations');
const { Scraper } = require('./scraper');

let migrations = new Migrations();
let scraper = new Scraper(config.scraper.github_api, config.scraper.github_token);
let stop = false;

async function scrape() {
    await scraper.Run();
}

const pause = (timeout) => new Promise(res => setTimeout(res, timeout * 1000));

const mainLoop = async _ => {
    try {
        INFO('Run migrations');
        await migrations.run();
        INFO('Run migrations, done');

        while (!stop) {
            await scrape();

            INFO(`Pause for 60 seconds`);
            await pause(60);
        }

    } catch (error) {
        ERROR(`[MainLoop] error :`);
        console.error(error);
        ERROR(`Shutting down`);
        process.exit(1);
    }
}

mainLoop();

function shutdown(exitCode = 0) {
    stop = true;
    setTimeout(() => {
        INFO(`Shutdown`);
        process.exit(exitCode);
    }, 3000);
}
//listen for TERM signal .e.g. kill
process.on('SIGTERM', shutdown);
// listen for INT signal e.g. Ctrl-C
process.on('SIGINT', shutdown);