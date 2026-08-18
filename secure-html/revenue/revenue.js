// ✅ ስም ብቻ ማስቀመጫ (ኢሜል/ፓስዎርድ ለብቻቸው ከታች ባሉት 2-ደረጃ ፈንክሽኖች ይቀየራሉ)
window.saveRevenueProfileData = async function() {
    if(!currentRevenueOfficer) return;
    let nName = document.getElementById('revOfficerName').value.trim();
    let targetUser = currentRevenueOfficer.authUser || currentRevenueOfficer.username;
    if(!nName) { showCustomAlert("ስህተት", "እባክዎ የአስተዳዳሪውን ስም ያስገቡ!"); return; }
    currentRevenueOfficer.authName = nName;
    localDB.revenueAuthorities[targetUser] = currentRevenueOfficer;
    pushRevenueFirebase();
    renderRevenuePanel();
    showCustomAlert("ተሳክቷል", "የፕሮፋይል ስም በተሳካ ሁኔታ ተስተካክሏል!");
};

// ==========================================================
// 🔑 የይለፍ ቃል ቀይር - 2-ደረጃ ፍሎው (ደረጃ1፡ ነባሩን ማረጋገጥ → ደረጃ2፡ አዲሱን ማስገባት)
// ==========================================================
window.changeRevenuePassword = function() {
    if(!currentRevenueOfficer) return;
    let oldEmail = currentRevenueOfficer.authEmail;

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
            console.error("Revenue Password Reauth Error:", error);
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
                let targetUser = currentRevenueOfficer.authUser || currentRevenueOfficer.username;
                localDB.revenueAuthorities[targetUser] = currentRevenueOfficer;
                pushRevenueFirebase();
                showCustomAlert("ተሳክቷል", "የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል! ከዚህ በኋላ በአዲሱ የይለፍ ቃል ብቻ ሎጊን ያድርጉ።");
            } catch(error) {
                console.error("Revenue Update Password Error:", error);
                let errMsg = "የይለፍ ቃል ማስቀመጥ አልተቻለም! " + (error.message || "");
                if(error.code === 'auth/requires-recent-login') errMsg = "❌ ደህንነት ችግር፡ እባክዎ Logout አድርገው እንደገና ሎጊን ካደረጉ በኋላ ይሞክሩ!";
                if(error.code === 'auth/weak-password') errMsg = "❌ አዲሱ ፓስዎርድ ደካማ ነው (ቢያንስ 6 ፊደል/ቁጥር ያስፈልጋል)!";
                showCustomAlert("❌ ስህተት", errMsg);
            }
        });
    });
};

