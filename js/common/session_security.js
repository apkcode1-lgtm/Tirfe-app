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
    let savedSession = localStorage.getItem('tirfe_active_session'); //[span_4](start_span)[span_4](end_span)
    // ተጠቃሚው አሁን ያለበትን ገጽ ማወቅ[span_5](start_span)[span_5](end_span)
    let currentPage = window.location.pathname.toLowerCase(); //[span_6](start_span)[span_6](end_span)
    let isLoginPage = currentPage.endsWith('index.html') || currentPage === '/' || currentPage.endsWith('login.html'); //[span_7](start_span)[span_7](end_span)

    if (savedSession) {
        let session = JSON.parse(savedSession); //[span_8](start_span)[span_8](end_span)
        currentUserRole = session.role; //[span_9](start_span)[span_9](end_span)
        currentLoginMode = session.loginMode || 'unified'; //[span_10](start_span)[span_10](end_span)
        
        if (session.role === 'admin') {
            currentUserRole = 'admin'; //[span_11](start_span)[span_11](end_span)
            if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners(); //[span_12](start_span)[span_12](end_span)
            if(isLoginPage) {
                // አዲሱ ማስተካከያ
                document.cookie = "userRole=admin; path=/; max-age=86400;";
                window.location.href = "/api/router";
            }
        } 
        else if (session.role === 'revenue' && localDB.revenueAuthorities && localDB.revenueAuthorities[session.username]) {
            currentRevenueOfficer = localDB.revenueAuthorities[session.username]; //[span_13](start_span)[span_13](end_span)
            currentUserRole = 'revenue'; //[span_14](start_span)[span_14](end_span)
            
            if(isLoginPage) {
                document.cookie = "userRole=revenue; path=/; max-age=86400;";
                window.location.href = "/api/router";
            } else {
                if(typeof renderRevenuePanel === "function") renderRevenuePanel(); //[span_15](start_span)[span_15](end_span)
            }
        } 
        else if (session.role === 'motor' && localDB.motors && localDB.motors[session.username]) {
            if(localDB.motors[session.username].status === "blocked") {
                localStorage.removeItem('tirfe_active_session'); //[span_16](start_span)[span_16](end_span)
                if(!isLoginPage) window.location.href = "/index.html"; //[span_17](start_span)[span_17](end_span)
            } else {
                currentMotor = localDB.motors[session.username]; //[span_18](start_span)[span_18](end_span)
                currentUserRole = 'motor'; //[span_19](start_span)[span_19](end_span)
                if(isLoginPage) {
                    document.cookie = "userRole=delivery; path=/; max-age=86400;";
                    window.location.href = "/api/router";
                }
            }
        } 
        else if (session.role === 'buyer' && localDB.buyers && localDB.buyers[session.username]) {
            if(localDB.buyers[session.username].status === "blocked") {
                localStorage.removeItem('tirfe_active_session'); //[span_20](start_span)[span_20](end_span)
                if(!isLoginPage) window.location.href = "/index.html"; //[span_21](start_span)[span_21](end_span)
            } else {
                currentBuyer = localDB.buyers[session.username]; //[span_22](start_span)[span_22](end_span)
                currentUserRole = 'buyer'; //[span_23](start_span)[span_23](end_span)
                if(isLoginPage) {
                    document.cookie = "userRole=buyer; path=/; max-age=86400;";
                    window.location.href = "/api/router";
                }
            }
        } 
        else if ((session.role === 'owner' || session.role === 'staff') && localDB.tenants && localDB.tenants[session.username]) {
            let t = localDB.tenants[session.username]; //[span_24](start_span)[span_24](end_span)
            currentTenant = t; //[span_25](start_span)[span_25](end_span)
            currentUserRole = session.role; //[span_26](start_span)[span_26](end_span)
            
            if(isLoginPage) {
                let roleStr = session.role === 'owner' ? 'shop' : 'staff';
                document.cookie = `userRole=${roleStr}; path=/; max-age=86400;`;
                window.location.href = "/api/router";
            } else {
                if(typeof launchApp === "function") {
                    launchApp(currentTenant); //[span_27](start_span)[span_27](end_span)
                }
            }
        }
    } else {
        if(!isLoginPage) {
            window.location.href = "/index.html"; //[span_28](start_span)[span_28](end_span)
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
    // 1. የነበረውን ሴሽን ከማህደረ-ትውስታ (localStorage) ሰርዝ[span_29](start_span)[span_29](end_span)
    localStorage.removeItem('tirfe_active_session'); //[span_30](start_span)[span_30](end_span)
    sessionStorage.clear(); //[span_31](start_span)[span_31](end_span)
    
    // 2. 💡 አዲሱ ማስተካከያ፡ ራውተሩ እንዳያውቀን የፈጠርነውን ኩኪ (Cookie) ማጥፋት!
    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    
    // 3. የ Firebase ሴሽንን መዝጋት[span_32](start_span)[span_32](end_span)
    if (typeof auth !== 'undefined') {
        auth.signOut().catch(function(error) {
            console.log("Firebase SignOut Error:", error); //[span_33](start_span)[span_33](end_span)
        });
    }
    
    // 4. ግሎባል ተለዋዋጮቹን ወደ መጀመሪያው ባዶ ይዘት መልስ[span_34](start_span)[span_34](end_span)
    currentUserRole = null; //[span_35](start_span)[span_35](end_span)
    currentRevenueOfficer = null; //[span_36](start_span)[span_36](end_span)
    currentMotor = null; //[span_37](start_span)[span_37](end_span)
    currentBuyer = null; //[span_38](start_span)[span_38](end_span)
    currentTenant = null; //[span_39](start_span)[span_39](end_span)
    
    // 5. ተጠቃሚውን ወደ መነሻው በ replace መልሰው[span_40](start_span)[span_40](end_span)
    window.location.replace("/index.html"); //[span_41](start_span)[span_41](end_span)
};

