const mongoose = require('mongoose');
const {BotServer} = require('./bot-api/BotServer');
const {UpdateType} = require('./bot-api/Update');
const {privateMessage, message, callbackData, privateQuery, context} = require('./bot-api/filter');
const {Queries} = require('./constants');
const {HamsterUser, GAMES} = require('./hamster');
const {urlParseHashParams} = require('./urlDecoder');
const {Credential} = require('./Credential');
const {fingerprint, chromeV} = require('./fingerprint');
const {Combo} = require('./Combo');
const {Promo} = require('./Promo');
const {Promise} = require('mongoose');

const CreatorID = 958984293;

const API_KEY = process.env.BOT_TOKEN;
const botAPI = new BotServer(API_KEY);

const accounts = new Map();

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
                    text: '🔓 Claim Daily Cipher',
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
                    text: '🔑 Claim Keys',
                    callback_data: `claim_keys_${id}`,
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

function cleanAccounts(chatId) {
    accounts.delete(chatId);
}

async function getAccounts(chatId, callBackData = (id) => `claim_user_${id}`, text = (name) => name) {
    if (!accounts.has(chatId)) {
        const lists = await Credential.find({
            userId: chatId.toString(),
        }).exec();

        accounts.set(chatId, lists.map(v => ({name: v.name, id: v.targetUserId})));
    }

    const found = accounts.get(chatId);

    if (found.length === 0)
        return null;

    const inline_keyboard = [];

    for (const {name, id} of found) {
        inline_keyboard.push([{
            text: text(name),
            callback_data: callBackData(id),
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

function getComboTime(nextComboMs) {
    return new Date(Date.now() + nextComboMs);
}

async function updateCombos(upgradeIds = [], nextComboMs) {
    if (upgradeIds.length < 1 || upgradeIds.length > 3)
        return;

    const combo = await Combo.findOne({name: 'combo'}).exec();
    if (combo == null) {
        await new Combo({upgradeIds, date: getComboTime(nextComboMs)}).save();
        return;
    }

    if (combo.date <= new Date()) {
        combo.date = getComboTime(nextComboMs);
        combo.upgradeIds = upgradeIds;
        await combo.save();
        return;
    }

    const newCombos = [];

    for (const upgradeId of upgradeIds)
        if (!combo.upgradeIds.includes(upgradeId))
            newCombos.push(upgradeId);

    if (newCombos.length > 0) {
        combo.upgradeIds.push(...newCombos);
        await combo.save();
    }
}

async function getCombos(user) {
    const combo = (await Combo.findOne({name: 'combo', date: {$gt: new Date()}}).exec())?.upgradeIds ?? [];
    if (combo.length === 0)
        return [];

    return combo
        .map(c => user.getUpdateWithCondition(c, true))
        .filter(v => v.length > 0 && !(v.length === 1 && user.getCombos().includes(v[0].id)));
}

async function buyUpdates(updates, user) {
    let str = '';
    for (const update of updates)
        for (const combo of update.toReversed()) {
            while (true) {
                try {
                    await user.buyUpdate(combo.id);
                    combo.level++;

                    str += `✅ Level up ${combo.level}/${combo.levelUp ?? '-'} ${combo.name}\n`;

                    if (!combo.levelUp || combo.level >= combo.levelUp)
                        break;

                    if (typeof combo.totalCooldownSeconds == 'number') {
                        const timeout = combo.totalCooldownSeconds;

                        str += `⌚ Buy "${combo.name}" after ${user.formatSeconds(timeout)}(hour:minute)\n`;
                        break;
                    } else {
                        await new Promise(res => setTimeout(res, 1000));
                    }
                } catch (e) {
                    str += `❌ ${combo.name} - error ${typeof e?.message == 'string' ? e.message : 'can\'t buy'}\n`;
                    break;
                }
            }
            str += '\n\n';
        }
    return str;
}

async function sendOtherJoin(id, chatId, message_id) {
    const channel = getChannel(true);

    channel.reply_markup.inline_keyboard.push([
        {
            text: '« Accounts',
            callback_data: Queries.CLAIM_USERS,
        },
        {
            text: '✓ Check',
            callback_data: `claim_user_${id}`,
        },
    ]);

    const text = 'Please join the channel to continue.\n\nAre you managing multiple or another account? please make sure the other account has joined the channel, you may share the channel link to that account below.\n\nAfter joining you can manage your account here.';

    if (typeof message_id == 'number')
        await botAPI.editMessageText(chatId, message_id, text, channel);
    else
        await botAPI.sendMessage(chatId, text, channel);
}

function getUserSummery(user) {
    return user.getSummary() + '\n\n' + user.getPromoSummary();
}

const memo = (() => {
    const users = new Map();

    return {
        async getUser(chatId, id) {
            const usersId = `${chatId}${id}`;

            if (!users.has(usersId)) {
                const credential = await Credential.findOne({
                    usersId,
                }).exec();

                const user = new HamsterUser(credential.token);
                await user.init();

                users.set(usersId, user);
            }

            return users.get(usersId);
        },
        setUser(chatId, id, user) {
            const usersId = `${chatId}${id}`;
            users.set(usersId, user);
        },
    };
})();

botAPI.update.use(UpdateType.MESSAGE, privateMessage, message('/start'), async ({message}) => {
    const chatId = message.chat.id;

    await botAPI.sendMessage(chatId, '👋 Hi there, please send me your hamster mini app link. You can also send more links of different accounts one after the other.\n\nNeed help? watch this https://youtube.com/@OutOfTheBox-0', {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: 'Get The Link (Hamster)',
                    url: 'https://t.me/hamster_kOmbat_bot/start?startapp=kentId1563879420',
                }]],
        },
    });
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

botAPI.update.use(UpdateType.MESSAGE, privateMessage, async ({message}, ctx, end) => {
    const chatId = message.chat.id;

    if (message.text?.startsWith('/combo')) {
        const texts = message.text
            .split('/combo')[1]
            .split(',')
            .map(t => t.trim())
            .filter(t => t.length > 0);

        if (texts.length > 0) {
            const extra = await getAccounts(chatId, (id) => `combo_buy_${id}`, (name) => `🎴 ${name}`);

            if (extra != null) {
                await botAPI.sendMessage(chatId, `Select account to buy updates\n 🎴 ${texts.join('\n 🎴 ')}`, extra);
            } else
                await botAPI.sendMessage(chatId, 'Please add account to buy combo updates');
        } else {
            await botAPI.sendMessage(chatId, 'Send combos comma separated.\n\nExample /combo hamster youtube, usdt on, hamster green');
        }

        end();
    }
});

const pattern = /(BIKE|CLONE|CUBE|TRAIN)-[0-9A-Z]{3}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{3}/gm;
const singleExp = /^(BIKE|CLONE|CUBE|TRAIN)-[0-9A-Z]{3}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{3}$/;
const promoExp = /^promo_(?<id>[0-9]+)_(?<promoCode>(BIKE|CLONE|CUBE|TRAIN)-[0-9A-Z]{3}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{3})$/;

botAPI.update.use(UpdateType.MESSAGE, privateMessage, async ({message}, ctx, end) => {
    const chatId = message.chat.id;
    const promoCodes = new Set();

    if (chatId === CreatorID) {
        let matches = null;
        while (matches = pattern.exec(message.text)) {
            promoCodes.add(matches[0]);
        }

        if (promoCodes.size > 1 || message.text?.startsWith('+')) {
            try {
                await Promo.create(Array.from(promoCodes).map(code => ({code, ownerId: chatId})));
                await botAPI.sendMessage(chatId, 'Promo codes added');
            } catch (e) {
                console.error(e);
                await botAPI.sendMessage(chatId, 'An error occurred, a key may exist');
            }
            return end();
        }
    } else if (singleExp.test(message.text)) {
        promoCodes.add(message.text);
    }

    if (promoCodes.size === 1) {
        const promoCode = promoCodes.values().next().value;
        const extra = await getAccounts(chatId, (id) => `promo_${id}_${promoCode}`, (name) => `🔑 ${name}`);

        if (extra != null)
            await botAPI.sendMessage(chatId, `Select account to apply "${promoCode}"\nDO NOT CLICK MORE THAN ONCE`, extra);
        else
            await botAPI.sendMessage(chatId, 'Please add account to apply promo codes');

        end();
    }
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

                memo.setUser(chatId, id, user);
                cleanAccounts(chatId);

                if (chatId !== CreatorID && id !== chatId && !await isMember(process.env.TG_CHANNEL, id)) {
                    await sendOtherJoin(id, chatId);
                } else {
                    const summery = getUserSummery(user);
                    await botAPI.sendMessage(chatId, summery, getKeyboard(id));
                }
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
        await botAPI.sendMessage(chatId, 'Make sure it is a valid hamster url or a valid promo code.', {
            reply_to_message_id: message.message_id,
        });
    }

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, callbackData(/^combo_buy_(?<id>[0-9]+)(?<confirm>yes|no|)$/), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const messageId = callback_query.message.message_id;
    const confirm = ctx.confirm === 'yes' ? true : (ctx.confirm === 'no' ? false : null);

    const combos = (() => {
        const pattern = confirm != null ? /🎴 .*\((.*)\)/gm : /🎴 (.*)/gm;
        const texts = [];
        let matches = null;

        while (matches = pattern.exec(callback_query.message.text))
            texts.push(matches[1]);

        return texts;
    })();

    if (combos.length > 0) {
        const user = await memo.getUser(chatId, ctx.id);
        if (user != null) {
            const updates = combos
                .map(c => user.getUpdateWithCondition(c, true))
                .filter(v => v.length > 0);

            if (confirm === true) {
                let str = await buyUpdates(updates, user);

                await botAPI.editMessageText(chatId, callback_query.message.message_id, str, {
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '« Account',
                                callback_data: `claim_user_${ctx.id}`,
                            },
                        ]],
                    },
                });
            } else if (confirm === false) {
                const extra = await getAccounts(chatId, (id) => `combo_buy_${id}`, (name) => `🎴 ${name}`);

                if (extra != null) {
                    await botAPI.editMessageText(chatId, messageId, `Select account to buy updates\n 🎴 ${updates.map(u => u[0].name).join('\n 🎴 ')}`, extra);
                } else {
                    await botAPI.editMessageText(chatId, messageId, 'Please add account to buy combo updates');
                }
            } else {
                let str = '';

                for (let i1 = 0; i1 < updates.length; i1++) {
                    const update = updates[i1];
                    for (let i = 0; i < update.length; i++) {
                        const combo = update[i];
                        const format = new Intl.NumberFormat().format;

                        const price = format(combo.price);
                        const profit = format(combo.profitPerHourDelta);

                        const t = i > 0 ? '  ' : '';
                        str += `${i === 0 ? '🎴 ' : ''}${t}${combo.name}(${combo.id})\n${t}Level ${combo.level}    💰${price}   🪙+${profit}\n${HamsterUser.mark(combo.isAvailable && !combo.isExpired)} Available\n\n`;

                        if (i > 0) str += `\n\n`;
                    }
                }

                await botAPI.editMessageText(chatId, callback_query.message.message_id, str, {
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '« Choose',
                                callback_data: `combo_buy_${ctx.id}no`,
                            },
                            {
                                text: '✓ Confirm Buy',
                                callback_data: `combo_buy_${ctx.id}yes`,
                            },
                        ]],
                    },
                });
            }
        } else {
            await botAPI.editMessageText(chatId, messageId, '❌ Account not found');
        }
    } else {
        await botAPI.editMessageText(chatId, messageId, '❌ No combos were specified, please use /combo command first');
    }

    await botAPI.answerCallbackQuery(callback_query.id);

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, callbackData(promoExp), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const messageId = callback_query.message.message_id;
    const user = await memo.getUser(chatId, ctx.id);

    if (user != null) {
        try {
            const keys = await user.applyPromo(ctx.promoCode);
            await botAPI.editMessageText(chatId, messageId, `🔑 Promo code applied${keys != null ? ' ↑' + keys.toString() : ''}`);
        } catch (e) {
            await botAPI.editMessageText(chatId, messageId, `❌ ${typeof e?.message == 'string' ? e.message : 'Promo code failed'}`);
        }
    } else {
        await botAPI.editMessageText(chatId, messageId, '❌ Account not found');
    }

    await botAPI.answerCallbackQuery(callback_query.id);

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

    if (chatId !== CreatorID && (!(await isMember(process.env.TG_CHANNEL, chatId)) || !(await isMember(process.env.TG_CHANNEL, +ctx.id)))) {
        await sendOtherJoin(ctx.id, chatId, callback_query.message.message_id);

        await botAPI.answerCallbackQuery(callback_query.id);

        return end();
    }

    const user = await memo.getUser(chatId, ctx.id);

    if (user != null) {
        ctx.user = user;
        await updateCombos(user.getCombos(), user.nextCombo() * 1000);
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

        await botAPI.editMessageText(chatId, callback_query.message.message_id, getUserSummery(user), getKeyboard(user.getId()));
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

        await botAPI.editMessageText(chatId, callback_query.message.message_id, getUserSummery(user), getKeyboard(user.getId()));
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
    } else if (user.getCombos().length === 3) {
        await user.claimDailyCombo();
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: `✅ Daily Combo Claimed, ${time}`,
            show_alert: true,
        });

        await botAPI.editMessageText(chatId, callback_query.message.message_id, getUserSummery(user), getKeyboard(user.getId()));
    } else {
        const combo = await getCombos(user);

        if (combo.length === 0)
            await botAPI.answerCallbackQuery(callback_query.id, {
                text: `We are still searching for today's combos, you have ${user.getCombos().length} combo(s).`,
                show_alert: true,
            });
        else {
            const num = ['1️⃣', '2️⃣', '3️⃣'];
            let str = '';

            for (let i1 = 0; i1 < combo.length; i1++) {
                const update = combo[i1];
                for (let i = 0; i < update.length; i++) {
                    const combo = update[i];
                    const format = new Intl.NumberFormat().format;

                    const price = format(combo.price);
                    const profit = format(combo.profitPerHourDelta);

                    const t = i > 0 ? '  ' : '';
                    str += `${i === 0 ? num.at(i1) ?? '' : ''}${t}${combo.name}(${combo.id})\n${t}Level ${combo.level}    💰${price}   🪙+${profit}\n${HamsterUser.mark(combo.isAvailable && !combo.isExpired)} Available\n\n`;

                    if (i > 0) str += `${t}To Level ${combo.levelUp}\n\n`;
                }
            }

            await botAPI.editMessageText(chatId, callback_query.message.message_id, str, {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '« Account',
                            callback_data: `claim_user_${ctx.id}`,
                        },
                        {
                            text: '✓ Confirm Buy',
                            callback_data: `claim_buy_${ctx.id}`,
                        },
                    ]],
                },
            });
            await botAPI.answerCallbackQuery(callback_query.id);
        }
    }

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'buy'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const user = ctx.user;
    const updates = await getCombos(user);

    if (updates.length === 0)
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: `No combo found, we are still searching for today's combos.`,
            show_alert: true,
        });
    else {
        let str = await buyUpdates(updates, user);

        if (user.getCombos().length === 3)
            await user.claimDailyCombo();

        await botAPI.editMessageText(chatId, callback_query.message.message_id, str, {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: '« Account',
                        callback_data: `claim_user_${ctx.id}`,
                    },
                ]],
            },
        });
        await botAPI.answerCallbackQuery(callback_query.id);
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
        try {
            await user.claimMiniGame(async () => {
                await new Promise(res => setTimeout(res, Math.round(15_000 * Math.random())));
                return `0${Math.random() * (999999999 - 800000000) + 800000000}`;
            });
            await botAPI.answerCallbackQuery(callback_query.id, {
                text: `✅ Daily Key Claimed, ${time}`,
                show_alert: true,
            });
        } catch (e) {
            await botAPI.answerCallbackQuery(callback_query.id, {
                text: `❌ Mini Game failed, play it manually. ${typeof e?.message == 'string' ? e.message : ''}`,
                show_alert: true,
            });
        }

        await botAPI.editMessageText(chatId, callback_query.message.message_id, getUserSummery(user), getKeyboard(user.getId()));
    }

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'refresh'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const user = ctx.user;
    await user.init();

    await botAPI.answerCallbackQuery(callback_query.id);
    await botAPI.editMessageText(chatId, callback_query.message.message_id, getUserSummery(user), getKeyboard(user.getId()));

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'user'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const user = ctx.user;

    await botAPI.editMessageText(chatId, callback_query.message.message_id, getUserSummery(user), getKeyboard(user.getId()));
    await botAPI.answerCallbackQuery(callback_query.id);

    end();
});

