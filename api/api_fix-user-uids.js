// ==========================================
// 📁 api/fix-user-uids.js
// ==========================================
// ይህ endpoint ልክ እንደ create-privileged-user.js / set-user-role.js
// admin-only endpoint ነው። tenants, buyers, revenueAuthorities, motors
// ውስጥ ያለውን "uid" field ከ Firebase Authentication UID ጋር በማመሳከር
// ትክክል ያልሆኑትን/የጠፉትን ያስተካክላል።
//
// 🔒 ማስተካከያ የሚያደርገው admin ብቻ ነው (idToken ማረጋገጫ + decodedToken.role === 'admin')
//
// 🧪 DRY RUN (ምንም አይቀየርም፣ ችግር ያለባቸውን ብቻ ይመልሳል)፦
//    POST /api/fix-user-uids   body: { idToken, dryRun: true }
//
// ✅ እውነተኛ ማስተካከያ፦
//    POST /api/fix-user-uids   body: { idToken, dryRun: false }
//
// 🎯 የተወሰኑ nodes ብቻ ማስተካከል ከፈለጉ (ለምሳሌ tenants እና buyers ብቻ)፦
//    body: { idToken, dryRun: false, nodes: ["tenants", "buyers"] }
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

async function processNode(key, config, dryRun) {
    const result = {
        label: config.label,
        path: config.path,
        checked: 0,
        alreadyOk: 0,
        fixed: [],          // { username, email, oldUid, newUid }
        noEmail: [],        // [username]
        notFoundInAuth: []  // [{ username, email }]
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

    const { idToken, dryRun, nodes } = req.body || {};
    const isDryRun = dryRun !== false; // 🔒 default ሁልጊዜ dry-run (ደህንነት ስንል)

    if (!idToken) {
        return res.status(400).json({ error: 'idToken ያስፈልጋል' });
    }

    try {
        // 1️⃣ የላከው ሰው በእውነት admin መሆኑን ማረጋገጥ
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        if (decodedToken.role !== 'admin') {
            return res.status(403).json({ error: 'ይህንን ለማድረግ የ admin ፍቃድ ያስፈልጋል' });
        }

        // 2️⃣ የትኞቹ nodes መስተካከል እንዳለባቸው መወሰን (ካልተገለጸ ሁሉንም)
        const targetKeys = Array.isArray(nodes) && nodes.length > 0
            ? nodes.filter(k => NODES_CONFIG[k])
            : Object.keys(NODES_CONFIG);

        if (targetKeys.length === 0) {
            return res.status(400).json({ error: 'ልክ ያልሆነ nodes ዝርዝር' });
        }

        // 3️⃣ እያንዳንዱን node ማስተካከል
        const results = {};
        for (const key of targetKeys) {
            results[key] = await processNode(key, NODES_CONFIG[key], isDryRun);
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
