// Api/get-html.js
const fs = require('fs');
const path = require('path');

// ኩኪዎችን በቀላሉ ለመገንጠል የሚረዳ ፈንክሽን
const parseCookies = (cookieHeader) => {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name.trim();
        if (!name) return;
        const val = rest.join('=').trim();
        list[name] = decodeURIComponent(val);
    });
    return list;
};

module.exports = async (req, res) => {
    // ከኩኪው ላይ የተጠቃሚውን ሚና (Role) እናገኛለን
    const cookies = parseCookies(req.headers.cookie);
    const userRole = cookies.userRole; 

    if (!userRole) {
        // መግቢያ ገጽ ላይ ካልሆኑ ወደ መግቢያ ይመለሱ
        return res.redirect('/index.html');
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
        default:         return res.status(403).send("የተከለከለ ገጽ!");
    }

    try {
        const filePath = path.join(process.cwd(), 'secure-html', fileName);
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(htmlContent);
    } catch (error) {
        return res.status(500).send("ይቅርታ፣ ገጹን መጫን አልተቻለም!");
    }
};
