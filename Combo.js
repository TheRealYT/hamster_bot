const mongoose = require('mongoose');

const ComboSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        default: 'combo',
    },
    upgradeIds: {
        type: [String],
        required: true,
        default: [],
    },
    date: {
        type: Date,
        required: true,
    },
}, {timestamps: true});

const Combo = mongoose.model('Combo', ComboSchema);

module.exports = {
    Combo,
};