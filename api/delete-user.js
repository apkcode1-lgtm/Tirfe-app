// api/delete-user.js
const admin = require('firebase-admin');

// 1. የ Firebase Admin SDK initilize ማድረጊያ
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // .env ላይ ያለውን \n ወደ ትክክለኛ አዲስ መስመር (newline) እንዲቀይረው ያደርጋል
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

// 2. ዋናው ተጠቃሚን የማጥፊያ (Delete) ሎጂክ
module.exports = async (req, res) => {
    // የሚቀበለው የ POST ሪኬስት ብቻ መሆኑን ማረጋገጥ
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    }

    const { uid, role, username } = req.body; 

    // UID ግዴታ መግባት ስላለበት ቼክ ማድረግ
    if (!uid) {
        return res.status(400).json({ error: "User UID is required" });
    }

    try {
        // 3. ተጠቃሚውን ከ Firebase Authentication ላይ ሙሉ በሙሉ ማጥፋት
        await admin.auth().deleteUser(uid);
        
        // 4. ተጠቃሚውን ከ Realtime Database ላይ ማጥፋት (role እና username ከተላኩ)
        if (role && username) {
            let dbPath = `tirfe_system/${role}/${username}`;
            await admin.database().ref(dbPath).remove();
        }

        return res.status(200).json({ 
            success: true, 
            message: "ተጠቃሚው ከ Auth እና ከ ዳታቤዝ በተሳካ ሁኔታ ተሰርዟል!" 
        });

    } catch (error) {
        console.error("Error deleting user:", error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};

