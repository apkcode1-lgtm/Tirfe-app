// ==========================================
// 📁 api/create-privileged-user.js
// ==========================================
const admin = require('./_firebaseAdmin');
const ADMIN_AUTHORIZED_ROLES = ['revenue', 'admin']; // ጠሪው admin መሆን ያለበት roles
const OWNER_AUTHORIZED_ROLES = ['staff']; // ጠሪው የራሱ tenant ባለቤት መሆን ያለበት roles
const ALL_ALLOWED_ROLES = [...ADMIN_AUTHORIZED_ROLES, ...OWNER_AUTHORIZED_ROLES];

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { idToken, email, password, role, tenantUsername } = req.body || {};

    if (!idToken || !email || !password || !role) {
        return res.status(400).json({ error: 'idToken, email, password እና role ያስፈልጋሉ' });
    }

    if (!ALL_ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: 'ይህ endpoint ለ revenue/admin/staff roles ብቻ ነው' });
    }

    try {
        // 1️⃣ የላከው ሰው ማንነት ማረጋገጥ
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        if (ADMIN_AUTHORIZED_ROLES.includes(role)) {
            // revenue/admin ለመፍጠር ጠሪው admin መሆን አለበት
            if (decodedToken.role !== 'admin') {
                return res.status(403).json({ error: 'ይህንን ለማድረግ የ admin ፍቃድ ያስፈልጋል' });
            }
        } else if (role === 'staff') {
            // 🆕 ስታፍ ለመፍጠር ጠሪው admin ወይም የዚያ tenant ትክክለኛ ባለቤት (owner) መሆን አለበት
            if (!tenantUsername) {
                return res.status(400).json({ error: 'tenantUsername ያስፈልጋል' });
            }
            if (decodedToken.role !== 'admin') {
                const tenantSnap = await admin.database().ref(`tirfe_system/tenants/${tenantUsername}/uid`).once('value');
                const ownerUid = tenantSnap.val();
                if (!ownerUid || ownerUid !== decodedToken.uid) {
                    return res.status(403).json({ error: 'ይህንን ለማድረግ የዚህ ሱቅ ባለቤት (owner) ፍቃድ ያስፈልጋል' });
                }
            }
        }

        // 2️⃣ አዲሱን ተጠቃሚ በ Admin SDK መፍጠር (ጠሪውን session አይነካውም)
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
