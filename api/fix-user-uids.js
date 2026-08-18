// ==========================================
// 📁 api/fix-user-uids.js
// ==========================================
// 🔄 ማስተካከያ 2፦ Sequential (አንድ በአንድ) ፋንታ Promise.all
// (parallel/በትይዩ) በመጠቀም ፈጣን እንዲሆን ተደርጓል - Vercel serverless
// function timeout (10 ሰከንድ በ Hobby plan) እንዳይመታ ለመከላከል።
//
// 🧪 DRY RUN (ምንም አይቀየርም)፦
//    POST /api/fix-user-uids
//    body: { username, email, password, dryRun: true }
//
// ✅ እውነተኛ ማስተካከያ፦
//    body: { username, email, password, dryRun: false }
//
// 🎯 አንድ node ብቻ ለማድረግ (ፈጣን እንዲሆን፣ timeout እንዳይመታ)፦
//    body: { ..., nodes: ["tenants"] }
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

async function processOneUser(username, record, config, dryRun) {
    const email = config.getEmail(record);
    const storedUid = record.uid || null;

    if (!email) {
        return { type: 'noEmail', username };
    }

    let authUser;
    try {
        authUser = await admin.auth().getUserByEmail(email);
    } catch (err) {
        return { type: 'notFoundInAuth', username, email };
    }

    const correctUid = authUser.uid;

    if (storedUid === correctUid) {
        return { type: 'alreadyOk' };
    }

    if (!dryRun) {
        await admin.database().ref(`${config.path}/${username}/uid`).set(correctUid);
    }

    return {
        type: 'fixed',
        username,
        email,
        oldUid: storedUid || '(ባዶ/የለም)',
        newUid: correctUid
    };
}

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
    result.checked = usernames.length;

    // 🚀 ሁሉንም ተጠቃሚዎች በትይዩ (parallel) ማካሄድ - ፈጣን ይሆናል
    const outcomes = await Promise.all(
        usernames.map(username => processOneUser(username, records[username], config, dryRun))
    );

    outcomes.forEach(o => {
        if (o.type === 'alreadyOk') result.alreadyOk++;
        else if (o.type === 'noEmail') result.noEmail.push(o.username);
        else if (o.type === 'notFoundInAuth') result.notFoundInAuth.push({ username: o.username, email: o.email });
        else if (o.type === 'fixed') result.fixed.push({ username: o.username, email: o.email, oldUid: o.oldUid, newUid: o.newUid });
    });

    return result;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username, email, password, dryRun, nodes } = req.body || {};
        const isDryRun = dryRun !== false;

        const ADMIN_USER = process.env.ADMIN_USERNAME;
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
        const ADMIN_PASS = process.env.ADMIN_PASSWORD;

        if (!ADMIN_PASS || !ADMIN_EMAIL || !ADMIN_USER) {
            return res.status(500).json({ error: 'Server ENV error: Admin credentials are not fully set.' });
        }

        if (username !== ADMIN_USER || email !== ADMIN_EMAIL || password !== ADMIN_PASS) {
            return res.status(403).json({ error: 'ይህንን ለማድረግ የ admin ፍቃድ ያስፈልጋል' });
        }

        const targetKeys = Array.isArray(nodes) && nodes.length > 0
            ? nodes.filter(k => NODES_CONFIG[k])
            : Object.keys(NODES_CONFIG);

        if (targetKeys.length === 0) {
            return res.status(400).json({ error: 'ልክ ያልሆነ nodes ዝርዝር' });
        }

        // 🚀 4ቱንም nodes በአንድ ጊዜ (parallel) ማካሄድ
        const resultsArray = await Promise.all(
            targetKeys.map(key => processNode(NODES_CONFIG[key], isDryRun))
        );

        const results = {};
        targetKeys.forEach((key, i) => { results[key] = resultsArray[i]; });

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
