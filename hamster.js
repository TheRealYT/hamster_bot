const {chromeV} = require('./fingerprint');

const GAMES = {
    BIKE: {
        promoId: '43e35910-c168-4634-ad4f-52fd764a843f',
    },
    CLONE: {
        promoId: 'fe693b26-b342-4159-8808-15e3ff7f8767',
    },
    CUBE: {
        promoId: 'b4170868-cef0-424f-8eb9-be0622e8e8e3',
    },
    TRAIN: {
        promoId: 'c4480ac7-e178-4973-8061-9ed5b2e17954',
    },
    MERGE: {
        promoId: 'dc128d28-c45b-411c-98ff-ac7726fbaea4',
    },
};

class HamsterUser {
    authToken = '';

    account = {};
    config = {};
    syncData = {};
    updates = {};
    games = {};

    constructor(authToken) {
        this.authToken = authToken;
    }

    async init() {
        this.account = await this.getAccount();
        this.config = await this.getConfig();
        this.syncData = await this.getSyncData();
        this.updates = await this.getUpdates();
        this.games = await this.getGames();
    }

    static mark(v) {
        return v === true ? '✅' : '❌';
    }

    static cipherDecode(e) {
        const t = `${e.slice(0, 3)}${e.slice(4)}`;
        return atob(t);
    }

    getKeysCount(gameName) {
        const state = {keys: 0, max: 0};

        if (!(gameName in GAMES))
            return null;

        const game = GAMES[gameName];

        const promo = this.games.promos.find(p => p.promoId === game.promoId);

        if (promo !== undefined)
            state.max = promo.keysPerDay;

        const gState = this.games.states.find(p => p.promoId === game.promoId);

        if (gState !== undefined)
            state.keys = gState.receiveKeysToday;

        return state;
    }

    getPromoSummary() {
        const store = {};

        for (const promo of this.games.promos) {
            store[promo.promoId] = {
                title: promo.title.en,
                keys: 0,
                max: promo.keysPerDay,
            };
        }

        let time = null;

        for (const state of this.games.states) {
            if (state.promoId in store) {
                store[state.promoId].keys = state.receiveKeysToday;
                if (time == null)
                    time = state.receiveKeysRefreshSec;
            }
        }

        let str = '';

        for (const game of Object.values(store))
            str += `🔑 ${game.keys} / ${game.max}  🎮 ${game.title}\n`;

        if (typeof time == 'number')
            str += `\nGame Time: ${this.formatSeconds(time)}\n`;

        return str;
    }

    getSummary() {
        const dailyReward = this.syncData.clickerUser.tasks.streak_days_special;
        const dailyCipher = this.config.dailyCipher;
        const combos = this.getCombos();

        return this.getUser()
            + `\n\n${HamsterUser.mark(this.isRewardClaimed())} 1️⃣ Daily Reward (${this.formatSeconds(this.nextReward())}) - Day ${dailyReward?.days ?? 0}D, ${dailyReward?.weeks ?? 0}W\n`
            + `${HamsterUser.mark(this.isCipherClaimed())} 2️⃣ Daily Cipher (${this.formatSeconds(this.nextCipher())}) - ${HamsterUser.cipherDecode(dailyCipher.cipher)}\n`
            + `${HamsterUser.mark(this.isComboClaimed())} 3️⃣ Daily Combo (${this.formatSeconds(this.nextCombo())})${combos.length > 0 ? '\n' : ''}       ${combos.map((v, i) => `${i + 1}. ${v}`).join('\n       ')}\n`
            + `${HamsterUser.mark(this.isMiniGameClaimed())} 4️⃣ Mini Game (${this.formatSeconds(this.nextMiniGame())})`;
    }

    getUsernames() {
        return Array.from(this.account.accountInfo.telegramUsers).map(u => `${u.firstName} @${u.username}`).join('');
    }

