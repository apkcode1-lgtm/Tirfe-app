// --------------------------------------------------------
// 🛠️ 1. የ Dexie (IndexedDB) ዳታቤዝ ማዋቀሪያ
// --------------------------------------------------------
const dbLocal = new Dexie("TirfeOfflineDB");

// ዳታው ምንም አይነት ቅርፅ ቢኖረውም ችግር እንዳይፈጥር በ id እና data እንከፍለዋለን
dbLocal.version(1).stores({
    tenants: 'id', 
    buyers: 'id', 
    revenueAuthorities: 'id', 
    motors: 'id', 
    globalData: 'id', // ለ adminSettings, tariffs, businessTypes, ወዘተ...
    actionQueue: 'id'
});

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
let actionQueue = []; // በ Memory ውስጥ ላሉ ፈጣን ስራዎች

window.addEventListener('online', handleOnlineStatus);
window.addEventListener('offline', handleOnlineStatus);

// የድሮው loadLocalStorageBackup በ አዲሱ loadDatabaseBackup ተቀይሯል
loadDatabaseBackup();

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
        // በመቀጠል አሁን ያለውን የሎካል ዳታ ወደ Queue ያስገባ
        pushToFirebase();
    }
}

// --------------------------------------------------------
// 💾 ዳታን ከ IndexedDB የማምጣት እና የማስቀመጥ ፋንክሽኖች
// --------------------------------------------------------

async function loadDatabaseBackup() {
    try {
        const tenants = await dbLocal.tenants.toArray();
        tenants.forEach(t => localDB.tenants[t.id] = t.data);

        const buyers = await dbLocal.buyers.toArray();
        buyers.forEach(b => localDB.buyers[b.id] = b.data);

        const revAuths = await dbLocal.revenueAuthorities.toArray();
        revAuths.forEach(r => localDB.revenueAuthorities[r.id] = r.data);

        const motors = await dbLocal.motors.toArray();
        motors.forEach(m => localDB.motors[m.id] = m.data);

        const adminSettings = await dbLocal.globalData.get('adminSettings');
        if (adminSettings) localDB.adminSettings = adminSettings.data;

        const tariffs = await dbLocal.globalData.get('tariffs');
        if (tariffs) localDB.tariffs = tariffs.data;

        const businessTypes = await dbLocal.globalData.get('businessTypes');
        if (businessTypes) localDB.businessTypes = businessTypes.data;

        const motorQuotas = await dbLocal.globalData.get('motorQuotas');
        if (motorQuotas) localDB.motorQuotas = motorQuotas.data;

        const taxReceipts = await dbLocal.globalData.get('taxReceipts');
        if (taxReceipts) localDB.taxReceipts = taxReceipts.data;

        // ወረፋዎችን ከ Dexie ማምጣት
        const aq = await dbLocal.actionQueue.orderBy('id').toArray();
        actionQueue = aq;

        if (localDB.adminSettings && localDB.adminSettings.deliveryCommissionRate === undefined) {
            localDB.adminSettings.deliveryCommissionRate = 10;
        }

        // ሁሉም ዳታ ከወጣ በኋላ UIን እናዘምናል (የሌሎች ፋይሎች አሰራር እንዳይቋረጥ)
        if(typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns();
        if(typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
        triggerUIRefresh();

    } catch (err) {
        console.error("Database Load Error:", err);
    }
}

async function saveToDatabase() {
    try {
        const formatForDexie = (obj) => Object.keys(obj).map(key => ({ id: key, data: obj[key] }));

        if (Object.keys(localDB.tenants).length) await dbLocal.tenants.bulkPut(formatForDexie(localDB.tenants));
        if (Object.keys(localDB.buyers).length) await dbLocal.buyers.bulkPut(formatForDexie(localDB.buyers));
        if (Object.keys(localDB.revenueAuthorities).length) await dbLocal.revenueAuthorities.bulkPut(formatForDexie(localDB.revenueAuthorities));
        if (Object.keys(localDB.motors).length) await dbLocal.motors.bulkPut(formatForDexie(localDB.motors));

        await dbLocal.globalData.bulkPut([
            { id: 'adminSettings', data: localDB.adminSettings },
            { id: 'tariffs', data: localDB.tariffs },
            { id: 'businessTypes', data: localDB.businessTypes },
            { id: 'motorQuotas', data: localDB.motorQuotas },
            { id: 'taxReceipts', data: localDB.taxReceipts }
        ]);
    } catch (err) {
        console.error("Database Save Error:", err);
    }
}

function getPublicTenantsData(tenantsData) {
    let publicData = {};
    for (let k in tenantsData) {
        publicData[k] = Object.assign({}, tenantsData[k]);
        delete publicData[k].password;
        delete publicData[k].activationCode; 
        delete publicData[k].staffAccounts; 
        delete publicData[k].telegramToken; 
        delete publicData[k].bankAccount; 
    }
    return publicData;
}

// --------------------------------------------------------
// 🚀 2. የ Action Queue አስተዳዳሪ ኮድ (በ Dexie የተደገፈ)
// --------------------------------------------------------

async function queueAction(actionType, collection, docId, data) {
    const newAction = {
        id: Date.now().toString(),
        actionType: actionType, 
        collection: collection, 
        docId: docId, 
        payload: data, 
        timestamp: Date.now()
    };
    actionQueue.push(newAction);
    
    // ከ LocalStorage ይልቅ ወደ Dexie እናስገባዋለን
    try {
        await dbLocal.actionQueue.put(newAction);
    } catch (err) {
        console.error("Queue Database save error:", err);
    }
}

function processActionQueue() {
    if (!isOnline || actionQueue.length === 0 || typeof db === 'undefined') return;

    let currentAction = actionQueue[0];
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
        fbRequest.then(async () => {
            actionQueue.shift(); 
            // ወደ ፋየርቤዝ ከገባ በኋላ ከ Dexie እናጠፋዋለን
            await dbLocal.actionQueue.delete(currentAction.id);
            if (actionQueue.length > 0) processActionQueue(); 
        }).catch(err => console.error("Firebase Sync Error, will retry:", err));
    }
}

const cleanData = (data) => data !== undefined ? JSON.parse(JSON.stringify(data)) : null;

// --------------------------------------------------------
// 🔧 3. ሚናን መሰረት ያደረጉ የማመሳሰያ ፋንክሽኖች
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
            tenantData.lastUpdated = Date.now(); 
            
            queueAction('UPDATE', 'tenants', currentTenant.username, tenantData);
            
            let publicT = getPublicTenantsData({ [currentTenant.username]: tenantData });
            queueAction('UPDATE', 'public_tenants', currentTenant.username, publicT[currentTenant.username]);

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
            buyerData.lastUpdated = Date.now();
            queueAction('UPDATE', 'buyers', currentBuyer.username, buyerData);
        }
    }
}

