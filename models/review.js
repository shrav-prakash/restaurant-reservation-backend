const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    user_id: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    rating: {
        type: Number,
        required: true
    },
    food: {
        type: String,
    },
    booking: {
        type: String,
    },
    hospitality: {
        type: String,
    },
    suggestions: {
        type: String,
    }
});

module.exports = mongoose.model('Review', reviewSchema)