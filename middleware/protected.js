const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

exports.requireAuth = asyncHandler(async (req, res, next) => {
    let token;
    if (req.cookies.user) {
        try {
            token = req.cookies.user;
            const decoded = jwt.verify(token, process.env.JWT_KEY);
            req.user = await User.findById(decoded.userId).select('-password');
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
});
