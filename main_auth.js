document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', event => {
    if (event.keyCode === 123) { event.preventDefault(); }
    if (event.ctrlKey && event.shiftKey && (event.keyCode === 73 || event.keyCode === 74)) { event.preventDefault(); }
    if (event.ctrlKey && event.keyCode === 85) { event.preventDefault(); }
});

async function sendSecureVerificationEmail(userEmail, verificationCode) {
    try {
        const backendAPIUrl = "/api/send-otp";
        const response = await fetch(backendAPIUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            },
            body: JSON.stringify({ email: userEmail, code: verificationCode })
        });
        const result = await response.json();
        if(!result.success) {
            console.error('ኢሜል መላክ አልተሳካም:', result.error);
            showCustomAlert("ስህተት", "የማረጋገጫ ኮድ ወደ ኢሜል መላክ አልተቻለም! " + (result.error || ""));
        }
    } catch (error) {
        console.error('ከጀርባ አገልጋይ ጋር መገናኘት አልተቻለም:', error);
        showCustomAlert("ስህተት", "ከሰርቨር (API) ጋር መገናኘት አልተቻለም። እባክዎ አፑን በ Live Server ወይም Vercel ላይ መክፈትዎን ያረጋግጡ።");
    }
}

function checkAutomaticLogin() {
    let savedSession = localStorage.getItem('tirfe_active_session');
    if (savedSession) {
        let session = JSON.parse(savedSession);
        currentUserRole = session.role;
        currentLoginMode = session.loginMode || 'unified';
        
        if (session.role === 'admin') {
            currentUserRole = 'admin';
            if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
            setTimeout(() => { switchView('adminPage'); renderAdminPanel(); }, 300);
        } else if (session.role === 'revenue' && localDB.revenueAuthorities && localDB.revenueAuthorities[session.username]) {
            currentRevenueOfficer = localDB.revenueAuthorities[session.username];
            currentUserRole = 'revenue';
            setTimeout(() => { switchView('revenuePage'); if(typeof renderRevenuePanel === "function") renderRevenuePanel(); }, 300);
        } else if (session.role === 'motor' && localDB.motors && localDB.motors[session.username]) {
            if(localDB.motors[session.username].status === "blocked") {
                localStorage.removeItem('tirfe_active_session');
            } else {
                currentMotor = localDB.motors[session.username];
                setTimeout(() => { switchView('motorPage'); }, 300);
            }
        } else if (session.role === 'buyer' && localDB.buyers && localDB.buyers[session.username]) {
            if(localDB.buyers[session.username].status === "blocked") {
                localStorage.removeItem('tirfe_active_session');
            } else {
                currentBuyer = localDB.buyers[session.username];
                setTimeout(() => { switchView('buyerPage'); }, 300);
            }
        } else if (localDB.tenants && localDB.tenants[session.username]) {
            let t = localDB.tenants[session.username];
            currentTenant = t;
            setTimeout(() => { launchApp(t); }, 300);
        }
    }
}

function checkTimeLock() {
    if(!currentTenant || !currentTenant.data || currentUserRole === "staff") return;
    let h = new Date().getHours();
    let isLockTime = (h >= 22 || h < 6);
    let d = currentTenant.data;
    if (isLockTime) {
        if (!d.shiftClosed) {
            document.getElementById('shiftStatusAlert').classList.remove('hidden');
            document.getElementById('shiftStatusAlert').innerHTML = "⚠️ ማታ 4:00 (10:00 PM) ሆኗል! ሲስተሙ ተቆልፏል፣ እባክዎ የዕለቱን ሂሳብ ወዲያውኑ ይዝጉ!";
            disableAllActionsExceptClose();
        } else {
            document.getElementById('shiftStatusAlert').classList.remove('hidden');
            document.getElementById('shiftStatusAlert').innerHTML = "🔒 ሲስተሙ የዕለት ሪፖርት ተቀብሎ ተቆልፏል። ጧት 12:00 (6:00 AM) ላይ ይከፈታል።";
            disableAllActions();
        }
    } else {
        document.getElementById('shiftStatusAlert').classList.add('hidden');
        enableAllActions();
    }
}

function disableAllActionsExceptClose() {
     const btns = ['btn_add_item', 'btn_main_sell', 'btn_expense', 'btn_credit', 'btn_draw', 'btn_settlement', 'btn_next_day', 'btn_staff_reg'];
     btns.forEach(id => { let b = document.getElementById(id); if(b) {b.disabled = true;} });
}

function disableAllActions() {
     const btns = ['btn_add_item', 'btn_main_sell', 'btn_expense', 'btn_credit', 'btn_draw', 'btn_settlement', 'btn_next_day', 'btn_close_shift', 'btn_staff_reg'];
     btns.forEach(id => { let b = document.getElementById(id); if(b) {b.disabled = true;} });
}

function enableAllActions() {
     const btns = ['btn_add_item', 'btn_main_sell', 'btn_expense', 'btn_credit', 'btn_draw', 'btn_settlement', 'btn_next_day', 'btn_close_shift', 'btn_staff_reg'];
     btns.forEach(id => { let b = document.getElementById(id); if(b) {b.disabled = false;} });
}

setInterval(() => { checkTimeLock(); }, 60000);

