// ==========================================
// 📁 api/create-privileged-user.js
// አድሚን አዲስ ልዩ-ፍቃድ ያለው ተጠቃሚ (ለምሳሌ የገቢዎች ባለስልጣን) ሲፈጥር የሚጠቀምበት
// ✅ Admin SDK ብቻ ስለሚጠቀም:
//    1) የ admin ን session አይነካውም (client-side createUser አያስፈልግም)
//    2) ፓስዎርድ በጭራሽ Realtime Database ላይ አይቀመጥም - Firebase Auth ብቻ ይይዘዋል
//    3) Custom Claim (role) በተመሳሳይ ጥሪ ውስጥ ተፈጥሮ ይሰጣል
// ==========================================
const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
    });
}

// አድሚን ብቻ ሊፈጥራቸው የሚችላቸው roles
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
