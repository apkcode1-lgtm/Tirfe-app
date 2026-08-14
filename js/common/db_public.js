// ==========================================
// 📁 db_public.js - የጋራ ዋና ክፍል (ሁሉም ገፆች የሚጫኑት)
// =========================================
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

// 🆕 ሌሎች ፋይሎች (login check, renderApp 
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
    // 🛠️ ማስተካከያ: db.ref().update()/.set() ውስጥ payload ላይ undefined ካለ Firebase
    // SDK synchronously ስህተት ይወረውራል (throw)። ይህ ከዚህ በፊት try/catch ስላልነበረው
    // ሙሉውን actionQueue ላይመለስ ድረስ ያደናቅፍ ነበር (isProcessingQueue ተጣብቆ ይቀር ነበር)።
    // አሁን ይህን ስህተት እንይዘዋለን፣ ችግር ያለበትን ንጥል ብቻ አልፈን ወደ ቀጣዩ እንቀጥላለን።
    try {
        if (currentAction.actionType === 'UPDATE') {
            fbRequest = db.ref(refPath).update(currentAction.payload);
        } else if (currentAction.actionType === 'SET') {
            fbRequest = db.ref(refPath).set(currentAction.payload);
        } else if (currentAction.actionType === 'DELETE') {
            fbRequest = db.ref(refPath).remove();
        }
    } catch (syncErr) {
        console.error("Firebase Sync Error (payload/validation):", syncErr, currentAction);
        // ችግር ያለበትን ንጥል ከ queue አውጣ (ደግመን ብንሞክር ተመሳሳይ ስህተት ይደግማል)፣
        // ግን ስርዓቱ ጠቅልሎ እንዳይደናቀፍ isProcessingQueue ን መልስ
        actionQueue.shift();
        saveActionQueue();
        isProcessingQueue = false;
        if (actionQueue.length > 0) processActionQueue();
        return;
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
// 📜 Dynamic Script Loader - auth.js ከ login በኋላ ተገቢውን db_modules/db_X.js
// በትክክለኛው ጊዜ (ደህንነት cookie ከተቀመጠ በኋላ) ጭኖ push ለማድረግ የሚጠቀምበት
// --------------------------------------------------------
function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Script load failed: ' + src));
        document.head.appendChild(s);
    });
}

