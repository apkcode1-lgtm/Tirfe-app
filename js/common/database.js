// ==========================================
// 📁 database.js - ወደ IndexedDB የተቀየረ ኮድ
// ==========================================
let localDB = { 
    tenants: {}, 
    buyers: {}, 
    revenueAuthorities: {}, 
    motors: {}, 
    motorQuotas: {},
    public_locations: {},
    taxReceipts: [], 
    adminSettings: { bankAccount: '', vatRate: 0, motorTariff: 0, deliveryCommissionRate: 10 }, 
    tariffs: { low: 500, medium: 1000, high: 2000 }, 
    businessTypes: ["አጠቃላይ ንግድ", "ኤሌክትሮኒክስ", "ፋርማሲ", "ልብስ እና ጫማ", "ግሮሰሪ", "ኮስሞቲክስ", "ካፌ እና ሬስቶራንት"]
};
let isOnline = navigator.onLine !== undefined ? navigator.onLine : true;
// 1. የ Action Queue ማከማቻ (አሁን ባዶ ይጀምርና ከ IndexedDB ወዲያውኑ ይሞላል - ከታች ይመልከቱ)
let actionQueue = [];
// --------------------------------------------------------
// 🗄️ 0. IndexedDB ረዳት ፋንክሺኖች (ዝቅተኛ ደረጃ wrapper - ምንም library አያስፈልገውም)
// --------------------------------------------------------
const IDB_NAME = 'tirfe_indexeddb';
const IDB_VERSION = 1;
const IDB_STORE = 'kv_store';
const LOCAL_DB_KEY = 'tirfe_local_db';
const ACTION_QUEUE_KEY = 'tirfe_action_queue';

let _idbConnectionPromise = null;
function idbOpen() {
    if (_idbConnectionPromise) return _idbConnectionPromise;
    _idbConnectionPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) { reject(new Error('IndexedDB not supported')); return; }
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = (e) => {
            const dbConn = e.target.result;
            if (!dbConn.objectStoreNames.contains(IDB_STORE)) {
                dbConn.createObjectStore(IDB_STORE, { keyPath: 'key' });
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
    return _idbConnectionPromise;
}
function idbGet(key) {
    return idbOpen().then(dbConn => new Promise((resolve, reject) => {
        try {
            const tx = dbConn.transaction(IDB_STORE, 'readonly');
            const store = tx.objectStore(IDB_STORE);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result ? req.result.value : undefined);
            req.onerror = (e) => reject(e.target.error);
        } catch (err) { reject(err); }
    }));
}
function idbSet(key, value) {
    return idbOpen().then(dbConn => new Promise((resolve, reject) => {
        try {
            const tx = dbConn.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            const req = store.put({ key: key, value: value });
            req.onsuccess = () => resolve(true);
            req.onerror = (e) => reject(e.target.error);
        } catch (err) { reject(err); }
    }));
}

// አሮጌ localStorage ውስጥ ዳታ ካለ አንድ ጊዜ ብቻ ወደ IndexedDB ማዛወሪያ (Migration)
function migrateFromLocalStorageIfNeeded() {
    return idbGet(LOCAL_DB_KEY).then(existing => {
        if (existing !== undefined) return; // ቀደም ብሎ ተዛውሯል - ድጋሚ አያስፈልግም
        let tasks = [];
        try {
            let oldBackup = localStorage.getItem(LOCAL_DB_KEY);
            if (oldBackup) tasks.push(idbSet(LOCAL_DB_KEY, JSON.parse(oldBackup)));
        } catch (e) { console.error('Old localStorage DB parse failed:', e); }
        try {
            let oldQueue = localStorage.getItem(ACTION_QUEUE_KEY);
            if (oldQueue) tasks.push(idbSet(ACTION_QUEUE_KEY, JSON.parse(oldQueue)));
        } catch (e) { console.error('Old localStorage queue parse failed:', e); }
        return Promise.all(tasks);
    }).catch(err => {
        console.error('Migration check failed:', err);
    });
}

window.addEventListener('online', handleOnlineStatus);
window.addEventListener('offline', handleOnlineStatus);

