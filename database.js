let localDB = { 
    tenants: {}, 
    buyers: {}, 
    revenueAuthorities: {}, 
    motors: {}, // አዲሱ የሞተረኞች ዳታቤዝ
    motorQuotas: {}, // አዲሱ የሞተረኛ ብዛት መቆጣጠሪያ (ጣሪያ) ማከማቻ
    taxReceipts: [], 
    // የዴሊቨሪ ኮሚሽን (10%) በዲፎልት ተጨምሯል
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
        
        if(parsedBackup.tenants) localDB.tenants = parsedBackup.tenants;
        if(parsedBackup.buyers) localDB.buyers = parsedBackup.buyers;
        if(parsedBackup.revenueAuthorities) localDB.revenueAuthorities = parsedBackup.revenueAuthorities;
        if(parsedBackup.motors) localDB.motors = parsedBackup.motors;
        if(parsedBackup.motorQuotas) localDB.motorQuotas = parsedBackup.motorQuotas; // የኮታ ዳታ
        if(parsedBackup.taxReceipts) localDB.taxReceipts = parsedBackup.taxReceipts;
        if(parsedBackup.tariffs) localDB.tariffs = parsedBackup.tariffs;
        if(parsedBackup.businessTypes) localDB.businessTypes = parsedBackup.businessTypes;
        
        if(parsedBackup.adminSettings) {
            localDB.adminSettings = parsedBackup.adminSettings;
            // ዲፎልት ኮሚሽን መጠን ከሌለው 10% እንዲሆን
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

function pushToFirebase() { 
    saveToLocalStorage();
    if(isOnline && typeof db !== 'undefined') { 
        
        const cleanData = (data) => data !== undefined ? JSON.parse(JSON.stringify(data)) : null;

        if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
            db.ref('tirfe_system').update({
                tenants: cleanData(localDB.tenants) || {},
                buyers: cleanData(localDB.buyers) || {},
                revenueAuthorities: cleanData(localDB.revenueAuthorities) || {},
                motors: cleanData(localDB.motors) || {},
                motorQuotas: cleanData(localDB.motorQuotas) || {},
                taxReceipts: cleanData(localDB.taxReceipts) || [],
                tariffs: cleanData(localDB.tariffs) || {},
                businessTypes: cleanData(localDB.businessTypes) || [],
                adminSettings: cleanData(localDB.adminSettings) || {}
            }).catch(err => console.error("Firebase Admin Sync Error:", err));
        } else {
            if(typeof currentTenant !== 'undefined' && currentTenant) {
                let tenantData = cleanData(localDB.tenants[currentTenant.username]);
                if(tenantData) {
                    db.ref(`tirfe_system/tenants/${currentTenant.username}`).set(tenantData)
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
                // ገቢዎች የወሰኑት የሞተረኛ ኮታ ወደ ፋየርቤዝ እንዲገባ
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
            
            let updates = {};
            if(localDB.taxReceipts) updates.taxReceipts = cleanData(localDB.taxReceipts);
            if(localDB.tariffs) updates.tariffs = cleanData(localDB.tariffs);
            if(localDB.businessTypes) updates.businessTypes = cleanData(localDB.businessTypes);

            if(Object.keys(updates).length > 0) {
                db.ref('tirfe_system').update(updates).catch(err => console.error("Firebase Global Updates Error:", err));
            }
        }
    } 
}

function sendAdminTelegramAlert(message) {
    const backendAPIUrl = "/api/sendAdminTelegram";
    
    // 💡 ማሻሻያ፡ አድሚኑ በሲስተሙ (UI) ላይ ያስገባውን ቶከን አውጥቶ ወደ API ይልካል
    let tgToken = (localDB.adminSettings && localDB.adminSettings.tgToken) ? localDB.adminSettings.tgToken : null;
    let tgChatId = (localDB.adminSettings && localDB.adminSettings.tgChatId) ? localDB.adminSettings.tgChatId : null;

    fetch(backendAPIUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            text: message,
            token: tgToken,
            chatId: tgChatId
        })
    }).catch(err => console.log("Admin Telegram API Alert Error: ", err));
}

function sendTelegramAlert(message) {
    if (typeof currentTenant === 'undefined' || !currentTenant) return;
    const backendAPIUrl = "/api/sendTenantTelegram";
    fetch(backendAPIUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username: currentTenant.username, 
            text: message 
        })
    }).catch(err => console.log("Telegram API Error: ", err));
}

