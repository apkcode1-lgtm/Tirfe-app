export default async function handler(req, res) {
    // የ CORS ፖሊሲ (ከየትኛውም ዶሜይን ጥያቄዎችን ለመቀበል)
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
        // የሞተረኛውን መረጃ ከፋየርቤዝ ዳታቤዝ ያነበዋል
        const dbUrl = `https://tirfe-app-default-rtdb.firebaseio.com/tirfe_system/motors/${username}.json`;
        const dbResponse = await fetch(dbUrl);
        const motor = await dbResponse.json();
        
        if (!motor) {
            return res.status(404).json({ success: false, message: 'የሞተረኛው መረጃ አልተገኘም' });
        }

        // ሞተረኛው ሲመዘገብ ወይም ሴቲንግ ላይ ያስገባው የቴሌግራም ቶከን (Bot Token)
        const userProvidedToken = motor.telegramToken || motor.tgToken;
        
        if (!userProvidedToken) {
            return res.status(404).json({ success: false, message: 'የሞተረኛው የቴሌግራም ቶከን (Token) ዳታቤዝ ላይ አልተገኘም' });
        }

        // ማስተካከያ:- ምንም አይነት Environment Variable (process.env) አንጠቀምም! 
        // በቀጥታ እያንዳንዱ ሞተረኛ የራሱን ያስገባውን ቶከን እንደ ቦት ቶከን እንጠቀማለን።
        const botToken = userProvidedToken;
        
        // ሞተረኞች ቻት አይዲ (Chat ID) አይጠቀሙም ስላልክ፣ በዲፎልት ቶከኑን እንደ ቻት አይዲ እንጠቀመዋለን
        // (ቴሌግራም chat_id ስለሚጠይቅ Error እንዳይፈጥር የተደረገ ነው)
        const chatId = motor.telegramChatId || userProvidedToken;

        // የቴሌግራም ኤፒአይ መልዕክት መላኪያ ዩአርኤል
        const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(tgUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error("Telegram API Error Response:", data);
            return res.status(response.status).json({ success: false, error: data });
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Motor Telegram Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
}
