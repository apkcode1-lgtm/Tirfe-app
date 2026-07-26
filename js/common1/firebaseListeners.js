if(typeof db !== 'undefined') {
    
    const fetchStaticData = function() {
        const staticNodes = ['tariffs', 'businessTypes', 'adminSettings'];
        staticNodes.forEach(node => {
            db.ref(`tirfe_system/${node}`).once('value').then((snapshot) => {
                if(snapshot.exists()) {
                    localDB[node] = snapshot.val();
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            }).catch(error => {
                console.log(`Firebase Error on ${node}, running offline mode.`);
                isOnline = false; handleOnlineStatus();
            });
        });
    }
    fetchStaticData();

window.setupSecureUserListeners = function() {
    
    function shouldUpdateLocal(incomingData, localData) {
        if (!localData) return true; 
        let incomingTime = incomingData.lastUpdated || 0;
        let localTime = localData.lastUpdated || 0;
        return incomingTime >= localTime; 
    }

    if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin' && !window.adminListenerAttached) {
        window.adminListenerAttached = true;
        const adminNodes = [
            { fbNode: 'admin_tenant_summary', localKey: 'tenants' }, 
            { fbNode: 'buyers', localKey: 'buyers' }, 
            { fbNode: 'motors', localKey: 'motors' }
        ];

        adminNodes.forEach(nodeObj => {
            let fbPath = nodeObj.fbNode;
            let localDbPath = nodeObj.localKey;

            if (!localDB[localDbPath]) localDB[localDbPath] = {}; 
            let ref = db.ref(`tirfe_system/${fbPath}`);
            
            ref.on('child_added', (snapshot) => {
                let incomingData = snapshot.val();
                let childKey = snapshot.key;
                if(shouldUpdateLocal(incomingData, localDB[localDbPath][childKey])) {
                    localDB[localDbPath][childKey] = incomingData;
                    saveToLocalStorage(); triggerUIRefresh();
                }
            });

            ref.on('child_changed', (snapshot) => {
                let incomingData = snapshot.val();
                let childKey = snapshot.key;
                if(shouldUpdateLocal(incomingData, localDB[localDbPath][childKey])) {
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

    if(typeof currentTenant !== 'undefined' && currentTenant && !window.tenantListenerAttached) {
        window.tenantListenerAttached = true;
        db.ref(`tirfe_system/tenants/${currentTenant.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) {
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.tenants[currentTenant.username])) {
                    localDB.tenants[currentTenant.username] = incomingData;
                    saveToLocalStorage(); triggerUIRefresh();
                }
            }
        });
    }
    
    if(typeof currentBuyer !== 'undefined' && currentBuyer && !window.buyerListenerAttached) {
        window.buyerListenerAttached = true;
        db.ref(`tirfe_system/buyers/${currentBuyer.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) { 
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.buyers[currentBuyer.username])) {
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
                    if(shouldUpdateLocal(inData, localDB.tenants[tUser])) {
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
    }
    
    if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer && !window.revenueListenerAttached) {
        window.revenueListenerAttached = true;
        db.ref(`tirfe_system/revenueAuthorities/${currentRevenueOfficer.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) { 
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.revenueAuthorities[currentRevenueOfficer.username])) {
                    localDB.revenueAuthorities[currentRevenueOfficer.username] = incomingData; 
                    saveToLocalStorage(); triggerUIRefresh(); 
                }
            }
        });
    }
    
    if(typeof currentMotor !== 'undefined' && currentMotor && !window.motorListenerAttached) {
        window.motorListenerAttached = true;
        db.ref(`tirfe_system/motors/${currentMotor.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) {
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.motors[currentMotor.username])) {
                    localDB.motors[currentMotor.username] = incomingData;
                    saveToLocalStorage(); triggerUIRefresh();
                }
            }
        });
    }
};
    setupSecureUserListeners();

    function triggerUIRefresh() {
        if(typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns();
        if(typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();

        if(typeof currentTenant !== 'undefined' && currentTenant) {
            let checkTenant = localDB.tenants[currentTenant.username];
            if(!checkTenant || checkTenant.status === "blocked") { 
                if(typeof logout === 'function') logout();
                return; 
            }
            currentTenant = checkTenant;
            if(typeof renderApp === 'function') renderApp();
            if(typeof renderTenantTaxReceipts === 'function') renderTenantTaxReceipts();
        }
     
        if(typeof currentBuyer !== 'undefined' && currentBuyer) {
            let checkBuyer = localDB.buyers[currentBuyer.username];
            if(checkBuyer) currentBuyer = checkBuyer;
        }
        if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();

        if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
            if(typeof renderRevenuePanel === 'function') renderRevenuePanel();
        }

        if(typeof currentMotor !== 'undefined' && currentMotor) {
            let checkMotor = localDB.motors[currentMotor.username];
            if(checkMotor) {
                currentMotor = checkMotor;
                if(typeof renderMotorPage === 'function') renderMotorPage();
            }
        }
        
        if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
            if(typeof renderAdminPanel === 'function') renderAdminPanel();
            if(typeof renderAdminMotors === 'function') renderAdminMotors();
            if(typeof renderAdminBuyers === 'function') renderAdminBuyers();
        }
    }
}

