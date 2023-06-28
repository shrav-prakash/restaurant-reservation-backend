const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const waiterSchema = new Schema({
    mgr_id: {
        type: Schema.Types.ObjectId,
        ref: 'managers',
        required: true
    },
    tables: {
        type: [Schema.Types.ObjectId],
        ref: 'tables',
        required: true
    },
    location: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('Waiter', waiterSchema)