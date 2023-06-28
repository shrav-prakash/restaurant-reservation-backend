const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const tableSchema = new Schema({
    num_seats: {
        type: Number,
        required: true
    },
    cost: {
        type: Number,
        required: true
    }
});

module.exports = mongoose.model('Table', tableSchema)