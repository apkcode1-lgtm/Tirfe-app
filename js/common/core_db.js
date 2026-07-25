// ፋይል: js/common/core_db.js
// የጋራ መረጃዎች እና የኔትዎርክ ሁኔታ መቆጣጠሪያ

let coreDB = {
    tariffs: {},
    businessTypes: [],
    adminSettings: {}
};

let isOnline = navigator.onLine !== undefined ? navigator.onLine : true;

window.addEventListener('online', handleOnlineStatus);
window.addEventListener('offline', handleOnlineStatus);

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
        // ኢንተርኔት ሲመለስ ሎካል ላይ የቀሩ ዳታዎች ካሉ እዚህ ይላካሉ
    }
}

// ⚠️ የማይለዋወጡ መረጃዎችን አንዴ ብቻ ማውረድ
function fetchStaticData() {
    if (typeof db === 'undefined') return;

    const staticNodes = ['tariffs', 'businessTypes', 'adminSettings'];
    staticNodes.forEach(node => {
        db.ref(`tirfe_system/${node}`).once('value').then((snapshot) => {
            if(snapshot.exists()) {
                coreDB[node] = snapshot.val();
                // መረጃውን ለ Offline እንዲጠቅም LocalStorage ላይ ማስቀመጥ
                localStorage.setItem(`tirfe_static_${node}`, JSON.stringify(coreDB[node]));
                
                // የ UI ማደሻ ፈንክሽኖችን መጥራት
                if(typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns();
                if(typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
            }
        }).catch(error => {
            console.log(`Firebase Error on ${node}, running offline mode.`);
        });
    });
}
