const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tableSchema = new Schema({
    date: {
        type: Date,
        required: true
    },
    num_seats: {
        type: Number,
        required: true
    },
    cost: {
        type: Number,
        required: true
    },
    index: {
        type: Number,
        required: true,
        unique: true,
        dropDups: true
    },
    slots: [{ time: { type: String, required: true }, isAvailable: { type: Boolean, required: true } }]
});

module.exports = mongoose.model('Table', tableSchema)
