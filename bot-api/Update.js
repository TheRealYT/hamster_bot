const UpdateType = {
    MESSAGE: 'message',
    EDITED_MESSAGE: 'edited_message',
    CHANNEL_POST: 'channel_post',
    EDITED_CHANNEL_POST: 'edited_channel_post',
    MESSAGE_REACTION: 'message_reaction',
    MESSAGE_REACTION_COUNT: 'message_reaction_count',
    INLINE_QUERY: 'inline_query',
    CHOSEN_INLINE_RESULT: 'chosen_inline_result',
    CALLBACK_QUERY: 'callback_query',
    SHIPPING_QUERY: 'shipping_query',
    PRE_CHECKOUT_QUERY: 'pre_checkout_query',
    POLL: 'poll',
    POLL_ANSWER: 'poll_answer',
    MY_CHAT_MEMBER: 'my_chat_member',
    CHAT_MEMBER: 'chat_member',
    CHAT_JOIN_REQUEST: 'chat_join_request',
    CHAT_BOOST: 'chat_boost',
    REMOVED_CHAT_BOOST: 'removed_chat_boost',
};

Object.freeze(UpdateType);

function updateType(reqBody) {
    for (const updateName of Object.values(UpdateType)) {
        if (updateName in reqBody) {
            return updateName;
        }
    }
    return null;
}

class UpdateEvent {
    #listeners = {};

    use(...[eventName, ...handlers]) {
        const listeners = this.listeners(eventName);
        listeners.push(handlers);
    }

    async emit(eventName, ...args) {
        const listeners = this.listeners(eventName);
        let stopCallbacks = false;
        let nextCallback = false;

        const end = () => stopCallbacks = true; // end emitting
        const next = () => nextCallback = true; // jump listener lists

        for (const listenerList of listeners) {
            for (let i = 0, n = listenerList.length; i < n; i++) {
                const listener = listenerList[i];

                if (stopCallbacks) return;

                if (nextCallback) {
                    nextCallback = false;
                    break;
                }

                if (i < n - 1)
                    await listener(...args, next, end);
                else
                    await listener(...args, end); // last callback in the list
            }
        }
    }

    listeners(eventName) {
        if (!(eventName in this.#listeners))
            this.#listeners[eventName] = [];

        return this.#listeners[eventName];
    }
}

module.exports = {UpdateType, updateType, UpdateEvent};