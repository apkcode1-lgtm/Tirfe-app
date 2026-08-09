// 1. ሞተረኛ ሎጊን ሲያደርግ ገፁን መረጃዎች ማሳያ (ከ main_auth.js ጋር የሚገናኝ)
function renderMotorPage() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    
    // ሀ. የፕሮፋይል ባጅ መሙላት
    const badge = document.getElementById('motorProfileBadge');
    if (badge) {
        badge.innerText = `ሰላም, ${currentMotor.firstName} ${currentMotor.lastName} (@${currentMotor.username})`;
    }

    // ለ. ሴቲንግ ፎርም ላይ የነበሩትን መረጃዎች መሙላት
    document.getElementById('motSetEmail').value = currentMotor.email || '';
    document.getElementById('motSetPhone').value = currentMotor.phone || '';
    document.getElementById('motSetTelegram').value = currentMotor.telegramToken || currentMotor.tgToken || '';

    // ሐ. 25 ብር እገዳ እና ኮሚሽን ማሳያ
    let commRate = (localDB.adminSettings && localDB.adminSettings.deliveryCommissionRate) ?
        localDB.adminSettings.deliveryCommissionRate : 10;
    let commDisplay = document.getElementById('motorCommissionRateDisplay');
    if (commDisplay) commDisplay.innerText = commRate + '%';
    const credit = currentMotor.credit || 0;
    // ክሬዲቱ ከ25 ብር በታች ከሆነ እና ታግዷል (blocked) ካልተባለ፣ እገዳውን በራስ-ሰር ጀምር
    if (credit <= 25 && currentMotor.status !== 'blocked') {
        currentMotor.status = 'blocked';
        currentMotor.creditBlocked = true;
        localDB.motors[currentMotor.username] = currentMotor;
        if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
        if (typeof pushToFirebase === 'function') pushMotorFirebase();
    }

    let overlay = document.getElementById('motorBlockedOverlay');
    let mainContent = document.getElementById('motorMainContent');
    let statusToggle = document.getElementById('motorStatusToggle');
    let statusText = document.getElementById('motorStatusText');
    if (currentMotor.status === 'blocked') {
        if (overlay) overlay.classList.remove('hidden');
        if (mainContent) mainContent.classList.add('hidden');
        if (statusToggle) { statusToggle.checked = false; statusToggle.disabled = true; }
        if (statusText) { statusText.innerText = 'ታግዷል (Blocked)';
        statusText.style.color = 'var(--danger-color)'; }
    } else {
        if (overlay) overlay.classList.add('hidden');
        if (mainContent) mainContent.classList.remove('hidden');
        
        // በእጁ ላይ የተቀበለው ንቁ ትዕዛዝ (Active Accepted Order) ካለ ማረጋገጫ
        let hasActiveAcceptedJob = (currentMotor.activeOrders || []).some(o => o.status === 'accepted');

        if (statusToggle) {
            // ንቁ ትዕዛዝ ካለ ኦንላይን/ኦፍላይን ማድረጊያው ይዘጋል (Disable ይሆናል)
            statusToggle.disabled = hasActiveAcceptedJob;
        }

        let isOnline = currentMotor.status === 'online';
        if (statusToggle) statusToggle.checked = isOnline;
        
        if (statusText) {
            if (hasActiveAcceptedJob) {
                statusText.innerText = 'በስራ ላይ (Active Job)';
                statusText.style.color = 'var(--warning-color)';
            } else {
                statusText.innerText = isOnline ? 'ኦንላይን (Online)' : 'ኦፍላይን (Offline)';
                statusText.style.color = isOnline ? 'var(--success-color)' : 'var(--danger-color)';
            }
        }
    }

    // መ. ዳሽቦርድ መረጃዎች (ክሬዲት እና ያደረሳቸው ብዛት)
    document.getElementById('motorCreditDisplay').innerText = credit.toFixed(2) + ' ETB';
    document.getElementById('motorTotalDelivered').innerText = currentMotor.totalDelivered || 0;
    
    // ሠ. የገዥ ክፍያ ማሳያ
    let incomingFee = currentMotor.incomingFee || 0;
    let feeDisplay = document.getElementById('motorIncomingFeeDisplay');
    let clearBtn = document.getElementById('btnMotorClearFee');
    if (feeDisplay) feeDisplay.innerText = incomingFee.toFixed(2) + ' ETB';
    if (incomingFee > 0) {
        if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
        if (clearBtn) clearBtn.classList.add('hidden');
    }

    // --- አዲሱ የቀን እና የወር ገቢ ስሌት (Daily & Monthly Income) ---
    let dailyIncome = 0;
    let monthlyIncome = 0;
    
    let now = new Date();
    // የኢትዮጵያ የስራ ቀን የሚጀምረው ጧት 1:00 (7:00 AM) ስለሆነ፣ ከሰአቱ ላይ 7 ሰአት እንቀንሳለን (ወደ ዜሮ እንዲመለስ)
    let currentBusinessTime = new Date(now.getTime() - 7 * 60 * 60 * 1000);
    let currentBizDateStr = currentBusinessTime.toISOString().split('T')[0]; // YYYY-MM-DD
    let currentBizMonthStr = currentBizDateStr.substring(0, 7);
    // YYYY-MM

    if (currentMotor.history) {
        currentMotor.history.forEach(record => {
            let recTime = record.isoDate ? new Date(record.isoDate) : new Date(); // አሮጌ ሂስትሪ ካለ ዛሬን ይወስዳል
            let recBizTime = new Date(recTime.getTime() - 7 * 60 * 60 * 1000);
            let recBizDateStr = recBizTime.toISOString().split('T')[0];
            let recBizMonthStr = recBizDateStr.substring(0, 7);

            let earned = parseFloat(record.earned) || 0;
            
            if (recBizDateStr === currentBizDateStr) {
                dailyIncome += earned;
            }
            // የወሩ መግቢያ (ቀን 1) ሲሆን አውቶማቲክ ቆጠራው 0 ይሆናል ምክንያቱም የወሩ ስም ይቀየራል
            if (recBizMonthStr === currentBizMonthStr) {
                monthlyIncome += earned;
            }
        });
    }

    let dailyDisp = document.getElementById('motorDailyIncome');
    if (dailyDisp) dailyDisp.innerText = dailyIncome.toFixed(2) + ' ETB';
    let monthlyDisp = document.getElementById('motorMonthlyIncome');
    if (monthlyDisp) monthlyDisp.innerText = monthlyIncome.toFixed(2) + ' ETB';
    // -----------------------------------------------------------

    // ረ. ቴብሎችን (ትዕዛዞች እና ታሪክ) መሳል
    renderMotorOrders();
    renderMotorHistory();
}

