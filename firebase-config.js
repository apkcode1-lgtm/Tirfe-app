const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();

// 1. ለአድሚን ቴሌግራም መልእክት መላኪያ (Admin Alert)
exports.sendAdminTelegram = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        // GET ሪኩዌስቶችን መከልከል
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const message = req.body.text;
        
        // የደህንነት ማሻሻያ፡- የአድሚን ሚስጥር ኮዶች እዚህ ሰርቨር ላይ ብቻ ነው የሚቀመጡት (ከ Client-side ጠፍተዋል)
        const ADMIN_BOT_TOKEN = "የእርስዎ_አድሚን_ቦት_ቶከን_እዚህ_ይገባል"; 
        const ADMIN_CHAT_ID = "የእርስዎ_አድሚን_ቻት_አይዲ_እዚህ_ይገባል";

        const url = `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text: message })
            });
            const data = await response.json();
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("Admin Telegram Error:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
});

// 2. ለነጋዴዎች (Tenants) ቴሌግራም መልእክት መላኪያ
exports.sendTenantTelegram = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const { username, text } = req.body;
        if (!username || !text) {
            return res.status(400).send('Missing data (username or text)');
        }

        try {
            // የነጋዴውን የቴሌግራም መረጃ ከፋየርቤዝ ዳታቤዝ ደህንነቱ በተጠበቀ ሁኔታ ሰርቨሩ ራሱ ያነበዋል
            const snapshot = await admin.database().ref(`tirfe_system/tenants/${username}`).once('value');
            const tenant = snapshot.val();

            if (!tenant || !tenant.telegramToken || !tenant.telegramChatId) {
                return res.status(404).json({ success: false, message: 'የነጋዴው የቴሌግራም መረጃ አልተገኘም' });
            }

            const url = `https://api.telegram.org/bot${tenant.telegramToken}/sendMessage`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: tenant.telegramChatId, text: text })
            });
            const data = await response.json();
            
            res.status(200).json({ success: true, data });
        } catch (error) {
            console.error("Tenant Telegram Error:", error);
            res.status(500).json({ success: false, error: error.message });
        }
    });
});

