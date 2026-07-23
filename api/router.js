const fs = require('fs');
const path = require('path');

// ኩኪዎችን ለመገንጠል የሚረዳ ረዳት ፈንክሽን
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
    // ከኩኪው ላይ የተጠቃሚውን ሚና (Role) እናገናለን
    const cookies = parseCookies(req.headers.cookie);
    const userRole = cookies.userRole; 

    // ሚና ከሌለው ወደ መግቢያ ገጽ መመለስ
    if (!userRole) {
        return res.redirect('/index.html');
    }

    // የሚፈቀዱ ሚናዎች ዝርዝር
    const allowedRoles = ['admin', 'buyer', 'revenue', 'shop', 'staff', 'delivery'];
    if (!allowedRoles.includes(userRole)) {
        return res.status(403).send("የተከለከለ ገጽ!");
    }

    // የተጠየቀ የተወሰነ ፋይል (ለምሳሌ JS ፋይል) ካለ ከ URL Query ማወቅ
    const requestedFile = req.query.file;

    try {
        // ሀ) የየራሳቸው የሆነ Script (JS) ፋይል ከተጠየቀ
        if (requestedFile) {
            const filePath = path.join(process.cwd(), 'secure-html', userRole, requestedFile);
            
            if (!fs.existsSync(filePath)) {
                return res.status(404).send("ፋይሉ አልተገኘም!");
            }

            const jsContent = fs.readFileSync(filePath, 'utf8');
            res.setHeader('Content-Type', 'application/javascript');
            return res.status(200).send(jsContent);
        } 
        
        // ለ) መደበኛው HTML ገጽ ሲጠየቅ
        else {
            const htmlPath = path.join(process.cwd(), 'secure-html', userRole, `${userRole}.html`);
            
            if (!fs.existsSync(htmlPath)) {
                return res.status(404).send("የተጠየቀው ገጽ አልተገኘም!");
            }

            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            
            // የጋራ የሆኑ ፋይሎች አድራሻ እንዳይጠፋ <base href="/"> ማስተካከል
            if (htmlContent.includes('<head>')) {
                htmlContent = htmlContent.replace('<head>', '<head><base href="/">');
            } else if (htmlContent.includes('<HEAD>')) {
                htmlContent = htmlContent.replace('<HEAD>', '<HEAD><base href="/">');
            } else {
                htmlContent = '<base href="/">' + htmlContent;
            }

            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(htmlContent);
        }
    } catch (error) {
        return res.status(500).send("ይቅርታ፣ ገጹን መጫን አልተቻለም!");
    }
};

