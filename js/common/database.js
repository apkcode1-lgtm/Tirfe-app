// ==========================================
// 📁 database.js - የተስተካከለ እና ሙሉ በሙሉ የተረጋገጠ ኮድ
// ==========================================

let localDB = { 
    tenants: {}, 
    buyers: {}, 
    revenueAuthorities: {}, 
    motors: {}, 
    motorQuotas: {}, 
    taxReceipts: [], 
    adminSettings: { bankAccount: '', vatRate: 0, motorTariff: 0, deliveryCommissionRate: 10 }, 
    tariffs: { low: 500, medium: 1000, high: 2000 }, 
    businessTypes: ["አጠቃላይ ንግድ", "ኤሌክትሮኒክስ", "ፋርማሲ", "ልብስ እና ጫማ", "ግሮሰሪ", "ኮስሞቲክስ", "ካፌ እና ሬስቶራንት"] 
};

let isOnline = navigator.onLine !== undefined ? navigator.onLine : true;

// 1. የ Action Queue ማከማቻ
let actionQueue = JSON.parse(localStorage.getItem('tirfe_action_queue')) || [];

window.addEventListener('online', handleOnlineStatus);
window.addEventListener('offline', handleOnlineStatus);

loadLocalStorageBackup();

function handleOnlineStatus() {
    isOnline = navigator.onLine;
    const tag = document.getElementById('syncIndicator');
    const criticalScreen = document.getElementById('criticalOfflineScreen');

    if(!isOnline) {
        if(tag) tag.classList.remove('hidden');
        if(criticalScreen) criticalScreen.classList.remove('hidden');
    } else {
        if(tag) tag.classList.add('hidden');
        if(criticalScreen) criticalScreen.classList.add('hidden');
        
        // ኢንተርኔት ሲመጣ መጀመሪያ የተጠራቀሙ ትዕዛዞችን ይልካል
        processActionQueue();
        
        // በመቀጠል አሁን ያለውን የሎካል ዳታ ወደ Queue ያስገባል
        pushToFirebase();
    }
}