// ==========================================================
// 📧 ኢሜል ቀይር - 2-ደረጃ ፍሎው (ደረጃ1፡ ነባሩን ማረጋገጥ → ደረጃ2፡ አዲሱን ማስገባት)
// ==========================================================
window.changeRevenueEmail = function() {
    if(!currentRevenueOfficer) return;
    let oldEmail = currentRevenueOfficer.authEmail;

    // ደረጃ 1/2: ኢሜል ለመቀየር ደህንነት ሲባል የአሁኑን የይለፍ ቃል ጠይቆ ማረጋገጥ
    // (Firebase ላይ ማንነትን ለማረጋገጥ ሁልጊዜ የይለፍ ቃል ያስፈልጋል - ኢሜል ብቻውን ማረጋገጫ ሊሆን አይችልም)
    showFormModal("🔒 ደረጃ 1/2 - ማረጋገጫ", [
        { id: "curPass", label: "ኢሜል ለመቀየር የአሁኑን የይለፍ ቃል ያስገቡ፦", type: "password", placeholder: "የአሁኑ ፓስዎርድ" }
    ], async (res) => {
        let curPass = res.curPass ? res.curPass.trim() : "";
        if(!curPass) { showCustomAlert("ስህተት", "እባክዎ የአሁኑን ፓስዎርድ ያስገቡ!"); return; }

        try {
            let cred = firebase.auth.EmailAuthProvider.credential(oldEmail, curPass);
            await auth.currentUser.reauthenticateWithCredential(cred);
        } catch(error) {
            console.error("Revenue Email Reauth Error:", error);
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
                currentRevenueOfficer.authEmail = newEmail;
                let targetUser = currentRevenueOfficer.authUser || currentRevenueOfficer.username;
                localDB.revenueAuthorities[targetUser] = currentRevenueOfficer;
                pushRevenueFirebase();
                renderRevenuePanel();
                showCustomAlert("ተሳክቷል", "ኢሜልዎ በተሳካ ሁኔታ ተቀይሯል! ከዚህ በኋላ በአዲሱ ኢሜል ብቻ ሎጊን ያድርጉ።");
            } catch(error) {
                console.error("Revenue Update Email Error:", error);
                let errMsg = "ኢሜል ማስቀመጥ አልተቻለም! " + (error.message || "");
                if(error.code === 'auth/requires-recent-login') errMsg = "❌ ደህንነት ችግር፡ እባክዎ Logout አድርገው እንደገና ሎጊን ካደረጉ በኋላ ይሞክሩ!";
                if(error.code === 'auth/email-already-in-use') errMsg = "❌ ይህ ኢሜል በሌላ አካውንት ተይዟል!";
                if(error.code === 'auth/invalid-email') errMsg = "❌ የገቡት ኢሜል ቅርፅ ትክክል አይደለም!";
                showCustomAlert("❌ ስህተት", errMsg);
            }
        });
    });
};
// አዲሱ የሞተረኛ ጣሪያ ማስተካከያ (Quota Limit)
window.setMotorQuotaLimit = function() {
    if(!currentRevenueOfficer) return;
    let limitVal = document.getElementById('revMotorLimitInput').value;
    if(limitVal === '' || limitVal < 0) {
    showCustomAlert("ስህተት", "እባክዎ ትክክለኛ የሞተረኛ ብዛት (ቁጥር) ያስገቡ");
      return;
    }
    // ለዚህ ገቢዎች ምድብ (ክልል_ዞን_ወረዳ) የተለየ መለያ (Key) መስራት

    let locKey = `${currentRevenueOfficer.authRegion}_${currentRevenueOfficer.authZone}_${currentRevenueOfficer.authWoreda}`;
    if(!localDB.motorQuotas) localDB.motorQuotas = {};
    localDB.motorQuotas[locKey] = parseInt(limitVal); // ወደ ዳታቤዝ ማስገባት
    saveToLocalStorage();
    pushRevenueFirebase();
    renderRevenuePanel();
    showCustomAlert("ተሳክቷል", `በእርስዎ ምድብ የሚፈቀደው ከፍተኛ የሞተረኛ ብዛት ጣሪያ ወደ ${limitVal} በተሳካ ሁኔታ ተወስኗል!`);
    document.getElementById('revMotorLimitInput').value = '';
};

