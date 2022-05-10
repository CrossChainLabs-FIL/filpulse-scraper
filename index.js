const { INFO, ERROR, WARNING } = require('./logs');
const { Migrations } = require('./migrations');

let migrations = new Migrations();


const mainLoop = async _ => {
    try {
        INFO('Run migrations');
        await migrations.run();
        INFO('Run migrations, done');
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