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
    // ከኩኪው ላይ የተጠቃሚውን ሚና (Role) እናገኛለን
    const cookies = parseCookies(req.headers.cookie);
    const userRole = cookies.userRole; 

    if (!userRole) {
        // መግቢያ ገጽ ላይ ካልሆኑ ወደ መግቢያ ይመለሱ
        return res.redirect('/index.html');
    }

    // ከ HTML ውስጥ ጃቫስክሪፕት ፋይል ከተጠየቀ (ለምሳሌ: ?file=admin.js)
    const requestedFile = req.query.file;

    try {
        // ሀ) የጃቫስክሪፕት (ወይም ሌላ) ፋይል ከሆነ በቀጥታ ከ secure-html ውስጥ ማውጣት
        if (requestedFile) {
            const filePath = path.join(process.cwd(), 'secure-html', requestedFile);
            
            if (!fs.existsSync(filePath)) {
                return res.status(404).send("ፋይሉ አልተገኘም!");
            }

            const jsContent = fs.readFileSync(filePath, 'utf8');
            res.setHeader('Content-Type', 'application/javascript');
            return res.status(200).send(jsContent);
        }

        // ለ) መደበኛው የ HTML ገጽ ሲጠየቅ
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

        const htmlPath = path.join(process.cwd(), 'secure-html', fileName);
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        // የጋራ የሆኑ ፋይሎች አድራሻ እንዳይጠፋ <base href="/"> መጨመር
        if (htmlContent.includes('<head>')) {
            htmlContent = htmlContent.replace('<head>', '<head><base href="/">');
        } else if (htmlContent.includes('<HEAD>')) {
            htmlContent = htmlContent.replace('<HEAD>', '<HEAD><base href="/">');
        } else {
            htmlContent = '<base href="/">' + htmlContent;
        }

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(htmlContent);

    } catch (error) {
        console.error("Router Error:", error);
        return res.status(500).send("ይቅርታ፣ ገጹን መጫን አልተቻለም!");
    }
};
