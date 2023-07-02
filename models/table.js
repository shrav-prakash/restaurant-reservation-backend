const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tableSchema = new Schema({
    date: {
        type: Date,
        required: true,
        unique: false
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
        unqiue: false
    },
    slots: {
        type: Object,
        required: true
    }
});

tableSchema.index({ date: 1, index: 1 }, { unique: true })

module.exports = mongoose.model('Table', tableSchema)