async function isSystemDataTaken(u, p, skipTenantUser, skipBuyerUser) {
    u = u ? u.toLowerCase() : "";
    if (u === "admin") return "ይህ ዩዘርኔም በዋና አስተዳዳሪ (Admin) ተይዟል (ትይዟል)!";
    if(isOnline && typeof db !== 'undefined') {
        try {
            let tSnap = await db.ref(`tirfe_system/tenants/${u}`).once('value');
            if (tSnap.exists() && u !== skipTenantUser) return "ዩዘርኔም (Username) በሌላ የሱቅ ባለቤት ተይዟል (ትይዟል)!";

            let bSnap = await db.ref(`tirfe_system/buyers/${u}`).once('value');
            if (bSnap.exists() && u !== skipBuyerUser) return "ዩዘርኔም በሌላ ደንበኛ (ገዥ) ተይዟል (ትይዟል)!";

            let rSnap = await db.ref(`tirfe_system/revenueAuthorities/${u}`).once('value');
            if (rSnap.exists() && u !== skipTenantUser) return "ይህ ዩዘርኔም በገቢዎች ባለስልጣን ተይዟል!";
            
            let mSnap = await db.ref(`tirfe_system/motors/${u}`).once('value');
            if (mSnap.exists()) return "ይህ ዩዘርኔም በሌላ ሞተረኛ ተይዟል!";

            let stSnap = await db.ref(`tirfe_system/staffAccounts/${u}`).once('value');
            if (stSnap.exists() && u !== skipTenantUser) return "ዩዘርኔም በሌላ ሰራተኛ ተይዟል (ትይዟል)!";
        } catch(e) {
            console.warn("Firebase Read Error:", e);
        }
    }

    if (localDB.tenants) {
        for(let k in localDB.tenants) {
            let t = localDB.tenants[k];
            if (t && t.username !== skipTenantUser) {
                if (t.username === u) return "ዩዘርኔም (Username) በሌላ የሱቅ ባለቤት ተይዟል (ትይዟል)!";
                if (t.phone === p) return "ስልክ ቁጥር በሌላ የሱቅ ባለቤት ተይዟል (ትይዟል)!";
                if (t.staffUser === u) return "ዩዘርኔም በሌላ ሰራተኛ ተይዟል (ትይዟል)!";
                if (t.staffAccounts) {
                    for(let s of t.staffAccounts) {
                        if (s.user === u) return "ዩዘርኔም በሌላ ሰራተኛ ተይዟል (ትይዟል)!";
                        if (s.phone === p) return "ስልክ ቁጥር በሌላ ሰራተኛ ተይዟል (ትይዟል)!";
                    }
                }
            }
        }
    }
    if (localDB.buyers) {
        for(let k in localDB.buyers) {
            let b = localDB.buyers[k];
            if (b && b.username !== skipBuyerUser) {
                if (b.username === u) return "ዩዘርኔም በሌላ ደንበኛ (ገዥ) ተይዟል (ትይዟል)!";
                if (b.phone === p) return "ስልክ ቁጥር በሌላ ደንበኛ (ገዥ) ተይዟል (ትይዟል)!";
            }
        }
    }
    if (localDB.revenueAuthorities) {
        for(let k in localDB.revenueAuthorities) {
            let r = localDB.revenueAuthorities[k];
            if (r && r.username !== skipTenantUser) {
                if (r.username === u) return "ይህ ዩዘርኔም በገቢዎች ባለስልጣን ተይዟል!";
                if (r.phone === p || r.contactPhone === p) return "ይህ ስልክ ቁጥር በገቢዎች ባለስልጣን ተይዟል!";
            }
        }
    }
    if (localDB.motors) {
        for(let k in localDB.motors) {
            let m = localDB.motors[k];
            if (m && m.username === u) return "ይህ ዩዘርኔም በሌላ ሞተረኛ ተይዟል!";
            if (m && m.phone === p) return "ይህ ስልክ ቁጥር በሌላ ሞተረኛ ተይዟል!";
        }
    }
    return false;
}

function openUnifiedLogin() {
    switchView('unifiedLoginBox');
    document.getElementById('loginUnifiedError').innerText = "";
    document.getElementById('loginUnifiedUser').value = "";
    document.getElementById('loginUnifiedEmail').value = "";
    document.getElementById('loginUnifiedPass').value = "";
}

function openUnifiedRegister() {
    switchView('unifiedRegisterBox');
    document.getElementById('unifiedRegRole').value = 'buyer';
    toggleUnifiedRegForm();
}

