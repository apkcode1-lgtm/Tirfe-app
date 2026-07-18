// api/chapa-verify.js
const admin = require('firebase-admin');

// Firebase Adminን በVercel Environment Variables ማዘጋጀት
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // የፕራይቬት ኪው አዲስ መስመር (\n) በቨርሴል ላይ እንዳይበላሽ ለማስተካከል
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
        })
    });
}
const db = admin.firestore();

module.exports = async (req, res) => {
    // ቻፓ በሊንኩ መጨረሻ ላይ የሚልክልን መለያ (tx_ref)
    const { tx_ref } = req.query; 

    if (!tx_ref) {
        return res.status(400).json({ status: "failed", message: "Transaction reference is required" });
    }

    try {
        // በAxios ፈንታ በVercel ላይ በነጻ የሚሰራውን የNode.js 'fetch' እንጠቀማለን
        const chapaResponse = await fetch(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.CHAPA_SECRET_KEY}`
            }
        });

        const paymentData = await chapaResponse.json();

        // ክፍያው በቻፓ በኩል ሙሉ በሙሉ ከተሳካ
        if (paymentData.status === "success" && paymentData.data && paymentData.data.status === "success") {
            
            const motoristId = paymentData.data.meta.motorist_id;
            const amountPaid = Number(paymentData.data.amount);

            // የሞተረኛውን አካውንት ፈልጎ ክሬዲት መጨመር
            const motoristRef = db.collection('motorists').doc(motoristId);
            
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(motoristRef);
                if (!doc.exists) {
                    throw new Error("የሞተረኛው ፕሮፋይል አልተገኘም!");
                }
                
                let currentCredit = doc.data().credit || 0;
                transaction.update(motoristRef, { credit: currentCredit + amountPaid });
            });

            // ክፍያው ሲሳካ ሞተረኛውን ወደ ዋናው ገጽ ይመልሰዋል
            return res.redirect(`/delivery.html?payment=success&amount=${amountPaid}`);

        } else {
            // ክፍያው ካልተሳካ
            return res.redirect('/delivery.html?payment=failed');
        }

    } catch (error) {
        console.error("Chapa Verification Error:", error);
        return res.redirect('/delivery.html?payment=error');
    }
};

