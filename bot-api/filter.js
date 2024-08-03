function privateMessage({message}, ctx, next) {
    if (message.from.is_bot === true || message.chat.type !== 'private')
        next();
}

function privateQuery({callback_query}, ctx, next) {
    if (callback_query.from.is_bot === true || callback_query.message.chat.type !== 'private')
        next();
}

function callbackData(filter) {
    return ({callback_query}, ctx, next) => {
        if (Array.isArray(filter)) {
            for (const key of filter) {
                if (callback_query.data === key)
                    return;
            }
        } else if (filter instanceof RegExp) {
            const matches = filter.exec(callback_query.data);
            if (matches != null) {
                Object.assign(ctx, matches.groups);
                return;
            }
        }

        next();
    };
}

function message(text) {
    return ({message}, ctx, next) => {
        if (typeof message?.text != 'string' || message.text.toLowerCase() !== text)
            next();
    };
}

function context(key, value) {
    return (_, ctx, next) => {
        if (key in ctx && ctx[key] === value)
            return;

        next();
    };
}

module.exports = {
    privateMessage,
    privateQuery,
    callbackData,
    message,
    context,
};