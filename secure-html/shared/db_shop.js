// ==========================================
// 📁 db_modules/db_shop.js
// ==========================================
function pushTenantFirebase() {
    if(typeof currentTenant !== 'undefined' && currentTenant) {
        // ✅ የሎካል እና የ Firebase ሰዓት አንድ አይነት እንዲሆን Date.now() እንጠቀማለን
        let currentTime = Date.now();
        localDB.tenants[currentTenant.username].lastUpdated = currentTime;
        let tenantData = cleanData(localDB.tenants[currentTenant.username]);
        if(tenantData) {
            tenantData.lastUpdated = currentTime;
            tenantData.locationKey = computeLocationKey(tenantData);
            queueAction('UPDATE', 'tenants', currentTenant.username, tenantData);
            let publicTenantData = {
              shopName: tenantData.shopName,
                businessType: tenantData.businessType,
                phone: tenantData.phone,
                address: tenantData.address,
                googleMapsLink: tenantData.googleMapsLink,
                shopLogo: tenantData.shopLogo,
                lastUpdated: currentTime
            };
            queueAction('UPDATE', 'public_tenants', currentTenant.username, publicTenantData);
            let adminSummary = Object.assign({}, tenantData);
            delete adminSummary.items;
            delete adminSummary.products;
            delete adminSummary.catalog;
            delete adminSummary.taxReceipts;
            queueAction('UPDATE', 'admin_tenant_summary', currentTenant.username, adminSummary);
        }
    }
}

// --------------------------------------------------------
// 💬 Telegram
// --------------------------------------------------------
function sendTelegramAlert(message) {
    if (typeof currentTenant === 'undefined' || !currentTenant) return;
    fetch("/api/sendTenantTelegram", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentTenant.username, text: message }) }).catch(err => console.log(err));
}

// --------------------------------------------------------
// 🔔 UI Refresh (tenant/staff only) - db_public.js's triggerUIRefresh() ይህን ይጠራል
// --------------------------------------------------------
window.refreshTenantUI = function() {
    if(typeof currentTenant !== 'undefined' && currentTenant) {
        let checkTenant = localDB.tenants[currentTenant.username];
        if(!checkTenant || checkTenant.status === "blocked") {
            alert("አካውንትዎ በአድሚን ታግዷል!"); // ተጠቃሚው ለምን እንደወጣ እንዲያውቅ
            if(typeof forceLogout === 'function') forceLogout();
            return;
        }
        currentTenant = checkTenant;
        if(typeof renderApp === 'function') renderApp();
        if(typeof renderTenantTaxReceipts === 'function') renderTenantTaxReceipts();
    }
};
// --------------------------------------------------------
// 🎧 Firebase Listeners (tenant/staff only)
// --------------------------------------------------------
window.setupTenantListeners = function() {
    if(typeof currentTenant !== 'undefined' && currentTenant && !window.tenantListenerAttached) {
        window.tenantListenerAttached = true;
        db.ref(`tirfe_system/tenants/${currentTenant.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) {
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.tenants[currentTenant.username], 'tenants', currentTenant.username)) {
                    localDB.tenants[currentTenant.username] = incomingData;
                    saveToLocalStorage(); triggerUIRefresh();
                }
            }
        });
    }
};
