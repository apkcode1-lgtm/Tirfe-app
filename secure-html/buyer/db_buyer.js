// ==========================================
// 📁 db_modules/db_buyer.js - ገዢ (Buyer) ብቻ የሚጠቀምበት
// ==========================================
// ⚠️ db_public.js ካስፈለገ በኋላ ብቻ ስራ ላይ ይውላል። buyer.html ላይ ብቻ ይጫኑ።

// --------------------------------------------------------
// 🚀 Buyer Push
// --------------------------------------------------------
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
    // ⚠️ ከ original ኮድ ጋር ተመሳሳይ ሆኖ እንዲቆይ: renderBuyerCatalog() ከ currentBuyer
    // ቼክ ውጪ ሆኖ ያለ ቅድመ ሁኔታ ይጠራል (ኦርጅናሉ ላይም እንደዚያው ነበር)
    if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
};

// --------------------------------------------------------
// 🎧 Firebase Listeners (buyer only)
// --------------------------------------------------------
function scrubTenantForBuyer(t) {
    if(!t) return t;
    delete t.password; delete t.activationCode; delete t.staffAccounts;
    delete t.telegramToken; delete t.bankAccount;
    return t;
}
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
        db.ref(`tirfe_system/public_tenants`).on('value', (snapshot) => {
            if(snapshot.exists()) {
                let incomingTenants = snapshot.val();
                let hasUpdates = false;
                for (let tUser in incomingTenants) {
                    let inData = incomingTenants[tUser];
                    if(shouldUpdateLocal(inData, localDB.tenants[tUser], 'tenants', tUser)) {
                        localDB.tenants[tUser] = Object.assign({}, localDB.tenants[tUser] || {}, inData);
                        hasUpdates = true;
                    }
                }
                if(hasUpdates) {
                    saveToLocalStorage();
                    if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
                }
            }
        });
        let buyerTenantsRef = db.ref('tirfe_system/tenants');
        buyerTenantsRef.on('child_added', (snapshot) => {
            let incomingData = scrubTenantForBuyer(snapshot.val());
            let tKey = snapshot.key;
            if(shouldUpdateLocal(incomingData, localDB.tenants[tKey], 'tenants', tKey)) {
                localDB.tenants[tKey] = incomingData;
                saveToLocalStorage();
                if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
            }
        });
        buyerTenantsRef.on('child_changed', (snapshot) => {
            let incomingData = scrubTenantForBuyer(snapshot.val());
            let tKey = snapshot.key;
            if(shouldUpdateLocal(incomingData, localDB.tenants[tKey], 'tenants', tKey)) {
                localDB.tenants[tKey] = incomingData;
                saveToLocalStorage();
                if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
            }
        });
        buyerTenantsRef.on('child_removed', (snapshot) => {
            delete localDB.tenants[snapshot.key];
            saveToLocalStorage();
            if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
        });
    }
};

// 🆕 SPLIT-FIX: buyer.html ራሱ ከ login በኋላ ብቻ ስለሚጫን፣ currentBuyer
// ተስተካክሎ ከሆነ በራስ-ሰር pushBuyerFirebase() ይሮጣል (index.html ላይ የነበረውን
// login-time push ጥሪ ይተካል)።
document.addEventListener('DOMContentLoaded', function() {
    if (typeof currentBuyer !== 'undefined' && currentBuyer) {
        pushBuyerFirebase();
    }
});
