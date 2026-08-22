// ==========================================
// db_admin.js
// ==========================================
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
// 🆕 የገቢዎች ባለስልጣን whitelist summary
// --------------------------------------------------------
window.buildAdminRevenueSummary = function(cleaned, lastUpdated) {
    // 🛠️ ማስተካከያ: undefined ፊልድ ካለ Firebase .update() በጸጥታ እንዳይወድቅ cleanData() ጠቅልል
    return cleanData({
        uid: cleaned.uid,
        username: cleaned.username,
        authUser: cleaned.authUser,
        authName: cleaned.authName,
        authPhone: cleaned.authPhone,
        authEmail: cleaned.authEmail,
        authRegion: cleaned.authRegion,
        authZone: cleaned.authZone,
        authWoreda: cleaned.authWoreda,
        status: cleaned.status,
        lastUpdated: lastUpdated
    });
};

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

    // 🆕 
    if(collection === 'motors' && typeof buildAdminMotorSummary === 'function') {
        queueAction('UPDATE', 'admin_motor_summary', docId, buildAdminMotorSummary(cleaned, cleaned.lastUpdated));
        queueAction('UPDATE', 'motor_location_view', docId, {
            locationKey: cleaned.locationKey,
            lastUpdated: cleaned.lastUpdated
        });
    }
    if(collection === 'revenueAuthorities') {
        queueAction('UPDATE', 'admin_revenue_summary', docId, buildAdminRevenueSummary(cleaned, cleaned.lastUpdated));
    }

    saveToLocalStorage();
    processActionQueue();
}
function pushAdminRecordDelete(collection, docId) {
    if(!docId) return;
    queueAction('DELETE', collection, docId, null);
    if(collection === 'motors') {
        queueAction('DELETE', 'admin_motor_summary', docId, null);
        queueAction('DELETE', 'motor_location_view', docId, null);
    }
    if(collection === 'revenueAuthorities') {
        queueAction('DELETE', 'admin_revenue_summary', docId, null);
    }
    saveToLocalStorage();
    processActionQueue();
}
function pushAdminTenantUpdate(username, tenantData) {
    let cleaned = cleanData(tenantData);
    if(!cleaned || !username) return;
    cleaned.lastUpdated = Date.now();
    cleaned.locationKey = computeLocationKey(cleaned);
    queueAction('UPDATE', 'tenants', username, cleaned);
    let summary = {
        username: cleaned.username,
        shopName: cleaned.shopName,
        businessType: cleaned.businessType,
        fullName: cleaned.fullName,
        phone: cleaned.phone,
        telegram: cleaned.telegram,
        address: cleaned.address,
        googleMapsLink: cleaned.googleMapsLink,
        contractType: cleaned.contractType,
        registrationFee: cleaned.registrationFee,
        expiryDate: cleaned.expiryDate,
        expiryNotified: cleaned.expiryNotified,
        status: cleaned.status,
        uid: cleaned.uid,
        locationKey: cleaned.locationKey,
        lastUpdated: cleaned.lastUpdated
    };
    queueAction('UPDATE', 'admin_tenant_summary', username, summary);
    saveToLocalStorage();
    processActionQueue();
}
function pushAdminTenantDelete(username) {
    if(!username) return;
    queueAction('DELETE', 'tenants', username, null);
    queueAction('DELETE', 'public_tenants', username, null);
    queueAction('DELETE', 'admin_tenant_summary', username, null);
    queueAction('DELETE', 'buyer_catalog', username, null);
    queueAction('DELETE', 'revenue_view', username, null);
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
            { fbNode: 'admin_motor_summary', localKey: 'motors' },
            { fbNode: 'admin_revenue_summary', localKey: 'revenueAuthorities' }
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
