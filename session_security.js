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

function checkAutomaticLogin() {
    let savedSession = localStorage.getItem('tirfe_active_session');
    // ተጠቃሚው አሁን ያለበትን ገጽ ማወቅ (ለምሳሌ፡ index.html ወይም revenue.html)
    let currentPage = window.location.pathname.toLowerCase();
    let isLoginPage = currentPage.endsWith('index.html') || currentPage === '/' || currentPage.endsWith('login.html');

    if (savedSession) {
        let session = JSON.parse(savedSession);
        currentUserRole = session.role;
        currentLoginMode = session.loginMode || 'unified';
        
        if (session.role === 'admin') {
            currentUserRole = 'admin';
            if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
            await fetchAndRenderSecureHTML('admin');
        } 
        else if (session.role === 'revenue' && localDB.revenueAuthorities && localDB.revenueAuthorities[session.username]) {
            currentRevenueOfficer = localDB.revenueAuthorities[session.username];
            currentUserRole = 'revenue';
            
            if(isLoginPage) {
                await fetchAndRenderSecureHTML('revenue');
            } else {
                // ገቢዎች ገጽ ላይ ከሆነ ዳታውን ያምጣ
                if(typeof renderRevenuePanel === "function") renderRevenuePanel();
            }
        } 
        else if (session.role === 'motor' && localDB.motors && localDB.motors[session.username]) {
            if(localDB.motors[session.username].status === "blocked") {
                localStorage.removeItem('tirfe_active_session');
                if(!isLoginPage) window.location.href = "index.html";
            } else {
                currentMotor = localDB.motors[session.username];
                currentUserRole = 'motor';
                if(isLoginPage) {
                await fetchAndRenderSecureHTML('motor');
                }
            }
        } 
        else if (session.role === 'buyer' && localDB.buyers && localDB.buyers[session.username]) {
            if(localDB.buyers[session.username].status === "blocked") {
                localStorage.removeItem('tirfe_active_session');
                if(!isLoginPage) window.location.href = "index.html";
            } else {
                currentBuyer = localDB.buyers[session.username];
                currentUserRole = 'buyer';
                if(isLoginPage) {
                await fetchAndRenderSecureHTML('buyer');
                }
            }
        } 
        else if ((session.role === 'owner' || session.role === 'staff') && localDB.tenants && localDB.tenants[session.username]) {
            let t = localDB.tenants[session.username];
            currentTenant = t;
            currentUserRole = session.role; // ሮሉን ማረጋገጥ
            
            if(isLoginPage) {
            await fetchAndRenderSecureHTML('owner');
            } else {
                // መፍትሄ፡ አሁን ሱቁ ገፅ ላይ (shop.html) ከሆነ አፑን እና በተኖቹን ማስነሳት (Launch) አለበት!
                if(typeof launchApp === "function") {
                    launchApp(currentTenant);
                }
            }
        }
    } else {
        // ሴሽን (Session) ከሌለ እና ሎጊን ገጽ ላይ ካልሆነ ወደ ሎጊን ይመለስ
        if(!isLoginPage) {
            window.location.href = "index.html";
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
// የተዋሃደ እና ደህንነቱ የተጠበቀ የ Logout ፈንክሽን (ለሁሉም ተጠቃሚዎች)
// ---------------------------------------------------------------------
window.forceLogout = async function() {
    try {
        // 1. የነበረውን ሴሽን ከማህደረ-ትውስታ (localStorage & sessionStorage) ሰርዝ
        localStorage.removeItem('tirfe_active_session');
        sessionStorage.clear(); 
        
        // 2. ግሎባል ተለዋዋጮቹን ወደ መጀመሪያው ባዶ ይዘት መልስ
        currentUserRole = null;
        currentRevenueOfficer = null;
        currentMotor = null;
        currentBuyer = null;
        currentTenant = null;

        // 3. የ Firebase ሴሽንን በአስተማማኝ ሁኔታ መዝጋት
        if (typeof auth !== 'undefined' && auth.currentUser) {
            await auth.signOut();
        }
        
        // 4. ወደ መነሻው (የሎጊን ገጽ) በ replace መመለስ (ብሮውዘሩ በአሮጌ Cache እንዳያስገባው በሰዓት መለወጫ መላክ)
        window.location.replace("index.html?logout=true&t=" + new Date().getTime());
    } catch (error) {
        console.error("Logout error:", error);
        // ስህተት ቢፈጠርም እንኳ ተጠቃሚው መውጣት አለበት
        window.location.replace("index.html");
    }
};

// የሌሎቹ ገጾች logout() የሚለውን ስም ቢጠቀሙም እንኳ ወደ አዲሱ እንዲመሩ ማድረግ
window.logout = window.forceLogout;