// 2. የፕሮፋይል ሲቲንግ መክፈቻና መዝጊያ
function toggleMotorSettings() {
    const settingsSection = document.getElementById('motorSettingsSection');
    if (settingsSection) {
        settingsSection.classList.toggle('hidden');
    }
}

// 3. የተስተካከለውን ሲቲንግ ሴቭ ማድረጊያ (ስልክ እና ቴሌግራም ብቻ - ኢሜል/ፓስዎርድ ከታች ባሉት 2-ደረጃ ፈንክሽኖች ይቀየራሉ)
function saveMotorSettings() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    const phone = document.getElementById('motSetPhone').value.trim();
    const tg = document.getElementById('motSetTelegram').value.trim();
    if (phone) currentMotor.phone = phone;
    if (tg) {
        currentMotor.tgToken = tg;
        currentMotor.telegramToken = tg;
    }

    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushMotorFirebase === 'function') pushMotorFirebase();

    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, "✅ የፕሮፋይል ማስተካከያዎ (Settings) በትክክል ተቀምጧል።");
    }

    if (typeof showCustomAlert === 'function') showCustomAlert("ተሳክቷል", "ማስተካከያው በትክክል ተቀምጧል!");
    else alert("ማስተካከያው በትክክል ተቀምጧል!");
    toggleMotorSettings();
    renderMotorPage();
}

// ==========================================================
// 🔑 የይለፍ ቃል ቀይር - 2-ደረጃ ፍሎው (ደረጃ1፡ ነባሩን ማረጋገጥ → ደረጃ2፡ አዲሱን ማስገባት)
// ==========================================================
function changeMotorPassword() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    let oldEmail = currentMotor.email;

    // ደረጃ 1/2: የአሁኑን የይለፍ ቃል ጠይቆ ከFirebase ጋር ማረጋገጥ
    showFormModal("🔒 ደረጃ 1/2 - ማረጋገጫ", [
        { id: "curPass", label: "የይለፍ ቃል ለመቀየር የአሁኑን የይለፍ ቃል ያስገቡ፦", type: "password", placeholder: "የአሁኑ ፓስዎርድ" }
    ], async (res) => {
        let curPass = res.curPass ? res.curPass.trim() : "";
        if(!curPass) { showCustomAlert("ስህተት", "እባክዎ የአሁኑን ፓስዎርድ ያስገቡ!"); return; }

        try {
            let cred = firebase.auth.EmailAuthProvider.credential(oldEmail, curPass);
            await auth.currentUser.reauthenticateWithCredential(cred);
        } catch(error) {
            console.error("Motor Password Reauth Error:", error);
            let errMsg = "ማረጋገጫው አልተሳካም! " + (error.message || "");
            if(error.code === 'auth/wrong-password') errMsg = "❌ ያስገቡት የአሁኑ ፓስዎርድ ትክክል አይደለም!";
            if(error.code === 'auth/too-many-requests') errMsg = "❌ በጣም ብዙ ጊዜ ተሞክሯል፣ እባክዎ ትንሽ ቆይተው ደግመው ይሞክሩ!";
            showCustomAlert("❌ ስህተት", errMsg);
            return;
        }

        // ደረጃ 2/2: ነባሩ ከተረጋገጠ በኋላ ብቻ አዲሱን የይለፍ ቃል መጠየቅ
        showFormModal("🔑 ደረጃ 2/2 - አዲስ የይለፍ ቃል", [
            { id: "newPass", label: "አዲስ የይለፍ ቃል፦", type: "password", placeholder: "ቢያንስ 6 ፊደል/ቁጥር" },
            { id: "newPass2", label: "አዲሱን የይለፍ ቃል ደግመው ያስገቡ፦", type: "password", placeholder: "አዲስ የይለፍ ቃል ያረጋግጡ" }
        ], async (res2) => {
            let newPass = res2.newPass ? res2.newPass.trim() : "";
            let newPass2 = res2.newPass2 ? res2.newPass2.trim() : "";
            if(!newPass || newPass.length < 6) { showCustomAlert("ስህተት", "አዲሱ የይለፍ ቃል ቢያንስ 6 ፊደል/ቁጥር ሊኖረው ይገባል!"); return; }
            if(newPass !== newPass2) { showCustomAlert("ስህተት", "ያስገቧቸው ሁለት አዲስ የይለፍ ቃሎች አይመሳሰሉም!"); return; }

            try {
                await auth.currentUser.updatePassword(newPass);
                // ❌ ፓስዎርድ በጭራሽ RTDB ላይ አይቀመጥም - Firebase Auth ብቻ ነው የሚያዘው
                localDB.motors[currentMotor.username] = currentMotor;
                if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
                if (typeof pushMotorFirebase === 'function') pushMotorFirebase();
                showCustomAlert("ተሳክቷል", "የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል! ከዚህ በኋላ በአዲሱ የይለፍ ቃል ብቻ ሎጊን ያድርጉ።");
            } catch(error) {
                console.error("Motor Update Password Error:", error);
                let errMsg = "የይለፍ ቃል ማስቀመጥ አልተቻለም! " + (error.message || "");
                if(error.code === 'auth/requires-recent-login') errMsg = "❌ ደህንነት ችግር፡ እባክዎ Logout አድርገው እንደገና ሎጊን ካደረጉ በኋላ ይሞክሩ!";
                if(error.code === 'auth/weak-password') errMsg = "❌ አዲሱ ፓስዎርድ ደካማ ነው (ቢያንስ 6 ፊደል/ቁጥር ያስፈልጋል)!";
                showCustomAlert("❌ ስህተት", errMsg);
            }
        });
    });
}

