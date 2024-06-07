const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    dueAmount: {
        type: Number,
        required: true
    },
    transactionId: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model("Payment", paymentSchema);
