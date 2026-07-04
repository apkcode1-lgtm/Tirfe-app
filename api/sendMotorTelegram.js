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
        let botToken = motor.telegramToken || motor.tgToken;
        
        if (!botToken) {
            return res.status(404).json({ success: false, message: 'የሞተረኛው የቴሌግራም ቶከን (Token) ዳታቤዝ ላይ አልተገኘም' });
        }

        let chatId = motor.telegramChatId;

        // ማስተካከያ 1:- ሞተረኛው ቶከን እና ቻት አይዲውን በኮማ (,) አያይዞ ካስገባ (ምሳሌ: 1234:ABC,987654)
        if (botToken.includes(',')) {
            const parts = botToken.split(',');
            botToken = parts[0].trim();
            chatId = parts[1].trim();
        } 
        // ማስተካከያ 2:- በ "/" አያይዞ ካስገባ
        else if (botToken.includes('/')) {
            const parts = botToken.split('/');
            botToken = parts[0].trim();
            chatId = parts[1].trim();
        }

        // ማስተካከያ 3:- ቻት አይዲ ከሌለ፣ ቴሌግራም API ላይ ገብተን ሞተረኛው ለቦቱ የላከውን (Start) መልዕክት ፈልገን ቻት አይዲውን አውቶማቲካሊ እንወስዳለን
        if (!chatId) {
            try {
                const updatesUrl = `https://api.telegram.org/bot${botToken}/getUpdates`;
                const updatesResponse = await fetch(updatesUrl);
                const updatesData = await updatesResponse.json();

                if (updatesData.ok && updatesData.result && updatesData.result.length > 0) {
                    // ከመጨረሻው የቴሌግራም መልዕክት ላይ ቻት አይዲውን (Chat ID) መውሰድ
                    const lastUpdate = updatesData.result[updatesData.result.length - 1];
                    if (lastUpdate.message && lastUpdate.message.chat) {
                        chatId = lastUpdate.message.chat.id;
                    }
                }
            } catch (error) {
                console.error("Auto-fetch Chat ID Error:", error);
            }
        }

        // ማስተካከያ 4:- ዋናው ችግር እዚህ ጋር ስለነበር ነው (ቶከንን እንደ ቻት አይዲ መጠቀም ስለማይቻል)
        if (!chatId) {
            return res.status(400).json({ 
                success: false, 
                message: 'የሞተረኛው ቻት አይዲ (Chat ID) አልተገኘም! እባክዎ ሞተረኛው ወደ ቦቱ በመግባት "Start" የሚለውን መጫኑን ያረጋግጡ፣ ወይም ቶከን በሚያስገቡበት ቦታ ላይ "BotToken,ChatID" አድርገው ያስገቡ።' 
            });
        }

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
