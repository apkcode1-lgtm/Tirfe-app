// ==========================================
// db_buyer.js
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
        //
        // 🛠️ ማስተካከያ: ከዚህ በፊት እነዚህ listeners ምንም error callback ስላልነበራቸው፣
        // permission-denied ቢከሰት (ለምሳሌ የ auth custom-claim (role='buyer') ገና
        // ካልታደሰ) ምንም ስህተት ሳይታይ ገፁ ላይ ካታሎግ ባዶ ሆኖ ይቀር ነበር። አሁን ቢያንስ
        // console ላይ ይታያል፣ እና ተጠቃሚው ላይ ግልጽ ማስጠንቀቂያ ይታያል።
        function onBuyerCatalogError(err) {
            console.error("Buyer catalog listener denied/failed:", err);
            if (typeof showCustomAlert === 'function') {
                showCustomAlert("ማሳሰቢያ", "የዕቃ ዝርዝር ማምጣት አልተቻለም። እባክዎ ዳግም ይግቡ (logout/login) ወይም ገፁን ያድሱ።");
            }
        }
        let buyerCatalogRef = db.ref('tirfe_system/buyer_catalog');
        buyerCatalogRef.on('child_added', (snapshot) => {
            let incomingData = snapshot.val();
            let tKey = snapshot.key;
            if(shouldUpdateLocal(incomingData, localDB.tenants[tKey], 'tenants', tKey)) {
                localDB.tenants[tKey] = incomingData;
                saveToLocalStorage();
                if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
            }
        }, onBuyerCatalogError);
        buyerCatalogRef.on('child_changed', (snapshot) => {
            let incomingData = snapshot.val();
            let tKey = snapshot.key;
            if(shouldUpdateLocal(incomingData, localDB.tenants[tKey], 'tenants', tKey)) {
                localDB.tenants[tKey] = incomingData;
                saveToLocalStorage();
                if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
            }
        }, onBuyerCatalogError);
        buyerCatalogRef.on('child_removed', (snapshot) => {
            delete localDB.tenants[snapshot.key];
            saveToLocalStorage();
            if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
        }, onBuyerCatalogError);
        // 🆕 🔒 PRIVACY FIX:
        db.ref(`tirfe_system/buyer_orders/${currentBuyer.username}`).on('value', (snapshot) => {
            localDB.myOrders = snapshot.exists() ? snapshot.val() : {};
            saveToLocalStorage();
            if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
        }, (err) => console.error("buyer_orders listener denied/failed:", err));
    }
};