function loadLocalStorageBackup() {
    let backup = localStorage.getItem('tirfe_local_db');
    if(backup) {
        let parsedBackup = JSON.parse(backup);
        if(parsedBackup.tenants) localDB.tenants = parsedBackup.tenants;
        if(parsedBackup.buyers) localDB.buyers = parsedBackup.buyers;
        if(parsedBackup.revenueAuthorities) localDB.revenueAuthorities = parsedBackup.revenueAuthorities;
        if(parsedBackup.motors) localDB.motors = parsedBackup.motors;
        if(parsedBackup.motorQuotas) localDB.motorQuotas = parsedBackup.motorQuotas; 
        if(parsedBackup.taxReceipts) localDB.taxReceipts = parsedBackup.taxReceipts;
        if(parsedBackup.tariffs) localDB.tariffs = parsedBackup.tariffs;
        if(parsedBackup.businessTypes) localDB.businessTypes = parsedBackup.businessTypes;
        
        if(parsedBackup.adminSettings) {
            localDB.adminSettings = parsedBackup.adminSettings;
            if (localDB.adminSettings.deliveryCommissionRate === undefined) {
                localDB.adminSettings.deliveryCommissionRate = 10;
            }
        }
        if(typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns();
        if(typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
    }
}

function saveToLocalStorage() {
    localStorage.setItem('tirfe_local_db', JSON.stringify(localDB));
}

// --------------------------------------------------------
// 🛠️ 2. የተስተካከለ የ Action Queue አስተዳዳሪ (የዳታ መጥፋት እንዳይከሰት የተስተካከለ)
// --------------------------------------------------------

function queueAction(actionType, collection, docId, data) {
    const newAction = {
        id: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 4),
        actionType: actionType, 
        collection: collection, 
        docId: docId, 
        payload: data, 
        timestamp: Date.now(),
        retryCount: 0
    };
    actionQueue.push(newAction);
    localStorage.setItem('tirfe_action_queue', JSON.stringify(actionQueue));
}

let isProcessingQueue = false;

function processActionQueue() {
    if (!isOnline || actionQueue.length === 0 || typeof db === 'undefined' || isProcessingQueue) return;

    isProcessingQueue = true;
    let currentAction = actionQueue[0];
    if (!currentAction.retryCount) currentAction.retryCount = 0;

    let refPath = currentAction.docId 
        ? `tirfe_system/${currentAction.collection}/${currentAction.docId}` 
        : `tirfe_system/${currentAction.collection}`;

    let fbRequest;
    if (currentAction.actionType === 'UPDATE') {
        fbRequest = db.ref(refPath).update(currentAction.payload);
    } else if (currentAction.actionType === 'SET') {
        fbRequest = db.ref(refPath).set(currentAction.payload);
    } else if (currentAction.actionType === 'DELETE') {
        fbRequest = db.ref(refPath).remove();
    }

    if (fbRequest) {
        fbRequest.then(() => {
            // በስኬት ከተላከ ብቻ ከ Queue ማስወጣት
            actionQueue.shift(); 
            localStorage.setItem('tirfe_action_queue', JSON.stringify(actionQueue));
            isProcessingQueue = false;
            if (actionQueue.length > 0) processActionQueue(); 
        }).catch(err => {
            console.error("Firebase Sync Error:", err);
            currentAction.retryCount += 1;
            
            // ❌ ዳታው እንዳይጠፋ ከ Queue ውስጥ አይሰረዝም!
            localStorage.setItem('tirfe_action_queue', JSON.stringify(actionQueue));
            isProcessingQueue = false;

            // ከ 3 ጊዜ በላይ ከተሳሳተ 10 ሰከንድ፣ አለበለዚያ 2 ሰከንድ አርፎ እንደገና ይሞክራል (Exponential Backoff)
            if (isOnline) {
                let delayTime = (currentAction.retryCount >= 3) ? 10000 : 2000;
                console.warn(`Sync failed. Retrying in ${delayTime / 1000} seconds...`);
                setTimeout(processActionQueue, delayTime);
            }
        });
    } else {
        actionQueue.shift();
        localStorage.setItem('tirfe_action_queue', JSON.stringify(actionQueue));
        isProcessingQueue = false;
        if (actionQueue.length > 0) processActionQueue();
    }
}

const cleanData = (data) => data !== undefined ? JSON.parse(JSON.stringify(data)) : null;

// የ Firebase Server Timestamp ማግኛ ረዳት ፋንክሽን
function getServerTimestamp() {
    if (typeof firebase !== 'undefined' && firebase.database && firebase.database.ServerValue) {
        return firebase.database.ServerValue.TIMESTAMP;
    }
    return Date.now();
}

 // --------------------------------------------------------
// 🚀 3. ሚናን መሰረት ያደረጉ የማመሳሰያ ፋንክሽኖች
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

function pushTenantFirebase() {
    if(typeof currentTenant !== 'undefined' && currentTenant) {
        let tenantData = cleanData(localDB.tenants[currentTenant.username]);
        if(tenantData) {
            tenantData.lastUpdated = getServerTimestamp();
            
            queueAction('UPDATE', 'tenants', currentTenant.username, tenantData);
            
            // ለህዝብ ክፍት የሚሆኑ መረጃዎች (የንግድ ስም፣ የሱቅ ምርቶች፣ አድራሻ) ብቻ ይቀመጣሉ
            let publicTenantData = {
                shopName: tenantData.shopName,
                businessType: tenantData.businessType,
                phone: tenantData.phone,
                address: tenantData.address,
                googleMapsLink: tenantData.googleMapsLink,
                shopLogo: tenantData.shopLogo,
                lastUpdated: tenantData.lastUpdated
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

function pushBuyerFirebase() {
    if(typeof currentBuyer !== 'undefined' && currentBuyer) {
        let buyerData = cleanData(localDB.buyers[currentBuyer.username]);
        if(buyerData) {
            buyerData.lastUpdated = getServerTimestamp();
            queueAction('UPDATE', 'buyers', currentBuyer.username, buyerData);
        }
    }
}

function pushRevenueFirebase() {
    if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
        let revData = cleanData(localDB.revenueAuthorities[currentRevenueOfficer.username]);
        if(revData) {
            revData.lastUpdated = getServerTimestamp();
            queueAction('UPDATE', 'revenueAuthorities', currentRevenueOfficer.username, revData);
        }
        if(localDB.motorQuotas) {
            queueAction('UPDATE', 'motorQuotas', null, cleanData(localDB.motorQuotas));
        }
    }
}

function pushMotorFirebase() {
    if(typeof currentMotor !== 'undefined' && currentMotor) {
        let motorData = cleanData(localDB.motors[currentMotor.username]);
        if(motorData) {
            motorData.lastUpdated = getServerTimestamp();
            queueAction('UPDATE', 'motors', currentMotor.username, motorData);
        }
    }
}

function pushToFirebase() { 
    saveToLocalStorage();
    
    if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
        pushAdminFirebase();
    } else {
        pushTenantFirebase();
        pushBuyerFirebase();
        pushRevenueFirebase();
        pushMotorFirebase();
    }
    
    processActionQueue();
}

// --------------------------------------------------------
// 💬 Telegram እና Firebase Listeners
// --------------------------------------------------------

function sendAdminTelegramAlert(message) {
    const backendAPIUrl = "/api/sendAdminTelegram";
    let tgToken = (localDB.adminSettings && localDB.adminSettings.tgToken) ? localDB.adminSettings.tgToken : null;
    let tgChatId = (localDB.adminSettings && localDB.adminSettings.tgChatId) ? localDB.adminSettings.tgChatId : null;
    fetch(backendAPIUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: message, token: tgToken, chatId: tgChatId }) }).catch(err => console.log(err));
}

function sendTelegramAlert(message) {
    if (typeof currentTenant === 'undefined' || !currentTenant) return;
    fetch("/api/sendTenantTelegram", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: currentTenant.username, text: message }) }).catch(err => console.log(err));
}

function sendMotorTelegramAlert(username, message) {
    fetch("/api/sendMotorTelegram", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username, text: message }) }).catch(err => console.log(err));
}

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
            let incomingTime = (incomingData && typeof incomingData.lastUpdated === 'number') ? incomingData.lastUpdated : 0;
            let localTime = (localData && typeof localData.lastUpdated === 'number') ? localData.lastUpdated : 0;
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
