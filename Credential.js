const mongoose = require('mongoose');

const CredentialSchema = new mongoose.Schema({
    targetUserId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    usersId: {
        type: String, // ${userId}${targetUserId}
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        required: true,
    },
}, {timestamps: true});

const Credential = mongoose.model('Credential', CredentialSchema);

module.exports = {
    Credential,
};