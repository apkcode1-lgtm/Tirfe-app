const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

const app = express();
app.use(cors({ origin: '*' })); // ማንም ሰው እንዳይከለከል
app.use(express.json());

// 1. የኢሜል መላኪያ ማዋቀሪያ
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'የእርስዎ_አድሚን_ኢሜል@gmail.com', // እዚህ ጋር ኢሜልዎን ያስገቡ
        pass: 'የእርስዎ_App_Password_እዚህ_ይገባል' // ሚስጥር ኮድዎን ያስገቡ
    }
});

// 2. የኢሜል ኮድ መላኪያ
app.post('/api/sendVerificationEmail', async (req, res) => {
    const { email, code } = req.body;
    const mailOptions = {
        from: 'የእርስዎ_አድሚን_ኢሜል@gmail.com',
        to: email,
        subject: 'የትርፌ ሲስተም ማረጋገጫ ኮድ (Verification Code)',
        text: `የማረጋገጫ ኮድዎ: ${code} ነው። እባክዎ ይህን ኮድ በሲስተሙ ላይ ያስገቡ።`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Email sent' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. ለአድሚን የቴሌግራም መልእክት መላኪያ
app.post('/api/sendAdminTelegram', async (req, res) => {
    const message = req.body.text;
    const ADMIN_BOT_TOKEN = "የእርስዎ_አድሚን_ቦት_ቶከን_እዚህ_ይገባል"; 
    const ADMIN_CHAT_ID = "የእርስዎ_አድሚን_ቻት_አይዲ_እዚህ_ይገባል";
    const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: message })
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ሰርቨሩን ማስነሻ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
