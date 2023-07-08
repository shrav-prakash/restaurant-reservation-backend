const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tableSchema = new Schema({
    date: {
        type: Date,
        required: true,
        unique: false
    },
    location: {
        type: String,
        required: true
    },
    seatCost: {
        type: Number,
        required: true
    },
    slots: {
        type: Object,
        required: true
    }
});

tableSchema.index({ date: 1, location: 1 }, { unique: true })

module.exports = mongoose.model('New-Table', tableSchema)
