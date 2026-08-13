// ==========================================
// 📁 api/_firebaseAdmin.js
// 🔗 የ Firebase Admin SDK የጋራ (shared) initializer - ሁሉም api/*.js
// ፋይሎች ይሄንን ብቻ ነው የሚጠቀሙት፣ እያንዳንዳቸው ራሳቸው initializeApp() አይደግሙም
// ⚠️ ፋይል ስሙ በ underscore ( _ ) ስለሚጀምር Vercel የራሱን route አድርጎ አይቆጥረውም -
//    ማለት /api/_firebaseAdmin ተብሎ ተጠርቶ ጨርሶ ከውጭ (browser) ሊደረስበት አይችልም
// ==========================================
const admin = require('firebase-admin');

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
module.exports = admin;
