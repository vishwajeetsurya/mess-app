const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const moment = require('moment');
const User = require('../models/User');
const sendPushNotification = require('../utils/sendPushNotification');

// Function to register a new user
exports.registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, startDate, monthlyFee, mealTimes, paidInAdvance, messOwnerPh, pushToken } = req.body;

    // Log received data
    console.log('Received registration data:', req.body);

    // Validate email and password
    // if (!validator.isEmail(email) || !validator.isStrongPassword(password, { minLength: 3 })) {
    //     return res.status(400).json({ message: 'Invalid email or password format' });
    // }

    // Validate start date format
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

    // Respond with success message
    res.status(201).json({ message: 'User registered successfully' });
});

// Function to log in a user
exports.loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!validator.isEmail(email) || !password) {
        return res.status(400).json({ message: "Invalid email or password" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
        return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, { expiresIn: "365d" });
    res.cookie("user", token, { maxAge: 1000 * 60 * 60 * 24 });

    // Respond with user data
    res.status(200).json({
        message: "User logged in successfully",
        result: { _id: user._id, name: user.name, email: user.email }
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

    // Update user with OTP and expiration
    await User.findByIdAndUpdate(user._id, {
        resetPasswordOTP: hashedOTP,
        resetPasswordExpires: resetPasswordExpires,
    });

    // Send OTP via email
    const message = `Your password reset OTP is: ${otp}. It is valid for 10 minutes.`;
    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset OTP',
            message
        });

        // Respond with success message
        res.status(200).json({ message: 'OTP sent to your email' });
    } catch (error) {
        // Handle email sending failure
        await User.findByIdAndUpdate(user._id, {
            resetPasswordOTP: undefined,
            resetPasswordExpires: undefined,
        });

        res.status(500).json({ message: 'Email could not be sent', error: error.message });
    }
});

// Function to reset user password
exports.resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Validate OTP
    if (!user.resetPasswordOTP || user.resetPasswordExpires < Date.now()) {
        return res.status(400).json({ message: 'OTP is invalid or has expired' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOTP);
    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Update password and clear OTP
    await User.findByIdAndUpdate(user._id, {
        password: await bcrypt.hash(newPassword, 10),
        resetPasswordOTP: undefined,
        resetPasswordExpires: undefined,
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_KEY, { expiresIn: "7d" });

    // Respond with success message and token
    res.status(200).json({
        message: 'Password reset successful',
        token
    });
});

// Function to update user profile
exports.updateUserProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Update user profile
    await User.findByIdAndUpdate(id, req.body);

    // Respond with success message
    res.status(200).json({ message: "User data updated successfully" });
});

// Function to log out user
exports.logoutUser = asyncHandler(async (req, res) => {
    // Clear user cookie
    res.clearCookie("user");
    res.json({ message: "User logged out successfully" });
});
