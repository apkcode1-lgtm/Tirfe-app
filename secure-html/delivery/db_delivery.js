// ==========================================
// 📁 db_modules/db_delivery.js
// ==========================================
function pushMotorFirebase() {
    if(typeof currentMotor !== 'undefined' && currentMotor) {
        let currentTime = Date.now();
        let motorData = cleanData(localDB.motors[currentMotor.username]);
        if(motorData) {
            motorData.lastUpdated = currentTime;
            motorData.locationKey = computeLocationKey(motorData);
            // 1️⃣ 'motors' - ሙሉ ዳታ (history/activeOrders ጨምሮ)
            queueAction('UPDATE', 'motors', currentMotor.username, motorData);

            // 2️⃣ 'admin_motor_summary' - ለአድሚን 
            queueAction('UPDATE', 'admin_motor_summary', currentMotor.username, buildAdminMotorSummary(motorData, currentTime));

            // 3️⃣ 'motor_location_view
            queueAction('UPDATE', 'motor_location_view', currentMotor.username, {
                locationKey: motorData.locationKey,
                lastUpdated: currentTime
            });
        }
    }
}

// --------------------------------------------------------
// 🛠️ ማስተካከያ: አድሚን
// --------------------------------------------------------
function buildAdminMotorSummary(motorData, currentTime) {
    return {
        username: motorData.username,
        firstName: motorData.firstName,
        lastName: motorData.lastName,
        phone: motorData.phone,
        email: motorData.email,
        plateNumber: motorData.plateNumber,
        region: motorData.region,
        zone: motorData.zone,
        woreda: motorData.woreda,
        credit: motorData.credit,
        accountStatus: motorData.accountStatus,
        creditBlocked: motorData.creditBlocked,
        uid: motorData.uid,
        idCardImage: motorData.idCardImage,
        licenseImage: motorData.licenseImage,
        lastUpdated: currentTime
    };
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