function toggleUnifiedRegForm() {
    let role = document.getElementById('unifiedRegRole').value;
    document.getElementById('unifiedBuyerForm').classList.add('hidden');
    document.getElementById('unifiedTenantForm').classList.add('hidden');
    let motorForm = document.getElementById('unifiedMotorForm');
    if(motorForm) motorForm.classList.add('hidden');
    if(role === 'buyer') {
        document.getElementById('unifiedBuyerForm').classList.remove('hidden');
    } else if(role === 'tenant') {
        document.getElementById('unifiedTenantForm').classList.remove('hidden');
        if (typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
    } else if(role === 'motor') {
        if(motorForm) motorForm.classList.remove('hidden');
        if (typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns(); 
    }
}

function autoFillPubCapitalFee() {
    let capital = document.getElementById('pub_newCapitalTier').value;
    let contractType = document.getElementById('pub_newContractType').value;
    let feeInput = document.getElementById('pub_newRegistrationFee');
    let tariffs = localDB.tariffs || { low: 500, medium: 1000, high: 2000 };
    let baseFee = 0;
    if (capital === 'low') baseFee = tariffs.low;
    else if (capital === 'medium') baseFee = tariffs.medium;
    else if (capital === 'high') baseFee = tariffs.high;

    if (contractType === 'በዓመት' && baseFee > 0) {
        baseFee = baseFee * 12;
    }
    if (baseFee > 0) {
        feeInput.value = baseFee;
    } else {
        feeInput.value = '';
    }
}

async function handleUnifiedLogin() {
    let user = document.getElementById('loginUnifiedUser').value.trim().toLowerCase();
    let email = document.getElementById('loginUnifiedEmail').value.trim();
    let pass = document.getElementById('loginUnifiedPass').value.trim();
    let err = document.getElementById('loginUnifiedError');
    let loginBtn = document.getElementById('loginBtn');
    
    if(!user || !email || !pass) { 
        err.innerText = "❌ እባክዎ ዩዘርኔም፣ ኢሜል እና የይለፍ ቃል በትክክል ያስገቡ!";
        return; 
    }

    if(loginBtn) { loginBtn.disabled = true; loginBtn.innerText = "🔄 በማረጋገጥ ላይ..."; }
    
    if(user === "admin" || email === "apkcode1@gmail.com") {
        err.innerText = "🔄 የአድሚን መረጃ በማረጋገጥ ላይ...";
        try {
            const response = await fetch('/api/admin-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: pass })
            });
            const data = await response.json();

            if(data.success) {
                localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'admin', loginMode: 'admin', username: 'admin' }));
                currentUserRole = 'admin'; 
                if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                switchView('adminPage');
                renderAdminPanel();
                return;
            } else {
                err.innerText = "❌ የተሳሳተ የአድሚን የይለፍ ቃል ወይም ኢሜል!";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                return;
            }
        } catch (error) {
            console.error("Admin Login Error: ", error);
            err.innerText = "❌ ከሰርቨር ጋር መገናኘት አልተቻለም!";
            if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
            return;
        }
    }

    err.innerText = "🔄 በማረጋገጥ ላይ...";
    try {
        let t = null;
        if(isOnline && typeof db !== 'undefined') {
            try {
                let tSnap = await db.ref(`tirfe_system/tenants/${user}`).once('value');
                if(tSnap.exists()) t = tSnap.val();
            } catch(fbErr) { console.warn("Firebase Error on Tenant:", fbErr); }
        }
        if(!t && localDB.tenants && localDB.tenants[user]) t = localDB.tenants[user];
        if(t) {
            if(String(t.gmail || "").toLowerCase() === email.toLowerCase() && String(t.password).trim() === pass) {
                if(isTenantExpired(t, err)) { if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return; }
                currentUserRole = "owner";
                localDB.tenants[user] = t; 
                localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'owner', loginMode: 'merchant', username: user }));
                err.innerText = "";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                launchApp(t);
                if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                return;
            }
        }

        let b = null;
        if(isOnline && typeof db !== 'undefined') {
            try {
                let bSnap = await db.ref(`tirfe_system/buyers/${user}`).once('value');
                if(bSnap.exists()) b = bSnap.val();
            } catch(fbErr) { console.warn("Firebase Error on Buyer:", fbErr); }
        }
        if(!b && localDB.buyers && localDB.buyers[user]) b = localDB.buyers[user];
        if(b) {
            if(String(b.email || "").toLowerCase() === email.toLowerCase() && String(b.password).trim() === pass) {
                if(b.status === "blocked") { err.innerText = "❌ አካውንትዎ ታግዷል (Blocked)!";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return;
                }
                currentBuyer = b;
                localDB.buyers[user] = b;
                localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'buyer', loginMode: 'buyer', username: user }));
                err.innerText = "";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                switchView('buyerPage');
                if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                return;
            }
        }
        
        let r = null;
        if(isOnline && typeof db !== 'undefined') {
            try {
                let rSnap = await db.ref(`tirfe_system/revenueAuthorities/${user}`).once('value');
                if(rSnap.exists()) r = rSnap.val();
            } catch(fbErr) { console.warn("Firebase Error on Revenue:", fbErr); }
        }
        if(!r && localDB.revenueAuthorities && localDB.revenueAuthorities[user]) r = localDB.revenueAuthorities[user];
        if(r) {
            let rEmail = String(r.authEmail || r.email || r.gmail || "");
            let rPass = String(r.authPass || r.password || r.pass || "").trim();
            if(rEmail.toLowerCase() === email.toLowerCase() && rPass === pass) {
                currentRevenueOfficer = r;
                currentUserRole = "revenue";
                localDB.revenueAuthorities[user] = r;
                localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'revenue', loginMode: 'revenue', username: user }));
                err.innerText = "";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                switchView('revenuePage');
                if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                if(typeof renderRevenuePanel === "function") renderRevenuePanel();
                return;
            }
        }

        let m = null;
        if(isOnline && typeof db !== 'undefined') {
            try {
                let mSnap = await db.ref(`tirfe_system/motors/${user}`).once('value');
                if(mSnap.exists()) m = mSnap.val();
            } catch(fbErr) { console.warn("Firebase Error on Motor:", fbErr); }
        }
        if(!m && localDB.motors && localDB.motors[user]) m = localDB.motors[user];
        if(m) {
            if(String(m.email || "").toLowerCase() === email.toLowerCase() && String(m.password).trim() === pass) {
                if(m.status === "blocked") { 
                    err.innerText = "❌ አካውንትዎ ታግዷል (Blocked)!";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return;
                }
                if(m.status === "pending") {
                    err.innerText = "⏳ መረጃዎ በአስተዳዳሪ እየተገመገመ ነው። እባክዎ ትንሽ ይጠብቁ።";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return;
                }
                currentMotor = m;
                currentUserRole = "motor";
                localDB.motors[user] = m;
                localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'motor', loginMode: 'motor', username: user }));
                err.innerText = "";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                switchView('motorPage');
                if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                return;
            }
        }

        // ================== አዲሱ የሰራተኛ መፈለጊያ ከፋየርቤዝ ==================
        let s = null;
        if(isOnline && typeof db !== 'undefined') {
            try {
                let sSnap = await db.ref(`tirfe_system/staffAccounts/${user}`).once('value');
                if(sSnap.exists()) s = sSnap.val();
            } catch(fbErr) { console.warn("Firebase Error on Staff:", fbErr); }
        }
        
        if (s) {
            if (String(s.gmail || "").toLowerCase() === email.toLowerCase() && String(s.pass).trim() === pass) {
                let parentTenant = null;
                try {
                    if (isOnline && typeof db !== 'undefined') {
                        let ptSnap = await db.ref(`tirfe_system/tenants/${s.tenantUsername}`).once('value');
                        if(ptSnap.exists()) parentTenant = ptSnap.val();
                    }
                } catch(e) {}
                
                if(!parentTenant && localDB.tenants && localDB.tenants[s.tenantUsername]) {
                    parentTenant = localDB.tenants[s.tenantUsername];
                }
                
                if (parentTenant) {
                    if(isTenantExpired(parentTenant, err)) { if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return; }
                    currentUserRole = "staff";
                    localDB.tenants[s.tenantUsername] = parentTenant;
                    localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'staff', loginMode: 'staff', username: parentTenant.username }));
                    err.innerText = "";
                    if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                    launchApp(parentTenant);
                    if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                    return;
                } else {
                    err.innerText = "❌ የሱቁ ባለቤት መረጃ ሲስተም ውስጥ አልተገኘም!";
                    if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                    return;
                }
            }
        }
        
        // እንደ ተጨማሪ የድሮ ሎካል ዳታቤዝ ሰራተኛ ፍለጋ
        if(localDB.tenants) {
            for(let tKey in localDB.tenants) {
                let tLocal = localDB.tenants[tKey];
                if(tLocal && tLocal.staffAccounts) {
                    let found = tLocal.staffAccounts.find(st => st.user === user && String(st.gmail || "").toLowerCase() === email.toLowerCase() && String(st.pass).trim() === pass);
                    if(found) {
                        if (isTenantExpired(tLocal, err)) { if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return; }
                        currentUserRole = "staff";
                        localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'staff', loginMode: 'staff', username: tLocal.username }));
                        err.innerText = "";
                        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                        launchApp(tLocal);
                        if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                        return;
                    }
                }
            }
        }
        // =========================================================

        err.innerText = "❌ መረጃው ስህተት ነው! አካውንት አልተገኘም።";
        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
        
    } catch (error) {
        console.error("Login Error: ", error);
        err.innerText = "❌ ስህተት አጋጥሟል! እባክዎ ኢንተርኔትዎን ያረጋግጡ (" + error.message + ")";
        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
    }
}

