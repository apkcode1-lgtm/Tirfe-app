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
    actionQueue: []
};

let isOnline = navigator.onLine !== undefined ? navigator.onLine : true;

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
        pushToFirebase();
    }
}

function loadLocalStorageBackup() {
    let backup = localStorage.getItem('tirfe_local_db');

    if(backup) {
        let parsedBackup = JSON.parse(backup);
        
        // ዳታውን ሎድ ስናደርግ ለተጠቃሚው ሚና የሚያስፈልገውን ብቻ እናወጣለን
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

// ሚስጥራዊ የሆኑትን የሻጭ መረጃዎች አውጥቶ ለ public የሚያዘጋጅ
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

// ⚠️ ማሻሻያ 1: ፋየርቤዝ ላይ ዳታ ሲላክ የሌላውን ሰው ዳታ
// ያልተገለጹ (undefined) ዳታዎችን የሚያጠራው ኮድ
const cleanData = (data) => data !== undefined ? JSON.parse(JSON.stringify(data)) : null;

// 1. የተቀየሩ ዳታዎችን ከነሙሉ ማውጫቸው (Full Path) እና ሰዓታቸው ወደ ሰልፍ ማስገቢያ
function queueAction(fullFirebasePath, specificUpdates) {
    let cleanedUpdates = cleanData(specificUpdates);
    if (!cleanedUpdates) return;

    let timestamp = new Date().getTime();
    cleanedUpdates['lastUpdated'] = timestamp; 
    
    if(!localDB.actionQueue) localDB.actionQueue = []; // እርግጠኛ ለመሆን
    localDB.actionQueue.push({ path: fullFirebasePath, data: cleanedUpdates, time: timestamp });
    saveToLocalStorage();
    
    if (isOnline) {
        processOfflineQueue();
    }
}

// 2. በሰልፍ የተያዙትን ኦፍላይን ዳታዎች ወደ ፋየርቤዝ መላኪያ
function processOfflineQueue() {
    // ⚠️ የድሮው isOnline እና db ማጣሪያ እዚህ ገብቷል
    if (!isOnline || !localDB.actionQueue || localDB.actionQueue.length === 0 || typeof db === 'undefined') return;

    let firebaseUpdates = {};
    
    localDB.actionQueue.forEach(item => {
        for (let key in item.data) {
            firebaseUpdates[`${item.path}/${key}`] = item.data[key];
        }
    });

    db.ref().update(firebaseUpdates)
        .then(() => {
            localDB.actionQueue = []; 
            saveToLocalStorage();
        })
        .catch(err => console.error("Queue Sync Error:", err));
}

// ---------------------------------------------------------
// 3. የተከፋፈሉ የፑሽ ፈንክሽኖች 
// ---------------------------------------------------------

function pushTenantFirebase(username, specificDataUpdates) {
    queueAction(`tirfe_system/tenants/${username}`, specificDataUpdates);
    
    // ⚠️ ማስተካከያ: cleanData({}, ...) የነበረው ተስተካክሏል
    let publicUpdates = cleanData(specificDataUpdates);
    if(publicUpdates) {
        delete publicUpdates.password;
        delete publicUpdates.activationCode; 
        delete publicUpdates.staffAccounts; 
        delete publicUpdates.telegramToken; 
        delete publicUpdates.bankAccount; 
        queueAction(`tirfe_system/public_tenants/${username}`, publicUpdates);
    }

    // ⚠️ ማስተካከያ: Object.assign የነበረው በ cleanData ተተክቷል
    let adminSummary = cleanData(specificDataUpdates);
    if(adminSummary) {
        delete adminSummary.items; 
        delete adminSummary.products;
        delete adminSummary.catalog;
        delete adminSummary.taxReceipts;
        queueAction(`tirfe_system/admin_tenant_summary/${username}`, adminSummary);
    }
}

function pushStaffFirebase(tenantUsername, staffUsername, specificDataUpdates) {
    queueAction(`tirfe_system/tenants/${tenantUsername}/staffAccounts/${staffUsername}`, specificDataUpdates);
}
function pushAdminFirebase(settingNodeName, specificDataUpdates) {
    queueAction(`tirfe_system/${settingNodeName}`, specificDataUpdates);
}
function pushBuyerFirebase(username, specificDataUpdates) {
    queueAction(`tirfe_system/buyers/${username}`, specificDataUpdates);
}
function pushMotorFirebase(username, specificDataUpdates) {
    queueAction(`tirfe_system/motors/${username}`, specificDataUpdates);
}
function pushRevenueFirebase(username, specificDataUpdates) {
    queueAction(`tirfe_system/revenueAuthorities/${username}`, specificDataUpdates);
}
function pushMotorQuotaFirebase(specificQuotaUpdates) {
    queueAction(`tirfe_system/motorQuotas`, specificQuotaUpdates);
}

// ---------------------------------------------------------
// 4. የተዋሃደው ዋና የ Push ፈንክሽን (Auto-detect)
// ---------------------------------------------------------
function pushToFirebase() { 
    saveToLocalStorage(); // ⚠️ ሁልጊዜ መጀመሪያ ዳታው ሎካል ላይ ሴቭ መደረግ አለበት

    // የድሮው አውቶማቲክ ማጣሪያ ወደ አዲሱ ሰልፍ (Queue) ማስገቢያነት ተቀይሯል
    if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
        pushAdminFirebase('motorQuotas', localDB.motorQuotas || {});
        pushAdminFirebase('tariffs', localDB.tariffs || {});
        pushAdminFirebase('businessTypes', localDB.businessTypes || []);
        pushAdminFirebase('adminSettings', localDB.adminSettings || {});
    } else {
        if(typeof currentTenant !== 'undefined' && currentTenant) {
            let tenantData = localDB.tenants[currentTenant.username];
            if(tenantData) pushTenantFirebase(currentTenant.username, tenantData);
        }
        if(typeof currentBuyer !== 'undefined' && currentBuyer) {
            let buyerData = localDB.buyers[currentBuyer.username];
            if(buyerData) pushBuyerFirebase(currentBuyer.username, buyerData);
        }
        if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
            let revData = localDB.revenueAuthorities[currentRevenueOfficer.username];
            if(revData) pushRevenueFirebase(currentRevenueOfficer.username, revData);
            
            if(localDB.motorQuotas) {
                pushMotorQuotaFirebase(localDB.motorQuotas);
            }
        }
        if(typeof currentMotor !== 'undefined' && currentMotor) {
            let motorData = localDB.motors[currentMotor.username];
            if(motorData) pushMotorFirebase(currentMotor.username, motorData);
        }
    }

    // ከላይ ወደ ሰልፍ የገቡትን እና ከበፊቱ የቆዩትን ሁሉ ይልካል (isOnline እና db እዚህ ውስጥ ይረጋገጣሉ)
    processOfflineQueue();
}
// 4. ኦንላይን ሲገባ (ወይም handleOnlineStatus ሲጠራ)
function pushToFirebase() { 
    processOfflineQueue();
}
// Telegram Functions
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
    
    // ⚠️ ማሻሻያ 2: የማይለዋወጡ መረጃዎችን (Static Data) አንዴ ብቻ እንዲመጡ ተደርጓል (.once)
    // ይሄ ኢንተርኔት ከመጨረስ ያድናል!
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

        // ⚠️ ማሻሻያ 3: የ Role-based መረጃ ማዳመጥ ከ "Timestamp Filtering (Conflict Resolution)" ጋር
