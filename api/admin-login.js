const admin = require('./_firebaseAdmin');

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
                // 🆕 ማስተካከያ: ከዚህ በፊት { success: true } ብቻ ይመለስ ነበር፣ ስለዚህ አድሚኑ
                // በጭራሽ Firebase Auth ውስጥ አይገባም ነበር (auth.currentUser == null →
                // getIdToken() ላይ ስህተት፣ Realtime DB rules ላይ PERMISSION_DENIED)።
                // አሁን፦ 1) የ admin Firebase user ካለ እናገኘዋለን፣ ከሌለ በ Admin SDK
                // እንፈጥረዋለን፤ 2) role:'admin' custom claim እንሰጠዋለን (ሁልጊዜ login ላይ
                // እንደገና እናረጋግጣለን)፤ 3) custom token ፈጥረን ለ client እንመልሳለን - ክላይንቱ
                // auth.signInWithCustomToken() ተጠቅሞ ይገባበታል።
                let adminUid;
                try {
                    const existingUser = await admin.auth().getUserByEmail(ADMIN_EMAIL);
                    adminUid = existingUser.uid;
                    if (!existingUser.customClaims || existingUser.customClaims.role !== 'admin') {
                        await admin.auth().setCustomUserClaims(adminUid, { role: 'admin' });
                    }
                } catch (lookupErr) {
                    // የ admin Firebase user ገና የለም - አዲስ እንፍጠር
                    const newUser = await admin.auth().createUser({ email: ADMIN_EMAIL, password: ADMIN_PASS });
                    adminUid = newUser.uid;
                    await admin.auth().setCustomUserClaims(adminUid, { role: 'admin' });
                }

                const customToken = await admin.auth().createCustomToken(adminUid, { role: 'admin' });
                return res.status(200).json({ success: true, customToken });
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
