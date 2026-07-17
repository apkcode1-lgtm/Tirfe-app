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
                window.location.href = "admin.html";
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
                
                // ማስተካከያ 3፡ ፋይሎቹ ስለተከፋፈሉ በቀጥታ ወደ ሱቁ ገጽ (shop.html) እንዲወስድ ተደርጓል
                window.location.href = "shop.html"; 
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
                window.location.href = "buyer.html";
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
                window.location.href = "revenue.html";
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
                window.location.href = "delivery.html";
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
                    window.location.href = "shop.html";
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
                            window.location.href = "shop.html";
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