// አዲሱ የሞተረኛ ቴሌግራም ኖቲፊኬሽን መላኪያ
function sendMotorTelegramAlert(username, message) {
    const backendAPIUrl = "/api/sendMotorTelegram";
    fetch(backendAPIUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username: username, 
            text: message 
        })
    }).catch(err => console.log("Motor Telegram API Error: ", err));
}

if(typeof db !== 'undefined') {
    
    // ማስተካከያ 1:- revenueAuthorities እና motorQuotas ወደ publicNodes ተጨምሯል
    const publicNodes = ['tariffs', 'businessTypes', 'adminSettings', 'revenueAuthorities', 'motorQuotas'];
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

    window.setupSecureUserListeners = function() {
        
        // ማስተካከያ 2:- አድሚን ሲገባ አዲስ ተመዝጋቢዎችን በስህተት እንዳያጠፋ (Real-time update)
        if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin' && !window.adminListenerAttached) {
            window.adminListenerAttached = true;
            const adminNodes = ['tenants', 'buyers', 'motors', 'taxReceipts'];
            adminNodes.forEach(node => {
                db.ref(`tirfe_system/${node}`).on('value', (snapshot) => {
                    if(snapshot.exists()) {
                        localDB[node] = snapshot.val();
                        saveToLocalStorage();
                        triggerUIRefresh();
                    }
                });
            });
        }

        if(typeof currentTenant !== 'undefined' && currentTenant && !window.tenantListenerAttached) {
            window.tenantListenerAttached = true;
            db.ref(`tirfe_system/tenants/${currentTenant.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    localDB.tenants[currentTenant.username] = snapshot.val();
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });
        }
        
        if(typeof currentBuyer !== 'undefined' && currentBuyer && !window.buyerListenerAttached) {
            window.buyerListenerAttached = true;
            db.ref(`tirfe_system/buyers/${currentBuyer.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    localDB.buyers[currentBuyer.username] = snapshot.val();
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });

            // የተስተካከለው:- ገዥዎች የሻጮችን ዳታ በቋሚነት (Real-time) እንዲያዳምጡ የተጨመረ
            db.ref(`tirfe_system/tenants`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    let allT = snapshot.val();
                    for(let k in allT) { 
                        delete allT[k].password;
                        delete allT[k].activationCode; 
                        delete allT[k].staffAccounts; 
                        delete allT[k].telegramToken; 
                        delete allT[k].bankAccount; 
                    }
                    localDB.tenants = allT;
                    saveToLocalStorage();
                    if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
                }
            });
        }
        
        if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer && !window.revenueListenerAttached) {
            window.revenueListenerAttached = true;
            db.ref(`tirfe_system/revenueAuthorities/${currentRevenueOfficer.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    localDB.revenueAuthorities[currentRevenueOfficer.username] = snapshot.val();
                    saveToLocalStorage();
                    triggerUIRefresh();
                }
            });
        }
        
        if(typeof currentMotor !== 'undefined' && currentMotor && !window.motorListenerAttached) {
            window.motorListenerAttached = true;
            db.ref(`tirfe_system/motors/${currentMotor.username}`).on('value', (snapshot) => {
                if(snapshot.exists()) {
                    localDB.motors[currentMotor.username] = snapshot.val();
                    saveToLocalStorage();
                    triggerUIRefresh();
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

        // ማስተካከያ 3:- ሞተረኛው ኦንላይን ሆኖ ዳታቤዝ ላይ ሌላ ሰው ትዕዛዝ ሲወስድ ስክሪኑ ሪፍሬሽ እንዲያደርግ (Point 1)
        if(typeof currentMotor !== 'undefined' && currentMotor) {
            let checkMotor = localDB.motors[currentMotor.username];
            if(checkMotor) {
                currentMotor = checkMotor;
                if(typeof renderMotorPage === 'function') renderMotorPage();
            }
        }
        
        let adminPage = document.getElementById('adminPage');
        if(adminPage && !adminPage.classList.contains('hidden')) { 
        if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
            if(typeof renderAdminPanel === 'function') renderAdminPanel();
            if(typeof renderAdminMotors === 'function') renderAdminMotors();
            if(typeof renderAdminBuyers === 'function') renderAdminBuyers();
            
        }
    }
}
