const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const resSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'users',
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

module.exports = mongoose.model('New-Reservation', resSchema)