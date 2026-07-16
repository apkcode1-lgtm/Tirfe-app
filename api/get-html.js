// Api/get-html.js
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    // ከደህንነት ጥበቃው (auth.js/session) የተላከውን የተጠቃሚ ሚና (Role) መቀበል
    const userRole = req.headers['x-user-role']; 

    if (!userRole) {
        return res.status(401).json({ error: "እባክዎ መጀመሪያ ይግቡ!" });
    }

    // በሚናው መሠረት የሚገባውን ፋይል መምረጥ
    let fileName = "";
    switch (userRole) {
        case 'admin':    fileName = 'admin.html'; break;
        case 'buyer':    fileName = 'buyer.html'; break;
        case 'revenue':  fileName = 'revenue.html'; break;
        case 'shop':     fileName = 'shop.html'; break;
        case 'staff':    fileName = 'staff.html'; break;
        case 'delivery': fileName = 'delivery.html'; break;
        default:         return res.status(403).json({ error: "የተከለከለ ገጽ!" });
    }

    try {
        // በ Vercel ላይ ፋይሎችን ለማንበብ ትክክለኛው መንገድ
        const filePath = path.join(process.cwd(), 'secure-html', fileName);
        
        // ፋይሉን በጽሑፍ (UTF-8) መልክ እናነባለን
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        
        // እንደ HTML መመለስ
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(htmlContent);
    } catch (error) {
        return res.status(500).json({ error: "ፋይሉን ማግኘት አልተቻለም!" });
    }
};

