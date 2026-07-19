export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    // ስህተት ቢፈጠር እንኳን ሰርቨሩ እንዳይዘጋ (Crash እንዳያደርግ) በ try...catch ተጠቅልሏል
    try {
        const { username, email, password } = req.body; 

        // ከ Vercel Environment Variables መረጃዎችን መውሰድ
        const ADMIN_USER = process.env.ADMIN_USERNAME;
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
        const ADMIN_PASS = process.env.ADMIN_PASSWORD; 

        if (!ADMIN_PASS || !ADMIN_EMAIL || !ADMIN_USER) {
            return res.status(500).json({ success: false, error: 'Server ENV error: Admin credentials are not fully set.' });
        }

        // መጀመሪያ ዩዘርኔም እና ኢሜሉ የአድሚኑ መሆኑን ያረጋግጣል
        if (username === ADMIN_USER && email === ADMIN_EMAIL) {
            if (password === ADMIN_PASS) {
                return res.status(200).json({ success: true });
            } else {
                return res.status(401).json({ success: false, error: 'Invalid Admin Password', isAdminMatch: true }); 
            }
        } else {
            return res.status(401).json({ success: false, error: 'Not Admin', isAdminMatch: false }); 
        }

    } catch (error) {
        console.error("API Server Error:", error);
        // ሰርቨሩ Crash ቢያደርግም ትክክለኛ JSON ይመልሳል
        return res.status(500).json({ success: false, error: 'Internal Server Error' }); 
    }
}
