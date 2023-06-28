const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mgrSchema = new Schema({
    cuisine: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Manager', mgrSchema)