const ClaimQueries = {
    CLAIM_REWARD: 'reward',
    CLAIM_CIPHER: 'cipher',
    CLAIM_COMBO: 'combo',
    CLAIM_GAME: 'game',
    CLAIM_REFRESH: 'refresh',
    CLAIM_USER: 'user',
    CLAIM_USERS: 'users',
    all: /^claim_(?<claim>reward|cipher|combo|game|refresh|user|users)_(?<id>[0-9]+)$/,
};

module.exports = {Queries: ClaimQueries};