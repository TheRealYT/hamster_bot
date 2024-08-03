// builtin modules
const crypto = require('node:crypto');

// 3rd-party modules
const express = require('express');

// custom modules
const {BotAPI} = require('./BotAPI');
const {updateType, UpdateEvent} = require('./Update');

class BotServer extends BotAPI {
    #app = express();
    #ADDRESS = '';
    update = new UpdateEvent();

    constructor(apiToken) {
        super(apiToken);

        this.#app.use(express.json());

        this.#app.use(async (req, res) => {
            if (req.path !== `/${this.#ADDRESS}`) return res.status(403).end('Access Denied');

            const body = req.body;
            console.log('Hook:', body);

            const ctx = {};
            const eventName = updateType(body);

            if (eventName == null) {
                console.error('Unknown update type.');
                res.status(200).end();
                return;
            }

            await this.update.emit(eventName, body, ctx);

            res.status(200).end();
        });

        this.#app.use((req, res) => {
            res.status(404).end('Not Found');
        });

        this.#app.use((err, req, res, _) => {
            console.error(err);
            res.status(500).end('Internal Server Error');
        });
    }

    async start({baseUrl, path = crypto.randomBytes(64).toString('hex'), listenPort = 3000, resetWebhook = true}) {
        this.#ADDRESS = path;

        return await new Promise((res, rej) => {
            this.#app.listen(listenPort, async () => {
                console.log(`Listening at ${listenPort}`);

                if (resetWebhook) {
                    try {
                        const {ok, result, description} = await this.setWebhook({url: `${baseUrl}/${this.#ADDRESS}`});
                        if (ok === true && result === true)
                            res(description);
                        else
                            rej(`Failed to set webhook\n${description}`);
                    } catch (e) {
                        rej(`Failed to set webhook\n${e}`);
                    }
                    return;
                }
                res();
            });
        });
    }
}

module.exports = {BotServer};