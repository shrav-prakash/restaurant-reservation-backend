const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const resSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    tables: {
        type: [Number],
        ref: 'tables',
        reqired: true
    },
    timeslot: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    cuisine: {
        type: String,
        required: true
    },
    details: {
        type: String
    }
});

module.exports = mongoose.model('Reservation', resSchema)