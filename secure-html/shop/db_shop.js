// ==========================================
// db_shop
// ==========================================
// --------------------------------------------------------
// 🎯 Buyer Catalog Sanitizer
// --------------------------------------------------------
function sanitizeInventoryForBuyer(inv) {
    return (inv || []).map(item => ({
        name: item.name || "",
        model: item.model || "-",
        price: item.price || 0,
        wholesalePrice: item.wholesalePrice || 0,
        imgUrl: item.imgUrl || "",
        unitType: item.unitType || "pcs",
        isAdvanced: item.isAdvanced || false,
        unitPerPack: item.unitPerPack || 1,
        qty: item.qty || 0,
        sold: item.sold || 0
    }));
}
// --------------------------------------------------------
// 🚀 Targeted Push - scopes = array,
// --------------------------------------------------
function pushTenantFirebase(scopes) {
    if(typeof currentTenant !== 'undefined' && currentTenant) {
        let fullPush = (typeof scopes === 'undefined');
        let scopeList = scopes || [];
        let hasScope = (s) => fullPush || scopeList.indexOf(s) !== -1;

        // ✅ የሎካል እና የ Firebase ሰዓት አንድ አይነት እንዲሆን Date.now() እንጠቀማለን
        let currentTime = Date.now();
        localDB.tenants[currentTenant.username].lastUpdated = currentTime;
        let tenantData = cleanData(localDB.tenants[currentTenant.username]);
        if(tenantData) {
            tenantData.lastUpdated = currentTime;
            tenantData.locationKey = computeLocationKey(tenantData);
            // 1️⃣ 'tenants' - የራሱ ሙሉ ዳታ - ሁልጊዜ ይጻፋል (staff/multi-device sync ወሳኝ ስለሆነ)
            queueAction('UPDATE', 'tenants', currentTenant.username, tenantData);
            // 2️⃣ 'public_tenants' + 3️⃣ 'buyer_catalog' (የመገለጫ ክፍል) + 4️⃣ 'admin_tenant_summary'
            // - እነዚህ ሶስቱ የ"ስም/ስልክ/ፎቶ" ለውጥ ላይ የጋራ ናቸው (scope: 'profile')
            if(hasScope('profile')) {
                
                let publicTenantData = cleanData({
                    shopName: tenantData.shopName,
                    businessType: tenantData.businessType,
                    phone: tenantData.phone,
                    address: tenantData.address,
                    googleMapsLink: tenantData.googleMapsLink,
                    shopLogo: tenantData.shopLogo,
                    lastUpdated: currentTime
                });
                queueAction('UPDATE', 'public_tenants', currentTenant.username, publicTenantData);

                queueAction('UPDATE', 'buyer_catalog', currentTenant.username, cleanData({
                    status: tenantData.status,
                    shopName: tenantData.shopName,
                    businessType: tenantData.businessType,
                    phone: tenantData.phone,
                    address: tenantData.address,
                    telegram: tenantData.telegram,
                    shopLogo: tenantData.shopLogo,
                    lastUpdated: currentTime
                }));

                queueAction('UPDATE', 'admin_tenant_summary', currentTenant.username, cleanData({
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
                }));
                queueAction('UPDATE', 'revenue_view', currentTenant.username, cleanData({
                    username: tenantData.username,
                    fullName: tenantData.fullName,
                    shopName: tenantData.shopName,
                    businessType: tenantData.businessType,
                    phone: tenantData.phone,
                    region: tenantData.region,
                    zone: tenantData.zone,
                    woreda: tenantData.woreda,
                    kebele: tenantData.kebele,
                    houseNo: tenantData.houseNo,
                    tinNumber: tenantData.tinNumber,
                    locationKey: tenantData.locationKey,
                    lastUpdated: currentTime
                }));
            }

            if(hasScope('inventory')) {
                let sanitizedInv = sanitizeInventoryForBuyer((tenantData.data && tenantData.data.inventory) || []);
                queueAction('UPDATE', 'buyer_catalog', currentTenant.username, {
                    'data/inventory': sanitizedInv,
                    lastUpdated: currentTime
                });
            }

            // 6️⃣ 'revenue_view/data/accumulatedVat' - ቫት ሲቆረጥ/ሲጨመር ብቻ
            if(hasScope('vat')) {
                queueAction('UPDATE', 'revenue_view', currentTenant.username, cleanData({
                    'data/accumulatedVat': (tenantData.data && tenantData.data.accumulatedVat) || 0,
                    lastUpdated: currentTime
                }));
            }

            if(hasScope('orders')) {
                queueAction('UPDATE', 'buyer_catalog', currentTenant.username, {
                    'data/deliveryOrders': (tenantData.data && tenantData.data.deliveryOrders) || [],
                    lastUpdated: currentTime
                });
            }
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