// ==========================================================
// 📧 ኢሜል ቀይር - 2-ደረጃ ፍሎው (ደረጃ1፡ ነባሩን ማረጋገጥ → ደረጃ2፡ አዲሱን ማስገባት)
// ==========================================================
function changeMotorEmail() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    let oldEmail = currentMotor.email;

    // ደረጃ 1/2: ኢሜል ለመቀየር ደህንነት ሲባል የአሁኑን የይለፍ ቃል ጠይቆ ማረጋገጥ
    showFormModal("🔒 ደረጃ 1/2 - ማረጋገጫ", [
        { id: "curPass", label: "ኢሜል ለመቀየር የአሁኑን የይለፍ ቃል ያስገቡ፦", type: "password", placeholder: "የአሁኑ ፓስዎርድ" }
    ], async (res) => {
        let curPass = res.curPass ? res.curPass.trim() : "";
        if(!curPass) { showCustomAlert("ስህተት", "እባክዎ የአሁኑን ፓስዎርድ ያስገቡ!"); return; }

        try {
            let cred = firebase.auth.EmailAuthProvider.credential(oldEmail, curPass);
            await auth.currentUser.reauthenticateWithCredential(cred);
        } catch(error) {
            console.error("Motor Email Reauth Error:", error);
            let errMsg = "ማረጋገጫው አልተሳካም! " + (error.message || "");
            if(error.code === 'auth/wrong-password') errMsg = "❌ ያስገቡት የአሁኑ ፓስዎርድ ትክክል አይደለም!";
            if(error.code === 'auth/too-many-requests') errMsg = "❌ በጣም ብዙ ጊዜ ተሞክሯል፣ እባክዎ ትንሽ ቆይተው ደግመው ይሞክሩ!";
            showCustomAlert("❌ ስህተት", errMsg);
            return;
        }

        // ደረጃ 2/2: ነባሩ ከተረጋገጠ በኋላ ብቻ አዲሱን ኢሜል መጠየቅ
        showFormModal("📧 ደረጃ 2/2 - አዲስ ኢሜል", [
            { id: "newEmail", label: "አዲስ ኢሜል (Gmail)፦", type: "email", placeholder: "newemail@gmail.com" },
            { id: "newEmail2", label: "አዲሱን ኢሜል ደግመው ያስገቡ፦", type: "email", placeholder: "አዲስ ኢሜል ያረጋግጡ" }
        ], async (res2) => {
            let newEmail = res2.newEmail ? res2.newEmail.trim() : "";
            let newEmail2 = res2.newEmail2 ? res2.newEmail2.trim() : "";
            if(!newEmail) { showCustomAlert("ስህተት", "እባክዎ አዲሱን ኢሜል ያስገቡ!"); return; }
            if(newEmail.toLowerCase() !== newEmail2.toLowerCase()) { showCustomAlert("ስህተት", "ያስገቧቸው ሁለት አዲስ ኢሜሎች አይመሳሰሉም!"); return; }
            if(newEmail.toLowerCase() === String(oldEmail || "").toLowerCase()) { showCustomAlert("ስህተት", "አዲሱ ኢሜል ካለው ኢሜል ጋር ተመሳሳይ ነው!"); return; }

            try {
                await auth.currentUser.updateEmail(newEmail);
                currentMotor.email = newEmail;
                localDB.motors[currentMotor.username] = currentMotor;
                if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
                if (typeof pushMotorFirebase === 'function') pushMotorFirebase();
                renderMotorPage();
                showCustomAlert("ተሳክቷል", "ኢሜልዎ በተሳካ ሁኔታ ተቀይሯል! ከዚህ በኋላ በአዲሱ ኢሜል ብቻ ሎጊን ያድርጉ።");
            } catch(error) {
                console.error("Motor Update Email Error:", error);
                let errMsg = "ኢሜል ማስቀመጥ አልተቻለም! " + (error.message || "");
                if(error.code === 'auth/requires-recent-login') errMsg = "❌ ደህንነት ችግር፡ እባክዎ Logout አድርገው እንደገና ሎጊን ካደረጉ በኋላ ይሞክሩ!";
                if(error.code === 'auth/email-already-in-use') errMsg = "❌ ይህ ኢሜል በሌላ አካውንት ተይዟል!";
                if(error.code === 'auth/invalid-email') errMsg = "❌ የገቡት ኢሜል ቅርፅ ትክክል አይደለም!";
                showCustomAlert("❌ ስህተት", errMsg);
            }
        });
    });
}
// 4. ኦንላይን/ኦፍላይን መቀየሪያ
function toggleMotorOnlineStatus() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    if (currentMotor.status === 'blocked') return; // ታግዶ ከሆነ እንዳይቀይር

    // በእጁ ላይ ያልተጠናቀቀ ትዕዛዝ ካለ ኦፍላይን እንዳያደርግ መከልከያ
    let hasActiveAcceptedJob = (currentMotor.activeOrders || []).some(o => o.status === 'accepted');
    if (hasActiveAcceptedJob) {
        alert("⚠️ በእጅዎ ላይ ያልተጠናቀቀ ትዕዛዝ አለ! መጀመሪያ ትዕዛዙን ያድርሱ ወይም 'ትዕዛዝ ሰርዝ' የሚለውን በመንካት ይሰርዙ።");
        const toggle = document.getElementById('motorStatusToggle');
        if (toggle) toggle.checked = true; // በተኑን ወደ ነበረበት መመለስ
        return;
    }

    const isChecked = document.getElementById('motorStatusToggle').checked;
    
    currentMotor.status = isChecked ? 'online' : 'offline';
    localDB.motors[currentMotor.username] = currentMotor;
    
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushMotorFirebase();
    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, `🔄 የስራ ሁኔታዎ ወደ ${isChecked ? 'ኦንላይን (Online)' : 'ኦፍላይን (Offline)'} ተቀይሯል።`);
    }

    renderMotorPage();
}
// 5. ክሬዲት ሞዳል መክፈቻ
function openMotorCreditModal() {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('motorCreditModal');
    
    if (overlay) overlay.classList.remove('hidden');
    
    // ሌሎች ክፍት የሆኑ ሞዳሎች ካሉ መዝጊያ
    document.querySelectorAll('.modal-card').forEach(m => {
        if(m.id !== 'motorCreditModal') m.classList.add('hidden');
    });
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('motorCreditAmount').value = '';
    }
}

