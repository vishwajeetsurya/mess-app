const mongoose = require("mongoose")

const attendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    meal: {
        type: String,
        enum: ["lunch", "dinner"],
        required: true
    },
    present: {
        type: Boolean,
        default: false,
        required: true
    },
    feePerMeal: {
        type: Number,
        required: true
    }
})

module.exports = mongoose.model("atttendence", attendanceSchema)