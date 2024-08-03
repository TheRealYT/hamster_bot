const {BotServer} = require('./bot-api/BotServer');
const {UpdateType} = require('./bot-api/Update');
const {privateMessage, message, callbackData, privateQuery, context} = require('./bot-api/filter');
const {Queries} = require('./constants');
const {HamsterUser} = require('./hamster');
const {urlParseHashParams} = require('./urlDecoder');

const API_KEY = process.env.BOT_TOKEN;
const botAPI = new BotServer(API_KEY);

const credentials = {};

function getKeyboard(id) {
    return {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: '📅 Claim Daily Reward',
                    callback_data: `claim_reward_${id}`,
                }],
                [{
                    text: '🗝️ Claim Daily Cipher',
                    callback_data: `claim_cipher_${id}`,
                }],
                [{
                    text: '🎴 Claim Daily Combo',
                    callback_data: `claim_combo_${id}`,
                }],
                [{
                    text: '🕹️ Claim Mini Game',
                    callback_data: `claim_game_${id}`,
                }],
                [{
                    text: '⁐ Refresh',
                    callback_data: `claim_refresh_${id}`,
                }],
                [{
                    text: '< Accounts',
                    callback_data: `claim_users_${id}`,
                }],
            ],
        },
    };
}

function getAccounts(chatId) {
    if (chatId in credentials && Object.keys(credentials[chatId]).length > 0) {
        const inline_keyboard = [];

        for (const [id, credential] of Object.entries(credentials[chatId])) {
            const {name} = credential;

            inline_keyboard.push([{
                text: name,
                callback_data: `claim_user_${id}`,
            }]);
        }

        return {
            reply_markup: {
                inline_keyboard,
            },
        };
    }

    return null;
}

botAPI.update.use(UpdateType.MESSAGE, privateMessage, message('/start'), async ({message}, ctx, end) => {
    const chatId = message.chat.id;

    await botAPI.sendMessage(chatId, '👋 Hi there, please send me you hamster mini app link (you can send multiple links one after the other).\n\nNeed help? watch this https://youtube.com');

    end();
});

botAPI.update.use(UpdateType.MESSAGE, privateMessage, message('/accounts'), async ({message}, ctx, end) => {
    const chatId = message.chat.id;

    const extra = getAccounts(chatId);
    if (extra != null)
        await botAPI.sendMessage(chatId, 'These are your accounts', extra);
    else
        await botAPI.sendMessage(chatId, 'No account found');

    end();
});