function renderRevenuePanel() {
    if(!currentRevenueOfficer) return;
  
    // ✅ ተጨማሪ ማስተካከያ: listeners ገና ካልተገናኙ (login ከ database.js ጅማሬ በኋላ ስለተከሰተ) አሁን እናገናኛቸው
    if(typeof window.setupSecureUserListeners === 'function' && !window.revenueListenerAttached) {
        window.setupSecureUserListeners();
    }
    document.getElementById('revOfficerName').value = currentRevenueOfficer.authName || "";
    // 🔒 ኢሜሉ እዚህ ለንባብ ብቻ (read-only) ይታያል፤ ለመቀየር "📧 ኢሜል ቀይር" ቁልፉ (2-ደረጃ ማረጋገጫ) ጥቅም ላይ ይውላል
    document.getElementById('revOfficerEmail').value = currentRevenueOfficer.authEmail || "";
    document.getElementById('revenueOfficerProfile').innerText = `👤 ስም: ${currentRevenueOfficer.authName} | 📍 ምድብ: ${currentRevenueOfficer.authRegion} / ${currentRevenueOfficer.authZone} / ${currentRevenueOfficer.authWoreda}`;
    let mSum = currentRevenueOfficer.monthlyVat || 0;
    let aSum = currentRevenueOfficer.annualVat || 0;
    document.getElementById('revenueMonthlyVatSum').innerText = mSum.toFixed(2) + " ETB";
    document.getElementById('revenueAnnualVatSum').innerText = aSum.toFixed(2) + " ETB";
    // ---- አዲሱ የሞተረኛ ጣሪያ እና አሁን ያሉ ሞተረኞች ማሳያ ሎጂክ ----
    let locKey = `${currentRevenueOfficer.authRegion}_${currentRevenueOfficer.authZone}_${currentRevenueOfficer.authWoreda}`;
    // 🛠️ ማስተካከያ: ከ localDB.motors (ራው/ሙሉ ዳታ - ገቢዎች ጨርሶ ማየት የለበትም) ይልቅ
    // db_revenue.js's setupRevenueListeners() ቀድሞ ባስቀመጠው motorCounts ቁጥር ብቻ እንጠቀማለን
    let mCount = (localDB.motorCounts && localDB.motorCounts[locKey]) || 0;
    let mLimit = (localDB.motorQuotas && localDB.motorQuotas[locKey] !== undefined) ? localDB.motorQuotas[locKey] : "ያልተወሰነ (Unlimited)";
    let curElem = document.getElementById('revMotorCurrentCount');
    let limElem = document.getElementById('revMotorMaxLimit');
    if(curElem) curElem.innerText = mCount;
    if(limElem) limElem.innerText = mLimit;
    // ----------------------------------------------------
    let tbody = document.getElementById('revenueTenantsBody');
    tbody.innerHTML = '';
    let count = 0;
    if(localDB.tenants) {
        Object.values(localDB.tenants).forEach(t => {
            // ተከራዮችን በትክክል በየምድባቸው (ክልል፣ ዞን፣ ወረዳ) ማጣራት
            if(t.region === currentRevenueOfficer.authRegion &&
               t.zone === currentRevenueOfficer.authZone &&
               t.woreda === currentRevenueOfficer.authWoreda) {
                count++;
                let accumulatedVat = (t.data && t.data.accumulatedVat) ? parseFloat(t.data.accumulatedVat) : 0;
                let businessTypeDisplay = t.businessType || 'አጠቃላይ ንግድ';
                let gmailDisplay = t.gmail || 'አልገባም';
                tbody.innerHTML += `<tr>
                    <td><b>${t.fullName}</b><br><small style="color:var(--accent-color)">${t.shopName} | ${businessTypeDisplay}</small></td>
                    <td>📞 ${t.phone}<br>📧 ${gmailDisplay}</td>
                    <td>${t.region} / ${t.zone} / ${t.woreda}</td>
                    <td>${t.kebele} /
                    ${t.houseNo}</td>
                    <td style="color:var(--warning-color); font-weight:bold;">${t.tinNumber}</td>
                    <td style="color:var(--warning-color); font-weight:bold;">${accumulatedVat.toFixed(2)} ETB</td>
                    <td><button class="btn-success btn-sm" onclick="payTenantVat('${t.username}')">ክፈል (Pay)</button></td>
                </tr>`;
            }
        });
    }
    if(count === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">በእርስዎ ምድብ የተመዘገበ ግብር ከፋይ (ተከራይ) እስካሁን የለም።</td></tr>`;
    }
}

