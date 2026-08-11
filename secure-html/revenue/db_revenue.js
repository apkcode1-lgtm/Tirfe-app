// ==========================================
// 📁 db_modules/db_revenue.js - የገቢዎች ባለስልጣን (Revenue) ብቻ የሚጠቀምበት
// ==========================================
function pushRevenueFirebase() {
    if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
      let currentTime = Date.now();
        let revData = cleanData(localDB.revenueAuthorities[currentRevenueOfficer.username]);
        if(revData) {
            revData.lastUpdated = currentTime;
            queueAction('UPDATE', 'revenueAuthorities', currentRevenueOfficer.username, revData);
        }
        if(localDB.motorQuotas) {
            queueAction('UPDATE', 'motorQuotas', null, cleanData(localDB.motorQuotas));
        }
    }
}

// --------------------------------------------------------
// 🔔 UI Refresh (revenue only) - db_public.js's triggerUIRefresh() ይህን ይጠራል
// --------------------------------------------------------
window.refreshRevenueUI = function() {
    if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
        if(typeof renderRevenuePanel === 'function') renderRevenuePanel();
    }
};

// --------------------------------------------------------
// 🎧 Firebase Listeners (revenue only)
// --------------------------------------------------------
window.setupRevenueListeners = function() {
    if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer && !window.revenueListenerAttached) {
        window.revenueListenerAttached = true;
        // የገቢዎች ሰራተኛውን የራሱን ዳታ ማንበብ
        db.ref(`tirfe_system/revenueAuthorities/${currentRevenueOfficer.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) {
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.revenueAuthorities[currentRevenueOfficer.username], 'revenueAuthorities', currentRevenueOfficer.username)) {
                    localDB.revenueAuthorities[currentRevenueOfficer.username] = incomingData;
                    saveToLocalStorage(); triggerUIRefresh();
                }
            }
        });
        // 🆕 የገቢዎች ሰራተኛው ክልል+ዞን+ወረዳ የተጣመረ መለያ (locationKey) - ተመሳሳይ ስም ያላቸው ወረዳዎች
        // (ለምሳሌ በተለያዩ ዞን ያሉ) እንዳይምታቱ
        let officerLocKey = `${currentRevenueOfficer.authRegion}_${currentRevenueOfficer.authZone}_${currentRevenueOfficer.authWoreda}`;
        // 🛠️ ማስተካከያ: ሙሉ የሀገሪቱን ነጋዴዎች ከማውረድ ይልቅ Firebase ላይ locationKey ተመሳሳይ የሆኑትን
        // ብቻ Query ማድረግ (ደህንነትንም ፍጥነትንም ያሻሽላል)
        db.ref(`tirfe_system/tenants`).orderByChild('locationKey').equalTo(officerLocKey).on('value', (snapshot) => {
         let hasUpdates = false;
            if(snapshot.exists()) {
                let incomingTenants = snapshot.val();
                for (let tUser in incomingTenants) {
                    let tData = incomingTenants[tUser];
                    if(shouldUpdateLocal(tData, localDB.tenants[tUser], 'tenants', tUser)) {
                         localDB.tenants[tUser] = tData;
                         hasUpdates = true;
                    }
                }
            }
            saveToLocalStorage();
            if(typeof renderRevenuePanel === 'function') renderRevenuePanel();
        });

        // የገቢዎች ሰራተኛው ምድብ (ክልል/ዞን/ወረዳ) ውስጥ ያሉትን ሞተረኞች ብቻ Query በማድረግ ማንበብ
        db.ref(`tirfe_system/motors`).orderByChild('locationKey').equalTo(officerLocKey).on('value', (snapshot) => {
            if(!localDB.motors) localDB.motors = {};
            if(snapshot.exists()) {
                let incomingMotors = snapshot.val();
                for (let mUser in incomingMotors) {
                    let mData = incomingMotors[mUser];
                    if(shouldUpdateLocal(mData, localDB.motors[mUser], 'motors', mUser)) {
                         localDB.motors[mUser] = mData;
                    }
                }
            }
            saveToLocalStorage();
            if(typeof renderRevenuePanel === 'function') renderRevenuePanel();
        });
    }
};
