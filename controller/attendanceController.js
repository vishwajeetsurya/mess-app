const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const MarkAttendance = require("../models/MarkAttendance");
const moment = require("moment");
const { mongoose } = require("mongoose");

exports.getAttendance = asyncHandler(async (req, res) => {
    const data = await MarkAttendance.find()
    res.status(200).json({ message: "Attendance found succcess", data });
})
exports.markAttendance = asyncHandler(async (req, res) => {
    const { mealType, present } = req.body;
    const userId = req.user._id;
    const currentDate = new Date().toISOString().split('T')[0];

    if (!['lunch', 'dinner'].includes(mealType)) {
        return res.status(400).json({ message: "Invalid meal type" });
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const existingAttendance = await MarkAttendance.findOne({ user: userId, date: currentDate, meal: mealType });
    if (existingAttendance) {
        return res.status(400).json({ message: "Attendance already marked for today" });
    }


    const feePerMeal = present ? user.monthlyFee / 60 : 0;

    const attendance = await MarkAttendance.create({
        user: userId,
        date: currentDate,
        meal: mealType,
        present,
        feePerMeal
    });

    res.status(201).json({ message: "Attendance marked successfully", attendance });
})