// ==========================================
// 📁 api/set-user-role.js
// ==========================================
const admin = require('./_firebaseAdmin');
const SELF_SERVICE_ROLES = ['buyer', 'tenant', 'motor'];
const ADMIN_GRANTED_ROLES = ['revenue', 'admin'];

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { idToken, targetUid, role } = req.body || {};

    if (!idToken || !targetUid || !role) {
        return res.status(400).json({ error: 'idToken, targetUid እና role ያስፈልጋሉ' });
    }

    try {
        // 1️⃣ የላከው ሰው በእውነት ማን እንደሆነ ማረጋገጥ (ID Token verify)
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        if (SELF_SERVICE_ROLES.includes(role)) {
            // ራሱን ብቻ ነው role ሊሰጠው የሚችለው (ራሱ ላይ ብቻ - ሌላ uid ላይ አይችልም)
            if (decodedToken.uid !== targetUid) {
                return res.status(403).json({ error: 'የራስዎን uid ብቻ ነው ማስተካከል የሚችሉት' });
            }
        } else if (ADMIN_GRANTED_ROLES.includes(role)) {
            // 'revenue' ወይም 'admin' role ለመስጠት፣ የላከው ሰው ራሱ አስቀድሞ admin መሆን አለበት
            if (decodedToken.role !== 'admin') {
                return res.status(403).json({ error: 'ይህንን role ለመስጠት የ admin ፍቃድ ያስፈልጋል' });
            }
        } else {
            return res.status(400).json({ error: 'ያልታወቀ role' });
        }
        // 2️⃣ Custom Claim ማስቀመጥ
        await admin.auth().setCustomUserClaims(targetUid, { role });

        return res.status(200).json({ success: true, uid: targetUid, role });
    } catch (error) {
        console.error('set-user-role error:', error);
        return res.status(401).json({ error: 'ማረጋገጫ አልተሳካም ወይም ስህተት ተፈጥሯል: ' + error.message });
    }
};
