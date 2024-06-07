const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const User = require("../models/User");
const sendEmail = require("../utils/email");
const moment = require("moment");

exports.registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, startDate, monthlyFee, mealTimes, paidInAdvance, messOwnerPh } = req.body;

    if (!validator.isEmail(email) || !validator.isStrongPassword(password)) {
        return res.status(400).json({ message: "Invalid email or password format" });
    }

    const parsedStartDate = moment(startDate, 'DD-MM-YYYY', true);
    if (!parsedStartDate.isValid()) {
        return res.status(400).json({ message: "Invalid start date format. Please use 'DD-MM-YYYY'." });
    }

    // Convert to UTC without changing the date
    const utcStartDate = parsedStartDate.utc(true).startOf('day').toDate();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const endDate = moment(utcStartDate).add(1, 'month').toDate();

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        startDate: utcStartDate, // Save as UTC date
        endDate, // Set end date to one month from start date
        monthlyFee,
        mealTimes,
        paidInAdvance,
        messOwnerPh
    });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, { expiresIn: "7d" });
    res.cookie('user', token, { maxAge: 1000 * 60 * 60 * 24 });

    res.status(201).json({ message: "User registered successfully" });
});

// User login
exports.loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!validator.isEmail(email) || !password) {
        return res.status(400).json({ message: "Invalid email or password" });
    }
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_KEY, { expiresIn: "1d" });
    res.cookie("user", token, { maxAge: 1000 * 60 * 60 * 24 });
    res.status(200).json({ message: "User logged in successfully", result: user });
});

// Update user profile
exports.updateUserProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    await User.findByIdAndUpdate(id, req.body);
    res.status(200).json({ message: "User data updated successfully" });
});

// Logout user
exports.logoutUser = asyncHandler(async (req, res) => {
    res.clearCookie("user");
    res.json({ message: "User logged out successfully" });
});

// Forgot Password
exports.forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate a 6-digit OTP
    const hashedOTP = await bcrypt.hash(otp, 10); // Hash the OTP using bcrypt
    const resetPasswordExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

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

// Reset Password
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
