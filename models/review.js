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
    details: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Review', reviewSchema)