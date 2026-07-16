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
// NEW LOGIN LOGIC (Firebase Auth + Fallback to LocalDB) - FIXED
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
                await fetchAndRenderSecureHTML('admin');
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

    // ማስተካከያ 1፡ እዚህ ጋር የነበረው ትርፍ "በማረጋገጥ ላይ" የሚል ጽሑፍ ተጠፍቶ ባዶ ተደርጓል
    err.innerText = "";
    
    // ማስተካከያ 2፡ ሁሉም ቀሪ ኮድ ወደ አንድ ትልቅ Try...Catch ውስጥ ገብቷል ድምፅ አልባ ክራሽ እንዳይኖር
    try {
        // 2. Try Firebase Authentication First
        let isFirebaseAuthSuccess = false;
        try {
            await auth.signInWithEmailAndPassword(email, pass);
            isFirebaseAuthSuccess = true;
        } catch (fbAuthError) {
            console.warn("Firebase Auth Failed: ", fbAuthError.message || fbAuthError);
            const strictErrors = ['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-email', 'auth/invalid-login-credentials'];
            if (fbAuthError.code && strictErrors.includes(fbAuthError.code)) {
                err.innerText = "❌ የተሳሳተ ኢሜል ወይም የይለፍ ቃል! (አካውንቱ የለም ወይም ፓስዎርድ ተሳስቷል)";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                return;
            }
        }

        let hashedInputPass = await hashPassword(pass);
        
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
            let tEmailMatch = String(t.gmail || "").toLowerCase() === email.toLowerCase();
            let tPassMatch = (String(t.password) === hashedInputPass || String(t.password).trim() === pass);
            
            if((isFirebaseAuthSuccess && tEmailMatch) || (tEmailMatch && tPassMatch)) {
                
                if(String(t.password).trim() === pass && String(t.password) !== hashedInputPass) {
                    t.password = hashedInputPass;
                    if(isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/tenants/${user}/password`).set(hashedInputPass);
                }

                if(isTenantExpired(t, err)) { if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return; }
                currentUserRole = "owner";
                localDB.tenants[user] = t; 
                localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'owner', loginMode: 'merchant', username: user }));
                pushToFirebase();
                err.innerText = "";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                await fetchAndRenderSecureHTML('shop');
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
            let bEmailMatch = String(b.email || "").toLowerCase() === email.toLowerCase();
            let bPassMatch = (String(b.password) === hashedInputPass || String(b.password).trim() === pass);

            if((isFirebaseAuthSuccess && bEmailMatch) || (bEmailMatch && bPassMatch)) {
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
                pushToFirebase();
                err.innerText = "";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                await fetchAndRenderSecureHTML('buyer');
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
            let rEmailMatch = rEmail.toLowerCase() === email.toLowerCase();
            let rPassMatch = (rPass === hashedInputPass || rPass === pass);

            if((isFirebaseAuthSuccess && rEmailMatch) || (rEmailMatch && rPassMatch)) {
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
                pushToFirebase();
                err.innerText = "";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                await fetchAndRenderSecureHTML('revenue');
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
            let mEmailMatch = String(m.email || "").toLowerCase() === email.toLowerCase();
            let mPassMatch = (String(m.password) === hashedInputPass || String(m.password).trim() === pass);

            if((isFirebaseAuthSuccess && mEmailMatch) || (mEmailMatch && mPassMatch)) {
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
                pushToFirebase();
                err.innerText = "";
                if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                await fetchAndRenderSecureHTML('motor');
                return;
            }
        }

        // --- STAFF ACCOUNTS CHECK (FIREBASE) ---
        let s = null;
        if(isOnline && typeof db !== 'undefined') {
            try {
                let sSnap = await db.ref(`tirfe_system/staffAccounts/${user}`).once('value');
                if(sSnap.exists()) s = sSnap.val();
            } catch(fbErr) { console.warn("Firebase Error on Staff:", fbErr); }
        }
        
        if (s) {
            let sEmailMatch = String(s.gmail || "").toLowerCase() === email.toLowerCase();
            let sPassMatch = (String(s.pass) === hashedInputPass || String(s.pass).trim() === pass);

            if ((isFirebaseAuthSuccess && sEmailMatch) || (sEmailMatch && sPassMatch)) {
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
                    pushToFirebase();
                    err.innerText = "";
                    if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                    await fetchAndRenderSecureHTML('staff');
                    return;
                } else {
                    err.innerText = "❌ የሱቁ ባለቤት መረጃ ሲስተም ውስጥ አልተገኘም!";
                    if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                    return;
                }
            }
        }
        
        // --- STAFF ACCOUNTS CHECK (LOCALDB) ---
        if(localDB.tenants) {
            for(let tKey in localDB.tenants) {
                let tLocal = localDB.tenants[tKey];
                if(tLocal && tLocal.staffAccounts) {
                    let found = tLocal.staffAccounts.find(st => st.user === user && String(st.gmail || "").toLowerCase() === email.toLowerCase());
                    
                    if(found) {
                        let stPassMatch = (String(found.pass) === hashedInputPass || String(found.pass).trim() === pass);
                        
                        if(isFirebaseAuthSuccess || stPassMatch) {
                            if (String(found.pass).trim() === pass && String(found.pass) !== hashedInputPass) {
                                found.pass = hashedInputPass;
                                pushToFirebase();
                            }

                            if (isTenantExpired(tLocal, err)) { if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return; }
                            currentUserRole = "staff";
                            localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'staff', loginMode: 'staff', username: tLocal.username }));
                            pushToFirebase();
                            err.innerText = "";
                            if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                            
                            // ማስተካከያ፡ ወደ ሱቅ ገጽ ቀጥታ መላክ
                           await fetchAndRenderSecureHTML('staff');
                            return;
                        }
                    }
                }
            }
        }

        // ከላይ ያሉት ማረጋገጫዎች ካልሰሩ ይሄን ያወጣል
        err.innerText = "❌ መረጃው ስህተት ነው! አካውንት አልተገኘም። እባክዎ ዩዘርኔምዎን ያረጋግጡ።";
        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
        
    } catch (error) {
        console.error("Login Error: ", error);
        err.innerText = "❌ ስህተት አጋጥሟል! " + (error.message || "ያልታወቀ የውስጥ ስህተት");
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

// 1. የፎርጌት ማረጋገጫ (Loading አብሮት የተጨመረበት)
async function triggerForgotPassword() {
    showFormModal("የይለፍ ቃል ማደሻ (Forgot Password)", [
        { id: "f_user", label: "የተጠቃሚ ስምዎን (Username) ያስገቡ፦", type: "text" },
        { id: "f_email", label: "የተመዘገቡበትን ኢሜል (Gmail) ያስገቡ፦", type: "email" }
    ], async (res) => {
        let u = res.f_user.trim().toLowerCase();
        let e = res.f_email.trim();
        if(!u || !e) { showCustomAlert("ስህተት", "መረጃ አልሞሉም!"); return; }

        // ሎዲንግ እያደረገ መሆኑን ለተጠቃሚው ማሳወቂያ
        let submitBtn = document.querySelector('#formModalFooter button.btn-add');
        if(submitBtn) { submitBtn.innerText = "በማረጋገጥ ላይ (Loading)..."; submitBtn.disabled = true; }

        let foundAccount = null;
        let accType = '';
        
        try {
            // Firebase ላይ መፈለግ
            if (isOnline && typeof db !== 'undefined') {
                let tSnap = await db.ref(`tirfe_system/tenants/${u}`).once('value');
                if(tSnap.exists() && String(tSnap.val().gmail || "").toLowerCase() === e.toLowerCase()) {
                    foundAccount = tSnap.val(); accType = 'tenant';
                } else {
                    let bSnap = await db.ref(`tirfe_system/buyers/${u}`).once('value');
                    if(bSnap.exists() && String(bSnap.val().email || "").toLowerCase() === e.toLowerCase()) {
                        foundAccount = bSnap.val(); accType = 'buyer';
                    } else {
                        let mSnap = await db.ref(`tirfe_system/motors/${u}`).once('value');
                        if(mSnap.exists() && String(mSnap.val().email || "").toLowerCase() === e.toLowerCase()) {
                            foundAccount = mSnap.val(); accType = 'motor';
                        } else {
                            // የሰራተኞችንም ዩዘርኔም እንዲፈልግ የተጨመረ
                            let sSnap = await db.ref(`tirfe_system/staffAccounts/${u}`).once('value');
                            if(sSnap.exists() && String(sSnap.val().gmail || "").toLowerCase() === e.toLowerCase()) {
                                foundAccount = sSnap.val(); accType = 'staff';
                            }
                        }
                    }
                }
            }
        } catch(err) { console.log(err); }

        // በተኑን ወደ ነበረበት መመለስ
        if(submitBtn) { submitBtn.innerText = "እሺ (OK)"; submitBtn.disabled = false; }

        if(!foundAccount) { 
            showCustomAlert("ስህተት", "በዚህ ዩዘርኔም እና ኢሜል የተመዘገበ አካውንት የለም!"); return;
        }

        // ፎርሙን ዘግቶ ወደ OTP ኮድ መላኪያ ማለፍ
        closeActiveModal(); 
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
                    if(localDB.tenants[u]) localDB.tenants[u].password = npHash; 
                    if (isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/tenants/${u}/password`).set(npHash);
                } 
                else if(accType === 'buyer') { 
                    if(localDB.buyers[u]) localDB.buyers[u].password = npHash; 
                    if (isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/buyers/${u}/password`).set(npHash);
                }
                else if(accType === 'motor') { 
                    if(localDB.motors[u]) localDB.motors[u].password = npHash;
                    if (isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/motors/${u}/password`).set(npHash);
                }
                else if(accType === 'staff') { 
                    if (isOnline && typeof db !== 'undefined') db.ref(`tirfe_system/staffAccounts/${u}/pass`).set(npHash);
                }

                pushToFirebase();
                showCustomAlert("✅ ተሳክቷል", "የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል! አሁን አዲሱን ተጠቅመው መግባት ይችላሉ።");
            });
        };
    });
}

