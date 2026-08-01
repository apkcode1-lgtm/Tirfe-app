document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', event => {
    if (event.keyCode === 123) { event.preventDefault(); }
    if (event.ctrlKey && event.shiftKey && (event.keyCode === 73 || event.keyCode === 74)) { event.preventDefault(); }
    if (event.ctrlKey && event.keyCode === 85) { event.preventDefault(); }
});

// ---------------------------------------------------------------------
// SECURITY UTILITY: Password Hashing (SHA-256)
// ---------------------------------------------------------------------
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// ---------------------------------------------------------------------
// AUTOMATIC LOGIN LOGIC - FIXED FOR ROUTER
// ---------------------------------------------------------------------
function checkAutomaticLogin() {
    let savedSession = localStorage.getItem('tirfe_active_session');
    // ተጠቃሚው አሁን ያለበትን ገጽ ማወቅ
    let currentPage = window.location.pathname.toLowerCase();
    let isLoginPage = currentPage.endsWith('index.html') || currentPage === '/' || currentPage.endsWith('login.html');

    if (savedSession) {
        let session = JSON.parse(savedSession);
        currentUserRole = session.role;
        currentLoginMode = session.loginMode || 'unified';
        
        if (session.role === 'admin') {
            currentUserRole = 'admin';
            if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
            if(isLoginPage) {
                // አዲሱ ማስተካከያ
                document.cookie = "userRole=admin; path=/; max-age=86400;";
                window.location.href = "/api/router";
            }
        } 
        else if (session.role === 'revenue' && localDB.revenueAuthorities && localDB.revenueAuthorities[session.username]) {
            currentRevenueOfficer = localDB.revenueAuthorities[session.username];
            currentUserRole = 'revenue';
            
            if(isLoginPage) {
                document.cookie = "userRole=revenue; path=/; max-age=86400;";
                window.location.href = "/api/router";
            } else {
                if(typeof renderRevenuePanel === "function") renderRevenuePanel();
            }
        } 
        else if (session.role === 'motor' && localDB.motors && localDB.motors[session.username]) {
            if(localDB.motors[session.username].status === "blocked") {
                localStorage.removeItem('tirfe_active_session');
                if(!isLoginPage) window.location.href = "/index.html";
            } else {
                currentMotor = localDB.motors[session.username];
                currentUserRole = 'motor';
                if(isLoginPage) {
                    document.cookie = "userRole=delivery; path=/; max-age=86400;";
                    window.location.href = "/api/router";
                }
            }
        } 
        else if (session.role === 'buyer' && localDB.buyers && localDB.buyers[session.username]) {
            if(localDB.buyers[session.username].status === "blocked") {
                localStorage.removeItem('tirfe_active_session');
                if(!isLoginPage) window.location.href = "/index.html";
            } else {
                currentBuyer = localDB.buyers[session.username];
                currentUserRole = 'buyer';
                if(isLoginPage) {
                    document.cookie = "userRole=buyer; path=/; max-age=86400;";
                    window.location.href = "/api/router";
                }
            }
        } 
        else if (session.role === 'owner' || session.role === 'staff') {
            let lookupUser = session.username;

            if (localDB.tenants && localDB.tenants[lookupUser]) {
                let t = localDB.tenants[lookupUser];

                // ተከራዩ ብሎክ ከሆነ አውቶማቲክ ሎግ-ኢን እንዳያደርግ መከልከል
                if(t.status === "blocked") {
                    localStorage.removeItem('tirfe_active_session');
                    if(!isLoginPage) window.location.href = "/index.html";
                } else {
                    currentTenant = t;
                    currentUserRole = session.role;
                    
                    if(isLoginPage) {
                        let roleStr = session.role === 'owner' ? 'shop' : 'staff';
                        document.cookie = `userRole=${roleStr}; path=/; max-age=86400;`;
                        window.location.href = "/api/router";
                    } else {
                        if(typeof launchApp === "function") {
                            launchApp(currentTenant);
                        }
                    }
                }
            }
            // ✅ FIX: localDB.tenants ውስጥ ዳታው ካልተገኘ (ለምሳሌ localStorage ፀድቷል ወይም
            // አዲስ browser/device ላይ ለመጀመሪያ ጊዜ ከሆነ)፣ ከዚህ በፊት ምንም ስላልተደረገ ገጹ
            // ባዶ ሆኖ ይቀር ነበር። አሁን ኦንላይን ከሆነ በቀጥታ ከ Firebase መልሶ ያመጣል።
            else if (navigator.onLine && typeof db !== 'undefined') {
                db.ref(`tirfe_system/tenants/${lookupUser}`).once('value').then(snap => {
                    if (snap.exists()) {
                        let t = snap.val();
                        if (!localDB.tenants) localDB.tenants = {};
                        localDB.tenants[lookupUser] = t;
                        if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
                        checkAutomaticLogin(); // ዳታው አሁን ስላለ እንደገና ይሞክር
                    } else {
                        // Firebase ላይም ካልተገኘ ብቻ ሴሽኑን አጥፋ እና ወደ login መልስ
                        localStorage.removeItem('tirfe_active_session');
                        if(!isLoginPage) window.location.href = "/index.html";
                    }
                }).catch(e => {
                    console.warn("Tenant fallback fetch failed:", e);
                });
            }
        } 
    } else {
        if(!isLoginPage) {
            window.location.href = "/index.html";
        }
    }
}

// ገጹ ልክ ሲከፈት ሴሽኑን በራሱ ጊዜ እንዲያጣራ ይህን ከታች ይጨምሩ
window.addEventListener('DOMContentLoaded', checkAutomaticLogin);

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

// ---------------------------------------------------------------------
// SECURE LOGOUT LOGIC - FIXED FOR ROUTER
// ---------------------------------------------------------------------
window.forceLogout = function() {
    // 1. የነበረውን ሴሽን ከማህደረ-ትውስታ (localStorage) ሰርዝ
    localStorage.removeItem('tirfe_active_session');
    sessionStorage.clear();
    
    // 2. 💡 አዲሱ ማስተካከያ፡ ራውተሩ እንዳያውቀን የፈጠርነውን ኩኪ (Cookie) ማጥፋት!
    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    
    // 3. የ Firebase ሴሽንን መዝጋት
    if (typeof auth !== 'undefined') {
        auth.signOut().catch(function(error) {
            console.log("Firebase SignOut Error:", error);
        });
    }
    
    // 4. ግሎባል ተለዋዋጮቹን ወደ መጀመሪያው ባዶ ይዘት መልስ
    currentUserRole = null;
    currentRevenueOfficer = null;
    currentMotor = null;
    currentBuyer = null;
    currentTenant = null;
    
    // 5. ተጠቃሚውን ወደ መነሻው በ replace መልሰው
    window.location.replace("/index.html");
};
