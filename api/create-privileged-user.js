// ==========================================
// 📁 api/create-privileged-user.js
// ==========================================
const admin = require('./_firebaseAdmin');
const ADMIN_ONLY_ROLES = ['revenue', 'admin'];

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { idToken, email, password, role } = req.body || {};

    if (!idToken || !email || !password || !role) {
        return res.status(400).json({ error: 'idToken, email, password እና role ያስፈልጋሉ' });
    }

    if (!ADMIN_ONLY_ROLES.includes(role)) {
        return res.status(400).json({ error: 'ይህ endpoint ለ revenue/admin roles ብቻ ነው' });
    }

    try {
        // 1️⃣ የላከው ሰው በእውነት admin መሆኑን ማረጋገጥ
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        if (decodedToken.role !== 'admin') {
            return res.status(403).json({ error: 'ይህንን ለማድረግ የ admin ፍቃድ ያስፈልጋል' });
        }

        // 2️⃣ አዲሱን ተጠቃሚ በ Admin SDK መፍጠር (admin ን session አይነካውም)
        const newUser = await admin.auth().createUser({ email, password });

        // 3️⃣ Custom Claim (role) ወዲያውኑ መስጠት
        await admin.auth().setCustomUserClaims(newUser.uid, { role });

        return res.status(200).json({ success: true, uid: newUser.uid });
    } catch (error) {
        console.error('create-privileged-user error:', error);
        let errMsg = error.message || 'ያልታወቀ ስህተት';
        if (error.code === 'auth/email-already-exists') errMsg = 'ይህ ኢሜል አስቀድሞ ተመዝግቧል!';
        return res.status(400).json({ error: errMsg });
    }
};