// 2. የ OTP ማሳያ (Error እንዳይፈጥር የተስተካከለ)
function triggerOTPFlow(emailAddress) {
    emailVerificationCode = Math.floor(10000 + Math.random() * 90000).toString();
    
    let emailDisp = document.getElementById('verifyEmailDisplay');
    if(emailDisp) emailDisp.innerText = emailAddress;
    
    // openModalContainer() ባይኖር እንኳን ሲስተሙ እንዳይቆም ያደርገዋል
    try { if (typeof openModalContainer === 'function') openModalContainer(); } catch(e){}
    
    let modalOverlay = document.getElementById('modalOverlay');
    if(modalOverlay) modalOverlay.classList.remove('hidden');
    
    let otpModal = document.getElementById('emailVerifyModal');
    if(otpModal) otpModal.classList.remove('hidden');
    
    for(let i=1; i<=5; i++) {
        let codeInput = document.getElementById('code'+i);
        if(codeInput) codeInput.value = '';
    }
    
    setTimeout(() => {
        let c1 = document.getElementById('code1');
        if(c1) c1.focus();
    }, 100);
    
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
// Password Hashing Helper
async function hashPassword(password) {
    if (!password) return "";
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// አዲሱን HTML ከ API ጎትቶ በገጹ ላይ ለመተካት የሚረዳ ረዳት ፈንክሽን
async function fetchAndRenderSecureHTML(role) {
    try {
        // 'owner' እና 'motor' የሚሉትን ሚናዎች ወደ HTML ፋይል ስማቸው እንቀይራለን
        let apiRole = role;
        if (role === 'owner') apiRole = 'shop';
        if (role === 'motor') apiRole = 'delivery';

        const response = await fetch('/api/get-html', {
            method: 'GET',
            headers: {
                'x-user-role': apiRole
            }
        });

        if (!response.ok) {
            throw new Error("ይህንን ገጽ የመጫን ፈቃድ የለዎትም!");
        }

        const htmlContent = await response.text();
        
        // አሁን ያለውን የ index.html ይዘት በሙሉ በአዲሱ HTML መተካት
        document.open();
        document.write(htmlContent);
        document.close();

        // የገጹን ጃቫስክሪፕቶች ለማስነሳት (ለምሳሌ launchApp ካለ)
        if (typeof launchApp === "function") {
            launchApp();
        } else if (typeof triggerUIRefresh === "function") {
            triggerUIRefresh();
        }
    } catch (error) {
        console.error("Secure HTML Fetch Error:", error);
        if (typeof showCustomAlert === "function") {
            showCustomAlert("ስህተት", "ገጹን መጫን አልተቻለም: " + error.message);
        } else {
            alert("ስህተት: " + error.message);
        }
    }
}

