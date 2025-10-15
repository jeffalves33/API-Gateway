const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true', // 465 -> true
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // App Password (16 chars)
    },
});

module.exports = transporter;
