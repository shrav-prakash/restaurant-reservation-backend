const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    bookings: {
        type: [Schema.Types.ObjectId],
        ref: 'bookings'
    },
    review_id: {
        type: Schema.Types.ObjectId,
        ref: 'reviews'
    }
});

module.exports = mongoose.model('User', userSchema);