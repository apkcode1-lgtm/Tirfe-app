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

// ⚠️ ማሻሻያ 1: ፋየርቤዝ ላይ ዳታ ሲላክ የሌላውን ሰው ዳታ እንዳያጠፋ (Least Privilege Push)
function pushToFirebase() { 
    saveToLocalStorage();
    if(isOnline && typeof db !== 'undefined') { 
        
        const cleanData = (data) => data !== undefined ? JSON.parse(JSON.stringify(data)) : null;

        if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
            // አድሚን ብቻ ነው ጀነራል ሴቲንግ እና ሌሎች የጋራ ዳታዎችን መላክ የሚችለው
            let adminUpdates = {};
            
            // የ public ዳታ ማዘመኛ
            if (localDB.tenants) {
                let cTenants = cleanData(localDB.tenants);
                let pTenants = getPublicTenantsData(cTenants);
                for(let t in pTenants) { adminUpdates[`public_tenants/${t}`] = pTenants[t]; }
                for(let t in cTenants) { adminUpdates[`tenants/${t}`] = cTenants[t]; }
            }
            
            adminUpdates['motorQuotas'] = cleanData(localDB.motorQuotas) || {};
            adminUpdates['tariffs'] = cleanData(localDB.tariffs) || {};
            adminUpdates['businessTypes'] = cleanData(localDB.businessTypes) || [];
            adminUpdates['adminSettings'] = cleanData(localDB.adminSettings) || {};

            db.ref('tirfe_system').update(adminUpdates)
              .catch(err => console.error("Firebase Admin Sync Error:", err));

        } else {
            // ተራ ተጠቃሚዎች የየራሳቸውን መረጃ ብቻ (Deep Path) ወደ ፋየርቤዝ ይልካሉ።
            // የ `fallbackUpdates` አደገኛ ኮድ ሙሉ በሙሉ ጠፍቷል!

            if(typeof currentTenant !== 'undefined' && currentTenant) {
                let tenantData = cleanData(localDB.tenants[currentTenant.username]);
                if(tenantData) {
                    let updates = {};
                    updates[`tenants/${currentTenant.username}`] = tenantData;
                    
                    let publicT = getPublicTenantsData({ [currentTenant.username]: tenantData });
                    updates[`public_tenants/${currentTenant.username}`] = publicT[currentTenant.username];

                    db.ref('tirfe_system').update(updates)
                    .catch(err => console.error("Firebase Tenant Sync Error:", err));
                }
            }
            if(typeof currentBuyer !== 'undefined' && currentBuyer) {
                let buyerData = cleanData(localDB.buyers[currentBuyer.username]);
                if(buyerData) {
                    db.ref(`tirfe_system/buyers/${currentBuyer.username}`).set(buyerData)
                    .catch(err => console.error("Firebase Buyer Sync Error:", err));
                }
            }
            if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
                let revData = cleanData(localDB.revenueAuthorities[currentRevenueOfficer.username]);
                if(revData) {
                    db.ref(`tirfe_system/revenueAuthorities/${currentRevenueOfficer.username}`).set(revData)
                    .catch(err => console.error("Firebase Revenue Sync Error:", err));
                }
                if(localDB.motorQuotas) {
                    db.ref(`tirfe_system/motorQuotas`).set(cleanData(localDB.motorQuotas))
                    .catch(err => console.error("Firebase Quota Sync Error:", err));
                }
            }
            if(typeof currentMotor !== 'undefined' && currentMotor) {
                let motorData = cleanData(localDB.motors[currentMotor.username]);
                if(motorData) {
                    db.ref(`tirfe_system/motors/${currentMotor.username}`).set(motorData)
                    .catch(err => console.error("Firebase Motor Sync Error:", err));
                }
            }
        }
    } 
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

    // ⚠️ ማሻሻያ 3: የ Role-based መረጃ ማዳመጥ (Listen) - እያንዳንዱ ተጠቃሚ የራሱን ስራ ብቻ ያወርዳል
    window.setupSecureUserListeners = function() {
        
        // 1. አድሚን (Admin) - የሁሉንም ሰው ጽሁፍ ዳታ ያወርዳል (Limit ተደርጎ)
        if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin' && !window.adminListenerAttached) {
            window.adminListenerAttached = true;
            
            // የሪፖርቶች/ደረሰኞች ብዛት እንዳይጭን 100 ብቻ እንዲያመጣ ተገድቧል
            db.ref(`tirfe_system/taxReceipts`).orderByKey().limitToLast(100).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    localDB.taxReceipts = Object.values(snapshot.val()); // Convert object to array if needed
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });

            const adminNodes = ['tenants', 'buyers', 'motors'];
            adminNodes.forEach(node => {
                db.ref(`tirfe_system/${node}`).on('value', (snapshot) => {
                    if(snapshot.exists()) { localDB[node] = snapshot.val(); saveToLocalStorage(); triggerUIRefresh(); }
                });
            });
        }

        // 2. ሻጭ (Tenant) - የራሱን ፕሮፋይል እና አዲስ የገቡ ትዕዛዞችን ብቻ ይከታተላል
        if(typeof currentTenant !== 'undefined' && currentTenant && !window.tenantListenerAttached) {
            window.tenantListenerAttached = true;
            db.ref(`tirfe_system/tenants/${currentTenant.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    localDB.tenants[currentTenant.username] = snapshot.val();
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });
            // የራሱን ደረሰኞች ብቻ ማዳመጥ ከተፈለገ (አሁን ባለው UI መሰረት)
            db.ref(`tirfe_system/taxReceipts`).orderByChild('tenantUsername').equalTo(currentTenant.username).on('value', (snapshot) => {
                 if(snapshot.exists()){
                     // UI logic handling specific tenant receipts
                 }
            });
        }
        
        // (የገዥ ኮድ (Buyer) ለጊዜው አልተቀየረም - በቀጣይ እንደምናወራው)
        if(typeof currentBuyer !== 'undefined' && currentBuyer && !window.buyerListenerAttached) {
            window.buyerListenerAttached = true;
            db.ref(`tirfe_system/buyers/${currentBuyer.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) { localDB.buyers[currentBuyer.username] = snapshot.val(); saveToLocalStorage(); triggerUIRefresh(); }
            });
            db.ref(`tirfe_system/public_tenants`).on('value', (snapshot) => {
                if(snapshot.exists()) { localDB.tenants = snapshot.val(); saveToLocalStorage(); if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog(); }
            });
        }
        
        // 3. የገቢዎች ሰራተኛ (Revenue) - የግብር ዳታ እና የራሱን ፕሮፋይል ብቻ
        if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer && !window.revenueListenerAttached) {
            window.revenueListenerAttached = true;
            db.ref(`tirfe_system/revenueAuthorities/${currentRevenueOfficer.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) { localDB.revenueAuthorities[currentRevenueOfficer.username] = snapshot.val(); saveToLocalStorage(); triggerUIRefresh(); }
            });
            // የቫት ሪፖርቶችን ብቻ ያዳምጣል (ሌላ ትርፍ ፎቶ አያወርድም)
            db.ref(`tirfe_system/motorQuotas`).on('value', (snapshot) => {
                if(snapshot.exists()) { localDB.motorQuotas = snapshot.val(); saveToLocalStorage(); }
            });
        }
        
        // 4. ሞተረኛ (Motor) - የራሱን ፕሮፋይል እና የትዕዛዝ ማሳወቂያ ብቻ ያወርዳል
        if(typeof currentMotor !== 'undefined' && currentMotor && !window.motorListenerAttached) {
            window.motorListenerAttached = true;
            db.ref(`tirfe_system/motors/${currentMotor.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    localDB.motors[currentMotor.username] = snapshot.val();
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });
            // ማሳሰቢያ፡ ትዕዛዝ ሲገባ ብቻ listen የሚያደርገውን ኖድ UI ላይ እንደሰራኸው ታክለዋለህ
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