// 🆕 ሌሎች ፋይሎች (login check, renderApp, ወዘተ) ገፁ ገና ሲከፈት ከ localDB/actionQueue
// ጋር የሚሰሩ ከሆነ፣ IndexedDB ንባቡ እስኪጠናቀቅ ድረስ ይህንን Promise መጠበቅ አለባቸው፡
//   window.dbReadyPromise.then(() => { ... })
window.dbReadyPromise = migrateFromLocalStorageIfNeeded()
    .then(loadLocalStorageBackup)
    .catch(err => {
        console.error('IndexedDB init/read error, ወደ localStorage fallback ተመልሷል:', err);
        loadLocalStorageBackupLegacySync();
    });

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
// 🆕 IndexedDB ስራ ላይ ካልዋለ (ለምሳሌ የድሮ browser) ብቻ የሚያገለግል ጥንቅቅ ያለ localStorage fallback
function loadLocalStorageBackupLegacySync() {
    let backup = localStorage.getItem(LOCAL_DB_KEY);
    let queue = localStorage.getItem(ACTION_QUEUE_KEY);
    if (queue) { try { actionQueue = JSON.parse(queue) || []; } catch(e){} }
    if(backup) {
        let parsedBackup = JSON.parse(backup);
        applyBackupToLocalDB(parsedBackup);
    }
    if(typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns();
    if(typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
}
function applyBackupToLocalDB(parsedBackup) {
    if(!parsedBackup) return;
    if(parsedBackup.tenants) localDB.tenants = parsedBackup.tenants;
    if(parsedBackup.buyers) localDB.buyers = parsedBackup.buyers;
    if(parsedBackup.revenueAuthorities) localDB.revenueAuthorities = parsedBackup.revenueAuthorities;
    if(parsedBackup.motors) localDB.motors = parsedBackup.motors;
    if(parsedBackup.motorQuotas) localDB.motorQuotas = parsedBackup.motorQuotas; 
    if(parsedBackup.taxReceipts) localDB.taxReceipts = parsedBackup.taxReceipts;
    if(parsedBackup.tariffs) localDB.tariffs = parsedBackup.tariffs;
    if(parsedBackup.public_locations) localDB.public_locations = parsedBackup.public_locations;
    if(parsedBackup.businessTypes) localDB.businessTypes = parsedBackup.businessTypes;
    if(parsedBackup.adminSettings) {
        localDB.adminSettings = parsedBackup.adminSettings;
        if (localDB.adminSettings.deliveryCommissionRate === undefined) {
            localDB.adminSettings.deliveryCommissionRate = 10;
        }
    }
}
// 🆕 አሁን async ሆኗል፣ ግን ስሙ እና ጥሪው (loadLocalStorageBackup()) ልክ እንደ ቀድሞው ነው
async function loadLocalStorageBackup() {
    try {
        let parsedQueue = await idbGet(ACTION_QUEUE_KEY);
        // actionQueue ገና ካልተነካካ (ተጠቃሚው በዚህ መሃል action ካልጨመረ) ብቻ ከ IDB ይሙላ
        if (parsedQueue && actionQueue.length === 0) actionQueue = parsedQueue;

        let parsedBackup = await idbGet(LOCAL_DB_KEY);
        applyBackupToLocalDB(parsedBackup);

        if(typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns();
        if(typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
    } catch (err) {
        console.error('IndexedDB read error, ወደ localStorage fallback ተመልሷል:', err);
        loadLocalStorageBackupLegacySync();
    }
}
function saveToLocalStorage() {
    idbSet(LOCAL_DB_KEY, localDB).catch(err => {
        console.error('IndexedDB write failed, ወደ localStorage fallback ተመልሷል:', err);
        try { localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(localDB)); } catch(e){}
    });
}
function saveActionQueue() {
    idbSet(ACTION_QUEUE_KEY, actionQueue).catch(err => {
        console.error('IndexedDB queue write failed, ወደ localStorage fallback ተመልሷል:', err);
        try { localStorage.setItem(ACTION_QUEUE_KEY, JSON.stringify(actionQueue)); } catch(e){}
    });
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
   saveActionQueue();

   // 🆕 FIX: እያንዳንዱ አዲስ ትዕዛዝ ገፁ ሳይታደስ ወዲያውኑ ወደ Firebase እንዲላክ (ከዚህ በፊት እዚህ ውስጥ
   // ምንም የመላኪያ ጥሪ ስላልነበረ፣ ዳታው ገፁ እስኪታደስ ወይም ኢንተርኔት off/on እስኪደረግ ድረስ ተጣብቆ ይቀር ነበር)
   if (isOnline && typeof db !== 'undefined') {
       processActionQueue();
   }
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
            saveActionQueue();
            isProcessingQueue = false;
            if (actionQueue.length > 0) processActionQueue(); 
        }).catch(err => {
            console.error("Firebase Sync Error:", err);
            currentAction.retryCount += 1;           
            // ❌ ዳታው እንዳይጠፋ ከ Queue ውስጥ አይሰረዝም!
            saveActionQueue();
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
        saveActionQueue();
        isProcessingQueue = false;
        if (actionQueue.length > 0) processActionQueue();
    }
}
const cleanData = (data) => data !== undefined ? JSON.parse(JSON.stringify(data)) : null;
// 🆕 FIX: የገቢዎች ገፅ (revenue) ላይ ያለው real-time listener
// (`tirfe_system/tenants` orderByChild('locationKey')) ውጤት እንዲያገኝ፣ ማንኛውም
// ተከራይ/ሞተረኛ ዳታ ወደ Firebase ሲላክ locationKey የሚባል ፊልድ ከ region/zone/woreda
// ተሰልቶ አብሮ መላክ አለበት። ይህ ፊልድ ከዚህ በፊት በጭራሽ አልተላከም ነበር፣ ስለዚህ ያ Query ምንም
// ውጤት አያገኝም ነበር (ቫት ሲሰበሰብ ገቢዎች ገፅ ላይ ቀጥታ የማይታየው በዚህ ምክንያት ነው)።
function computeLocationKey(record) {
    if(!record) return undefined;
    return `${record.region || ''}_${record.zone || ''}_${record.woreda || ''}`;
}
// --------------------------------------------------------
// ☁️ 3. ፋይሎችን ወደ Firebase Storage የመጫኛ ረዳት ፋንክሽን
// --------------------------------------------------------
async function uploadImageToStorage(file, folderName, username) {
    if (!file) return null;
     try {
       let fileExtension = file.name.split('.').pop();
        let uniqueFileName = `${folderName}_${Date.now()}.${fileExtension}`;
        let fullPath = `kyc_documents/${username}/${uniqueFileName}`;
        let storageRef = firebase.storage().ref(fullPath);
        let snapshot = await storageRef.put(file);
        let downloadURL = await snapshot.ref.getDownloadURL();
        return downloadURL;
      } catch (error) {
        console.error("Storage Upload Error:", error);
        throw error;
    }
}
// --------------------------------------------------------
// 🚀 4. ሚናን መሰረት ያደረጉ የማመሳሰያ ፋንክሽኖች (ሰዓት የተስተካከለበት)
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
function pushMotorFirebase() {
    if(typeof currentMotor !== 'undefined' && currentMotor) {
        let currentTime = Date.now();
        let motorData = cleanData(localDB.motors[currentMotor.username]);
        if(motorData) {
            motorData.lastUpdated = currentTime;
            motorData.locationKey = computeLocationKey(motorData);
            queueAction('UPDATE', 'motors', currentMotor.username, motorData);
        }
    }
}
// --------------------------------------------------------
// 🛠️ አዲስ የተጨመሩ - ከአድሚን ገፅ ላይ ማንኛውንም ተጠቃሚ (ተከራይ/ሞተረኛ/ገቢዎች) በቀጥታ
// --------------------------------------------------------

function pushAdminRecordUpdate(collection, docId, data) {
    let cleaned = cleanData(data);
    if(!cleaned || !docId) return;
    cleaned.lastUpdated = Date.now();
    if(collection === 'tenants' || collection === 'motors') {
        cleaned.locationKey = computeLocationKey(cleaned);
    }
    queueAction('UPDATE', collection, docId, cleaned);
    saveToLocalStorage();
    processActionQueue();   
}
function pushAdminRecordDelete(collection, docId) {
    if(!docId) return;
    queueAction('DELETE', collection, docId, null);
    saveToLocalStorage();
    processActionQueue();
}
function pushAdminTenantUpdate(username, tenantData) {
    let cleaned = cleanData(tenantData);
    if(!cleaned || !username) return;
    cleaned.lastUpdated = Date.now();
    cleaned.locationKey = computeLocationKey(cleaned);
    queueAction('UPDATE', 'tenants', username, cleaned);
    let summary = Object.assign({}, cleaned);
    delete summary.items; delete summary.products; delete summary.catalog; delete summary.taxReceipts;
    queueAction('UPDATE', 'admin_tenant_summary', username, summary);
    saveToLocalStorage();
    processActionQueue();
}
function pushAdminTenantDelete(username) {
    if(!username) return;
    queueAction('DELETE', 'tenants', username, null);
    queueAction('DELETE', 'public_tenants', username, null);
    queueAction('DELETE', 'admin_tenant_summary', username, null);
    saveToLocalStorage();
    processActionQueue();
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
     const staticNodes = ['tariffs', 'businessTypes', 'adminSettings', 'public_locations', 'motorQuotas'];
        staticNodes.forEach(node => {
            db.ref(`tirfe_system/${node}`).on('value', (snapshot) => {
                 if(snapshot.exists()) {
                    localDB[node] = snapshot.val();
                     saveToLocalStorage();
                     triggerUIRefresh();
                     }
 }, (error) => {
               console.log(`Firebase Error on ${node}, running offline mode.`);
               isOnline = false; handleOnlineStatus();
          });
        });
    }
    fetchStaticData();
    window.setupSecureUserListeners = function() {
        // ✅ አሮጌ ዳታ አዲሱን እንዳያጠፋ የተጨመረ መከላከያ 
      function shouldUpdateLocal(incomingData, localData, collection, docId) {
            // ✅ ተስተካክሏል: ገና ያልተላከ ዳታ በ Queue ውስጥ ካለ የምናግድበት ለዚያው collection/docId ብቻ ነው
            // (ከዚህ በፊት ማንኛውም unrelated pending action ካለ ሁሉንም incoming data ላይመታ ይከለክል ነበር)
            let pendingQueue = actionQueue || [];
            if (collection) {
                let hasPendingForThis = pendingQueue.some(a =>
                    a.collection === collection && (!docId || a.docId === docId)
                );
                if (hasPendingForThis) return false;
            }
            if (!localData) return true;
            let incomingTime = (incomingData && typeof incomingData.lastUpdated === 'number') ? incomingData.lastUpdated : 0;
            let localTime = (localData && typeof localData.lastUpdated === 'number') ? localData.lastUpdated : 0;
            return incomingTime > localTime; 
        }
        if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin' && !window.adminListenerAttached) {
            window.adminListenerAttached = true;
            const adminNodes = [
                { fbNode: 'admin_tenant_summary', localKey: 'tenants' }, 
                { fbNode: 'buyers', localKey: 'buyers' }, 
                { fbNode: 'motors', localKey: 'motors' },
                { fbNode: 'revenueAuthorities', localKey: 'revenueAuthorities' }
            ];
            adminNodes.forEach(nodeObj => {
                let fbPath = nodeObj.fbNode;
                let localDbPath = nodeObj.localKey;
                if (!localDB[localDbPath]) localDB[localDbPath] = {}; 
                let ref = db.ref(`tirfe_system/${fbPath}`);
                ref.on('child_added', (snapshot) => {
                   let incomingData = snapshot.val();
                    let childKey = snapshot.key;
                    if(shouldUpdateLocal(incomingData, localDB[localDbPath][childKey], fbPath, childKey)) {
        localDB[localDbPath][childKey] = incomingData;
            saveToLocalStorage(); triggerUIRefresh();
                    }
                });
                ref.on('child_changed', (snapshot) => {
                    let incomingData = snapshot.val();
                    let childKey = snapshot.key;
                    if(shouldUpdateLocal(incomingData, localDB[localDbPath][childKey], fbPath, childKey)) {
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
                    if(shouldUpdateLocal(incomingData, localDB.tenants[currentTenant.username], 'tenants', currentTenant.username)) {
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
            function scrubTenantForBuyer(t) {
                if(!t) return t;
                delete t.password; delete t.activationCode; delete t.staffAccounts;
                delete t.telegramToken; delete t.bankAccount;
                return t;
            }
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
            // 🆕 የገቢዎች ሰራተኛው ክልል+ዞን+ወረዳ የተጣመረ መለያ (locationKey) - ተመሳሳይ ስም ያላቸው ወረዳዎች (ለምሳሌ በተለያዩ ዞን ያሉ) እንዳይምታቱ
            let officerLocKey = `${currentRevenueOfficer.authRegion}_${currentRevenueOfficer.authZone}_${currentRevenueOfficer.authWoreda}`;
            // 🛠️ ማስተካከያ: ሙሉ የሀገሪቱን ነጋዴዎች ከማውረድ ይልቅ Firebase ላይ locationKey ተመሳሳይ የሆኑትን ብቻ Query ማድረግ (ደህንነትንም ፍጥነትንም ያሻሽላል)
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
        if(typeof currentMotor !== 'undefined' && currentMotor && !window.motorListenerAttached) {
            window.motorListenerAttached = true;
            db.ref(`tirfe_system/motors/${currentMotor.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    let incomingData = snapshot.val();
                    if(shouldUpdateLocal(incomingData, localDB.motors[currentMotor.username], 'motors', currentMotor.username)) {
                        localDB.motors[currentMotor.username] = incomingData;
                        saveToLocalStorage(); triggerUIRefresh();
                    }
                }
           });
        }
    };
    setupSecureUserListeners();
    processActionQueue();
    
    function triggerUIRefresh() {
        if(typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns();
        if(typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();

        // 1. የተከራይ (Tenant) የብሎክ እና ሪፍሬሽ ቼክ
        if(typeof currentTenant !== 'undefined' && currentTenant) {
            let checkTenant = localDB.tenants[currentTenant.username];
            // logout() የነበረውን ወደ forceLogout() ቀይረነዋል
            if(!checkTenant || checkTenant.status === "blocked") { 
                alert("አካውንትዎ በአድሚን ታግዷል!"); // ተጠቃሚው ለምን እንደወጣ እንዲያውቅ
                if(typeof forceLogout === 'function') forceLogout();
                return; 
            }
            currentTenant = checkTenant;
            if(typeof renderApp === 'function') renderApp();
            if(typeof renderTenantTaxReceipts === 'function') renderTenantTaxReceipts();
        }
     
        // 2. የገዢ (Buyer) ሪፍሬሽ ቼክ
        if(typeof currentBuyer !== 'undefined' && currentBuyer) {
            let checkBuyer = localDB.buyers[currentBuyer.username];
            if(!checkBuyer || checkBuyer.status === "blocked") {
                if(typeof forceLogout === 'function') forceLogout();
                return;
            }
            currentBuyer = checkBuyer;
        }
        if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();

        // 3. የገቢዎች (Revenue) ሪፍሬሽ ቼክ
        if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
            if(typeof renderRevenuePanel === 'function') renderRevenuePanel();
        }

        // 4. የሞተረኛ (Motor) የብሎክ እና ሪፍሬሽ ቼክ
        if(typeof currentMotor !== 'undefined' && currentMotor) {
            let checkMotor = localDB.motors[currentMotor.username];
            if(!checkMotor) {
                if(typeof forceLogout === 'function') forceLogout();
                return;
            }
            if(checkMotor.status === "blocked" && !checkMotor.creditBlocked) {
                alert("የሞተረኛ አካውንትዎ በአድሚን ታግዷል!");
                if(typeof forceLogout === 'function') forceLogout();
                return;
            }
            currentMotor = checkMotor;
            if(typeof renderMotorPage === 'function') renderMotorPage();
        }
        // 5. የአድሚን ሪፍሬሽ
        if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
            if(typeof renderAdminPanel === 'function') renderAdminPanel();
            if(typeof renderAdminMotors === 'function') renderAdminMotors();
            if(typeof renderAdminBuyers === 'function') renderAdminBuyers();
        }
    }
}
