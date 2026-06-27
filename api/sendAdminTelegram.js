export default async function handler(req, res) {
    // የ CORS ፖሊሲ (ከየትኛውም ዌብሳይት ሪኩዌስት እንዲቀበል)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Pre-flight request handling
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const message = req.body.text;
    
    // የደህንነት ማሻሻያ፡- ሚስጥራዊ ኮዶቹ እዚህ የጀርባ ሰርቨር ላይ ብቻ ነው የሚቀመጡት
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
}