// 6. ክሬዲት ሲሞላ ገንዘቡን ወደ አካውንቱ ማስገቢያ 
function submitMotorCredit() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    const amountInput = document.getElementById('motorCreditAmount').value;
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
        alert("እባክዎ ትክክለኛ የብር መጠን ያስገቡ!");
        return;
    }

    if (typeof currentMotor.credit === 'undefined') currentMotor.credit = 0;
    // ማስተካከያ:- አድሚን ጋር ለመላክ ቀድሞ የነበረውን መጠን ማስቀመጫ
    let oldCredit = currentMotor.credit;
    
    currentMotor.credit += amount;
    // ክሬዲቱ ከ25 ብር በላይ ከሆነ አውቶማቲካሊ ብሎኩን ያነሳዋል
    let wasBlocked = currentMotor.status === 'blocked' && currentMotor.creditBlocked;
    if (wasBlocked && currentMotor.credit > 25) {
        currentMotor.status = 'offline';
        currentMotor.creditBlocked = false;
    }
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushMotorFirebase();        pushAdminFirebase();
    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, `💰 ሂሳብዎ ላይ ${amount} ብር ክሬዲት ተሞልቷል!\nአጠቃላይ ክሬዲት፡ ${currentMotor.credit} ETB`);
    }
    // አዲስ የተጨመረ ማስተካከያ:- ክሬዲት ሲሞላ ለአድሚኑ/አከራዩ በቴሌግራም መላክ
    if (typeof sendAdminTelegramAlert === 'function') {
        let nowForCredit = new Date();
        let timeStampCredit = nowForCredit.toLocaleDateString('am-ET') + " " + nowForCredit.toLocaleTimeString('am-ET');
        let adminCreditMsg = `💰 ሞተረኛ ክሬዲት ሞልቷል!\n\n` +
                             `👤 ዩዘርኔም: @${currentMotor.username}\n` +
                             `📉 ቀድሞ የነበረው: ${oldCredit.toFixed(2)} ETB\n` +
                             `💵 አዲስ የተሞላው: ${amount.toFixed(2)} ETB\n` +
                             `🏦 አጠቃላይ ክሬዲት: ${currentMotor.credit.toFixed(2)} ETB\n` +
                             `📅 የተሞላበት ጊዜ: ${timeStampCredit}`;
        sendAdminTelegramAlert(adminCreditMsg);
    }

    if (typeof closeActiveModal === 'function') {
        closeActiveModal();
    } else {
        let overlay = document.getElementById('modalOverlay');
        let modal = document.getElementById('motorCreditModal');
        if(overlay) overlay.classList.add('hidden');
        if(modal) modal.classList.add('hidden');
    }

    if (wasBlocked && currentMotor.credit <= 25) {
        alert(`በትክክል ${amount} ብር ክሬዲት ተሞልቷል!\n\n⚠️ ሆኖም አሁንም ክሬዲትዎ ከ25 ብር በታች ስለሆነ እገዳው (Block) አልተነሳም። እባክዎ ተጨማሪ ክሬዲት ይሙሉ!`);
    } else if (wasBlocked && currentMotor.credit > 25) {
        alert(`በትክክል ${amount} ብር ክሬዲት ተሞልቷል!\n\n✅ አሁን ክሬዲትዎ ከ25 ብር በላይ ስለሆነ ሲስተሙ እገዳውን አንስቶልዎታል! አሁን ስራ መቀጠል ይችላሉ።`);
    } else {
        alert(`በትክክል ${amount} ብር ክሬዲት ተሞልቷል!`);
    }
    
    renderMotorPage();
}

