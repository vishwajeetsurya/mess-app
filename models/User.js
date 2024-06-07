const mongoose = require('mongoose');
const cron = require('node-cron');
const moment = require('moment');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    monthlyFee: { type: Number, required: true },
    mealTimes: {
        lunch: { type: String, required: true },
        dinner: { type: String, required: true },
    },
    messOwnerPh: { type: String, required: true },
    paidInAdvance: { type: Number, default: 0 },
    resetPasswordOTP: String,
    resetPasswordExpires: Date
});

const calculateEndDate = (startDate, numberOfMonths) => {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + numberOfMonths);
    return endDate;
};

const updateStartAndEndDate = async () => {
    const users = await User.find({ endDate: { $lt: new Date() } });
    users.forEach(async (user) => {
        user.startDate = user.endDate;
        user.endDate = calculateEndDate(user.startDate, 1);
        await user.save();
    });
};

cron.schedule('0 0 * * *', updateStartAndEndDate);

const User = mongoose.model('User', userSchema);
module.exports = User;