window.payTenantVat = function(username) {
    let t = localDB.tenants[username];
    if(!t || !t.data) return;
    let vatToPay = parseFloat(t.data.accumulatedVat) || 0;
    if(vatToPay <= 0) {
        showCustomAlert("ማሳሰቢያ", "ይህ ነጋዴ የሚከፍለው የተሰበሰበ የቫት መጠን የለበትም (0.00 ETB)።");
        return;
    }
    showCustomConfirm("ክፍያ ማረጋገጫ", `ከ ${t.fullName} (${t.shopName}) የተሰበሰበውን የቫት መጠን ${vatToPay.toFixed(2)} ETB መቀበልዎን እርግጠኛ ኖት?`, () => 
    {
        if(!currentRevenueOfficer.monthlyVat) currentRevenueOfficer.monthlyVat = 0;
        if(!currentRevenueOfficer.annualVat) currentRevenueOfficer.annualVat = 0;
        currentRevenueOfficer.monthlyVat += vatToPay;
        currentRevenueOfficer.annualVat += vatToPay;
        let targetUser = currentRevenueOfficer.authUser || currentRevenueOfficer.username;
        localDB.revenueAuthorities[targetUser] = currentRevenueOfficer;
        let recId = Math.floor(100000 + Math.random() * 900000);
        let todayDate = typeof getTodayFormatted === 'function' ? getTodayFormatted() : new Date().toISOString().split('T')[0];
        let newTaxReceipt = {
            recId: recId,
            date: todayDate,
            amount: vatToPay,
            officerName: currentRevenueOfficer.authName || "ያልተመዘገበ",
            officerPhone: currentRevenueOfficer.authPhone || "-",
            officerRegion: currentRevenueOfficer.authRegion || "-",
            officerZone: currentRevenueOfficer.authZone || "-",
            officerWoreda: currentRevenueOfficer.authWoreda || "-",
            tenantName: t.fullName || "-",
            tenantShop: t.shopName || "-",
            tenantPhone: t.phone || "-",
            tenantTin: t.tinNumber || "-",
            reason: "የቫት (VAT) ግብር ክፍያ"
        };
        if(!t.data.taxReceipts) t.data.taxReceipts = [];
        t.data.taxReceipts.push(newTaxReceipt);
        if(!localDB.taxReceipts) localDB.taxReceipts = [];
        localDB.taxReceipts.push(newTaxReceipt);
        // እዳውን ዜሮ ማድረግ
        t.data.accumulatedVat = 0;
        localDB.tenants[username] = t;
        // በቀጥታ ወደ Firebase መላክ (ለገቢዎች ሰራተኛው)
        if(typeof db !== 'undefined' && isOnline) {
             let currentTime = Date.now();
             currentRevenueOfficer.lastUpdated = currentTime;
            db.ref(`tirfe_system/revenueAuthorities/${targetUser}`).update({
                 monthlyVat: currentRevenueOfficer.monthlyVat,
                 annualVat: currentRevenueOfficer.annualVat,
                 lastUpdated: currentTime
             });
             // በቀጥታ ወደ Firebase መላክ (ለሻጩ/ተከራዩ) - እዳው 0 መሆኑን እና ደረሰኙን
             t.lastUpdated = currentTime;
             db.ref(`tirfe_system/tenants/${username}`).update({
                 "data/accumulatedVat": 0,
                 "data/taxReceipts": t.data.taxReceipts,
                 lastUpdated: currentTime
             }).then(() => {
                 // የ Public Tenant ዳታንም Update ማድረግ ካስፈለገ
                 db.ref(`tirfe_system/public_tenants/${username}/lastUpdated`).set(currentTime);
                 // 🆕 ማስተካከያ: revenue_view ን ተመሳሳይ ደረጃ ላይ ማድረግ - አለበለዚያ ገቢዎች
                 // ዝርዝር ላይ "0.00 ETB" ተብሎ ቢታይም revenue_view ላይ አሮጌው accumulatedVat ይቀራል
                 db.ref(`tirfe_system/revenue_view/${username}`).update({
                     "data/accumulatedVat": 0,
                     lastUpdated: currentTime
                 });
             }).catch(err => console.error(err));
        }
        saveToLocalStorage(); // ዳታውን ሎካል ላይም ማስቀመጥ
        renderRevenuePanel();
       showCustomAlert("ተሳክቷል", "ክፍያው በተሳካ ሁኔታ ተሰብስቧል! የነጋዴው የተሰበሰበ ቫት 0.00 ሆኗል፤ እንዲሁም የግብር ደረሰኝ አውቶማቲክ ወደ ተከራዩ ተልኳል።");
    });
};
window.closeRevenueBudgetAnnual = function() {
    showCustomConfirm("በጀት መዝጊያ", "በእርግጥ የአመቱን በጀት መዝጋት ይፈልጋሉ? ይህ ድርጊት የወሩን እና የአመቱን የቫት ድምር ወደ 0.00 ይመልሰዋል።", () => {
        if(currentRevenueOfficer) {
            currentRevenueOfficer.monthlyVat = 0;
            currentRevenueOfficer.annualVat = 0;
            let targetUser = currentRevenueOfficer.authUser || currentRevenueOfficer.username;
            localDB.revenueAuthorities[targetUser] = currentRevenueOfficer;
            pushRevenueFirebase();
            renderRevenuePanel();
            showCustomAlert("በጀት ተዘግቷል", "የአመቱ የቫት በጀት በተሳካ ሁኔታ ተዘግቶ ወደ 0.00 ተመልሷል።");
        }
    });
};
