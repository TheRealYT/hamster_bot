class BotAPI {
    constructor(token) {
        this.token = token;
    }

    async request(methodName, body = null) {
        const requestInit = {};

        if (body != null) {
            requestInit.method = 'POST';
            requestInit.body = JSON.stringify(body);
            requestInit.headers = {
                'Content-Type': 'application/json',
            };
        }

        const res = await fetch(`https://api.telegram.org/bot${this.token}/${methodName}`, requestInit);
        const resBody = await res.json();

        console.log('Response:', resBody); // #FIXME I/O blocking

        return resBody;
    }

    getMe() {
        return this.request('getMe');
    }

    getUpdates(body) {
        return this.request('getUpdates', body);
    }

    answerCallbackQuery(callback_query_id, extra = {}) {
        return this.request('answerCallbackQuery', {...extra, callback_query_id});
    }

    sendMessage(chat_id, text, extra = {}) {
        return this.request('sendMessage', {...extra, chat_id, text});
    }

    editMessageText(chat_id, message_id, text, extra = {}) {
        return this.request('editMessageText', {...extra, chat_id, message_id, text});
    }

    setWebhook(body) {
        return this.request('setWebhook', body);
    }

    getWebhookInfo() {
        return this.request('getWebhookInfo');
    }

    deleteWebhook(drop_pending_updates = true) {
        return this.request('deleteWebhook', {drop_pending_updates});
    }
}

module.exports = {
    BotAPI,
};