    getUser() {
        const level = this.syncData.clickerUser.level;
        const profit = new Intl.NumberFormat().format(this.syncData.clickerUser.earnPassivePerHour);
        const coin = new Intl.NumberFormat().format(Math.round(this.syncData.clickerUser.balanceCoins));

        return `${Array.from(this.account.accountInfo.telegramUsers).map(u => `😊 ${u.firstName} @${u.username}`).join('\n')}\n`
            + `💰${coin}   🤵 Level ${level}\n`
            + `🪙 +${profit}(hr)  🔑 ${this.getKeys()}`;
    }

    getCombos() {
        return this.updates.dailyCombo.upgradeIds;
    }

    getKeys() {
        return this.syncData.clickerUser.balanceKeys;
    }

    formatSeconds(seconds) {
        const pad = (num) => num.toString().padStart(2, '0');

        return `${pad(Math.floor(seconds / 3600))}:${pad(Math.round((seconds % 3600) / 60))}`;
    }

    nextMiniGame() {
        return this.config.dailyKeysMiniGames?.Candles?.remainSeconds ?? 0;
    }

    nextCombo() {
        return this.updates.dailyCombo.remainSeconds;
    }

    nextCipher() {
        return this.config.dailyCipher.remainSeconds;
    }

    nextReward() {
        const now = new Date();
        const zeroDay = new Date(0);
        const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), zeroDay.getHours() - zeroDay.getUTCHours()).getTime();
        const tomorrow = new Date(today + (24 * 3600 * 1000)).getTime();

        const number = Math.round((tomorrow - now.getTime()) / 1000);
        return number > 0 ? number : 0;
    }

    isMiniGameClaimed() {
        return this.config.dailyKeysMiniGames?.Candles?.isClaimed ?? true;
    }

    isComboClaimed() {
        return this.updates.dailyCombo.isClaimed;
    }

    isCipherClaimed() {
        return this.config.dailyCipher.isClaimed;
    }

    isRewardClaimed() {
        const now = new Date();
        const today = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3);
        const date = new Date(this.syncData.clickerUser.tasks.streak_days_special?.completedAt);
        return date.getTime() >= today.getTime();
    }

    async claimDailyReward() {
        if (this.isRewardClaimed())
            return true;

        const data = await (await this.req('clicker/check-task', '{"taskId":"streak_days_special"}', {
            'accept': 'application/json',
            'content-type': 'application/json',
        })).json();

        this.syncData.clickerUser = data.clickerUser;
        this.syncData.clickerUser.tasks.streak_days_special = data.task;

        return true;
    }

    async claimDailyCipher() {
        if (this.isCipherClaimed())
            return true;

        const data = await (await this.req('clicker/claim-daily-cipher', JSON.stringify({
            cipher: this.getCipher(),
        }), {
            'accept': 'application/json',
            'content-type': 'application/json',
        })).json();

        this.syncData.clickerUser = data.clickerUser;
        this.config.dailyCipher = data.dailyCipher;

        return true;
    }

    async claimDailyCombo() {
        if (this.isComboClaimed())
            return true;

        const data = await (await this.req('clicker/claim-daily-combo')).json();

        this.syncData.clickerUser = data.clickerUser;
        this.updates.dailyCombo = data.dailyCombo;
    }

    async claimMiniGame(cipherFunc) {
        if (this.isMiniGameClaimed())
            return true;

        if (typeof cipherFunc != 'function')
            throw new Error('Expected cipher function');

        const miniGameId = this.config.dailyKeysMiniGames.Candles.id;

        await this.req('clicker/start-keys-minigame', JSON.stringify({
            miniGameId,
        }), {
            'accept': 'application/json',
            'content-type': 'application/json',
        });

        const cipher = await cipherFunc();
        const sig = '5dTLCZxh4IgRhMl2v3Baf0y8JA9mcA+FcToNUGwLm4Q=';
        const score = '3449923200';

        const data = await (await this.req('clicker/claim-daily-keys-minigame', JSON.stringify({
            cipher: btoa(cipher + '|' + this.getId() + '|' + miniGameId + '|' + score + '|' + sig),
            miniGameId,
        }), {
            'accept': 'application/json',
            'content-type': 'application/json',
        })).json();

        this.config.dailyKeysMiniGames = data.dailyKeysMiniGames;

        return true;
    }

    getId() {
        return this.account.accountInfo.id;
    }

    async applyPromo(promoCode) {
        if (typeof promoCode != 'string')
            throw new Error('Invalid promo code');

        const data = await (await this.req('clicker/apply-promo', JSON.stringify({
            promoCode,
        }), {
            'accept': 'application/json',
            'content-type': 'application/json',
        })).json();

        this.syncData.clickerUser = data.clickerUser;
        const index = this.games.states.findIndex(s => s.promoId === data.promoState.promoId);

        if (index !== -1) {
            this.games.states[index] = data.promoState;
            return data.promoState.receiveKeysToday;
        }

        return null;
    }

    async buyUpdate(updateId) {
        if (typeof updateId != 'string')
            throw new Error('Invalid update id');

        const data = await (await this.req('clicker/buy-upgrade', JSON.stringify({
            'upgradeId': updateId, 'timestamp': Date.now(),
        }), {
            'accept': 'application/json',
            'content-type': 'application/json',
        })).json();

        this.syncData.clickerUser = data.clickerUser;
        this.updates.dailyCombo = data.dailyCombo;
        this.updates.upgradesForBuy = data.upgradesForBuy;

        return true;
    }

    getUpdateWithCondition(updateId) {
        const all = Array.from(this.updates.upgradesForBuy);
        const tree = [];

        let update = all.find(v => v.id.toLowerCase() === updateId.toLowerCase() || v.id.toLowerCase().includes(updateId.toLowerCase()) || v.name.toLowerCase().includes(updateId.toLowerCase()));
        while (update != null) {
            update.level = this.syncData.clickerUser.upgrades?.[update.id]?.level ?? update.level;
            tree.push(update);

            if (update.condition == null || update.condition._type !== 'ByUpgrade')
                break;

            const newUpdate = all.find(v => v.id === update.condition.upgradeId);
            newUpdate.level = this.syncData.clickerUser.upgrades?.[newUpdate.id]?.level ?? newUpdate.level;

            if (newUpdate.level >= update.condition.level)
                break;

            newUpdate.levelUp = update.condition.level;
            update = newUpdate;
        }

        return tree;
    }

    getAllUpdates() {
        return Array.from(this.updates.upgradesForBuy);
    }

    getCipher() {
        return HamsterUser.cipherDecode(this.config.dailyCipher.cipher);
    }

    async req(url, body = null, overrideHeaders = {}) {
        const v = chromeV();
        const headers = {
            'accept': '*/*',
            'accept-language': 'en-US,en;q=0.9',
            'authorization': `Bearer ${this.authToken}`,
            'cache-control': 'no-cache',
            'content-type': '',
            'pragma': 'no-cache',
            'priority': 'u=1, i',
            'sec-ch-ua': `"Not/A)Brand";v="8", "Chromium";v="${v}", "Android WebView";v="${v}"`,
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'x-requested-with': 'org.telegram.messenger',
            'Referer': 'https://hamsterkombatgame.io/',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            ...overrideHeaders,
        };

        if (!('content-type' in overrideHeaders))
            delete headers['content-type'];

        const res = await fetch(`https://api.hamsterkombatgame.io/${url}`, {
            headers,
            body,
            'method': 'POST',
        });

        if (!res.ok)
            throw new Error((await res.json())?.error_message);

        return res;
    }

    async getAccount() {
        return await (await this.req('auth/account-info')).json();
    }

    async getConfig() {
        return await (await this.req('clicker/config')).json();
    }

    async getSyncData() {
        return await (await this.req('clicker/sync')).json();
    }

    async getUpdates() {
        return await (await this.req('clicker/upgrades-for-buy')).json();
    }

    async getGames() {
        return await (await this.req('clicker/get-promos')).json();
    }
}

module.exports = {HamsterUser, GAMES};