async function triggerUnifiedRegistration() {
    let role = document.getElementById('unifiedRegRole').value;
    let regSubmitBtn = document.getElementById('regSubmitBtn');
    
    if(role === 'buyer') {
        let name = document.getElementById('pubBuyerName').value.trim();
        let email = document.getElementById('pubBuyerEmail').value.trim();
        let phone = document.getElementById('pubBuyerPhone').value.trim();
        let user = document.getElementById('pubBuyerUser').value.trim().toLowerCase();
        if(!name || !email || !phone || !user) { showCustomAlert("ስህተት", "እባክዎ መረጃዎን ሙሉ በሙሉ ይሙሉ!");
            return;
        }

        if(regSubmitBtn) { regSubmitBtn.disabled = true; regSubmitBtn.innerText = "በማረጋገጥ ላይ..."; }
        
        let takenMsg = await isSystemDataTaken(user, phone, "", "");
        if(takenMsg) { 
            showCustomAlert("ስህተት", takenMsg);
            if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
            return;
        }

        pendingRegType = 'buyer';
        pendingRegistrationData = { name, email, phone, user };
        triggerOTPFlow(email);
        onVerifySuccess = () => {
            showFormModal("🔒 የይለፍ ቃል ይፍጠሩ", [
                { id: "newPass", label: "ለአካውንትዎ አዲስ የይለፍ ቃል ይፍጠሩ፦", type: "password", placeholder: "ሚስጥራዊ ፓስዎርድ" }
            ], (res) => {
                if(!res.newPass) { showCustomAlert("ስህተት", "ፓስዎርድ አልፈጠሩም!"); return; }
    
                if(!localDB.buyers) localDB.buyers = {};
                localDB.buyers[pendingRegistrationData.user] = { 
                    username: pendingRegistrationData.user, phone: pendingRegistrationData.phone, 
                    name: pendingRegistrationData.name, email: pendingRegistrationData.email,
                    password: res.newPass, joinDate: new Date().getTime(), receipts: [], 
                    status: "active" 
                };
                
                if(isOnline && typeof db !== 'undefined') {
                    db.ref(`tirfe_system/buyers/${pendingRegistrationData.user}`).set(localDB.buyers[pendingRegistrationData.user]).catch(err => console.log(err));
                }
                pushToFirebase();
                showCustomAlert("✅ ተሳክቷል", "በተሳካ ሁኔታ ተመዝግበዋል! አሁን በሚያውቁት ፓስዎርድ ሎጊን በማድረግ ይግቡ።");
                if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
                switchView('welcomeGateway');
            });
        };
    } 
    else if(role === 'tenant') {
        let shop = document.getElementById('pub_newShopName').value.trim();
        let fullName = document.getElementById('pub_newFullName').value.trim();
        let user = document.getElementById('pub_newUsername').value.trim().toLowerCase();
        let phone = document.getElementById('pub_newPhone').value.trim();
        let newEmail = document.getElementById('pub_newEmail').value.trim();
        let telegram = document.getElementById('pub_newTelegram').value.trim();
        let region = document.getElementById('pub_newRegion').value.trim();
        let zone = document.getElementById('pub_newZone').value.trim();
        let woreda = document.getElementById('pub_newWoreda').value.trim();
        let kebele = document.getElementById('pub_newKebele').value.trim();
        let houseNo = document.getElementById('pub_newHouseNo').value.trim();
        let tinNum = document.getElementById('pub_newTin').value.trim();
        let tradeReg = document.getElementById('pub_newTradeReg').value.trim();
        let mapsLink = document.getElementById('pub_newMapsLink').value.trim();
        let address = document.getElementById('pub_newAddress').value.trim();
        
        let businessType = document.getElementById('pub_newBusinessType').value.trim();
        let capitalTier = document.getElementById('pub_newCapitalTier').value;
        let registrationFee = parseFloat(document.getElementById('pub_newRegistrationFee').value) || 0;
        let contractType = document.getElementById('pub_newContractType').value;
        let expiryDate = document.getElementById('pub_newExpiryDate').value;
        if(!shop || !user || !expiryDate || !fullName || !phone || !newEmail || !region || !zone || !woreda || !kebele || !houseNo || !tinNum || !tradeReg || !businessType) { 
            showCustomAlert("ስህተት", "እባክዎ መሠረታዊ እና አስገዳጅ መረጃዎችን ሙሉ በሙሉ ያሟሉ!");
            return; 
        }
        
        if(regSubmitBtn) { regSubmitBtn.disabled = true; regSubmitBtn.innerText = "በማረጋገጥ ላይ..."; }
        
        let checkUser = await isSystemDataTaken(user, phone, "", "");
        if (checkUser) { 
            showCustomAlert("⚠️ ምዝገባው አልተሳካም", checkUser);
            if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
            return;
        }

        let fileInput = document.getElementById('pub_newShopLogoFile');
        let file = fileInput ? fileInput.files[0] : null;
        pendingRegType = 'tenant';
        triggerOTPFlow(newEmail);
        
        onVerifySuccess = () => {
            showFormModal("🔒 የይለፍ ቃል ይፍጠሩ", [
                { id: "newPass", label: "ለሱቅዎ አዲስ ጠንካራ የይለፍ ቃል ይፍጠሩ፦", type: "password", placeholder: "ሚስጥራዊ ፓስዎርድ" }
            ], (res) => {
                if(!res.newPass) { showCustomAlert("ስህተት", "ፓስዎርድ አልፈጠሩም!"); return; }
        
                let proceedReg = function(shopLogoBase64) {
                    let timestampNow = new Date().getTime();
                    localDB.tenants[user] = { 
                        shopName: shop, fullName: fullName, phone: phone, telegram: telegram || "-", address: address || "-",
                        businessType: businessType, googleMapsLink: mapsLink || "", shopLogo: shopLogoBase64 || "", gmail: newEmail,
                        region: region, zone: zone, woreda: woreda, kebele: kebele, houseNo: houseNo, tinNumber: tinNum, tradeRegistration: tradeReg,
                        username: user, password: res.newPass, activationCode: res.newPass, codeCreatedAt: timestampNow,
                        isActivated: true, contractType: contractType, expiryDate: expiryDate, registrationFee: registrationFee,
                        status: "active", theme: "theme-deepblue", staffAccounts: [],
                        data: { sessionActive: false, shiftClosed: false, inventory: [], expenses: [], debts: [], drawerLog: [], history: [], receipts: [], deliveryOrders: [], remoteCarts: {}, accumulatedVat: 0, lastMonthlyResetDate: timestampNow } 
                    };
                    if(isOnline && typeof db !== 'undefined') {
                        db.ref(`tirfe_system/tenants/${user}`).set(localDB.tenants[user]).catch(err => console.log(err));
                    }
                    pushToFirebase();
                    let capitalTierAmh = "ያልተመረጠ";
                    if (capitalTier === 'low') capitalTierAmh = "ዝቅተኛ (Low)";
                    else if (capitalTier === 'medium') capitalTierAmh = "መካከለኛ (Medium)";
                    else if (capitalTier === 'high') capitalTierAmh = "ከፍተኛ (High)";
                    let bankHint = (localDB.adminSettings && localDB.adminSettings.bankAccount) ? `\n\n🏦 የክፍያ ማረጋገጫ (ባንክ): ${localDB.adminSettings.bankAccount}` : "";
                    let tgMsg = `🔔 አዲስ ተከራይ በራሱ ተመዝግቧል!\n\n👤 የተከራይ ስም: ${fullName}\n🔑 ዩዘርኔም: ${user}\n📧 ኢሜል (Gmail): ${newEmail}\n📞 ስልክ: ${phone}\n💰 የካፒታል መጠን: ${capitalTierAmh}\n🏢 የንግድ ዘርፍ: ${businessType}${bankHint}`;
                    if(typeof sendAdminTelegramAlert === 'function') sendAdminTelegramAlert(tgMsg);
                    
                    let adminBankInfo = (localDB.adminSettings && localDB.adminSettings.bankAccount) ? localDB.adminSettings.bankAccount : "አልተሞላም";
                    let successMsg = `ሱቅዎ በተሳካ ሁኔታ ተመዝግቧል!\n\nእባክዎ ክፍያዎን በሚከተለው የባንክ ሂሳብ ቁጥር ይፈፅሙ፦\n🏦 ሂሳብ ቁጥር: ${adminBankInfo}\n💵 የሚከፈል መጠን: ${registrationFee} ETB\n\nክፍያው እንደተረጋገጠ አከራዩ አካውንትዎን ሙሉ በሙሉ ይከፍተዋል።`;
                    showCustomAlert("✅ ተሳክቷል", successMsg);
                    if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
                    switchView('welcomeGateway');
                };
                if(file) processImageUpload(file, proceedReg); else proceedReg("");
            });
        };
        if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
    }
    else if(role === 'motor') {
        let firstName = document.getElementById('mot_firstName').value.trim();
        let lastName = document.getElementById('mot_lastName').value.trim();
        let phone = document.getElementById('mot_phone').value.trim();
        let email = document.getElementById('mot_email').value.trim();
        let user = document.getElementById('mot_username').value.trim().toLowerCase();
        let tgToken = document.getElementById('mot_tgToken').value.trim();
        let plateNumber = document.getElementById('mot_plateNumber').value.trim();
        let region = document.getElementById('mot_region').value.trim();
        let zone = document.getElementById('mot_zone').value.trim();
        let woreda = document.getElementById('mot_woreda').value.trim();
        
        let idCardInput = document.getElementById('mot_idCardFile');
        let licenseInput = document.getElementById('mot_licenseFile');

        if(!firstName || !lastName || !phone || !email || !user || !tgToken || !plateNumber || !region || !zone || !woreda) {
            showCustomAlert("ስህተት", "እባክዎ መሠረታዊ የሞተረኛ መረጃዎችን ሙሉ በሙሉ ያሟሉ!");
            return; 
        }
        
        if(!idCardInput.files || idCardInput.files.length === 0 || !licenseInput.files || licenseInput.files.length === 0) {
            showCustomAlert("ስህተት", "የነዋሪነት መታወቂያ እና መንጃፍቃድ ፎቶ ማንሳት ግዴታ ነው!");
            return; 
        }

        if(regSubmitBtn) { regSubmitBtn.disabled = true; regSubmitBtn.innerText = "ፎቶ በማዘጋጀት ላይ..."; }
        
        let checkUser = await isSystemDataTaken(user, phone, "", "");
        if (checkUser) { 
            showCustomAlert("⚠️ ምዝገባው አልተሳካም", checkUser);
            if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
            return;
        }

        const processImg = (file) => new Promise(res => {
            if(typeof processImageUpload === 'function') {
                processImageUpload(file, res);
            } else {
                let r = new FileReader(); 
                r.onload = e => res(e.target.result); 
                r.readAsDataURL(file);
            }
        });
        let idCardBase64 = await processImg(idCardInput.files[0]);
        let licenseBase64 = await processImg(licenseInput.files[0]);

        if(regSubmitBtn) { regSubmitBtn.innerText = "OTP በመላክ ላይ..."; }

        pendingRegType = 'motor';
        triggerOTPFlow(email);
        onVerifySuccess = () => {
            showFormModal("🔒 የይለፍ ቃል ይፍጠሩ", [
                { id: "newPass", label: "ለሞተረኛ አካውንትዎ አዲስ የይለፍ ቃል ይፍጠሩ፦", type: "password", placeholder: "ሚስጥራዊ ፓስዎርድ" }
            ], async (res) => {
                if(!res.newPass) { showCustomAlert("ስህተት", "ፓስዎርድ አልፈጠሩም!"); return; }

                if(!localDB.motors) localDB.motors = {};
                localDB.motors[user] = {
                    firstName: firstName, lastName: lastName, phone: phone, email: email,
                    username: user, password: res.newPass, telegramToken: tgToken, plateNumber: plateNumber,
                    region: region, zone: zone, woreda: woreda,
                    idCardImage: idCardBase64, licenseImage: licenseBase64,
                    joinDate: new Date().getTime(),
                    status: "pending" 
                };
        
                if(isOnline && typeof db !== 'undefined') {
                    db.ref(`tirfe_system/motors/${user}`).set(localDB.motors[user]).catch(err => console.log(err));
                }
                pushToFirebase();
                let tgMsg = `🏍️ አዲስ ሞተረኛ ተመዝግቧል!\n\n👤 ስም: ${firstName} ${lastName}\n🔑 ዩዘርኔም: ${user}\n📞 ስልክ: ${phone}\n📍 አድራሻ: ${region} / ${zone} / ${woreda}\n\nአስተዳዳሪ (Admin) ገፅ ላይ በመግባት ማረጋገጥ ይችላሉ።`;
                if(typeof sendAdminTelegramAlert === 'function') sendAdminTelegramAlert(tgMsg);

                showCustomAlert("✅ ተሳክቷል", "በተሳካ ሁኔታ ተመዝግበዋል! መረጃዎ በአስተዳዳሪ (Admin) ሲረጋገጥ ወደ ሲስተሙ ሙሉ በሙሉ መግባት ይችላሉ። አሁን ሎጊን በማድረግ መሞከር ይችላሉ።");
                if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
                switchView('welcomeGateway');
            });
        };
        if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
    }
}

