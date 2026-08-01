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
    if (u === "admin") return "ይህ ዩዘርኔም በዋና አስተዳዳሪ (Admin) ተይዟል!";
    
    // 1. ኦንላይን ከሆነ ከ Firebase ማረጋገጥ (አዲሱ ደህንነቱ የተጠበቀ መንገድ)
    if(isOnline && typeof db !== 'undefined') {
        try {
            // ሙሉ የዩዘር ዳታን ከማንበብ ይልቅ የዩዘርኔም ማውጫውን ብቻ ማንበብ
            let userSnap = await db.ref(`tirfe_system/usernames/${u}`).once('value');
            
            if (userSnap.exists()) {
                let role = userSnap.val().role;
                
                // የድሮውን ዩዘርኔም እያደስን ከሆነ ማሳለፍ (Skip)
                if (u !== skipTenantUser && u !== skipBuyerUser) {
                    if (role === 'tenant') return "ዩዘርኔም (Username) በሌላ የሱቅ ባለቤት ተይዟል!";
                    if (role === 'buyer') return "ዩዘርኔም በሌላ ደንበኛ (ገዥ) ተይዟል!";
                    if (role === 'revenue') return "ይህ ዩዘርኔም በገቢዎች ባለስልጣን ተይዟል!";
                    if (role === 'motor') return "ይህ ዩዘርኔም በሌላ ሞተረኛ ተይዟል!";
                    if (role === 'staff') return "ዩዘርኔም በሌላ ሰራተኛ ተይዟል!";
                    return "ይህ ዩዘርኔም ቀድሞ ተይዟል!";
                }
            }
        } catch(e) {
            console.warn("Firebase Username Read Error:", e);
        }
    }

    // 2. የስልክ ቁጥር እና የሎካል ዳታቤዝ (Offline) ፍተሻ (ይህ በብራውዘር ውስጥ ብቻ ስለሚሰራ ደህንነቱ የተጠበቀ ነው)
    if (localDB.tenants) {
        for(let k in localDB.tenants) {
            let t = localDB.tenants[k];
            if (t && t.username !== skipTenantUser) {
                if (t.phone === p) return "ስልክ ቁጥር በሌላ የሱቅ ባለቤት ተይዟል!";
                if (t.staffAccounts) {
                    for(let s of t.staffAccounts) {
                        if (s.phone === p) return "ስልክ ቁጥር በሌላ ሰራተኛ ተይዟል!";
                    }
                }
            }
        }
    }
    if (localDB.buyers) {
        for(let k in localDB.buyers) {
            let b = localDB.buyers[k];
            if (b && b.username !== skipBuyerUser && b.phone === p) {
                return "ስልክ ቁጥር በሌላ ደንበኛ (ገዥ) ተይዟል!";
            }
        }
    }
    if (localDB.revenueAuthorities) {
        for(let k in localDB.revenueAuthorities) {
            let r = localDB.revenueAuthorities[k];
            if (r && r.username !== skipTenantUser && (r.phone === p || r.contactPhone === p)) {
                return "ይህ ስልክ ቁጥር በገቢዎች ባለስልጣን ተይዟል!";
            }
        }
    }
    if (localDB.motors) {
        for(let k in localDB.motors) {
            let m = localDB.motors[k];
            if (m && m.phone === p) return "ይህ ስልክ ቁጥር በሌላ ሞተረኛ ተይዟል!";
        }
    }
    return false;
}
// ---------------------------------------------------------------------
// NEW LOGIN LOGIC (Strict Firebase Auth Only) - REFACTORED
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
    
    // 1. Admin Login API Check
    err.innerText = "🔄 መረጃ በማረጋገጥ ላይ...";
    try {
        const response = await fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, email: email, password: pass })
        });
        const data = await response.json();

        if(data.success) {
            localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'admin', loginMode: 'admin', username: user }));
            currentUserRole = 'admin'; 
            if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners(); 
            if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
            
            document.cookie = "userRole=admin; path=/; max-age=86400;";
            window.location.href = "/api/router";
            return;
            
        } else if (data.isAdminMatch) {
            err.innerText = "❌ የተሳሳተ የአድሚን የይለፍ ቃል!";
            if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
            return;
        }
    } catch (error) {
        console.error("Admin Login API Check Failed: ", error);
    }

    err.innerText = "";
                  
    try {
        // 2. Try Firebase Authentication First (ይህ ብቻ ነው ፓስዋርድ የሚያረጋግጠው)
        try {
            await auth.signInWithEmailAndPassword(email, pass);
        } catch (fbAuthError) {
            console.warn("Firebase Auth Failed: ", fbAuthError.message || fbAuthError);
            err.innerText = "❌ የተሳሳተ ኢሜል ወይም የይለፍ ቃል! (አካውንቱ የለም ወይም ፓስዎርድ ተሳስቷል)";
            if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
            return; // Firebase ካላሳለፈው እዚሁ ላይ ያቆማል
        }

        // Firebase Auth በትክክል ካሳለፈው፣ ዳታቤዝ (Realtime DB) ላይ የዩዘሩን ፕሮፋይል ብቻ ፈልገን እናስገባዋለን
            if(navigator.onLine && typeof db !== 'undefined') {
        
            // --- TENANT (SHOP) CHECK ---
            let tSnap = await db.ref(`tirfe_system/tenants/${user}`).once('value');
            if(tSnap.exists()) {
                let t = tSnap.val();
                if(String(t.gmail || "").toLowerCase() === email.toLowerCase()) {
                    if(t.status === "blocked") {
                        err.innerText = "❌ አካውንትዎ ታግዷል (Blocked)! እባክዎ ዋናውን አስተዳዳሪ (Admin) ያነጋግሩ።";
                        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return;
                    }
                    if(typeof isTenantExpired === 'function' && isTenantExpired(t, err)) { if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return; }
                    currentUserRole = "owner";
                    if(localDB.tenants) localDB.tenants[user] = t; 
                    localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'owner', loginMode: 'merchant', username: user }));
                    pushTenantFirebase();
                    document.cookie = "userRole=shop; path=/; max-age=86400;";
                    window.location.href = "/api/router";
                    return;
                }
            }

            // --- BUYER CHECK ---
            let bSnap = await db.ref(`tirfe_system/buyers/${user}`).once('value');
            if(bSnap.exists()) {
                let b = bSnap.val();
                if(String(b.email || "").toLowerCase() === email.toLowerCase()) {
                    if(b.status === "blocked") { 
                        err.innerText = "❌ አካውንትዎ ታግዷል (Blocked)!";
                        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return;
                    }
                    currentBuyer = b;
                    if(localDB.buyers) localDB.buyers[user] = b;
                    localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'buyer', loginMode: 'buyer', username: user }));
                    pushBuyerFirebase();
                    document.cookie = "userRole=buyer; path=/; max-age=86400;";
                    window.location.href = "/api/router";
                    return;
                }
            }
  
            // --- REVENUE OFFICER CHECK ---
            let rSnap = await db.ref(`tirfe_system/revenueAuthorities/${user}`).once('value');
            if(rSnap.exists()) {
                let r = rSnap.val();
                let rEmail = String(r.authEmail || r.email || r.gmail || "");
                if(rEmail.toLowerCase() === email.toLowerCase()) {
                    window.currentRevenueOfficer = r;
                    window.currentUserRole = "revenue";
                    if(!localDB.revenueAuthorities) localDB.revenueAuthorities = {};
                    localDB.revenueAuthorities[user] = r;
                    if(typeof saveToLocalStorage === 'function') saveToLocalStorage(); // 🔹 ገፁ ሳይቀየር ዳታው በሎካል እንዲቀመጥ ያደርጋል
                    localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'revenue', loginMode: 'revenue', username: user }));
                    pushRevenueFirebase();
                    document.cookie = "userRole=revenue; path=/; max-age=86400;";
                    window.location.href = "/api/router";
                    return;
                }
            }

            // --- MOTOR (DELIVERY) CHECK ---
            let mSnap = await db.ref(`tirfe_system/motors/${user}`).once('value');
            if(mSnap.exists()) {
                let m = mSnap.val();
                if(String(m.email || "").toLowerCase() === email.toLowerCase()) {
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
                    if(localDB.motors) localDB.motors[user] = m;
                    localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'motor', loginMode: 'motor', username: user }));
                    pushMotorFirebase();
                    document.cookie = "userRole=delivery; path=/; max-age=86400;";
                    window.location.href = "/api/router";
                    return;
                }
            }

            // --- STAFF ACCOUNTS CHECK (FIREBASE ONLY) ---
            let sSnap = await db.ref(`tirfe_system/staffAccounts/${user}`).once('value');
            if(sSnap.exists()) {
                let s = sSnap.val();
                if (String(s.gmail || "").toLowerCase() === email.toLowerCase()) {
                    let ptSnap = await db.ref(`tirfe_system/tenants/${s.tenantUsername}`).once('value');
                    if(ptSnap.exists()) {
                        let parentTenant = ptSnap.val();
                        if(parentTenant.status === "blocked") {
                            err.innerText = "❌ የሱቁ አካውንት ታግዷል (Blocked)! እባክዎ ዋናውን አስተዳዳሪ (Admin) ያነጋግሩ።";
                            if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return;
                        }
                        if(typeof isTenantExpired === 'function' && isTenantExpired(parentTenant, err)) { if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; } return; }
                        currentUserRole = "staff";
                        if(localDB.tenants) localDB.tenants[s.tenantUsername] = parentTenant;
                        localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'staff', loginMode: 'staff', username: parentTenant.username }));
                        pushTenantFirebase();
                        document.cookie = "userRole=staff; path=/; max-age=86400;";
                        window.location.href = "/api/router";
                        return;
                    } else {
                        err.innerText = "❌ የሱቁ ባለቤት መረጃ ሲስተም ውስጥ አልተገኘም!";
                        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
                        return;
                    }
                }
            }
        }

        // ሁሉም ቦታ ተፈልጎ ካልተገኘ (ወይም ኦንላይን ካልሆነ)
        err.innerText = "❌ አካውንትዎ አልተገኘም ወይም ኢንተርኔት የሎትም።";
        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
        
    } catch (error) {
        console.error("Login Error: ", error);
        err.innerText = "❌ ስህተት አጋጥሟል! " + (error.message || "ያልታወቀ የውስጥ ስህተት");
        if(loginBtn) { loginBtn.disabled = false; loginBtn.innerText = "ግባ (Login)"; }
    }
}

