 // ዩዘርኔም አዲስ ተጨምሯል
    const { username, email, password } = req.body; 

    // ሶስቱም መረጃዎች ከ Vercel .env ይነበባሉ (ሃርድ ኮድ የለም)
    const ADMIN_USER = process.env.ADMIN_USERNAME;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD; 

    if (!ADMIN_PASS || !ADMIN_EMAIL || !ADMIN_USER) {
        return res.status(500).json({ success: false, error: 'Server ENV error: Admin credentials are not fully set.' });
    }

    // መጀመሪያ ዩዘርኔም እና ኢሜሉ የአድሚኑ መሆኑን ያረጋግጣል
    if (username === ADMIN_USER && email === ADMIN_EMAIL) {
        if (password === ADMIN_PASS) {
            return res.status(200).json({ success: true }); // ሁሉም ትክክል ሲሆን
        } else {
            // ዩዘርኔም/ኢሜል ትክክል ሆኖ ፓስዋርድ ከተሳሳተ (ለ Frontend ምልክት ይሰጣል)
            return res.status(401).json({ success: false, error: 'Invalid Admin Password', isAdminMatch: true }); 
        }
    } else {
        // አድሚን ካልሆነ ወደ ተጠቃሚ (Firebase) እንዲያልፍ
        return res.status(401).json({ success: false, error: 'Not Admin', isAdminMatch: false }); 
    }
}
