let localDB = { 
    tenants: {}, 
    buyers: {}, 
    revenueAuthorities: {}, 
    taxReceipts: [], 
    // የደህንነት ማሻሻያ፡ adminAppPass እና tgToken ከዚህ ላይ ሙሉ በሙሉ ጠፍተዋል
    adminSettings: { bankAccount: '', vatRate: 0 }, 
    tariffs: { low: 500, medium: 1000, high: 2000 }, 
    businessTypes: ["አጠቃላይ ንግድ", "ኤሌክትሮኒክስ", "ፋርማሲ", "ልብስ እና ጫማ", "ግሮሰሪ", "ኮስሞቲክስ", "ካፌ እና ሬስቶራንት"] 
};

let isOnline = true;

window.addEventListener('online', handleOnlineStatus);
window.addEventListener('offline', handleOnlineStatus);

// ፔጁ ሪፍሬሽ ሲደረግ ዳታው ወዲያውኑ እንዲጫን ይህ ፈንክሽን መጀመሪያ ላይ መጠራት አለበት
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
        
        if(parsedBackup.tenants) localDB.tenants = parsedBackup.tenants;
        if(parsedBackup.buyers) localDB.buyers = parsedBackup.buyers;
        if(parsedBackup.revenueAuthorities) localDB.revenueAuthorities = parsedBackup.revenueAuthorities;
        if(parsedBackup.taxReceipts) localDB.taxReceipts = parsedBackup.taxReceipts;
        if(parsedBackup.tariffs) localDB.tariffs = parsedBackup.tariffs;
        if(parsedBackup.businessTypes) localDB.businessTypes = parsedBackup.businessTypes;
        if(parsedBackup.adminSettings) localDB.adminSettings = parsedBackup.adminSettings;

        // ዳታው ሲጫን የክልል/ዞን እና የንግድ ዘርፍ ምርጫዎችን አፕዴት ያድርግ
        if(typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns();
        if(typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
    }
}

function saveToLocalStorage() {
    localStorage.setItem('tirfe_local_db', JSON.stringify(localDB));
}

function pushToFirebase() { 
    // ማንኛውም ዳታ ሲገባ ሁልጊዜ በመጀመሪያ ሎካል ስቶሬጅ ላይ ሴቭ እንዲያደርግ ተደርጓል
    saveToLocalStorage();
    if(isOnline && typeof db !== 'undefined') { 
        // የደህንነት ማሻሻያ፡ ሙሉ ዳታቤዙን overwrite ከማድረግ ይልቅ ተጠቃሚው የራሱን ዳታ ብቻ ሴቭ እንዲያደርግ ተቀይሯል
        if(typeof currentTenant !== 'undefined' && currentTenant) {
            db.ref(`tirfe_system/tenants/${currentTenant.username}`).set(localDB.tenants[currentTenant.username]);
        }
        if(typeof currentBuyer !== 'undefined' && currentBuyer) {
            db.ref(`tirfe_system/buyers/${currentBuyer.username}`).set(localDB.buyers[currentBuyer.username]);
        }
        if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
            db.ref(`tirfe_system/revenueAuthorities/${currentRevenueOfficer.username}`).set(localDB.revenueAuthorities[currentRevenueOfficer.username]);
        }
        
        // የጋራ ዳታዎችን Update ማድረግ እንጂ Set አናደርግም (የሌላውን ዳታ ላለማጥፋት)
        db.ref('tirfe_system').update({
            taxReceipts: localDB.taxReceipts,
            tariffs: localDB.tariffs,
            businessTypes: localDB.businessTypes
        });
    } 
}

// የደህንነት ማሻሻያ፡ ቴሌግራም መልእክት አላላክ ወደ Backend API ተቀይሯል
function sendAdminTelegramAlert(message) {
    // Cloud Functions URL (ከፋየርቤዝ የሚሰጥህን እዚህ ጋር ቀይረው)
    const backendAPIUrl = "https://us-central1-tirfe-app.cloudfunctions.net/sendAdminTelegram"; 
    
    fetch(backendAPIUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message })
    }).catch(err => console.log("Admin Telegram API Alert Error: ", err));
}

// የተከራይ ቴሌግራም መልእክት አላላክ
function sendTelegramAlert(message) {
    if (typeof currentTenant === 'undefined' || !currentTenant) return;
    
    const backendAPIUrl = "https://us-central1-tirfe-app.cloudfunctions.net/sendTenantTelegram"; 

    fetch(backendAPIUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username: currentTenant.username, 
            text: message 
        })
    }).catch(err => console.log("Telegram API Error: ", err));
}

// የደህንነት ማሻሻያ፡ ሙሉ ዳታቤዝ በአንድ ጊዜ ከማውረድ ይልቅ ደህንነቱ በተጠበቀ ሁኔታ መከፋፈል
if(typeof db !== 'undefined') {
    
    // 1. የጋራ (Public) የሆኑትን ብቻ ሲስተሙ ሲነሳ ይጎትታል
    const publicNodes = ['tariffs', 'businessTypes', 'adminSettings'];
    publicNodes.forEach(node => {
        db.ref(`tirfe_system/${node}`).on('value', (snapshot) => {
            if(snapshot.exists()) {
                localDB[node] = snapshot.val();
                saveToLocalStorage();
                triggerUIRefresh();
            }
        }, (error) => {
            console.log(`Firebase Error on ${node}, running offline mode.`);
            isOnline = false;
            handleOnlineStatus();
        });
    });

    // 2. የተጠቃሚዎችን የግል ዳታ በየራሳቸው (Secure Fetching) የሚጎትት ፈንክሽን
    window.setupSecureUserListeners = function() {
        if(typeof currentTenant !== 'undefined' && currentTenant) {
            db.ref(`tirfe_system/tenants/${currentTenant.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    localDB.tenants[currentTenant.username] = snapshot.val();
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });
        }
        if(typeof currentBuyer !== 'undefined' && currentBuyer) {
            db.ref(`tirfe_system/buyers/${currentBuyer.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    localDB.buyers[currentBuyer.username] = snapshot.val();
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });
        }
        if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
            db.ref(`tirfe_system/revenueAuthorities/${currentRevenueOfficer.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    localDB.revenueAuthorities[currentRevenueOfficer.username] = snapshot.val();
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });
        }
    };

    // ሎካል ስቶሬጅ ላይ ከዚህ በፊት ሎግ-ኢን ያደረገ ሰው ካለ ቼክ እንዲያደርግ
    setupSecureUserListeners();
    
    // የ UI ሪፍሬሽ ሎጂክ በየቦታው እንዳይደገም በአንድ ፈንክሽን ተሰብስቧል
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
        
        let adminPage = document.getElementById('adminPage');
        if(adminPage && !adminPage.classList.contains('hidden')) { 
            if(typeof renderAdminPanel === 'function') renderAdminPanel();
        }
    }
}
