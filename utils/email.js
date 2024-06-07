const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: process.env.FROM_EMAIL,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.FROM_EMAIL,
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    // Enable nodemailer debugging
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error occurred:', error.message);
            throw new Error('Email could not be sent');
        }
        console.log('Email sent successfully:', info.response);
    });
};

module.exports = sendEmail;
