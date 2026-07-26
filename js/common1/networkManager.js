// 1. የ Action Queue ማከማቻ
let actionQueue = JSON.parse(localStorage.getItem('tirfe_action_queue')) || [];

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
        
        // ኢንተርኔት ሲመጣ መጀመሪያ የተጠራቀሙ ትዕዛዞችን ይልካል
        processActionQueue();
        
        // በመቀጠል አሁን ያለውን የሎካል ዳታ ወደ Queue ያስገባ
        pushToFirebase();
    }
}

// --------------------------------------------------------
// 🛠️ 2. የ Action Queue አስተዳዳሪ ኮድ
// --------------------------------------------------------

function queueAction(actionType, collection, docId, data) {
    const newAction = {
        id: Date.now().toString(),
        actionType: actionType, 
        collection: collection, 
        docId: docId, 
        payload: data, 
        timestamp: Date.now()
    };
    actionQueue.push(newAction);
    localStorage.setItem('tirfe_action_queue', JSON.stringify(actionQueue));
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
        fbRequest.then(() => {
            actionQueue.shift(); 
            localStorage.setItem('tirfe_action_queue', JSON.stringify(actionQueue));
            if (actionQueue.length > 0) processActionQueue(); 
        }).catch(err => console.error("Firebase Sync Error, will retry:", err));
    }
}

const cleanData = (data) => data !== undefined ? JSON.parse(JSON.stringify(data)) : null;

