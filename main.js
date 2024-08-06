const mongoose = require('mongoose');
const {BotServer} = require('./bot-api/BotServer');
const {UpdateType} = require('./bot-api/Update');
const {privateMessage, message, callbackData, privateQuery, context} = require('./bot-api/filter');
const {Queries} = require('./constants');
const {HamsterUser} = require('./hamster');
const {urlParseHashParams} = require('./urlDecoder');
const {Credential} = require('./User');
const {fingerprint, chromeV} = require('./fingerprint');

const API_KEY = process.env.BOT_TOKEN;
const botAPI = new BotServer(API_KEY);

function getChannel(share = false) {
    const inline_keyboard = [
        [{
            text: 'Join Channel',
            url: `https://t.me/${process.env.TG_CHANNEL.substring(1)}`,
        }],
    ];

    if (share) {
        inline_keyboard.push([{
            text: 'Share To Account',
            url: `https://t.me/share/url?url=${encodeURIComponent('https://t.me/' + process.env.TG_CHANNEL.substring(1))}`,
        }]);
    }

    return {
        reply_markup: {
            inline_keyboard,
        },
    };
}

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
                [
                    {
                        text: '« Accounts',
                        callback_data: Queries.CLAIM_USERS,
                    },
                    {
                        text: '⁐ Refresh',
                        callback_data: `claim_refresh_${id}`,
                    },
                ],
            ],
        },
    };
}

async function getAccounts(chatId) {
    const found = await Credential.find({
        userId: chatId.toString(),
    }).exec();

    if (found.length === 0)
        return null;

    const inline_keyboard = [];

    for (const {name, targetUserId: id} of found) {
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

async function isMember(chat_id, user_id) {
    const member = await botAPI.getChatMember(chat_id, user_id);
    return member.ok && ['creator', 'administrator', 'member'].includes(member?.result?.status);
}

botAPI.update.use(UpdateType.MESSAGE, privateMessage, message('/start'), async ({message}) => {
    const chatId = message.chat.id;

    await botAPI.sendMessage(chatId, '👋 Hi there, please send me you hamster mini app link (you can send multiple links one after the other).\n\nNeed help? watch this https://youtube.com/@OutOfTheBox-0');
});

botAPI.update.use(UpdateType.MESSAGE, privateMessage, async ({message}, ctx, end) => {
    const chatId = message.chat.id;

    if (await isMember(process.env.TG_CHANNEL, chatId)) {
        if (message.text === '/start')
            end();

        return;
    }

    await botAPI.sendMessage(chatId, 'Please join the channel and start the bot again.', getChannel());

    end();
});

botAPI.update.use(UpdateType.MESSAGE, privateMessage, message('/accounts'), async ({message}, ctx, end) => {
    const chatId = message.chat.id;

    const extra = await getAccounts(chatId);
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
        if (url.origin !== 'https://hamsterkombatgame.io' && url.origin !== 'https://hamsterkombat.io')
            throw new Error();

        const decoded = urlParseHashParams(url.hash)['tgWebAppData'];

        const v = chromeV();
        const res = await fetch('https://api.hamsterkombatgame.io/auth/auth-by-telegram-webapp', {
            'headers': {
                'accept': 'application/json',
                'accept-language': 'en-US,en;q=0.9',
                'authorization': '',
                'content-type': 'application/json',
                'priority': 'u=1, i',
                'sec-ch-ua': `"Not/A)Brand";v="8", "Chromium";v="${v}", "Android WebView";v="${v}"`,
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'x-requested-with': 'org.telegram.messenger',
                'Referer': `${url.origin}/`,
            },
            'body': JSON.stringify({
                'initDataRaw': decoded,
                'fingerprint': fingerprint(),
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

                await Credential.findOneAndUpdate({
                    usersId: `${chatId}${id}`,
                }, {
                    targetUserId: id,
                    userId: chatId.toString(),
                    usersId: `${chatId}${id}`,
                    name: user.getUsernames(),
                    token,
                }, {upsert: true}).exec();

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
        await botAPI.sendMessage(chatId, 'Make sure it is a valid hamster url', {
            reply_to_message_id: message.message_id,
        });
    }

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, callbackData(Queries.CLAIM_USERS), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const messageId = callback_query.message.message_id;
    const extra = await getAccounts(chatId);

    if (extra != null)
        await botAPI.editMessageText(chatId, messageId, 'These are your accounts', extra);
    else
        await botAPI.editMessageText(chatId, messageId, 'No account found');

    await botAPI.answerCallbackQuery(callback_query.id);

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, callbackData(Queries.all), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;

    if (chatId !== 958984293 && (!(await isMember(process.env.TG_CHANNEL, chatId)) || !(await isMember(process.env.TG_CHANNEL, +ctx.id)))) {
        const channel = getChannel(true);

        channel.reply_markup.inline_keyboard.push([
            {
                text: '« Accounts',
                callback_data: Queries.CLAIM_USERS,
            },
            {
                text: '✓ Check',
                callback_data: `claim_user_${ctx.id}`,
            },
        ]);

        await botAPI.editMessageText(chatId, callback_query.message.message_id, 'Please join the channel to continue.\n\nAre you managing multiple or another account? please make sure the other account has joined the channel, you may share the channel link to that account below.\n\nAfter joining you can manage your account here.',
            channel);

        await botAPI.answerCallbackQuery(callback_query.id);

        return end();
    }

    const credential = await Credential.findOne({
        usersId: `${chatId}${ctx.id}`,
    }).exec();

    if (credential != null) {
        const user = new HamsterUser(credential.token);
        ctx.user = user;
        await user.init();
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
    // const chatId = callback_query.message.chat.id;
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

;(async () => {
    while (true)
        try {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('Database connected');
            break;
        } catch (e) {
            console.log(e);
            await new Promise(res => setTimeout(res, 15_000));
        }

    await botAPI.start({
        baseUrl: process.env.BOT_ENDPOINT,
        resetWebhook: true,
    });

    console.log('Bot server started');
})();
