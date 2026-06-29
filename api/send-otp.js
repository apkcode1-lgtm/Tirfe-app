const nodemailer = require('nodemailer');

module.exports = async function handler(req, res) {
    // የ CORS ችግር እንዳይፈጠር የሚረዳ
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        // ማሻሻያ፡ ሪኩዌስቱ በ string መልክ ከመጣ ወደ JSON Object እንዲቀየር ተደርጓል
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const { email, code } = body;

        if (!email || !code) {
            return res.status(400).json({ success: false, error: 'ኢሜል እና ኮድ ያስፈልጋል' });
        }

        // =====================================================================
        // ማሳሰቢያ፡ እዚህ ጋር የ Brevo.com መረጃህን አስገባ
        const BREVO_SMTP_USER = "የብሬቮ_መግቢያ_ኢሜልህን_ወይም_SMTP_Login_አስገባ"; // ምሳሌ: apkcode1@gmail.com
        const BREVO_SMTP_KEY = "የብሬቮ_SMTP_Master_Password_አስገባ"; // ከ Brevo SMTP & API ገፅ የሚገኝ (Master Password)
        const SENDER_EMAIL = "apkcode1@gmail.com"; // በ Brevo ላይ Verified ያደረግከው ኢሜል
        // =====================================================================

        const transporter = nodemailer.createTransport({
            host: 'smtp-relay.brevo.com',
            port: 587,
            secure: false, // port 587 ስለሆነ false መሆን አለበት
            auth: {
                user: BREVO_SMTP_USER,
                pass: BREVO_SMTP_KEY,
            }
        });

        const mailOptions = {
            from: `"Tirfe Shop Security" <${SENDER_EMAIL}>`,
            to: email,
            subject: 'የማረጋገጫ ኮድ (Tirfe Verification Code)',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
     
                    <div style="text-align: center; padding-bottom: 15px; border-bottom: 2px solid #082f49;">
                        <h2 style="color: #082f49; margin: 0;">ትርፌ ሲስተም (Tirfe Shop)</h2>
                    </div>
                    <div style="padding: 20px 0; text-align: center;">
 
                        <p style="font-size: 16px; color: #333333;">ሰላም!</p>
                        <p style="font-size: 16px; color: #333333;">የአካውንት ማረጋገጫ ሚስጥራዊ ኮድዎ የሚከተለው ነው፦</p>
                        <div style="margin: 25px 0;">
             
                            <span style="font-size: 32px; font-weight: bold; background-color: #082f49; color: #ffffff; padding: 12px 30px; border-radius: 8px; letter-spacing: 6px;">${code}</span>
                        </div>
                        <p style="font-size: 13px; color: #ef4444; font-weight: bold;">ይህን ኮድ ለማንም አሳልፈው አይስጡ!</p>
                        <p style="font-size: 14px; color: #666666;">ኮዱ የሚያገለግለው ለ 5 ደቂቃ ብቻ ነው።</p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: 'OTP ተልኳል' });

    } catch (error) {
        console.error("Mail Send Error:", error);
        return res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
    }
};
