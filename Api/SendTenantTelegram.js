export default async function handler(req, res) {
    // የ CORS ፖሊሲ
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { username, text } = req.body;
    if (!username || !text) {
        return res.status(400).json({ error: 'Missing data (username or text)' });
    }

    try {
        // የነጋዴውን መረጃ ከፋየርቤዝ ዳታቤዝ በ REST API (ያለ Admin SDK) በቀላሉ ያነበዋል
        const dbUrl = `https://tirfe-app-default-rtdb.firebaseio.com/tirfe_system/tenants/${username}.json`;
        const dbResponse = await fetch(dbUrl);
        const tenant = await dbResponse.json();

        if (!tenant || !tenant.telegramToken || !tenant.telegramChatId) {
            return res.status(404).json({ success: false, message: 'የነጋዴው የቴሌግራም መረጃ አልተገኘም' });
        }

        const tgUrl = `https://api.telegram.org/bot${tenant.telegramToken}/sendMessage`;
        const response = await fetch(tgUrl, {
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
}

