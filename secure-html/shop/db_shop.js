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

            // 🆕 buyer_catalog - ገዢ የሚፈልገውን ብቻ የያዘ "view" node
            let buyerCatalogData = {
                status: tenantData.status,
                shopName: tenantData.shopName,
                businessType: tenantData.businessType,
                phone: tenantData.phone,
                address: tenantData.address,
                telegram: tenantData.telegram,
                shopLogo: tenantData.shopLogo,
                lastUpdated: currentTime,
                data: {
                    inventory: (tenantData.data && tenantData.data.inventory) || [],
                    deliveryOrders: (tenantData.data && tenantData.data.deliveryOrders) || []
                }
            };
            queueAction('UPDATE', 'buyer_catalog', currentTenant.username, buyerCatalogData);

            // 🆕 revenue_view - ገቢዎች ባለስልጣን የሚፈልገውን ብቻ የያዘ "view" node
            let revenueViewData = {
                username: tenantData.username,
                fullName: tenantData.fullName,
                shopName: tenantData.shopName,
                businessType: tenantData.businessType,
                phone: tenantData.phone,
                gmail: tenantData.gmail,
                region: tenantData.region,
                zone: tenantData.zone,
                woreda: tenantData.woreda,
                kebele: tenantData.kebele,
                houseNo: tenantData.houseNo,
                tinNumber: tenantData.tinNumber,
                locationKey: tenantData.locationKey,
                lastUpdated: currentTime,
                data: {
                    accumulatedVat: (tenantData.data && tenantData.data.accumulatedVat) || 0
                }
            };
            queueAction('UPDATE', 'revenue_view', currentTenant.username, revenueViewData);

            // 🛠️ 
            let adminSummary = {
                username: tenantData.username,
                shopName: tenantData.shopName,
                businessType: tenantData.businessType,
                fullName: tenantData.fullName,
                phone: tenantData.phone,
                telegram: tenantData.telegram,
                address: tenantData.address,
                googleMapsLink: tenantData.googleMapsLink,
                contractType: tenantData.contractType,
                registrationFee: tenantData.registrationFee,
                expiryDate: tenantData.expiryDate,
                expiryNotified: tenantData.expiryNotified,
                status: tenantData.status,
                uid: tenantData.uid,
                locationKey: tenantData.locationKey,
                lastUpdated: currentTime
            };
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
