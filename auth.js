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

// ---------------------------------------------------------------------
// NEW LOGIN LOGIC (Firebase Auth + Fallback to LocalDB)
// ---------------------------------------------------------------------
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

    if(loginBtn) { 
        loginBtn.disabled = true; loginBtn.innerText = "🔄 በማረጋገጥ ላይ...";
    }
    
    // 1. Admin Login (Remains via Vercel API)
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
    
    // 2. Try Firebase Authentication First
    let isFirebaseAuthSuccess = false;
    try {
        await auth.signInWithEmailAndPassword(email, pass);
        isFirebaseAuthSuccess = true;
    } catch (fbAuthError) {
        console.warn("Firebase Auth Failed: ", fbAuthError.message);
        const strictErrors = ['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-email', 'auth/invalid-login-credentials'];
        if (strictErrors.includes(fbAuthError.code)) {
            err.innerText = "❌ የተሳሳተ ኢሜል ወይም የይለፍ ቃል! (አካውንቱ የለም ወይም ፓስዎርድ ተሳስቷል)";
            if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
            return;
        }
    }

    let hashedInputPass = await hashPassword(pass);
    
    try {
        // --- TENANT CHECK ---
        let t = null;
        if(isOnline && typeof db !== 'undefined') {
            try {
                let tSnap = await db.ref(`tirfe_system/tenants/${user}`).once('value');
                if(tSnap.exists()) t = tSnap.val();
            } catch(fbErr) { console.warn("Firebase Error on Tenant:", fbErr); }
        }
        if(!t && localDB.tenants && localDB.tenants[user]) t = localDB.tenants[user];
        if(t) {
            if(isFirebaseAuthSuccess || (String(t.gmail || "").toLowerCase() === email.toLowerCase() && (String(t.password) === hashedInputPass || String(t.password).trim() === pass))) {
                
                if(String(t.password).trim() === pass && String(t.password) !== hashedInputPass) {
                    t.password = hashedInputPass;
                    if(isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/tenants/${user}/password`).set(hashedInputPass);
                }

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

        // --- BUYER CHECK ---
        let b = null;
        if(isOnline && typeof db !== 'undefined') {
            try {
                let bSnap = await db.ref(`tirfe_system/buyers/${user}`).once('value');
                if(bSnap.exists()) b = bSnap.val();
            } catch(fbErr) { console.warn("Firebase Error on Buyer:", fbErr); }
        }
        if(!b && localDB.buyers && localDB.buyers[user]) b = localDB.buyers[user];
        if(b) {
            if(isFirebaseAuthSuccess || (String(b.email || "").toLowerCase() === email.toLowerCase() && (String(b.password) === hashedInputPass || String(b.password).trim() === pass))) {
                
                if(String(b.password).trim() === pass && String(b.password) !== hashedInputPass) {
                    b.password = hashedInputPass;
                    if(isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/buyers/${user}/password`).set(hashedInputPass);
                }

                if(b.status === "blocked") { 
                    err.innerText = "❌ አካውንትዎ ታግዷል (Blocked)!";
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
        
        // --- REVENUE OFFICER CHECK ---
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
            if(isFirebaseAuthSuccess || (rEmail.toLowerCase() === email.toLowerCase() && (rPass === hashedInputPass || rPass === pass))) {
                
                if(rPass === pass && rPass !== hashedInputPass) {
                    if (r.authPass) r.authPass = hashedInputPass;
                    else if (r.password) r.password = hashedInputPass;
                    else if (r.pass) r.pass = hashedInputPass;
                    if(isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/revenueAuthorities/${user}`).set(r);
                }

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

        // --- MOTOR CHECK ---
        let m = null;
        if(isOnline && typeof db !== 'undefined') {
            try {
                let mSnap = await db.ref(`tirfe_system/motors/${user}`).once('value');
                if(mSnap.exists()) m = mSnap.val();
            } catch(fbErr) { console.warn("Firebase Error on Motor:", fbErr); }
        }
        if(!m && localDB.motors && localDB.motors[user]) m = localDB.motors[user];
        if(m) {
            if(isFirebaseAuthSuccess || (String(m.email || "").toLowerCase() === email.toLowerCase() && (String(m.password) === hashedInputPass || String(m.password).trim() === pass))) {
                
                if(String(m.password).trim() === pass && String(m.password) !== hashedInputPass) {
                    m.password = hashedInputPass;
                    if(isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/motors/${user}/password`).set(hashedInputPass);
                }

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

        // --- STAFF ACCOUNTS CHECK ---
        let s = null;
        if(isOnline && typeof db !== 'undefined') {
            try {
                let sSnap = await db.ref(`tirfe_system/staffAccounts/${user}`).once('value');
                if(sSnap.exists()) s = sSnap.val();
            } catch(fbErr) { console.warn("Firebase Error on Staff:", fbErr); }
        }
        
        if (s) {
            if (isFirebaseAuthSuccess || (String(s.gmail || "").toLowerCase() === email.toLowerCase() && (String(s.pass) === hashedInputPass || String(s.pass).trim() === pass))) {
                
                if(String(s.pass).trim() === pass && String(s.pass) !== hashedInputPass) {
                     s.pass = hashedInputPass;
                     if(isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/staffAccounts/${user}/pass`).set(hashedInputPass);
                }

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
        
        if(localDB.tenants) {
            for(let tKey in localDB.tenants) {
                let tLocal = localDB.tenants[tKey];
                if(tLocal && tLocal.staffAccounts) {
                    let found = tLocal.staffAccounts.find(st => st.user === user && String(st.gmail || "").toLowerCase() === email.toLowerCase() && (String(st.pass) === hashedInputPass || String(st.pass).trim() === pass));
                    if(isFirebaseAuthSuccess || found) {
                        
                        if (found && String(found.pass).trim() === pass && String(found.pass) !== hashedInputPass) {
                            found.pass = hashedInputPass;
                            pushToFirebase();
                        }

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

        err.innerText = "❌ መረጃው ስህተት ነው! አካውንት አልተገኘም።";
        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
        
    } catch (error) {
        console.error("Login Error: ", error);
        err.innerText = "❌ ስህተት አጋጥሟል! እባክዎ ኢንተርኔትዎን ያረጋግጡ (" + error.message + ")";
        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
    }
}

// ---------------------------------------------------------------------
// REGISTRATION LOGIC WITH FIREBASE AUTH & HASHING
// ---------------------------------------------------------------------
async function triggerUnifiedRegistration() {
    let role = document.getElementById('unifiedRegRole').value;
    let regSubmitBtn = document.getElementById('regSubmitBtn');
    
    // --- BUYER REGISTRATION ---
    if(role === 'buyer') {
        let name = document.getElementById('pubBuyerName').value.trim();
        let email = document.getElementById('pubBuyerEmail').value.trim();
        let phone = document.getElementById('pubBuyerPhone').value.trim();
        let user = document.getElementById('pubBuyerUser').value.trim().toLowerCase();
        
        if(!name || !email || !phone || !user) { 
            showCustomAlert("ስህተት", "እባክዎ መረጃዎን ሙሉ በሙሉ ይሙሉ!");
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
            ], async (res) => {
                if(!res.newPass) { showCustomAlert("ስህተት", "ፓስዎርድ አልፈጠሩም!"); return; }
    
                try {
                    await auth.createUserWithEmailAndPassword(pendingRegistrationData.email, res.newPass);
                    let hashedPass = await hashPassword(res.newPass);
                    
                    if(!localDB.buyers) localDB.buyers = {};
                    localDB.buyers[pendingRegistrationData.user] = { 
                        username: pendingRegistrationData.user, phone: pendingRegistrationData.phone, 
                        name: pendingRegistrationData.name, email: pendingRegistrationData.email,
                        password: hashedPass, joinDate: new Date().getTime(), receipts: [], 
                        status: "active" 
                    };
                    
                    if(isOnline && typeof db !== 'undefined') {
                        db.ref(`tirfe_system/buyers/${pendingRegistrationData.user}`).set(localDB.buyers[pendingRegistrationData.user]).catch(err => console.log(err));
                    }
                    pushToFirebase();
                    
                    showCustomAlert("✅ ተሳክቷል", "በተሳካ ሁኔታ ተመዝግበዋል! አሁን በሚያውቁት ፓስዎርድ ሎጊን በማድረግ ይግቡ።");
                    if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
                    switchView('welcomeGateway');
                } catch(error) {
                    showCustomAlert("ስህተት", "ምዝገባ አልተሳካም (Firebase): " + error.message);
                }
            });
        };
    } 
    // --- TENANT REGISTRATION ---
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
            ], async (res) => {
                if(!res.newPass) { showCustomAlert("ስህተት", "ፓስዎርድ አልፈጠሩም!"); return; }
       
                try {
                    await auth.createUserWithEmailAndPassword(newEmail, res.newPass);
                    let hashedPass = await hashPassword(res.newPass);

                    let proceedReg = function(shopLogoBase64) {
                        let timestampNow = new Date().getTime();
                        localDB.tenants[user] = { 
                            shopName: shop, fullName: fullName, phone: phone, telegram: telegram || "-", address: address || "-",
                            businessType: businessType, googleMapsLink: mapsLink || "", shopLogo: shopLogoBase64 || "", gmail: newEmail,
                            region: region, zone: zone, woreda: woreda, kebele: kebele, houseNo: houseNo, tinNumber: tinNum, tradeRegistration: tradeReg,
                            username: user, password: hashedPass, activationCode: hashedPass, codeCreatedAt: timestampNow,
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
                } catch(error) {
                    showCustomAlert("ስህተት", "ምዝገባ አልተሳካም (Firebase): " + error.message);
                }
            });
        };
        if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
    }
    // --- MOTOR REGISTRATION ---
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

                try {
                    await auth.createUserWithEmailAndPassword(email, res.newPass);
                    let hashedPass = await hashPassword(res.newPass);

                    if(!localDB.motors) localDB.motors = {};
                    localDB.motors[user] = {
                        firstName: firstName, lastName: lastName, phone: phone, email: email,
                        username: user, password: hashedPass, telegramToken: tgToken, plateNumber: plateNumber,
                        region: region, zone: zone, woreda: woreda,
                        idCardImage: idCardBase64, licenseImage: licenseBase64,
                        joinDate: new Date().getTime(),
                        status: "pending" 
                    };
                    
                    if(isOnline && typeof db !== 'undefined') {
                        db.ref(`tirfe_system/motors/${user}`).set(localDB.motors[user]).catch(err => console.log(err));
                    }
                    pushToFirebase();
                    
                    let nowForReg = new Date();
                    let timeStampReg = nowForReg.toLocaleDateString('am-ET') + " " + nowForReg.toLocaleTimeString('am-ET');
                    let tgMsg = `🏍️ አዲስ ሞተረኛ ተመዝግቧል!\n\n` +
                                `👤 ሙሉ ስም: ${firstName} ${lastName}\n` +
                                `🔑 ዩዘርኔም: @${user}\n` +
                                `📞 ስልክ: ${phone}\n` +
                                `🏍️ የታርጋ ቁጥር / ሞተር: ${plateNumber}\n` +
                                `📍 አድራሻ: ${region} / ${zone} / ${woreda}\n` +
                                `📅 የተመዘገበበት ጊዜ: ${timeStampReg}\n\n` +
                                `አስተዳዳሪ (Admin) ገፅ ላይ በመግባት ማረጋገጥ ይችላሉ።`;
                                
                    if(typeof sendAdminTelegramAlert === 'function') sendAdminTelegramAlert(tgMsg);
    
                    showCustomAlert("✅ ተሳክቷል", "በተሳካ ሁኔታ ተመዝግበዋል! መረጃዎ በአስተዳዳሪ (Admin) ሲረጋገጥ ወደ ሲስተሙ ሙሉ በሙሉ መግባት ይችላሉ። አሁን ሎጊን በማድረግ መሞከር ይችላሉ።");
                    if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
                    switchView('welcomeGateway');
                } catch(error) {
                    showCustomAlert("ስህተት", "ምዝገባ አልተሳካም (Firebase): " + error.message);
                }
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

        if(!foundAccount) { 
            showCustomAlert("ስህተት", "በዚህ ዩዘርኔም እና ኢሜል የተመዘገበ አካውንት የለም!"); return;
        }

        pendingRegType = 'forgot_pass';
        triggerOTPFlow(e);
        
        onVerifySuccess = () => {
            showFormModal("🔑 አዲስ የይለፍ ቃል ማስተካከያ", [
                { id: "newPass", label: "አዲሱን የይለፍ ቃልዎን ያስገቡ፦", type: "password" }
            ], async (resPass) => {
                let np = resPass.newPass.trim();
                if(!np) { showCustomAlert("ስህተት", "ባዶ መሆን አይችልም!"); return; }
                
                let npHash = await hashPassword(np);

                if(accType === 'tenant') { 
                    localDB.tenants[u].password = npHash; 
                    if (isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/tenants/${u}/password`).set(npHash);
                } 
                else if(accType === 'buyer') { 
                    localDB.buyers[u].password = npHash; 
                    if (isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/buyers/${u}/password`).set(npHash);
                }
                else if(accType === 'motor') { 
                    localDB.motors[u].password = npHash;
                    if (isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/motors/${u}/password`).set(npHash);
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
    } else { 
        showCustomAlert("❌ ስህተት", "ያስገቡት ማረጋገጫ ኮድ የተሳሳተ ነው!");
    }
}