async function triggerForgotPassword() {
    showFormModal("የይለፍ ቃል ማደሻ (Forgot Password)", [
        { id: "f_user", label: "የተጠቃሚ ስምዎን (Username) ያስገቡ፦", type: "text" },
        { id: "f_email", label: "የተመዘገቡበትን ኢሜል (Gmail) ያስገቡ፦", type: "email" }
    ], async (res) => {
        let u = res.f_user.trim().toLowerCase();
        let e = res.f_email.trim();
        if(!u || !e) { showCustomAlert("ስህተት", "መረጃ አልሞሉም!"); return; }

        let foundAccount = null;
        let accType = '';
        
        try {
            if (isOnline && typeof db !== 'undefined') {
                let tSnap = await db.ref(`tirfe_system/tenants/${u}`).once('value');
                if(tSnap.exists() && String(tSnap.val().gmail || "").toLowerCase() === e.toLowerCase()) {
                    foundAccount = tSnap.val(); accType = 'tenant';
                    localDB.tenants[u] = foundAccount; 
                } else {
                    let bSnap = await db.ref(`tirfe_system/buyers/${u}`).once('value');
                    if(bSnap.exists() && String(bSnap.val().email || "").toLowerCase() === e.toLowerCase()) {
                        foundAccount = bSnap.val();
                        accType = 'buyer';
                        localDB.buyers[u] = foundAccount;
                    } else {
                        let mSnap = await db.ref(`tirfe_system/motors/${u}`).once('value');
                        if(mSnap.exists() && String(mSnap.val().email || "").toLowerCase() === e.toLowerCase()) {
                            foundAccount = mSnap.val();
                            accType = 'motor';
                            if(!localDB.motors) localDB.motors = {};
                            localDB.motors[u] = foundAccount;
                        }
                    }
                }
            }
        } catch(err) { console.log(err); }

        if(!foundAccount) { showCustomAlert("ስህተት", "በዚህ ዩዘርኔም እና ኢሜል የተመዘገበ አካውንት የለም!"); return; }

        pendingRegType = 'forgot_pass';
        triggerOTPFlow(e);
        onVerifySuccess = () => {
            showFormModal("🔑 አዲስ የይለፍ ቃል ማስተካከያ", [
                { id: "newPass", label: "አዲሱን የይለፍ ቃልዎን ያስገቡ፦", type: "password" }
            ], (resPass) => {
                let np = resPass.newPass.trim();
                if(!np) { showCustomAlert("ስህተት", "ባዶ መሆን አይችልም!"); return; }
                
                if(accType === 'tenant') { 
                    localDB.tenants[u].password = np; 
                    if (isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/tenants/${u}/password`).set(np);
                } 
                else if(accType === 'buyer') { 
                    localDB.buyers[u].password = np; 
                    if (isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/buyers/${u}/password`).set(np);
                }
                else if(accType === 'motor') { 
                    localDB.motors[u].password = np; 
                    if (isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/motors/${u}/password`).set(np);
                }
                pushToFirebase();
                showCustomAlert("✅ ተሳክቷል", "የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል! አሁን በአዲሱ መግባት ይችላሉ።");
            });
        };
    });
}

function triggerOTPFlow(emailAddress) {
    emailVerificationCode = Math.floor(10000 + Math.random() * 90000).toString();
    document.getElementById('verifyEmailDisplay').innerText = emailAddress;
    openModalContainer();
    document.getElementById('emailVerifyModal').classList.remove('hidden');
    for(let i=1; i<=5; i++) document.getElementById('code'+i).value = '';
    document.getElementById('code1').focus();
    
    sendSecureVerificationEmail(emailAddress, emailVerificationCode);
}

window.resendOTP = function() {
    let currentEmail = document.getElementById('verifyEmailDisplay').innerText;
    emailVerificationCode = Math.floor(10000 + Math.random() * 90000).toString();
    sendSecureVerificationEmail(currentEmail, emailVerificationCode);
    showCustomAlert("✅ ተልኳል", "አዲስ ማረጋገጫ ኮድ ወደ ኢሜልዎ ተልኳል።");
};

function verifyEmailCodeSubmit() {
    let enteredCode = "";
    for(let i=1; i<=5; i++) { enteredCode += document.getElementById('code'+i).value; }
    if (enteredCode === emailVerificationCode) {
        closeActiveModal();
        if(onVerifySuccess) onVerifySuccess();
    } else { showCustomAlert("❌ ስህተት", "ያስገቡት ማረጋገጫ ኮድ የተሳሳተ ነው!"); }
}

function isTenantExpired(tenant, errorElement) {
    if(tenant.expiryDate) {
        let today = new Date();
        today.setHours(0,0,0,0);
        let expiry = new Date(tenant.expiryDate); expiry.setHours(0,0,0,0);
        if(today > expiry) {
            tenant.status = "blocked";
            localDB.tenants[tenant.username] = tenant; pushToFirebase();
            errorElement.innerText = "🔒 የኪራይ ውልዎ ጊዜ አልቋል! እባክዎ ባለቤቱን ያነጋግሩ።"; return true;
        }
    }
    if(tenant.status === "blocked") { errorElement.innerText = "🔒 አካውንትዎ ታግዷል!"; return true; }
    return false;
}

function checkMonthlyAccessReset() {
    if (!currentTenant || !currentTenant.data) return;
    let now = new Date(); let currentTimestamp = now.getTime();
    if (!currentTenant.data.lastMonthlyResetDate) {
        currentTenant.data.lastMonthlyResetDate = currentTenant.codeCreatedAt || currentTimestamp;
        saveAndRefresh(); return;
    }
    
    let diffTime = Math.abs(currentTimestamp - currentTenant.data.lastMonthlyResetDate);
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 30) {
        let d = currentTenant.data;
        let expensesList = d.expenses || []; let totalMonthlyExp = 0;
        expensesList.forEach(e => totalMonthlyExp += parseFloat(e.amount) || 0);
        let totalMonthlySales = 0; let totalMonthlyProfit = 0;
        let inv = d.inventory || [];
        inv.forEach(item => {
            totalMonthlySales += (item.price * item.sold);
            totalMonthlyProfit += (item.price - item.cost) * item.sold;
        });
        let finalMonthlyNetProfit = totalMonthlyProfit - totalMonthlyExp;
        
        if(!d.history) d.history = [];
        let lastResetObj = new Date(d.lastMonthlyResetDate);
        let formattedPeriod = `${lastResetObj.toLocaleDateString('en-GB')} - ${now.toLocaleDateString('en-GB')}`;
        
        d.history.push({
            date: "የወር ማጠቃለያ", employee: formattedPeriod, sales: totalMonthlySales, profit: finalMonthlyNetProfit,
            expenses: totalMonthlyExp, draws: 0, reportedCash: d.reportedCash || 0, expectedCash: d.expectedCash || 0,
            variance: d.variance || 0, isMonthlyArchive: true
        });
        d.expenses = []; d.lastMonthlyResetDate = currentTimestamp; 
        
        localDB.tenants[currentTenant.username] = currentTenant; saveToLocalStorage(); pushToFirebase();
        showCustomAlert("📅 አዲስ ወር ጀምሯል", `ያለፈው 30 ቀናት የሱቅ ወጪና የሂሳብ መረጃዎች ተጠቅልለው ማህደር (Archive) ውስጥ ገብተዋል። ለአዲሱ ወር ወጪው ከ 0 ተጀምሯል።`);
    }
}

window.openStaffManagement = function() {
    if(!currentTenant.staffAccounts) {
        currentTenant.staffAccounts = [];
        if(currentTenant.staffUser && currentTenant.staffPass) {
            currentTenant.staffAccounts.push({ name: "ነባር ሰራተኛ", gmail: "", phone: "", user: currentTenant.staffUser, pass: currentTenant.staffPass });
        }
    }
    tempStaffForms = JSON.parse(JSON.stringify(currentTenant.staffAccounts));
    if(tempStaffForms.length === 0) { tempStaffForms.push({ name: "", gmail: "", phone: "", user: "", pass: "" }); }
    
    renderStaffForms(); openModalContainer();
    document.querySelectorAll('.modal-card').forEach(m => m.classList.add('hidden'));
    document.getElementById('staffManageModal').classList.remove('hidden');
};

window.addStaffFormRow = function() {
    if(tempStaffForms.length >= 3) { showCustomAlert("ማሳሰቢያ", "ከ 3 ሰራተኛ በላይ በአንድ ጊዜ መመዝገብ አይቻልም!"); return; }
    tempStaffForms.push({ name: "", gmail: "", phone: "", user: "", pass: "" }); renderStaffForms();
};

window.removeStaffFormRow = function(idx) { tempStaffForms.splice(idx, 1); renderStaffForms(); };

window.renderStaffForms = function() {
    let container = document.getElementById('staffFormsContainer');
    container.innerHTML = "";
    tempStaffForms.forEach((s, idx) => {
        container.innerHTML += `
        <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; margin-bottom: 10px; border: 1px dashed var(--accent-color);">
            <h4 style="color:var(--accent-color); margin-bottom: 5px;">ሰራተኛ ${idx + 1}
                ${(idx > 0 || tempStaffForms.length > 1) ? `<span style="float:right; cursor:pointer; color:var(--danger-color);" onclick="removeStaffFormRow(${idx})">❌</span>` : ''}
            </h4>
            <input type="text" id="s_name_${idx}" placeholder="ሙሉ ስም" value="${s.name}">
            <input type="email" id="s_gmail_${idx}" placeholder="ኢሜል (Gmail)" value="${s.gmail}">
            <input type="tel" id="s_phone_${idx}" placeholder="ስልክ ቁጥር" value="${s.phone}">
            <input type="text" id="s_user_${idx}" placeholder="የመግቢያ ስም (Username)" value="${s.user}">
            <input type="text" id="s_pass_${idx}" placeholder="የይለፍ ቃል (Password)" value="${s.pass}">
        </div>`;
    });
};

// ================== ማስተካከያ የተደረገበት ==================
// ሰራተኛ ሲፈጠር በቀጥታ ወደ ፋየርቤዝ እንዲላክ እና ከማንኛውም ስልክ መግባት እንዲችል ታክሏል
window.saveAllStaff = async function() {
    for(let i=0; i<tempStaffForms.length; i++) {
        tempStaffForms[i].name = document.getElementById(`s_name_${i}`).value.trim();
        tempStaffForms[i].gmail = document.getElementById(`s_gmail_${i}`).value.trim();
        tempStaffForms[i].phone = document.getElementById(`s_phone_${i}`).value.trim();
        tempStaffForms[i].user = document.getElementById(`s_user_${i}`).value.trim().toLowerCase();
        tempStaffForms[i].pass = document.getElementById(`s_pass_${i}`).value.trim();
        if(!tempStaffForms[i].name || !tempStaffForms[i].phone || !tempStaffForms[i].user || !tempStaffForms[i].pass) {
            showCustomAlert("ስህተት", `እባክዎ ለሰራተኛ ${i+1} አስፈላጊ መረጃዎችን ይሙሉ!`);
            return;
        }
        let takenMsg = await isSystemDataTaken(tempStaffForms[i].user, tempStaffForms[i].phone, currentTenant.username, "");
        if (takenMsg) { showCustomAlert("ስህተት", `ሰራተኛ ${i+1}: ${takenMsg}`); return; }

        for(let j=0; j<i; j++) {
            if(tempStaffForms[j].user === tempStaffForms[i].user) { showCustomAlert("ስህተት", "ዩዘርኔም በፎርሙ ውስጥ ተደግሟል!"); return; }
            if(tempStaffForms[j].phone === tempStaffForms[i].phone) { showCustomAlert("ስህተት", "ስልክ ቁጥር በፎርሙ ውስጥ ተደግሟል!"); return; }
        }
    }
    currentTenant.staffAccounts = tempStaffForms;
    saveAndRefresh(); closeActiveModal();
    
    // የሰራተኛውን መረጃ በቀጥታ ወደ ፋየርቤዝ መላክ
    if(isOnline && typeof db !== 'undefined') {
        tempStaffForms.forEach(staff => {
            if(staff.user && staff.pass) {
                db.ref(`tirfe_system/staffAccounts/${staff.user}`).set({
                    name: staff.name,
                    gmail: staff.gmail,
                    phone: staff.phone,
                    user: staff.user,
                    pass: staff.pass,
                    tenantUsername: currentTenant.username
                }).catch(err => console.error("Staff Save Error:", err));
            }
        });
    }

    showCustomAlert("ተሳክቷል", "የሰራተኞች መረጃ በተሳካ ሁኔታ ተመዝግቧል!");
};

function configureBank() {
    if(currentUserRole === "staff") { showCustomAlert("🏦 የባንክ ሂሳብ መረጃ", `የአሰሪው የባንክ ሂሳብ ቁጥር (CBE/Telebirr)፦ ${currentTenant.bankAccount || "ያልተገናኘ"}`); return; }
    
    showFormModal("🏦 የባንክ እና የቴሌግራም አገናኝ መቼት", [
        { id: "telegramToken", label: "የቴሌግራም ቦት ቶከን (Telegram Bot Token)", type: "text", placeholder: "Token...", defaultValue: currentTenant.telegramToken || "" },
        { id: "telegramChatId", label: "የቴሌግራም ቻት ID (Telegram Chat ID)", type: "text", placeholder: "Chat ID...", defaultValue: currentTenant.telegramChatId || "" },
        { id: "bankAccountNumber", label: "የባንክ ሂሳብ ቁጥር (CBE/Telebirr)", type: "text", placeholder: "የባንክ ቁጥር...", defaultValue: currentTenant.bankAccount || "" }
    ], (res) => {
        currentTenant.telegramToken = res.telegramToken.trim(); currentTenant.telegramChatId = res.telegramChatId.trim(); currentTenant.bankAccount = res.bankAccountNumber.trim();
        saveAndRefresh(); showCustomAlert("ተሳክቷል", "የማያያዣ መቼቶች በተሳካ ሁኔታ ተቀምጠዋል!");
    });
}
