const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const MarkAttendance = require("../models/MarkAttendance");
const moment = require("moment");
const { mongoose } = require("mongoose");

exports.getAttendance = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const attendanceData = await MarkAttendance.find({ user: userId });

        const formattedAttendance = {};
        attendanceData.forEach((entry) => {
            const date = entry.date.toISOString().split('T')[0]; // Extract date in 'YYYY-MM-DD' format
            const mealType = entry.meal;
            const attendanceStatus = entry.present ? 'Present' : 'Absent';

            if (!formattedAttendance[date]) {
                formattedAttendance[date] = { lunch: '', dinner: '' };
            }

            formattedAttendance[date][mealType] = attendanceStatus;
        });

        res.status(200).json({ message: 'Attendance found successfully', data: formattedAttendance });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance data', error });
    }
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

exports.updateAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { present } = req.body;

    try {
        const attendance = await MarkAttendance.findById(id);
        if (!attendance) {
            return res.status(404).json({ message: "Attendance not found" });
        }

        const user = await User.findById(attendance.user);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        let feePerMeal = 0;
        if (present) {
            feePerMeal = user.monthlyFee / 60;
        }

        await MarkAttendance.findByIdAndUpdate(id, { ...req.body, feePerMeal });

        res.status(200).json({ message: "Attendance update successful" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update attendance' });
    }
});

exports.getAttendanceReport = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { startDate, endDate } = req.body

    try {
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        const data = await MarkAttendance.find({
            user: userId,
            date: { $gte: start, $lte: end }
        });

        res.status(200).json({ message: 'Attendance found successfully', data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch attendance' });
    }
})


exports.countPresentEntries = asyncHandler(async (req, res) => {
    try {
        const presentCount = await MarkAttendance.aggregate([
            { $match: { present: true } },
            { $group: { _id: null, count: { $sum: 1 } } }
        ]);

        const count = presentCount.length > 0 ? presentCount[0].count : 0;

        res.status(200).json({ message: 'Count of present entries retrieved successfully', count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to count present entries' });
    }
});