// 7. ትዕዛዞችን ማሳያ (Active Deliveries) - የተስተካከለ
function renderMotorOrders() {
    const tbody = document.getElementById('motorActiveOrdersBody');
    if (!tbody) return;
    
    // ዳታቤዝ (.on listener) በ database.js ላይ ስለተሰራ፣ 
    // እዚህ ጋር በድጋሚ ከ Firebase ማምጣት አያስፈልግም። በቀጥታ ሎካል ያለውን እናሳያለን።
    let liveOrders = (typeof currentMotor !== 'undefined' && currentMotor.activeOrders) ? currentMotor.activeOrders : [];
    
    drawOrdersTable(liveOrders);

    // ቴብሉን የምንስልበት (Loop የሚያደርገው) ሎጂክ
    function drawOrdersTable(activeOrders) {
        tbody.innerHTML = '';
        if (activeOrders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">በአሁኑ ሰዓት የተመደበ ምንም ትዕዛዝ የለም</td></tr>`;
            return;
        }
        let feeReceived = (currentMotor.incomingFee && parseFloat(currentMotor.incomingFee) > 0);
        let hasActiveJob = activeOrders.some(o => o.status === 'accepted') || feeReceived;
        
        activeOrders.forEach((order, index) => {
            let tr = document.createElement('tr');
            let actionBtn = "";
            let statusBadge = "";

            if(order.status === 'pending_motor') {
                statusBadge = `<span class="badge-warning">አዲስ ጥሪ (በመጠባበቅ ላይ)</span><br>`;
                
                if (hasActiveJob) {
                    actionBtn = `<button class="btn-add btn-sm" style="background-color: #64748b; color: #cbd5e1; cursor: not-allowed; opacity: 0.5;" disabled>🔒 በስራ ላይ ነዎት</button>`;
                } else {
                    actionBtn = `<button class="btn-add btn-sm" onclick="acceptMotorOrder(${index})">✋ ተቀበል (Accept)</button>`;
                }
            } else {
                statusBadge = `<span class="badge-success">በእርስዎ የተያዘ</span><br>`;
                
                let cancelBtn = `<button class="btn-danger btn-sm" onclick="cancelMotorOrder(${index})" style="margin-top: 4px; background-color: #ef4444; color: white;">❌ ትዕዛዝ ሰርዝ</button>`;
                if(feeReceived) {
                    actionBtn = `<button class="btn-sell btn-sm" onclick="completeMotorOrder(${index})">✅ አድርሻለሁ (Deliver)</button>`;
                } else {
                    actionBtn = `<button class="btn-sell btn-sm" style="background-color: #64748b; color: #cbd5e1; cursor: not-allowed; opacity: 0.7;" disabled>⏳ ክፍያ አልገባም</button><br>${cancelBtn}`;
                }
            }
            tr.innerHTML = `
                <td>${order.shopName}<br><a href="${order.shopMap}" target="_blank" style="color:var(--accent-color);">📍 የሻጭ ማፕ</a> | 📞 ${order.shopPhone}</td>
                <td>${order.buyerName}<br><a href="${order.buyerMap}" target="_blank" style="color:var(--accent-color);">📍 የገዥ ማፕ</a> | 📞 ${order.buyerPhone}</td>
                <td>${order.itemName} (x${order.qty})<br><strong style="color:var(--warning-color);">${order.totalPrice} ETB</strong><br>${statusBadge}</td>
                <td>${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// 8. ኦርደር ሲቀበል (Lock & Link) - የተስተካከለ
window.acceptMotorOrder = function(index) {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    
    if (currentMotor.incomingFee > 0) {
        alert("⚠️ እባክዎ መጀመሪያ የያዙትን ትዕዛዝ በማድረስ ከገዥ የተላከውን ክፍያ ያረጋግጡ (ዳሽቦርድዎ ላይ 0.00 ይሁን)! ከዚያ በኋላ ብቻ አዲስ ትዕዛዝ መቀበል ይችላሉ።");
        return;
    }

    let hasActiveJob = currentMotor.activeOrders.some(o => o.status === 'accepted');
    if (hasActiveJob) {
        alert("⚠️ አስቀድመው የተቀበሉት ሌላ ትዕዛዝ አለ! እባክዎ መጀመሪያ ያንን ያድርሱ።");
        return;
    }
    
    let acceptedOrder = currentMotor.activeOrders[index];
    acceptedOrder.status = 'accepted';
    
    let poolId = acceptedOrder.poolId;
    let shopUser = acceptedOrder.shopUsername;

    // 1. ሌሎች ሞተረኞች ጋር የተላከውን ጥሪ ከ Firebase ላይ ማጥፋት
    if(poolId && typeof isOnline !== 'undefined' && isOnline && typeof db !== 'undefined') {
        db.ref('tirfe_system/motors').once('value').then(snap => {
            let allMotors = snap.val() || {};
            Object.keys(allMotors).forEach(mUser => {
                if(mUser !== currentMotor.username) {
                    let otherMotorActive = allMotors[mUser].activeOrders || [];
                    let filteredOrders = otherMotorActive.filter(o => o.poolId !== poolId);
                    
                    if(otherMotorActive.length !== filteredOrders.length) {
                        // 🆕 FIX: activeOrders ብቻ መጻፍ በቂ አልነበረም - ያ ሞተረኛ ገፁ ላይ real-time
                        // ትዕዛዙ (ሌላ ሰው ስለወሰደው) እንዲጠፋለት lastUpdated ማዘመን ያስፈልጋል፣
                        // ካልሆነ የተወሰደ ትዕዛዝ በስክሪኑ ላይ ገፁ እስኪታደስ ድረስ ይታይበታል።
                        let otherMotorUpdate = {};
                        otherMotorUpdate[`tirfe_system/motors/${mUser}/activeOrders`] = filteredOrders;
                        otherMotorUpdate[`tirfe_system/motors/${mUser}/lastUpdated`] = Date.now();
                        db.ref().update(otherMotorUpdate);
                    }
                }
            });
        }).catch(err => console.error("Error updating other motors:", err));
    }

    // 2. የሻጩን ዳታቤዝ አፕዴት ማድረግ (ኦንላይን)
    // 🆕 FIX: ከዚህ በፊት once('value') አንብቦ ሙሉውን deliveryOrders array መልሶ
    // .set() የሚያደርግ ነበር (read → modify → write, "race condition")። ሻጩ በራሱ
    // በኩል (acceptDelivery/completeDelivery ወዘተ) ተመሳሳይ ወቅት ላይ የራሱን ሙሉ tenant
    // ዳታ ቢልክ (pushTenantFirebase)፣ የትኛው ይሆን የመጨረሻ የሚደርሰው መሰረት፣ ያ ሁለተኛው
    // ጽሁፍ ይህኛውን (የሞተረኛውን motorUser/status ለውጥ) ሙልጭ አድርጎ ስለሚጽፍበት ላይ
    // ስለሚጽፍበት፣ ትዕዛዙ ገጹ ላይ "ልክ እንደ አዲስ ትዕዛዝ" ይመስል ነበር። transaction()
    // ስንጠቀም ግን Firebase ራሱ ግጭት (conflict) ካለ ደጋግሞ በትክክለኛው የቅርብ ጊዜ ዳታ ላይ
    // ብቻ ይተገብረዋል፣ ስለዚህ ምንም ዳታ አይጠፋም/አይደገምም።
    if (shopUser && typeof isOnline !== 'undefined' && isOnline && typeof db !== 'undefined') {
        let shopPath = `tirfe_system/tenants/${shopUser}/data/deliveryOrders`;
        db.ref(shopPath).transaction((currentOrders) => {
            if (!currentOrders) return currentOrders; // ገና ምንም ከሌለ ምንም አታድርግ
            let ordersArr = Array.isArray(currentOrders) ? currentOrders : Object.values(currentOrders);
            let sIdx = ordersArr.findIndex(o => o && (o.poolId === poolId || (o.buyerPhone == acceptedOrder.buyerPhone && o.itemName == acceptedOrder.itemName)));
            if (sIdx > -1) {
                ordersArr[sIdx].motorUser = currentMotor.username; // ሞተረኛውን እንመድባለን
                ordersArr[sIdx].status = 'accepted'; // ስታተሱን እንቀይራለን
            }
            return ordersArr;
        }).then((result) => {
            if (result.committed) {
                // ገፁ ላይ "በመንገድ ላይ ነው" real-time እንዲታይ tenant root lastUpdated ማዘመን
                db.ref(`tirfe_system/tenants/${shopUser}/lastUpdated`).set(Date.now());
            }
        }).catch(err => console.error("Error updating shop orders:", err));
    }

    // 3. የቴሌግራም መልዕክት ለሞተረኛው
    let tgMessage = `📦 አዲስ ትዕዛዝ ተቀብለዋል!\n\n` +
                    `📱 የገዥ ስልክ: ${acceptedOrder.buyerPhone || '-'}\n` +
                    `📍 ገዥ ያለበት ቦታ: ${acceptedOrder.address || '-'}\n` +
                    `🗺️ የገዥ ጎግል ማፕ: ${acceptedOrder.buyerMap || '-'}\n\n` +
                    `📞 የሻጭ ስልክ: ${acceptedOrder.shopPhone || '-'}\n` +
                    `🗺️ የሻጭ ጎግል ማፕ: ${acceptedOrder.shopMap || '-'}\n\n` +
                    `🛍️ የዕቃው አይነት: ${acceptedOrder.itemName || '-'}\n` +
                    `🔢 የዕቃው ብዛት: ${acceptedOrder.qty || '-'}\n\n` +
                    `መልካም ስራ!\nአድራሻውን ተጠቅመው እቃውን ያድርሱ።`;
    
    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, tgMessage);
    }

    // 4. ወደ ሎካል እና ፋየርቤዝ ሴቭ ማድረግ
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    
    // ማስተካከያ:- እዚህ ጋር pushTenantFirebase(); የሚል የነበረው ስህተት ስለሆነ ተሰርዟል
    if (typeof pushMotorFirebase === 'function') {
        pushMotorFirebase();
    }
    
    alert("ትዕዛዙን በተሳካ ሁኔታ ተቀብለዋል! ዝርዝር መረጃው በቴሌግራም ተልኮልዎታል።");
    
    // ገፁን አፕዴት ማድረግ
    renderMotorPage(); 
};

// ሞተረኛው የተቀበለውን ትዕዛዝ መሰረዝ ሲፈልግ
window.cancelMotorOrder = function(index) {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    if (!confirm("እርግጠኛ ነዎት ይህንን ትዕዛዝ መሰረዝ ይፈልጋሉ? ትዕዛዙ ተመልሶ ወደ ሻጩ ይላካል።")) return;

    let canceledOrder = currentMotor.activeOrders[index];
    let poolId = canceledOrder.poolId;
    let shopUser = canceledOrder.shopUsername;

    // 1. የሻጩ ዳታቤዝ ላይ የትዕዛዙን ሁኔታ ወደ 'cancelled' ቀይሮ ወደ ሻጭ መመለስ
    // 🆕 FIX: transaction() ተጠቅመናል (ከላይ acceptMotorOrder ላይ እንዳለው ምክንያት)፣
    // read→modify→.set() race ስለሚያስከትል የሻጩ ገፅ ላይ ያለውን ትዕዛዝ ላይ ችግር ይፈጥር ነበር።
    if (shopUser && typeof isOnline !== 'undefined' && isOnline && typeof db !== 'undefined') {
        let shopPath = `tirfe_system/tenants/${shopUser}/data/deliveryOrders`;
        db.ref(shopPath).transaction((currentOrders) => {
            if (!currentOrders) return currentOrders;
            let ordersArr = Array.isArray(currentOrders) ? currentOrders : Object.values(currentOrders);
            let sIdx = ordersArr.findIndex(o => o && (o.poolId === poolId || (o.buyerPhone == canceledOrder.buyerPhone && o.itemName == canceledOrder.itemName)));
            if (sIdx > -1) {
                ordersArr[sIdx].motorUser = null; // ሞተረኛውን ማንሳት
                ordersArr[sIdx].status = 'cancelled'; // ስታተሱን ተሰርዟል ማድረግ
            }
            return ordersArr;
        }).then((result) => {
            if (result.committed) {
                db.ref(`tirfe_system/tenants/${shopUser}/lastUpdated`).set(Date.now());
            }
        }).catch(err => console.error("Error updating shop order cancel status:", err));
    }

    // 2. ከሞተረኛው የትዕዛዝ ዝርዝር (activeOrders) ውስጥ ማጥፋት
    currentMotor.activeOrders.splice(index, 1);

    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') 
    pushTenantFirebase();
    pushMotorFirebase();
    alert("ትዕዛዙ ተሰርዟል! መረጃው ወደ ሻጩ ተመልሷል።");
    renderMotorPage(); // ገፁን ዳግም መሳል (ይህ በተኑን ተመልሶ እንዲበራ ያደርገዋል)
};

// ብሩን ሲቀበል (ኮሚሽን ቆርጦ 0.00 ያደርጋል፣ ከ 25 በታች ከሆነም ይዘጋል)
window.clearIncomingFee = function() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    if(!confirm("እርግጠኛ ነዎት ክፍያውን ከገዥው ተቀብለዋል? ይህ ማሳያውን ወደ 0.00 ይመልሰዋል።")) return;
    
    let feeCollected = currentMotor.incomingFee || 0;
    // የሲስተሙ ባለቤት ኮሚሽን ስሌት
    let commRate = (localDB.adminSettings && localDB.adminSettings.deliveryCommissionRate) ? (localDB.adminSettings.deliveryCommissionRate / 100) : 0.10;
    let commissionAmount = feeCollected * commRate;
    
    currentMotor.credit = (currentMotor.credit || 0) - commissionAmount;
    // ኮሚሽኑን ከክሬዲት ቀንሶታል
    currentMotor.incomingFee = 0;
    // ማሳያውን ወደ 0.00 ይመልሳል
    
    // ክሬዲቱ 25 እና ከዚያ በታች ከሆነ አካውንቱን እገደው (Block)
    if (currentMotor.credit <= 25) {
        currentMotor.status = 'blocked';
    }
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') 
    pushMotorFirebase();
    pushAdminFirebase();
        if (typeof sendMotorTelegramAlert === 'function') {
        let blockMsg = currentMotor.status === 'blocked' ?
        "\n\n⚠️ ክሬዲትዎ 25 ብር ስለደረሰ አካውንትዎ ታግዷል! እባክዎ ክሬዲት ይሙሉ።" : "\n\nአሁን አዲስ ትዕዛዝ መቀበል ይችላሉ!";
        sendMotorTelegramAlert(currentMotor.username, `✅ ክፍያ ተረጋግጧል!\n\nገዥው የከፈለው: ${feeCollected} ETB\nየተቆረጠ ኮሚሽን: ${commissionAmount} ETB` + blockMsg);
    }
    
    if (currentMotor.status === 'blocked') {
        alert(`✅ ክፍያው ተረጋግጧል! (ኮሚሽን ${commissionAmount} ETB ተቆርጧል)።\n⚠️ ክሬዲትዎ 25 ብር እና ከዚያ በታች ስለሆነ ሲስተሙ አካውንትዎን አግዶታል። እባክዎ ክሬዲት ይሙሉ።`);
    } else {
        alert(`✅ ክፍያው ተረጋግጧል! ማሳያው ወደ 0.00 ተመልሷል። (ኮሚሽን ${commissionAmount} ETB ተቆርጧል)። አሁን አዲስ ትዕዛዝ መቀበል ይችላሉ።`);
    }
    
    renderMotorPage();
};
// 9. የስራ ታሪክ ማሳያ (Delivery History with Date Filter)
function renderMotorHistory() {
    const tbody = document.getElementById('motorHistoryBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let history = currentMotor.history || [];
    // የ Date Picker ማጣሪያ
    let filterInput = document.getElementById('motorHistoryDateFilter');
    let filterDate = filterInput && filterInput.value ?
    filterInput.value : null;

    let todayStr = new Date().toISOString().split('T')[0]; // የዛሬ ቀን በ YYYY-MM-DD

    let filteredHistory = history.filter(record => {
        let recDateStr = todayStr;
        // isoDate ካለው ከዛ ላይ ቀኑን ይወስዳል
        if (record.isoDate) {
            recDateStr = record.isoDate.split('T')[0];
        }
        
        if (filterDate) {
            // ተጠቃሚው መርጦ ከሆነ የተመረጠውን ብቻ
            return recDateStr === filterDate;
        } else {
            // ካልመረጠ የዛሬውን ብቻ (ፊት ለፊት እንዳያጨናንቀው)
            return recDateStr === todayStr;
        }
    });
    if (filteredHistory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">በዚህ ቀን የተመዘገበ ታሪክ የለም</td></tr>`;
        return;
    }

    let reversedHistory = [...filteredHistory].reverse();
    reversedHistory.forEach(record => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${record.date}</td>
            <td>${record.shopName}</td>
            <td>${record.buyerName}</td>
            <td style="color: var(--success-color); font-weight: bold;">+${record.earned} ETB</td>
        `;
        tbody.appendChild(tr);
    });
}
// 10. ትዕዛዝ ማድረሱን ማረጋገጫ
function completeMotorOrder(index) {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    if(!confirm("እርግጠኛ ነዎት እቃውን ለደንበኛው አስረክበዋል?")) return;
    
    let order = currentMotor.activeOrders[index];
    
    // ማስተካከያ 1: ክፍያ ከዕቃው ዋጋ እንዳይሆን!
    // ትክክለኛውን የዴሊቨሪ ክፍያ 'ከገዥ የተላከ ክፍያ' (incomingFee) ላይ ብቻ እንዲመሰረት አድርገናል
    let actualFee = parseFloat(currentMotor.incomingFee);
    // ለጥንቃቄ (ክፍያው ከ 0.00 ካልተቀየረ አያስጨርሰውም)
    if (isNaN(actualFee) || actualFee <= 0) {
        alert("⚠️ የዴሊቨሪ ክፍያ ገና አልገባም! እባክዎ ዳሽቦርድ ላይ 'ከገዥ የተላከ ክፍያ' ከ 0.00 እስኪቀየር ይጠብቁ።");
        return;
    }
    
    if(!currentMotor.history) currentMotor.history = [];
    currentMotor.history.push({
        date: new Date().toLocaleDateString('am-ET'),
        isoDate: new Date().toISOString(), // ለዳሽቦርድ ስሌት ይጠቅማል
        shopName: order.shopName,
        buyerName: order.buyerName,
        earned: actualFee // ከዕቃው ዋጋ ሳይሆን ትክክለኛው የዴሊቨሪ ክፍያ ይመዘገባል!
    });
    currentMotor.activeOrders.splice(index, 1);
    currentMotor.totalDelivered = (currentMotor.totalDelivered || 0) + 1;
    
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushMotorFirebase();

    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, `✅ ትዕዛዝ በተሳካ ሁኔታ አድረሷል!\n\n🏢 ሱቅ: ${order.shopName}\n👤 ደንበኛ: ${order.buyerName}\n💵 ያገኙት ክፍያ: ${actualFee} ETB`);
    }

    alert("ትዕዛዙን በተሳካ ሁኔታ ስላደረሱ እናመሰግናለን! አሁን ከዳሽቦርድዎ ላይ '✅ ክፍያ ተቀብያለሁ (ወደ 0.00 መልስ)' የሚለውን በመጫን ኮሚሽን አወራርደው አዲስ ስራ መቀበል ይችላሉ።");
    renderMotorPage();
}
// 14. የሞተረኛን ዳታ ማጽጃ (Clear Data)
window.clearMotorData = function() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    
    if(!confirm("እርግጠኛ ነዎት የሞተረኛ ዳታዎን (የስራ ታሪክ፣ የተቀበሏቸው ትዕዛዞች፣ ያደረሱት ብዛት ወዘተ) ሙሉ በሙሉ ማጥፋት ይፈልጋሉ?\n\nማሳሰቢያ፦ ይህ እርምጃ ክሬዲትዎን አያጠፋም! ነገር ግን ሌላ እርምጃ አይቀለበስም።")) {
        return;
    }

    // ዳታዎችን ወደ ዜሮ (ባዶ) መመለስ (ክሬዲት እና አካውንት አይጠፋም)
    currentMotor.history = [];
    currentMotor.activeOrders = [];
    currentMotor.totalDelivered = 0;
    currentMotor.incomingFee = 0;

    localDB.motors[currentMotor.username] = currentMotor;
    
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushMotorFirebase();

    alert("✅ የሞተረኛ ዳታዎ በተሳካ ሁኔታ ፀድቶ አዲስ ጀምሯል!");
    renderMotorPage();
        }
