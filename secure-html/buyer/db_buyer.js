// ==========================================
// 📁 db_modules/db_buyer.js - ገዢ (Buyer) ብቻ የሚጠቀምበት
// ==========================================
function pushBuyerFirebase() {
    if(typeof currentBuyer !== 'undefined' && currentBuyer) {
        let currentTime = Date.now();
        let buyerData = cleanData(localDB.buyers[currentBuyer.username]);
        if(buyerData) {
            buyerData.lastUpdated = currentTime;
            queueAction('UPDATE', 'buyers', currentBuyer.username, buyerData);
        }
    }
}

// --------------------------------------------------------
// 🔔 UI Refresh (buyer only) - db_public.js's triggerUIRefresh() ይህን ይጠራል
// --------------------------------------------------------
window.refreshBuyerUI = function() {
    if(typeof currentBuyer !== 'undefined' && currentBuyer) {
        let checkBuyer = localDB.buyers[currentBuyer.username];
        if(!checkBuyer || checkBuyer.status === "blocked") {
            if(typeof forceLogout === 'function') forceLogout();
            return;
        }
        currentBuyer = checkBuyer;
    }
    if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
};

// --------------------------------------------------------
// 🎧 Firebase Listeners (buyer only)
// --------------------------------------------------------
// ❌ scrubTenantForBuyer() ሙሉ በሙሉ ተወግዷል - ከዚህ በኋላ አያስፈልግም ምክንያቱም
// buyer_catalog ገና ከ write ጀምሮ (db_shop.js) ንፁህ ዳታ ብቻ ስለያዘ
window.setupBuyerListeners = function() {
    if(typeof currentBuyer !== 'undefined' && currentBuyer && !window.buyerListenerAttached) {
        window.buyerListenerAttached = true;
        db.ref(`tirfe_system/buyers/${currentBuyer.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) {
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.buyers[currentBuyer.username], 'buyers', currentBuyer.username)) {
                    localDB.buyers[currentBuyer.username] = incomingData;
                    saveToLocalStorage(); triggerUIRefresh();
                }
            }
        });
        // 🆕 ማስተካከያ: ከ `tirfe_system/tenants` (ሙሉ ጥሬ ዳታ) ይልቅ አሁን
        // `tirfe_system/buyer_catalog` (ገዢ የሚፈልገውን ብቻ የያዘ mirror node) ነው የሚነበበው
        let buyerCatalogRef = db.ref('tirfe_system/buyer_catalog');
        buyerCatalogRef.on('child_added', (snapshot) => {
            let incomingData = snapshot.val();
            let tKey = snapshot.key;
            if(shouldUpdateLocal(incomingData, localDB.tenants[tKey], 'tenants', tKey)) {
                localDB.tenants[tKey] = incomingData;
                saveToLocalStorage();
                if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
            }
        });
        buyerCatalogRef.on('child_changed', (snapshot) => {
            let incomingData = snapshot.val();
            let tKey = snapshot.key;
            if(shouldUpdateLocal(incomingData, localDB.tenants[tKey], 'tenants', tKey)) {
                localDB.tenants[tKey] = incomingData;
                saveToLocalStorage();
                if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
            }
        });
        buyerCatalogRef.on('child_removed', (snapshot) => {
            delete localDB.tenants[snapshot.key];
            saveToLocalStorage();
            if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
        });
    }
};
