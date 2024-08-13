const mongoose = require('mongoose');

const MarkAttendanceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    meals: {
        lunch: {
            present: { type: Boolean, default: false },
            feePerMeal: { type: Number, default: 0 }
        },
        dinner: {
            present: { type: Boolean, default: false },
            feePerMeal: { type: Number, default: 0 }
        }
    }
});

module.exports = mongoose.model('MarkAttendance', MarkAttendanceSchema)
