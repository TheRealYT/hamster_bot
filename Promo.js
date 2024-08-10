const mongoose = require('mongoose');

const PromoSchema = new mongoose.Schema({
    ownerId: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
        unique: true,
    },
    used: {
        type: Boolean,
        required: true,
        default: false,
    },
}, {timestamps: true});

const Promo = mongoose.model('Promo', PromoSchema);

module.exports = {
    Promo,
};