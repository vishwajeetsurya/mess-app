const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const MarkAttendance = require('../models/MarkAttendance');

// Get Attendance
exports.getAttendance = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const attendanceData = await MarkAttendance.find({ user: userId });

        const formattedAttendance = {};
        attendanceData.forEach((entry) => {
            const date = entry.date.toISOString().split('T')[0];
            const meals = entry.meals;

            formattedAttendance[date] = {
                lunch: meals.lunch.present ? 'Present' : 'Absent',
                dinner: meals.dinner.present ? 'Present' : 'Absent',
            };
        });

        res.status(200).json({ message: 'Attendance found successfully', data: formattedAttendance });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attendance data', error });
    }
});

// Mark Attendance
exports.markAttendance = asyncHandler(async (req, res) => {
    const { mealType, present } = req.body;
    const userId = req.user._id;
    const currentDate = new Date().toISOString().split('T')[0];

    if (!['lunch', 'dinner'].includes(mealType)) {
        return res.status(400).json({ message: 'Invalid meal type' });
    }

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
    }

    let attendance = await MarkAttendance.findOne({ user: userId, date: currentDate });
    if (!attendance) {
        attendance = new MarkAttendance({ user: userId, date: currentDate, meals: {} });
    }

    const feePerMeal = present ? user.monthlyFee / 60 : 0;
    attendance.meals[mealType] = { present, feePerMeal };

    await attendance.save();

    res.status(201).json({ message: 'Attendance marked successfully', attendance });
});

// Update Attendance
exports.updateAttendance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { mealType, present } = req.body;

    try {
        const attendance = await MarkAttendance.findById(id);
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance not found' });
        }

        const user = await User.findById(attendance.user);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const feePerMeal = present ? user.monthlyFee / 60 : 0;
        attendance.meals[mealType] = { present, feePerMeal };

        await attendance.save();

        res.status(200).json({ message: 'Attendance update successful', attendance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update attendance' });
    }
});

// Get Attendance Report
exports.getAttendanceReport = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { startDate, endDate } = req.body;

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
});

// Count Present Entries
exports.countPresentEntries = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    try {
        const presentCount = await MarkAttendance.aggregate([
            { $match: { user: mongoose.Types.ObjectId(userId) } },
            { $group: { _id: null, count: { $sum: { $cond: [{ $or: ['$meals.lunch.present', '$meals.dinner.present'] }, 1, 0] } } } }
        ]);

        const count = presentCount.length > 0 ? presentCount[0].count : 0;

        res.status(200).json({ message: 'Count of present entries retrieved successfully', count });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to count present entries' });
    }
});
