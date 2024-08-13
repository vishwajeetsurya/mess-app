const asyncHandler = require("express-async-handler");
const validator = require("validator");
const Payment = require("../models/Payment");
const User = require("../models/User");
const moment = require("moment");
const Attendance = require("../models/Attendance");


exports.calculateMonthlyFees = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user || !user.startDate) {
        return res.status(404).json({ message: "User or start date not found." });
    }

    const startDate = moment(user.startDate).startOf('day');
    const endDate = startDate.clone().add(1, 'month').endOf('day');

    const attendanceRecords = await Attendance.find({
        user: userId,
        date: {
            $gte: startDate,
            $lte: endDate
        }
    });

    const totalFee = attendanceRecords.reduce((sum, record) => {
        const lunchFee = record.meals.lunch.present ? record.meals.lunch.feePerMeal : 0;
        const dinnerFee = record.meals.dinner.present ? record.meals.dinner.feePerMeal : 0;
        return sum + lunchFee + dinnerFee;
    }, 0);

    res.status(200).json({
        message: "Fees calculated successfully for 30 days from start date",
        totalFee,
        messOwnerPh: user.messOwnerPh
    });
});

exports.makePayment = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { paymentType, transactionRef, amount } = req.body;

    if (!paymentType || !['online', 'offline'].includes(paymentType)) {
        return res.status(400).json({ message: "Invalid payment type." });
    }

    const paymentData = {
        user: userId,
        amount,
        paymentType,
        transactionRef: paymentType === 'online' ? transactionRef : null,
        status: 'completed',
        date: new Date()
    };

    await Payment.create(paymentData);

    res.status(200).json({ message: "Payment recorded successfully." });
});



exports.getPaymentHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const { from, to } = req.body;

    if (!from || !to) {
        return res.status(400).json({ message: "From and To dates are required" });
    }

    const fromDate = moment(from).startOf('day');
    const toDate = moment(to).endOf('day');

    console.log(`From Date: ${fromDate}, To Date: ${toDate}`);

    const payments = await Payment.find({
        user: userId,
        date: {
            $gte: fromDate,
            $lte: toDate
        }
    });

    res.status(200).json({ message: "Payment history fetched successfully", payments });
});