// --------------------------------------------------------
// 🚀 4. Generic Push Dispatcher
// --------------------------------------------------------
function pushToFirebase() {
    saveToLocalStorage();
    if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
        if (typeof pushAdminFirebase === 'function') pushAdminFirebase();
    } else {
        if (typeof pushTenantFirebase === 'function') pushTenantFirebase();
        if (typeof pushBuyerFirebase === 'function') pushBuyerFirebase();
        if (typeof pushRevenueFirebase === 'function') pushRevenueFirebase();
        if (typeof pushMotorFirebase === 'function') pushMotorFirebase();
    }
    processActionQueue();
}
// --------------------------------------------------------
// 🆕 Registration-time Mirror Writer (session-independent)
// pushTenantFirebase() ከ currentTenant (login session global) ይነበባል፣
// ስለዚህ በምዝገባ ወቅት (login ገና ስላልተደረገ) ስራ ላይ አይውልም (silent no-op)።
// ይህ function ግን username/tenantData በቀጥታ parameter ስለሚቀበል
// index.html (ገና login ባልተደረገበት ገጽ) ላይም መጠቀም ይቻላል - db_public.js
// ሁሉም ገጽ ላይ ስለሚጫን።
// --------------------------------------------------------
function writeTenantMirrorsOnRegister(username, tenantData) {
    let currentTime = Date.now();

    queueAction('UPDATE', 'public_tenants', username, {
        shopName: tenantData.shopName, businessType: tenantData.businessType,
        phone: tenantData.phone, address: tenantData.address,
        googleMapsLink: tenantData.googleMapsLink, shopLogo: tenantData.shopLogo,
        lastUpdated: currentTime
    });

    queueAction('UPDATE', 'buyer_catalog', username, {
        status: tenantData.status, shopName: tenantData.shopName,
        businessType: tenantData.businessType, phone: tenantData.phone,
        address: tenantData.address, telegram: tenantData.telegram,
        shopLogo: tenantData.shopLogo, lastUpdated: currentTime,
        data: { inventory: [], deliveryOrders: [] }
    });

    queueAction('UPDATE', 'revenue_view', username, {
        username: tenantData.username, fullName: tenantData.fullName,
        shopName: tenantData.shopName, businessType: tenantData.businessType,
        phone: tenantData.phone, gmail: tenantData.gmail,
        region: tenantData.region, zone: tenantData.zone, woreda: tenantData.woreda,
        kebele: tenantData.kebele, houseNo: tenantData.houseNo,
        tinNumber: tenantData.tinNumber, locationKey: tenantData.locationKey,
        lastUpdated: currentTime, data: { accumulatedVat: 0 }
    });

    queueAction('UPDATE', 'admin_tenant_summary', username, {
        username: tenantData.username, shopName: tenantData.shopName,
        businessType: tenantData.businessType, fullName: tenantData.fullName,
        phone: tenantData.phone, telegram: tenantData.telegram,
        address: tenantData.address, googleMapsLink: tenantData.googleMapsLink,
        contractType: tenantData.contractType, registrationFee: tenantData.registrationFee,
        expiryDate: tenantData.expiryDate,
        // 🛠️ ማስተካከያ: expiryNotified በአዲስ ምዝገባ ወቅት ገና አልተፈጠረም (undefined ነው)፣
        // Firebase undefined ያለበት object አይቀበልም እና ሙሉ queue ን ያደናቅፋል - ስለዚህ
        // fallback (false) ጨምረናል
        expiryNotified: tenantData.expiryNotified || false,
        status: tenantData.status,
        uid: tenantData.uid, locationKey: tenantData.locationKey,
        lastUpdated: currentTime
    });

    processActionQueue();
}
// --------------------------------------------------------
// 🔔 UI Refresh Orchestrator - registry pattern
// --------------------------------------------------------
function triggerUIRefresh() {
    if(typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns();
    if(typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();

    if(typeof window.refreshTenantUI === 'function') window.refreshTenantUI();
    if(typeof window.refreshBuyerUI === 'function') window.refreshBuyerUI();
    if(typeof window.refreshRevenueUI === 'function') window.refreshRevenueUI();
    if(typeof window.refreshMotorUI === 'function') window.refreshMotorUI();
    if(typeof window.refreshAdminUI === 'function') window.refreshAdminUI();
}
// --------------------------------------------------------
// 🔐 shouldUpdateLocal - ሁሉም db_modules/*.js listeners የሚጠቀሙት የጋራ helper
// (ገና ያልተላከ ዳታ በ Queue ውስጥ ካለ incoming update እንዳይተካው የሚከላከል)
// --------------------------------------------------------
function shouldUpdateLocal(incomingData, localData, collection, docId) {
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
// --------------------------------------------------------
// 🎧 Listener Orchestrator - registry pattern
// --------------------------------------------------------
if (typeof db !== 'undefined') {
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
    };

    window.setupSecureUserListeners = function() {
        if (typeof window.setupAdminListeners === 'function') window.setupAdminListeners();
        if (typeof window.setupTenantListeners === 'function') window.setupTenantListeners();
        if (typeof window.setupBuyerListeners === 'function') window.setupBuyerListeners();
        if (typeof window.setupRevenueListeners === 'function') window.setupRevenueListeners();
        if (typeof window.setupMotorListeners === 'function') window.setupMotorListeners();
    };

    // 🆕 SPLIT-FIX
    document.addEventListener('DOMContentLoaded', function() {
        fetchStaticData();
        setupSecureUserListeners();
        processActionQueue();
    });                                    
}