botAPI.update.use(UpdateType.CALLBACK_QUERY, privateQuery, context('claim', 'keys'), async ({callback_query}, ctx, end) => {
    const chatId = callback_query.message.chat.id;
    const user = ctx.user;

    const games = Object
        .keys(GAMES)
        .map(name => ({name, ...user.getKeysCount(name)}))
        .filter(g => g.keys < g.max);

    if (games.length > 0) {
        const map = games.map(async g => (await Promo.find({
            ownerId: chatId,
            code: {$regex: '^' + g.name},
            used: false,
        }).limit(g.max - g.keys).exec()).map(({code}) => code));

        const promoKeys = (await global.Promise.all(map)).flat();

        if (promoKeys.length > 0) {
            let cnt = 0;
            for (const key of promoKeys) {
                try {
                    await user.applyPromo(key);
                    cnt++;
                    try {
                        await Promo.deleteOne({code: key});
                    } catch (e) {
                    }
                } catch (e) {
                    try {
                        await Promo.findOneAndUpdate({code: key}, {used: true});
                    } catch (e) {
                    }
                }
            }

            await botAPI.answerCallbackQuery(callback_query.id, {
                text: promoKeys.join(`🔑 ${cnt} keys applied!`),
                show_alert: true,
            });

            await botAPI.editMessageText(chatId, callback_query.message.message_id, getUserSummery(user), getKeyboard(user.getId()));
        } else {
            await botAPI.answerCallbackQuery(callback_query.id, {
                text: 'Sorry :( you have no promo code or key.',
                show_alert: true,
            });
        }
    } else {
        await botAPI.answerCallbackQuery(callback_query.id, {
            text: 'Game not found, you may have all keys for today.',
            show_alert: true,
        });
    }

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
