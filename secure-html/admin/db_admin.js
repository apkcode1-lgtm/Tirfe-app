// ==========================================
// 📁 db_modules/db_admin.js - አድሚን ብቻ የሚጠቀምበት
// ==========================================
// ⚠️ ይህ ፋይል db_public.js ካስፈለገ በኋላ ብቻ ስራ ላይ ይውላል (localDB, cleanData,
// computeLocationKey, queueAction, saveToLocalStorage, shouldUpdateLocal, ወዘተ
// ከዛ ፋይል ይመጣሉ)። admin.html ላይ ብቻ ይጫኑ።

// --------------------------------------------------------
// 🚀 Admin Push
// --------------------------------------------------------
function pushAdminFirebase() {
    let adminUpdates = {};
    if(localDB.motorQuotas) adminUpdates['motorQuotas'] = cleanData(localDB.motorQuotas);
    if(localDB.tariffs) adminUpdates['tariffs'] = cleanData(localDB.tariffs);
    if(localDB.businessTypes) adminUpdates['businessTypes'] = cleanData(localDB.businessTypes);
    if(localDB.adminSettings) adminUpdates['adminSettings'] = cleanData(localDB.adminSettings);
    if(Object.keys(adminUpdates).length > 0) {
        queueAction('UPDATE', '', null, adminUpdates);
    }
}
// --------------------------------------------------------
// 🛠️ አድሚን ማንኛውንም ተጠቃሚ (ተከራይ/ሞተረኛ/ገቢዎች) በቀጥታ የሚያስተካክልበት
// --------------------------------------------------------
function pushAdminRecordUpdate(collection, docId, data) {
    let cleaned = cleanData(data);
    if(!cleaned || !docId) return;
    cleaned.lastUpdated = Date.now();
    if(collection === 'tenants' || collection === 'motors') {
        cleaned.locationKey = computeLocationKey(cleaned);
    }
    queueAction('UPDATE', collection, docId, cleaned);
    saveToLocalStorage();
    processActionQueue();
}
function pushAdminRecordDelete(collection, docId) {
    if(!docId) return;
    queueAction('DELETE', collection, docId, null);
    saveToLocalStorage();
    processActionQueue();
}
function pushAdminTenantUpdate(username, tenantData) {
    let cleaned = cleanData(tenantData);
    if(!cleaned || !username) return;
    cleaned.lastUpdated = Date.now();
    cleaned.locationKey = computeLocationKey(cleaned);
    queueAction('UPDATE', 'tenants', username, cleaned);
    let summary = Object.assign({}, cleaned);
    delete summary.items; delete summary.products; delete summary.catalog; delete summary.taxReceipts;
    queueAction('UPDATE', 'admin_tenant_summary', username, summary);
    saveToLocalStorage();
    processActionQueue();
}
function pushAdminTenantDelete(username) {
    if(!username) return;
    queueAction('DELETE', 'tenants', username, null);
    queueAction('DELETE', 'public_tenants', username, null);
    queueAction('DELETE', 'admin_tenant_summary', username, null);
    saveToLocalStorage();
    processActionQueue();
}

// --------------------------------------------------------
// 💬 Telegram
// --------------------------------------------------------
function sendAdminTelegramAlert(message) {
    const backendAPIUrl = "/api/sendAdminTelegram";
    let tgToken = (localDB.adminSettings && localDB.adminSettings.tgToken) ? localDB.adminSettings.tgToken : null;
    let tgChatId = (localDB.adminSettings && localDB.adminSettings.tgChatId) ? localDB.adminSettings.tgChatId : null;
    fetch(backendAPIUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: message, token: tgToken, chatId: tgChatId }) }).catch(err => console.log(err));
}

// --------------------------------------------------------
// 🔔 UI Refresh (admin only) - db_public.js's triggerUIRefresh() ይህን ይጠራል
// --------------------------------------------------------
window.refreshAdminUI = function() {
    if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
        if(typeof renderAdminPanel === 'function') renderAdminPanel();
        if(typeof renderAdminMotors === 'function') renderAdminMotors();
    }
};

// --------------------------------------------------------
// 🎧 Firebase Listeners (admin only)
// --------------------------------------------------------
window.setupAdminListeners = function() {
    if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin' && !window.adminListenerAttached) {
        window.adminListenerAttached = true;
        const adminNodes = [
            { fbNode: 'admin_tenant_summary', localKey: 'tenants' },
            { fbNode: 'motors', localKey: 'motors' },
            { fbNode: 'revenueAuthorities', localKey: 'revenueAuthorities' }
        ];
        adminNodes.forEach(nodeObj => {
            let fbPath = nodeObj.fbNode;
            let localDbPath = nodeObj.localKey;
            if (!localDB[localDbPath]) localDB[localDbPath] = {};
            let ref = db.ref(`tirfe_system/${fbPath}`);
            ref.on('child_added', (snapshot) => {
                let incomingData = snapshot.val();
                let childKey = snapshot.key;
                if(shouldUpdateLocal(incomingData, localDB[localDbPath][childKey], fbPath, childKey)) {
                    localDB[localDbPath][childKey] = incomingData;
                    saveToLocalStorage(); triggerUIRefresh();
                }
            });
            ref.on('child_changed', (snapshot) => {
                let incomingData = snapshot.val();
                let childKey = snapshot.key;
                if(shouldUpdateLocal(incomingData, localDB[localDbPath][childKey], fbPath, childKey)) {
                    localDB[localDbPath][childKey] = incomingData;
                    saveToLocalStorage(); triggerUIRefresh();
                }
            });
            ref.on('child_removed', (snapshot) => {
                delete localDB[localDbPath][snapshot.key];
                saveToLocalStorage(); triggerUIRefresh();
            });
        });
    }
};

// 🆕 SPLIT-FIX: ይህ ገፅ (admin.html) የሚጫነው ከ login በኋላ ብቻ ስለሆነ፣ ገፁ ሲጫን
// currentUserRole ቀደም ብሎ (ከ session cookie/localStorage) ተስተካክሎ ከሆነ በራስ-ሰር
// pushAdminFirebase() ይሮጣል። ይህ ከዚህ በፊት auth.js ውስጥ index.html ላይ በቀጥታ
// ይደረግ የነበረውን ጥሪ ይተካል (index.html ላይ ይህ ፋይል ስለማይጫን)።
document.addEventListener('DOMContentLoaded', function() {
    if (typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
        pushAdminFirebase();
    }
});