window.setupSecureUserListeners = function() {
    
    // 🛠️ ማጣሪያ ሄልፐር ፋንክሽን፡ ከፋየርቤዝ የሚመጣው ዳታ ሎካል ካለው ማነሱን ወይም መብለጡን ያረጋግጣል
    function shouldUpdateLocal(incomingData, localData) {
        if (!localData) return true; // ሎካል ላይ ዳታ ከሌለ (አዲስ ከሆነ) እንቀበለዋለን
        let incomingTime = incomingData.lastUpdated || 0;
        let localTime = localData.lastUpdated || 0;
        return incomingTime >= localTime; // የመጣው ዳታ እኩል ወይም አዲስ ከሆነ ብቻ true ይመልሳል
    }

    // 1. አድሚን (Admin) - አጭር የሻጭ መረጃዎችን ብቻ ያወርዳል
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
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });

            ref.on('child_changed', (snapshot) => {
                let incomingData = snapshot.val();
                let childKey = snapshot.key;
                
                if(shouldUpdateLocal(incomingData, localDB[localDbPath][childKey])) {
                    localDB[localDbPath][childKey] = incomingData;
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });

            ref.on('child_removed', (snapshot) => {
                delete localDB[localDbPath][snapshot.key];
                saveToLocalStorage();
                triggerUIRefresh();
            });
        });
    }

    // 2. ሻጭ (Tenant) - የራሱን ፕሮፋይል እና አዲስ የገቡ ትዕዛዞችን ብቻ ይከታተላል
    if(typeof currentTenant !== 'undefined' && currentTenant && !window.tenantListenerAttached) {
        window.tenantListenerAttached = true;
        db.ref(`tirfe_system/tenants/${currentTenant.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) {
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.tenants[currentTenant.username])) {
                    localDB.tenants[currentTenant.username] = incomingData;
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            }
        });
        
        // የራሱን ደረሰኞች ብቻ ማዳመጥ ከተፈለገ (አሁን ባለው UI መሰረት)
        db.ref(`tirfe_system/taxReceipts`).orderByChild('tenantUsername').equalTo(currentTenant.username).on('value', (snapshot) => {
             if(snapshot.exists()){
                 // UI logic handling specific tenant receipts
             }
        });
    }
    
    // የገዥ ኮድ (Buyer)
    if(typeof currentBuyer !== 'undefined' && currentBuyer && !window.buyerListenerAttached) {
        window.buyerListenerAttached = true;
        
        // የራሱን ዳታ ማዳመጫ
        db.ref(`tirfe_system/buyers/${currentBuyer.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) { 
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.buyers[currentBuyer.username])) {
                    localDB.buyers[currentBuyer.username] = incomingData; 
                    saveToLocalStorage(); 
                    triggerUIRefresh(); 
                }
            }
        });
        
        // የሻጮችን (Public Catalog) ማዳመጫ
        db.ref(`tirfe_system/public_tenants`).on('value', (snapshot) => {
            if(snapshot.exists()) { 
                let incomingTenants = snapshot.val();
                let hasUpdates = false;
                
                // የሁሉንም ሻጭ ዳታ ስለሚያመጣ በእያንዳንዳቸው ላይ ሉፕ (Loop) አድርገን እናጣራለን
                for (let tUser in incomingTenants) {
                    let inData = incomingTenants[tUser];
                    if(shouldUpdateLocal(inData, localDB.tenants[tUser])) {
                        // የነበረውን ሎካል ዳታ ከፋየርቤዝ ከመጣው ጋር ማዋሃድ (Merge) እንጂ ሙሉ በሙሉ Overwrite እንዳያደርገው
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
    
    // 3. የገቢዎች ሰራተኛ (Revenue) - የግብር ዳታ እና የራሱን ፕሮፋይል ብቻ
    if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer && !window.revenueListenerAttached) {
        window.revenueListenerAttached = true;
        
        db.ref(`tirfe_system/revenueAuthorities/${currentRevenueOfficer.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) { 
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.revenueAuthorities[currentRevenueOfficer.username])) {
                    localDB.revenueAuthorities[currentRevenueOfficer.username] = incomingData; 
                    saveToLocalStorage(); 
                    triggerUIRefresh(); 
                }
            }
        });
        
        // የቫት ሪፖርቶችን ብቻ ያዳምጣል
        db.ref(`tirfe_system/motorQuotas`).on('value', (snapshot) => {
            if(snapshot.exists()) { 
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.motorQuotas)) {
                    localDB.motorQuotas = incomingData; 
                    saveToLocalStorage(); 
                }
            }
        });
    }
    
    // 4. ሞተረኛ (Motor) - የራሱን ፕሮፋይል እና የትዕዛዝ ማሳወቂያ ብቻ ያወርዳል
    if(typeof currentMotor !== 'undefined' && currentMotor && !window.motorListenerAttached) {
        window.motorListenerAttached = true;
        db.ref(`tirfe_system/motors/${currentMotor.username}`).on('value', (snapshot) => {
            if(snapshot.exists()) {
                let incomingData = snapshot.val();
                if(shouldUpdateLocal(incomingData, localDB.motors[currentMotor.username])) {
                    localDB.motors[currentMotor.username] = incomingData;
                    saveToLocalStorage();
                    triggerUIRefresh();
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