botAPI.update.use(UpdateType.MESSAGE, privateMessage, async ({message}, ctx, end) => {
    const chatId = message.chat.id;
    try {
        const url = new URL(message.text);
        if (url.origin !== 'https://hamsterkombatgame.io')
            throw new Error();

        const decoded = urlParseHashParams(url.hash)['tgWebAppData'];

        const res = await fetch('https://api.hamsterkombatgame.io/auth/auth-by-telegram-webapp', {
            'headers': {
                'accept': 'application/json',
                'accept-language': 'en-US,en;q=0.9',
                'authorization': '',
                'content-type': 'application/json',
                'priority': 'u=1, i',
                'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Android WebView";v="126"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'x-requested-with': 'org.telegram.messenger',
                'Referer': 'https://hamsterkombatgame.io/',
            },
            'body': JSON.stringify({
                'initDataRaw': decoded,
                'fingerprint': {
                    'version': '4.2.1', 'visitorId': '7d88c4adf7fd1aba1ab0263d71a12a54', 'components': {
                        'fonts': {'value': ['sans-serif-thin'], 'duration': 92},
                        'domBlockers': {'value': [], 'duration': 41},
                        'fontPreferences': {
                            'value': {
                                'default': 145.90625,
                                'apple': 145.90625,
                                'serif': 164.71875,
                                'sans': 145.90625,
                                'mono': 132.625,
                                'min': 72.953125,
                                'system': 145.90625,
                            }, 'duration': 18,
                        },
                        'audio': {'value': 0.00007444995, 'duration': 43},
                        'screenFrame': {'value': [0, 0, 0, 0], 'duration': 3},
                        'canvas': null,
                        'osCpu': {'duration': 0},
                        'languages': {'value': [['en-US']], 'duration': 0},
                        'colorDepth': {'value': 24, 'duration': 1},
                        'deviceMemory': {'value': 4, 'duration': 0},
                        'screenResolution': {'value': [860, 386], 'duration': 0},
                        'hardwareConcurrency': {'value': 8, 'duration': 0},
                        'timezone': {'value': 'Africa/Addis_Ababa', 'duration': 0},
                        'sessionStorage': {'value': true, 'duration': 0},
                        'localStorage': {'value': true, 'duration': 0},
                        'indexedDB': {'value': true, 'duration': 0},
                        'openDatabase': {'value': true, 'duration': 0},
                        'cpuClass': {'duration': 0},
                        'platform': {'value': 'Linux aarch64', 'duration': 0},
                        'plugins': {'value': [], 'duration': 1},
                        'touchSupport': {
                            'value': {'maxTouchPoints': 5, 'touchEvent': true, 'touchStart': true},
                            'duration': 0,
                        },
                        'vendor': {'value': 'Google Inc.', 'duration': 0},
                        'vendorFlavors': {'value': [], 'duration': 1},
                        'cookiesEnabled': {'value': true, 'duration': 10},
                        'colorGamut': {'value': 'srgb', 'duration': 0},
                        'invertedColors': {'duration': 0},
                        'forcedColors': {'value': false, 'duration': 0},
                        'monochrome': {'value': 0, 'duration': 0},
                        'contrast': {'value': 0, 'duration': 0},
                        'reducedMotion': {'value': false, 'duration': 0},
                        'reducedTransparency': {'value': false, 'duration': 0},
                        'hdr': {'value': false, 'duration': 0},
                        'math': {
                            'value': {
                                'acos': 1.4473588658278522,
                                'acosh': 709.889355822726,
                                'acoshPf': 355.291251501643,
                                'asin': 0.12343746096704435,
                                'asinh': 0.881373587019543,
                                'asinhPf': 0.8813735870195429,
                                'atanh': 0.5493061443340548,
                                'atanhPf': 0.5493061443340548,
                                'atan': 0.4636476090008061,
                                'sin': 0.8178819121159085,
                                'sinh': 1.1752011936438014,
                                'sinhPf': 2.534342107873324,
                                'cos': -0.8390715290095377,
                                'cosh': 1.5430806348152437,
                                'coshPf': 1.5430806348152437,
                                'tan': -1.4214488238747245,
                                'tanh': 0.7615941559557649,
                                'tanhPf': 0.7615941559557649,
                                'exp': 2.718281828459045,
                                'expm1': 1.718281828459045,
                                'expm1Pf': 1.718281828459045,
                                'log1p': 2.3978952727983707,
                                'log1pPf': 2.3978952727983707,
                                'powPI': 1.9275814160560204e-50,
                            }, 'duration': 1,
                        },
                        'pdfViewerEnabled': {'value': false, 'duration': 0},
                        'architecture': {'value': 127, 'duration': 0},
                        'applePay': {'value': -1, 'duration': 0},
                        'privateClickMeasurement': {'duration': 0},
                        'webGlBasics': {
                            'value': {
                                'version': 'WebGL 1.0 (OpenGL ES 2.0 Chromium)',
                                'vendor': 'WebKit',
                                'vendorUnmasked': 'Qualcomm',
                                'renderer': 'WebKit WebGL',
                                'rendererUnmasked': 'Adreno (TM) 610',
                                'shadingLanguageVersion': 'WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)',
                            }, 'duration': 25,
                        },
                        'webGlExtensions': null,
                    },
                },
            }),
            'method': 'POST',
        });
        const data = await res.json();
        console.log(data);

        if (res.ok && 'authToken' in data) {
            const token = data.authToken;

            await botAPI.sendMessage(chatId, `Login successful`, {
                reply_to_message_id: message.message_id,
            });

            try {
                const user = new HamsterUser(token);
                await user.init();
                const id = user.getId();

                if (!(chatId in credentials))
                    credentials[chatId] = {};

                credentials[chatId][id] = {token, name: user.getUsernames()};

                const summery = user.getSummary();

                await botAPI.sendMessage(chatId, summery, getKeyboard(id));
            } catch (e) {
                console.error(e);
                await botAPI.sendMessage(chatId, 'Error while generating user summery.\nPlease tell the administrator.');
            }
        } else {
            await botAPI.sendMessage(chatId, 'Sorry, login failed. Check your link.', {
                reply_to_message_id: message.message_id,
            });
        }
    } catch (e) {
        console.error(e);
        await botAPI.sendMessage(chatId, 'Make sure it is a valid url', {
            reply_to_message_id: message.message_id,
        });
    }

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, callbackData(Queries.all), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;

    if (chatId in credentials && ctx.id in credentials[chatId]) {
        const {token} = credentials[chatId][ctx.id];

        const user = new HamsterUser(token);
        await user.init();
        ctx.user = user;

        return;
    }

    await botAPI.answerCallbackQuery(callback_query.id, {
        text: 'No session found for the given user, it may have been expired try sending the link again.',
        show_alert: true,
    });

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'reward'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const user = ctx.user;

    const time = `come back after ${user.formatSeconds(user.nextReward())} (hour:minute).`;
    if (user.isRewardClaimed()) {
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: `Daily reward already claimed, ${time}`,
            show_alert: true,
        });
    } else {
        await user.claimDailyReward();
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: `✅ Daily Reward Claimed, ${time}`,
            show_alert: true,
        });

        await botAPI.editMessageText(chatId, callback_query.message.message_id, user.getSummary(), getKeyboard(user.getId()));
    }

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'cipher'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const user = ctx.user;

    const time = `come back after ${user.formatSeconds(user.nextCipher())} (hour:minute).`;
    if (user.isCipherClaimed()) {
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: `Daily cipher already claimed, ${time}`,
            show_alert: true,
        });
    } else {
        await user.claimDailyCipher();
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: `✅ Daily Cipher Claimed, ${time}`,
            show_alert: true,
        });

        await botAPI.editMessageText(chatId, callback_query.message.message_id, user.getSummary(), getKeyboard(user.getId()));
    }

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'combo'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const user = ctx.user;

    const time = `come back after ${user.formatSeconds(user.nextCombo())} (hour:minute).`;
    if (user.isComboClaimed()) {
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: `Daily combo already claimed, ${time}`,
            show_alert: true,
        });
    } else {
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: ':( Sorry, daily combo claim is not implemented yet',
            show_alert: true,
        });
    }

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'game'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const user = ctx.user;

    const time = `come back after ${user.formatSeconds(user.nextMiniGame())} (hour:minute).`;
    if (user.isMiniGameClaimed()) {
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: `Daily mini game already played, ${time}`,
            show_alert: true,
        });
    } else {
        await user.claimMiniGame(async () => {
            await new Promise(res => setTimeout(res, Math.round(15_000 * Math.random())));
            return `0${Math.random() * (399999999 - 200000000) + 200000000}`;
        });
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: `✅ Daily Key Claimed, ${time}`,
            show_alert: true,
        });

        await botAPI.editMessageText(chatId, callback_query.message.message_id, user.getSummary(), getKeyboard(user.getId()));
    }

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'refresh'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const user = ctx.user;

    await botAPI.answerCallbackQuery(callback_query.id);
    await botAPI.editMessageText(chatId, callback_query.message.message_id, user.getSummary(), getKeyboard(user.getId()));

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'user'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const user = ctx.user;

    await botAPI.editMessageText(chatId, callback_query.message.message_id, user.getSummary(), getKeyboard(user.getId()));
    await botAPI.answerCallbackQuery(callback_query.id);

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'users'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const messageId = callback_query.message.message_id;
    const extra = getAccounts(chatId);

    if (extra != null)
        await botAPI.editMessageText(chatId, messageId, 'These are your accounts', extra);
    else
        await botAPI.editMessageText(chatId, messageId, 'No account found');

    await botAPI.answerCallbackQuery(callback_query.id);

    end();
});

botAPI.start({
    baseUrl: process.env.BOT_ENDPOINT,
    resetWebhook: true,
})
    .then(console.log)
    .catch(console.error);
