const asyncHandler = require("express-async-handler");
const validator = require("validator");
const Payment = require("../models/Payment");
const MarkAttendance = require("../models/MarkAttendance");
const User = require("../models/User");
const mongoose = require("mongoose");
const moment = require("moment");

exports.calculateMonthlyFees = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user || !user.startDate) {
        return res.status(404).json({ message: "User or start date not found." });
    }

    const startDate = moment(user.startDate).startOf('day');
    const endDate = startDate.clone().add(1, 'month').endOf('day');

    console.log(`Start Date: ${startDate}, End Date: ${endDate}`);

    const attendanceRecords = await MarkAttendance.find({
        user: userId,
        date: {
            $gte: startDate,
            $lte: endDate
        }
    });
    console.log("Attendance Records:", attendanceRecords);

    const totalFee = attendanceRecords.reduce((sum, record) => sum + record.feePerMeal, 0);
    console.log("Total Fee:", totalFee);

    // Update or create a payment record for the user
    await Payment.updateOne(
        { user: userId },
        { dueAmount: totalFee },
        { upsert: true }
    );

    res.status(200).json({ message: "Fees calculated successfully for 30 days from start date", totalFee });
});

exports.makePayment = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const paymentRecord = await Payment.findOne({ user: userId });
    if (!paymentRecord) {
        return res.status(404).json({ message: "No due amount found for user" });
    }

    const amount = paymentRecord.dueAmount;

    paymentRecord.transactionHistory.push({
        transactionId,
        amount,
        date: new Date()
    });

    paymentRecord.dueAmount = 0;
    await paymentRecord.save();

    res.status(201).json({ message: "Payment recorded successfully", payment: paymentRecord });
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
