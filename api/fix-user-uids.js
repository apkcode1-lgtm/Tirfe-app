// ==========================================
// 📁 api/fix-user-uids.js
// ==========================================
// 🔄 ማስተካከያ፦ ይህ ፕሮጀክት admin ን የሚያረጋግጠው በ Firebase Auth idToken
// ሳይሆን በ env variables (ADMIN_USERNAME/ADMIN_EMAIL/ADMIN_PASSWORD)
// ስለሆነ (admin-login.js ላይ እንዳለው)፣ ይህ endpoint ተመሳሳይ ስልት ይጠቀማል።
//
// 🧪 DRY RUN (ምንም አይቀየርም)፦
//    POST /api/fix-user-uids
//    body: { username, email, password, dryRun: true }
//
// ✅ እውነተኛ ማስተካከያ፦
//    body: { username, email, password, dryRun: false }
// ==========================================

const admin = require('./_firebaseAdmin');

const NODES_CONFIG = {
    tenants: {
        path: 'tirfe_system/tenants',
        label: 'ሻጭ (Tenants)',
        getEmail: (record) => record.gmail
    },
    buyers: {
        path: 'tirfe_system/buyers',
        label: 'ገዥ (Buyers)',
        getEmail: (record) => record.email
    },
    revenueAuthorities: {
        path: 'tirfe_system/revenueAuthorities',
        label: 'ገቢዎች (Revenue Authorities)',
        getEmail: (record) => record.authEmail || record.email || record.gmail
    },
    motors: {
        path: 'tirfe_system/motors',
        label: 'ሞተረኛ (Motors)',
        getEmail: (record) => record.email
    }
};

async function processNode(config, dryRun) {
    const result = {
        label: config.label,
        path: config.path,
        checked: 0,
        alreadyOk: 0,
        fixed: [],
        noEmail: [],
        notFoundInAuth: []
    };

    const snap = await admin.database().ref(config.path).once('value');
    if (!snap.exists()) return result;

    const records = snap.val();
    const usernames = Object.keys(records);

    for (const username of usernames) {
        result.checked++;
        const record = records[username];
        const email = config.getEmail(record);
        const storedUid = record.uid || null;

        if (!email) {
            result.noEmail.push(username);
            continue;
        }

        let authUser;
        try {
            authUser = await admin.auth().getUserByEmail(email);
        } catch (err) {
            result.notFoundInAuth.push({ username, email });
            continue;
        }

        const correctUid = authUser.uid;

        if (storedUid === correctUid) {
            result.alreadyOk++;
            continue;
        }

        if (!dryRun) {
            await admin.database().ref(`${config.path}/${username}/uid`).set(correctUid);
        }

        result.fixed.push({
            username,
            email,
            oldUid: storedUid || '(ባዶ/የለም)',
            newUid: correctUid
        });
    }

    return result;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username, email, password, dryRun, nodes } = req.body || {};
        const isDryRun = dryRun !== false; // 🔒 default ሁልጊዜ dry-run

        // 1️⃣ ልክ እንደ admin-login.js ተመሳሳይ ማረጋገጫ
        const ADMIN_USER = process.env.ADMIN_USERNAME;
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
        const ADMIN_PASS = process.env.ADMIN_PASSWORD;

        if (!ADMIN_PASS || !ADMIN_EMAIL || !ADMIN_USER) {
            return res.status(500).json({ error: 'Server ENV error: Admin credentials are not fully set.' });
        }

        if (username !== ADMIN_USER || email !== ADMIN_EMAIL || password !== ADMIN_PASS) {
            return res.status(403).json({ error: 'ይህንን ለማድረግ የ admin ፍቃድ ያስፈልጋል' });
        }

        // 2️⃣ የትኞቹ nodes መስተካከል እንዳለባቸው መወሰን
        const targetKeys = Array.isArray(nodes) && nodes.length > 0
            ? nodes.filter(k => NODES_CONFIG[k])
            : Object.keys(NODES_CONFIG);

        if (targetKeys.length === 0) {
            return res.status(400).json({ error: 'ልክ ያልሆነ nodes ዝርዝር' });
        }

        // 3️⃣ እያንዳንዱን node ማስተካከል
        const results = {};
        for (const key of targetKeys) {
            results[key] = await processNode(NODES_CONFIG[key], isDryRun);
        }

        return res.status(200).json({
            success: true,
            dryRun: isDryRun,
            results
        });
    } catch (error) {
        console.error('fix-user-uids error:', error);
        return res.status(500).json({ error: 'ስህተት ተፈጥሯል: ' + error.message });
    }
};
