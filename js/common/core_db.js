// core_db.js

let localDB = { 
    tenants: {}, buyers: {}, revenueAuthorities: {}, motors: {}, motorQuotas: {}, taxReceipts: [], 
    adminSettings: { bankAccount: '', vatRate: 0, motorTariff: 0, deliveryCommissionRate: 10 }, 
    tariffs: { low: 500, medium: 1000, high: 2000 }, 
    businessTypes: ["አጠቃላይ ንግድ", "ኤሌክትሮኒክስ", "ፋርማሲ", "ልብስ እና ጫማ", "ግሮሰሪ", "ኮስሞቲክስ", "ካፌ እና ሬስቶራንት"] 
}; //[span_2](start_span)[span_2](end_span)

let isOnline = navigator.onLine !== undefined ? navigator.onLine : true; //[span_3](start_span)[span_3](end_span)

window.addEventListener('online', handleOnlineStatus); //[span_4](start_span)[span_4](end_span)
window.addEventListener('offline', handleOnlineStatus); //[span_5](start_span)[span_5](end_span)

loadLocalStorageBackup(); //[span_6](start_span)[span_6](end_span)

function handleOnlineStatus() {
    isOnline = navigator.onLine; //[span_7](start_span)[span_7](end_span)
    const tag = document.getElementById('syncIndicator'); //[span_8](start_span)[span_8](end_span)
    const criticalScreen = document.getElementById('criticalOfflineScreen'); //[span_9](start_span)[span_9](end_span)

    if(!isOnline) {
        if(tag) tag.classList.remove('hidden'); //[span_10](start_span)[span_10](end_span)
        if(criticalScreen) criticalScreen.classList.remove('hidden'); //[span_11](start_span)[span_11](end_span)
    } else {
        if(tag) tag.classList.add('hidden'); //[span_12](start_span)[span_12](end_span)
        if(criticalScreen) criticalScreen.classList.add('hidden'); //[span_13](start_span)[span_13](end_span)
        // እያንዳንዱ ሞጁል የራሱን push ሎጂክ ይሰራል። ማዕከላዊ ፑሽ ቀርቷል።
    }
}

function loadLocalStorageBackup() {
    let backup = localStorage.getItem('tirfe_local_db'); //[span_14](start_span)[span_14](end_span)
    if(backup) {
        let parsedBackup = JSON.parse(backup); //[span_15](start_span)[span_15](end_span)
        if(parsedBackup.tenants) localDB.tenants = parsedBackup.tenants; //[span_16](start_span)[span_16](end_span)
        // ... (ሌሎቹንም በተመሳሳይ ሎድ ያደርጋል) ... //[span_17](start_span)[span_17](end_span)
    }
}

function saveToLocalStorage() {
    localStorage.setItem('tirfe_local_db', JSON.stringify(localDB)); //[span_18](start_span)[span_18](end_span)
}

const cleanData = (data) => data !== undefined ? JSON.parse(JSON.stringify(data)) : null; //[span_19](start_span)[span_19](end_span)

const fetchStaticData = function() {
    const staticNodes = ['tariffs', 'businessTypes', 'adminSettings']; //[span_20](start_span)[span_20](end_span)
    staticNodes.forEach(node => {
        db.ref(`tirfe_system/${node}`).once('value').then((snapshot) => { //[span_21](start_span)[span_21](end_span)
            if(snapshot.exists()) {
                localDB[node] = snapshot.val(); //[span_22](start_span)[span_22](end_span)
                saveToLocalStorage(); //[span_23](start_span)[span_23](end_span)
            }
        }); //[span_24](start_span)[span_24](end_span)
    });
}
if(typeof db !== 'undefined') fetchStaticData(); //[span_25](start_span)[span_25](end_span)

// Telegram Alerts
function sendAdminTelegramAlert(message) { /* ሎጂኩ ይገባል[span_26](start_span)[span_26](end_span) */ }
function sendTelegramAlert(message) { /* ሎጂኩ ይገባል[span_27](start_span)[span_27](end_span) */ }
function sendMotorTelegramAlert(username, message) { /* ሎጂኩ ይገባል[span_28](start_span)[span_28](end_span) */ }

