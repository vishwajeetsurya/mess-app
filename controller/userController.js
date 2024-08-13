const path = require('path');

console.log('Current directory:', __dirname);
console.log('Looking for model at:', path.join(__dirname, '../models/markAttendance'));

const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const moment = require('moment');
const User = require('../models/User');
const sendPushNotification = require('../utils/sendPushNotification');
const markAttendance = require('../models/markAttendance');
try {
    const markAttendance = require('../models/markAttendance');
    console.log('MarkAttendance model imported successfully.');
} catch (error) {
    console.error('Error importing MarkAttendance model:', error);
}

exports.registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, startDate, monthlyFee, mealTimes, paidInAdvance, messOwnerPh, pushToken } = req.body;


    // Validate email and password
    // if (!validator.isEmail(email) || !validator.isStrongPassword(password, { minLength: 3 })) {
    //     return res.status(400).json({ message: 'Invalid email or password format' });
    // }

    const parsedStartDate = moment(startDate, 'DD-MM-YYYY', true);
    if (!parsedStartDate.isValid()) {
        return res.status(400).json({ message: 'Invalid start date format. Please use "DD-MM-YYYY".' });
    }

    // Convert start date to UTC
    const utcStartDate = parsedStartDate.utc(true).startOf('day').toDate();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Calculate end date (assuming 1 month subscription)
    const endDate = moment(utcStartDate).add(1, 'month').toDate();

    // Create user with push token
    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        startDate: utcStartDate,
        endDate,
        monthlyFee,
        mealTimes,
        paidInAdvance,
        messOwnerPh,
        pushToken,
        notificationPreferences: {
            lunchReminder: true,
            dinnerReminder: true,
            paymentReminder: true,
        },
    });

    // Send push notification to confirm registration
    const title = 'Registration Successful';
    const body = 'Thank you for registering with us!';
    await sendPushNotification(pushToken, title, body);

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, { expiresIn: '365d' });
    res.cookie('user', token, { maxAge: 1000 * 60 * 60 * 24 });

    res.status(201).json({ message: 'User registered successfully' });
});

exports.loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!validator.isEmail(email) || !password) {
        return res.status(400).json({ message: "Invalid email or password" });
    }

    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, { expiresIn: "365d" });
    res.cookie("user", token, { maxAge: 1000 * 60 * 60 * 24 });

    res.status(200).json({
        message: "User logged in successfully",
        result: {
            id: user._id,
            name: user.name,
            email: user.email,
            startDate: user.startDate,
            endDate: user.endDate,
            mealTimes: user.mealTimes,
        }
    });
})

// Function to handle forgot password request
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);
    const resetPasswordExpires = Date.now() + 10 * 60 * 1000;

    await User.findByIdAndUpdate(user._id, {
        resetPasswordOTP: hashedOTP,
        resetPasswordExpires: resetPasswordExpires,
    });

    const message = `Your password reset OTP is: ${otp}. It is valid for 10 minutes.`;
    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset OTP',
            message
        });

        res.status(200).json({ message: 'OTP sent to your email' });
    } catch (error) {
        await User.findByIdAndUpdate(user._id, {
            resetPasswordOTP: undefined,
            resetPasswordExpires: undefined,
        });

        res.status(500).json({ message: 'Email could not be sent', error: error.message });
    }
});

exports.resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    if (!user.resetPasswordOTP || user.resetPasswordExpires < Date.now()) {
        return res.status(400).json({ message: 'OTP is invalid or has expired' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOTP);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid OTP' });
    }

    await User.findByIdAndUpdate(user._id, {
        password: await bcrypt.hash(newPassword, 10),
        resetPasswordOTP: undefined,
        resetPasswordExpires: undefined,
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, { expiresIn: "7d" });

    res.status(200).json({
        message: 'Password reset successful',
        token
    });
});

exports.updateUserProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndUpdate(id, req.body);

    res.status(200).json({ message: "User data updated successfully" });
});


exports.logoutUser = asyncHandler(async (req, res) => {

    res.clearCookie("user");
    res.json({ message: "User logged out successfully" });
});



exports.resetMessData = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        await User.updateOne({ _id: userId }, {
            $unset: {
                startDate: "",
                endDate: "",
                monthlyFee: "",
                mealTimes: "",
                messOwnerPh: "",
                paidInAdvance: ""
            }
        });
        await markAttendance.deleteMany({ user: userId });
        res.status(200).send({ message: "Specified fields deleted from the user and all attendance records deleted." });
    } catch (error) {
        res.status(500).send({ error: "Error resetting mess data and deleting attendance records: " + error.message });
    }
})