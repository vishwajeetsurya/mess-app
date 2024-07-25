const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
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
    resetPasswordExpires: Date,
    pushToken: { type: String, required: true },
    notificationPreferences: {
        lunchReminder: { type: Boolean, default: true },
        dinnerReminder: { type: Boolean, default: true },
        paymentReminder: { type: Boolean, default: true },
    },
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

const User = mongoose.model('User', userSchema);

const cron = require('node-cron');
cron.schedule('0 0 * * *', updateStartAndEndDate);

module.exports = User;