function pushRevenueFirebase() {
    if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
        let revData = cleanData(localDB.revenueAuthorities[currentRevenueOfficer.username]);
        if(revData) {
            revData.lastUpdated = Date.now();
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
            motorData.lastUpdated = Date.now();
            queueAction('UPDATE', 'motors', currentMotor.username, motorData);
        }
    }
}

// ዋናው መቆጣጠሪያ 
function pushToFirebase() { 
    saveToDatabase(); // ከ LocalStorage ይልቅ በ Dexie አደረግነው
    
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
                    saveToDatabase();
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
                    saveToDatabase(); triggerUIRefresh();
                }
            });

            ref.on('child_changed', (snapshot) => {
                let incomingData = snapshot.val();
                let childKey = snapshot.key;
                if(shouldUpdateLocal(incomingData, localDB[localDbPath][childKey])) {
                    localDB[localDbPath][childKey] = incomingData;
                    saveToDatabase(); triggerUIRefresh();
                }
            });

            ref.on('child_removed', (snapshot) => {
                delete localDB[localDbPath][snapshot.key];
                saveToDatabase(); triggerUIRefresh();
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
                    saveToDatabase(); triggerUIRefresh();
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
                    saveToDatabase(); triggerUIRefresh(); 
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
                    saveToDatabase(); 
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
                    saveToDatabase(); triggerUIRefresh(); 
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
                    saveToDatabase(); triggerUIRefresh();
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
