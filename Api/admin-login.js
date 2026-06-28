export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { email, password } = req.body;

    // እነዚህ በ Vercel ሰርቨር ላይ ብቻ የሚቀመጡ ሚስጥሮች ናቸው
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "apkcode1@gmail.com";
    const ADMIN_PASS = process.env.ADMIN_PASSWORD; 

    if (!ADMIN_PASS) {
        return res.status(500).json({ success: false, error: 'Server ENV error: ADMIN_PASSWORD is not set.' });
    }

    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
        return res.status(200).json({ success: true });
    } else {
        return res.status(401).json({ success: false, error: 'Invalid Admin Credentials' });
    }
}

