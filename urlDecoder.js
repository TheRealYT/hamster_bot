function urlSafeDecode(urlencoded) {
    try {
        urlencoded = urlencoded.replace(/\+/g, '%20');
        return decodeURIComponent(urlencoded);
    } catch (e) {
        return urlencoded;
    }
}

function urlParseQueryString(queryString) {
    let params = {};
    if (!queryString.length) {
        return params;
    }
    let queryStringParams = queryString.split('&');
    let i, param, paramName, paramValue;
    for (i = 0; i < queryStringParams.length; i++) {
        param = queryStringParams[i].split('=');
        paramName = urlSafeDecode(param[0]);
        paramValue = param[1] == null ? null : urlSafeDecode(param[1]);
        params[paramName] = paramValue;
    }
    return params;
}

function urlParseHashParams(locationHash) {
    locationHash = locationHash.replace(/^#/, '');
    let params = {};
    if (!locationHash.length) {
        return params;
    }
    if (locationHash.indexOf('=') < 0 && locationHash.indexOf('?') < 0) {
        params._path = urlSafeDecode(locationHash);
        return params;
    }
    let qIndex = locationHash.indexOf('?');
    if (qIndex >= 0) {
        let pathParam = locationHash.substr(0, qIndex);
        params._path = urlSafeDecode(pathParam);
        locationHash = locationHash.substr(qIndex + 1);
    }
    let query_params = urlParseQueryString(locationHash);
    for (let k in query_params) {
        params[k] = query_params[k];
    }
    return params;
}

module.exports = {
    urlParseHashParams,
};