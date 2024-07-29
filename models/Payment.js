const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactionRef: {
        type: String,
        required: function () {
            return this.paymentType === 'online';
        }
    },
    paymentType: {
        type: String,
        enum: ['online', 'offline'],
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed'
    }
});

module.exports = mongoose.model("Payment", paymentSchema);
