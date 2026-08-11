// ==========================================
// 📁 db_modules/db_delivery.js - ሞተረኛ (Motor/Delivery) ብቻ የሚጠቀምበት
// ==========================================
// ⚠️ db_public.js ካስፈለገ በኋላ ብቻ ስራ ላይ ይውላል። delivery.html ላይ ብቻ ይጫኑ።

// --------------------------------------------------------
// 🚀 Motor Push
// --------------------------------------------------------
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
// 💬 Telegram
// --------------------------------------------------------
function sendMotorTelegramAlert(username, message) {
   fetch("/api/sendMotorTelegram", { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username, text: message }) }).catch(err => console.log(err));
}

// --------------------------------------------------------
// 🔔 UI Refresh (motor only) - db_public.js's triggerUIRefresh() ይህን ይጠራል
// --------------------------------------------------------
window.refreshMotorUI = function() {
    if(typeof currentMotor !== 'undefined' && currentMotor) {
        let checkMotor = localDB.motors[currentMotor.username];
        if(!checkMotor) {
            if(typeof forceLogout === 'function') forceLogout();
            return;
        }
        // 🛠️ ማስተካከያ: accountStatus (እውነተኛው የአድሚን/ክሬዲት ብሎክ) ብቻ ነው መታየት ያለበት፤ status "online"/"offline" ብሎክ አይደለም
        let checkMotorAccountStatus = checkMotor.accountStatus || (checkMotor.status === "blocked" ? "blocked" : "active");
        if(checkMotorAccountStatus === "blocked" && !checkMotor.creditBlocked) {
            alert("የሞተረኛ አካውንትዎ በአድሚን ታግዷል!");
            if(typeof forceLogout === 'function') forceLogout();
            return;
        }
        currentMotor = checkMotor;
        if(typeof renderMotorPage === 'function') renderMotorPage();
    }
};

// --------------------------------------------------------
// 🎧 Firebase Listeners (motor only)
// --------------------------------------------------------
window.setupMotorListeners = function() {
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

// 🆕 SPLIT-FIX: delivery.html ራሱ ከ login በኋላ ብቻ ስለሚጫን፣ currentMotor
// ተስተካክሎ ከሆነ በራስ-ሰር pushMotorFirebase() ይሮጣል (index.html ላይ የነበረውን
// login-time push ጥሪ ይተካል)።
document.addEventListener('DOMContentLoaded', function() {
    if (typeof currentMotor !== 'undefined' && currentMotor) {
        pushMotorFirebase();
    }
});
