async function sendSecureVerificationEmail(userEmail, verificationCode) {
    try {
        // Vercel ላይ ዴፕሎይ ሲሆን ይህ አድራሻ በቀጥታ api/send-otp.js ን ይጠራል
        // ማሳሰቢያ፡ ሎካል ላይ እየሰሩ ከሆነ የ Vercel ፕሮጄክትዎን ሙሉ URL እዚህ ሊያስገቡ ይችላሉ (ምሳሌ: "https://your-app.vercel.app/api/send-otp")
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
            setTimeout(() => { switchView('adminPage'); renderAdminPanel(); }, 300);
        } else if (session.role === 'revenue' && localDB.revenueAuthorities && localDB.revenueAuthorities[session.username]) {
            currentRevenueOfficer = localDB.revenueAuthorities[session.username];
            currentUserRole = 'revenue';
            setTimeout(() => { switchView('revenuePage'); if(typeof renderRevenuePanel === "function") renderRevenuePanel(); }, 300);
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

// የደህንነት ማሻሻያ፡ ዩዘርኔም መኖሩን በቀጥታ ከሰርቨር ቼክ እንዲያደርግ (Async) ተቀይሯል
async function isSystemDataTaken(u, p, skipTenantUser, skipBuyerUser) {
    u = u ? u.toLowerCase() : "";
    if (u === "admin") return "ይህ ዩዘርኔም በዋና አስተዳዳሪ (Admin) ተይዟል (ትይዟል)!";
    
    if(typeof db !== 'undefined') {
        try {
            let tSnap = await db.ref(`tirfe_system/tenants/${u}`).once('value');
            if (tSnap.exists() && u !== skipTenantUser) return "ዩዘርኔም (Username) በሌላ የሱቅ ባለቤት ተይዟል (ትይዟል)!";

            let bSnap = await db.ref(`tirfe_system/buyers/${u}`).once('value');
            if (bSnap.exists() && u !== skipBuyerUser) return "ዩዘርኔም በሌላ ደንበኛ (ገዥ) ተይዟል (ትይዟል)!";

            let rSnap = await db.ref(`tirfe_system/revenueAuthorities/${u}`).once('value');
            if (rSnap.exists() && u !== skipTenantUser) return "ይህ ዩዘርኔም በገቢዎች ባለስልጣን ተይዟል!";
        } catch(e) {
            console.warn("Firebase Read Error:", e);
        }
    }

    // ሎካል ስቶሬጅ ላይ ያሉ የስልክ እና የሰራተኞች መረጃዎችን ቼክ ለማድረግ (Fallback)
    if (localDB.tenants) {
        for(let k in localDB.tenants) {
            let t = localDB.tenants[k];
            if (t.username !== skipTenantUser) {
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
            if (b.username !== skipBuyerUser) {
                if (b.username === u) return "ዩዘርኔም በሌላ ደንበኛ (ገዥ) ተይዟል (ትይዟል)!";
                if (b.phone === p) return "ስልክ ቁጥር በሌላ ደንበኛ (ገዥ) ተይዟል (ትይዟል)!";
            }
        }
    }
    if (localDB.revenueAuthorities) {
        for(let k in localDB.revenueAuthorities) {
            let r = localDB.revenueAuthorities[k];
            if (r.username !== skipTenantUser) {
                if (r.username === u) return "ይህ ዩዘርኔም በገቢዎች ባለስልጣን ተይዟል!";
                if (r.phone === p || r.contactPhone === p) return "ይህ ስልክ ቁጥር በገቢዎች ባለስልጣን ተይዟል!";
            }
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
    if(role === 'buyer') {
        document.getElementById('unifiedBuyerForm').classList.remove('hidden');
        document.getElementById('unifiedTenantForm').classList.add('hidden');
    } else {
        document.getElementById('unifiedBuyerForm').classList.add('hidden');
        document.getElementById('unifiedTenantForm').classList.remove('hidden');
        if (typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
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

// የደህንነት ማሻሻያ፡ Login ሲደረግ መረጃውን በቀጥታ ከሰርቨር ፈልጎ እንዲያመጣ (Async) ተደርጓል
async function handleUnifiedLogin() {
    let user = document.getElementById('loginUnifiedUser').value.trim().toLowerCase();
    let email = document.getElementById('loginUnifiedEmail').value.trim();
    let pass = document.getElementById('loginUnifiedPass').value.trim();
    let err = document.getElementById('loginUnifiedError');
    
    if(!user || !email || !pass) { 
        err.innerText = "❌ እባክዎ ዩዘርኔም፣ ኢሜል እና የይለፍ ቃል በትክክል ያስገቡ!";
        return; 
    }

    if((user === "admin" || email === "apkcode1@gmail.com") && pass === "admin123") {
        localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'admin', loginMode: 'admin', username: 'admin' }));
        switchView('adminPage');
        renderAdminPanel();
        return;
    }

    err.innerText = "🔄 በማረጋገጥ ላይ...";
    // ሎዲንግ ቴክስት

    try {
        // 1. ነጋዴ መሆኑን ቼክ ማድረግ (Tenant)
        let tSnap = await db.ref(`tirfe_system/tenants/${user}`).once('value');
        if(tSnap.exists()) {
            let t = tSnap.val();
            if(t.gmail === email && String(t.password).trim() === pass) {
                if(isTenantExpired(t, err)) return;
                currentUserRole = "owner";
                localDB.tenants[user] = t; // ሎካል ላይ ሴቭ እናደርጋለን
                localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'owner', loginMode: 'merchant', username: user }));
                if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                err.innerText = "";
                launchApp(t);
                return;
            }
        }

        // 2. ገዥ መሆኑን ቼክ ማድረግ (Buyer)
        let bSnap = await db.ref(`tirfe_system/buyers/${user}`).once('value');
        if(bSnap.exists()) {
            let b = bSnap.val();
            if(b.email === email && String(b.password).trim() === pass) {
                if(b.status === "blocked") { err.innerText = "❌ አካውንትዎ ታግዷል (Blocked)!";
                    return; }
                currentBuyer = b;
                localDB.buyers[user] = b;
                localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'buyer', loginMode: 'buyer', username: user }));
                if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                err.innerText = "";
                switchView('buyerPage');
                return;
            }
        }
        
        // 3. ገቢዎች መሆኑን ቼክ ማድረግ (Revenue)
        let rSnap = await db.ref(`tirfe_system/revenueAuthorities/${user}`).once('value');
        if(rSnap.exists()) {
            let r = rSnap.val();
            let rEmail = r.authEmail || r.email || r.gmail || ""; 
            let rPass = String(r.authPass || r.password || r.pass || "").trim();
            if(rEmail === email && rPass === pass) {
                currentRevenueOfficer = r;
                currentUserRole = "revenue";
                localDB.revenueAuthorities[user] = r;
                localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'revenue', loginMode: 'revenue', username: user }));
                if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                err.innerText = "";
                switchView('revenuePage');
                if(typeof renderRevenuePanel === "function") renderRevenuePanel();
                return;
            }
        }

        // 4. ሰራተኛ ከሆነ ደግሞ ሎካል ላይ ባለው ዳታ ቼክ እናደርጋለን (Staff Fallback)
        if(localDB.tenants) {
            for(let tKey in localDB.tenants) {
                let t = localDB.tenants[tKey];
                if(t.staffAccounts) {
                    let found = t.staffAccounts.find(s => s.user === user && s.gmail === email && String(s.pass).trim() === pass);
                    if(found) {
                        if (isTenantExpired(t, err)) return;
                        currentUserRole = "staff";
                        localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'staff', loginMode: 'staff', username: t.username }));
                        if(typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
                        err.innerText = "";
                        launchApp(t);
                        return;
                    }
                }
            }
        }

        err.innerText = "❌ መረጃው ስህተት ነው! አካውንት አልተገኘም።";
    } catch (error) {
        console.error("Login Error: ", error);
        err.innerText = "❌ ከሰርቨር ጋር መገናኘት አልተቻለም! ኢንተርኔትዎን ያረጋግጡ።";
    }
}

// የደህንነት ማሻሻያ፡ ምዝገባውን Async አድርገነዋል
async function triggerUnifiedRegistration() {
    let role = document.getElementById('unifiedRegRole').value;
    if(role === 'buyer') {
        let name = document.getElementById('pubBuyerName').value.trim();
        let email = document.getElementById('pubBuyerEmail').value.trim();
        let phone = document.getElementById('pubBuyerPhone').value.trim();
        let user = document.getElementById('pubBuyerUser').value.trim().toLowerCase();

        if(!name || !email || !phone || !user) { showCustomAlert("ስህተት", "እባክዎ መረጃዎን ሙሉ በሙሉ ይሙሉ!");
            return; }

        let takenMsg = await isSystemDataTaken(user, phone, "", "");
        if(takenMsg) { showCustomAlert("ስህተት", takenMsg); return; }

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
                pushToFirebase();
                showCustomAlert("✅ ተሳክቷል", "በተሳካ ሁኔታ ተመዝግበዋል! ወደ ዋናው ገጽ ይመለሳሉ።");
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
        let checkUser = await isSystemDataTaken(user, phone, "", "");
        if (checkUser) { showCustomAlert("⚠️ ምዝገባው አልተሳካም", checkUser); return; }

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
                    switchView('welcomeGateway');
                };
                if(file) processImageUpload(file, proceedReg); else proceedReg("");
            });
        };
    }
}

// የደህንነት ማሻሻያ፡ ፓስዎርድ መርሳትም በቀጥታ ከሰርቨር ፈልጎ እንዲያመጣ ተስተካክሏል
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
            let tSnap = await db.ref(`tirfe_system/tenants/${u}`).once('value');
            if(tSnap.exists() && tSnap.val().gmail === e) {
                foundAccount = tSnap.val(); accType = 'tenant';
                localDB.tenants[u] = foundAccount; // Caching for update
            } else {
                let bSnap = await db.ref(`tirfe_system/buyers/${u}`).once('value');
                if(bSnap.exists() && bSnap.val().email === e) {
                    foundAccount = bSnap.val();
                    accType = 'buyer';
                    localDB.buyers[u] = foundAccount;
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
                
                if(accType === 'tenant') { localDB.tenants[u].password = np; } 
                else if(accType === 'buyer') { localDB.buyers[u].password = np; }
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
    
    // የደህንነት ማሻሻያ፡ ወደ ትክክለኛው የኢሜል መላኪያ ተቀይሯል
    sendSecureVerificationEmail(emailAddress, emailVerificationCode);
}

window.resendOTP = function() {
    let currentEmail = document.getElementById('verifyEmailDisplay').innerText;
    emailVerificationCode = Math.floor(10000 + Math.random() * 90000).toString();
    // የደህንነት ማሻሻያ፡ በድጋሚ ኮድ ሲጠየቅ ወደ ኢሜል እንዲላክ ተደርጓል
    sendSecureVerificationEmail(currentEmail, emailVerificationCode);
    showCustomAlert("✅ ተልኳል", "አዲስ ማረጋገጫ ኮድ ወደ ኢሜልዎ ተልኳል።");
};

function verifyEmailCodeSubmit() {
    let enteredCode = "";
    for(let i=1; i<=5; i++) { enteredCode += document.getElementById('code'+i).value; }
    if (enteredCode === emailVerificationCode) {
        closeActiveModal();
        if(onVerifySuccess) onVerifySuccess();
    } else { showCustomAlert("❌ ስህተት", "ያስገቡት ማረጋገጫ ኮድ የተሳሳተ ነው!");
    }
}

function logoutBuyer() {
    currentBuyer = null;
    localStorage.removeItem('tirfe_active_session');
    switchView('welcomeGateway');
}

window.openBuyerProfileSettings = function() {
    if(!currentBuyer) return;
    showFormModal("⚙️ የፕሮፋይል ሲቲንግ", [
        { id: "b_name", label: "ሙሉ ስም (Name)", type: "text", defaultValue: currentBuyer.name },
        { id: "b_username", label: "መግቢያ ስም (Username)", type: "text", defaultValue: currentBuyer.username },
        { id: "b_email", label: "ኢሜል (Gmail)", type: "email", defaultValue: currentBuyer.email || "" },
        { id: "b_phone", label: "ስልክ ቁጥር (Phone)", type: "tel", defaultValue: currentBuyer.phone },
        { id: "b_password", label: "የይለፍ ቃል (Password)", type: "text", defaultValue: currentBuyer.password }
    ], async (res) => {
        let newU = res.b_username.trim().toLowerCase();
        let newP = res.b_phone.trim();
        
        if(newU !== currentBuyer.username || newP !== currentBuyer.phone) {
            let takenMsg = await isSystemDataTaken(newU, newP, "", currentBuyer.username);
            if(takenMsg) { showCustomAlert("ስህተት (Error)", takenMsg); return; }
        }
   
        let oldU = currentBuyer.username;
        currentBuyer.name = res.b_name.trim();
        currentBuyer.username = newU;
        currentBuyer.email = res.b_email.trim(); currentBuyer.phone = newP; currentBuyer.password = res.b_password.trim();
        
        if(oldU !== newU) {
            localDB.buyers[newU] = currentBuyer;
            delete localDB.buyers[oldU];
            localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'buyer', loginMode: 'buyer', username: newU }));
        } else { localDB.buyers[newU] = currentBuyer;
        }
        
        pushToFirebase(); renderBuyerCatalog();
        showCustomAlert("✅ ተሳክቷል", "ፕሮፋይልዎ በትክክል ተስተካክሏል!");
    });
};

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
    if(tenant.status === "blocked") { errorElement.innerText = "🔒 አካውንትዎ ታግዷል!"; return true;
    }
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

window.openDeliveryOrderModal = function(shopKey, itemIdx, itemName, price) {
    if(!currentBuyer) { showCustomAlert("ማሳሰቢያ", "እባክዎ መጀመሪያ እንደ ገዥ ይግቡ/ይመዝገቡ!"); return;
    }
    
    showFormModal("🚚 " + itemName + " - ዴሊቨሪ ማዘዣ", [
        { id: "phone", label: "ስልክ ቁጥርዎ", type: "text", defaultValue: currentBuyer.phone },
        { id: "address", label: "ያሉበት ትክክለኛ አድራሻ / ሰፈር", type: "text", placeholder: "ምሳሌ: ቦሌ ሚካኤል፣ ህንፃ 3..." },
        { id: "mapLink", label: "የጎግል ማፕ ሊንክ (አማራጭ)", type: "text", placeholder: "https://maps.google.com/..." },
        { id: "qty", label: "የሚፈልጉት ብዛት", type: "number", defaultValue: "1" }
    ], 
    (res) => {
        let qty = parseFloat(res.qty) || 0;
        if(qty <= 0 || !res.address) { showCustomAlert("ስህተት", "እባክዎ አድራሻዎን እና የሚፈልጉትን ብዛት በትክክል ይሙሉ!"); return; }

        let t = localDB.tenants[shopKey];
        if(!t.data.deliveryOrders) t.data.deliveryOrders = [];

        let orderId = Math.floor(100000 + Math.random() * 900000);
        t.data.deliveryOrders.push({
            orderId: orderId, buyerUser: currentBuyer.username, buyerPhone: res.phone,
            address: res.address, mapLink: res.mapLink, itemIdx: itemIdx, itemName: itemName,
            qty: qty, price: price, total: qty * price, status: "pending", date: getTodayFormatted()
        });
        
        localDB.tenants[shopKey] = t; pushToFirebase();
        showCustomAlert("ተሳክቷል", "ትዕዛዝዎ ለሻጩ ተልኳል። ሻጩ ሲቀበለው በገጽዎ ላይ 'በመንገድ ላይ ነው' የሚል ምልክት ያያሉ።");
        renderBuyerCatalog();
    });
};

window.buyFromShop = function(shopKey, itemIdx, itemName, price, availableRem) {
    if(!currentBuyer) { showCustomAlert("ማሳሰቢያ", "እባክዎ መጀመሪያ እንደ ገዥ ይግቡ/ይመዝገቡ!");
        return; }
    
    showFormModal("🛒 " + itemName + " - ወደ ቅርጫት (Cart) ማስገቢያ", [
        { id: "qty", label: "የሚፈልጉት ብዛት", type: "number", defaultValue: "1" }
    ], (res) => {
        let qty = parseFloat(res.qty) || 0;
        if(qty <= 0) { showCustomAlert("ስህተት", "የተሳሳተ ብዛት!"); return; }
        if(qty > availableRem) { showCustomAlert("ብዛት የለም", "የጠየቁት ብዛት በአሁኑ ሰዓት ከስቶር የለም (አልቋል)!"); return; }

        let existIdx = window.buyerCartData.findIndex(c => c.shopKey === shopKey && c.itemIdx === itemIdx);
        if(existIdx > -1) {
            let totalWanted = window.buyerCartData[existIdx].qty + qty;
            if(totalWanted > availableRem) { showCustomAlert("ስህተት", "ከክምችት በላይ ነው!"); return; }
            window.buyerCartData[existIdx].qty += qty;
            window.buyerCartData[existIdx].total = window.buyerCartData[existIdx].qty * price;
        } else {
            window.buyerCartData.push({ shopKey: shopKey, itemIdx: itemIdx, itemName: itemName, qty: qty, price: price, total: qty * price });
        }
        renderBuyerCart();
        showCustomAlert("🛒 በቅርጫትዎ ውስጥ ገብቷል", "ትዕዛዙ Cart ውስጥ ገብቷል። ሲጨርሱ ከላይ 'እርግጠኛ ነኝ ትዕዛዙን ላክ' የሚለውን ይጫኑ።");
    });
};

window.renderBuyerCart = function() {
    let section = document.getElementById('buyerCartSection');
    let listBody = document.getElementById('buyerCartList');
    let cartTotalBar = section.querySelector('.cart-total-bar');

    if(!window.buyerCartData || window.buyerCartData.length === 0) {
        section.style.display = 'none';
        listBody.innerHTML = ''; 
        if(cartTotalBar) cartTotalBar.innerHTML = `አጠቃላይ ሂሳብ: <span id="buyerCartTotalSum" style="color: var(--success-color);">0</span> ብር`;
        return;
    }

    section.style.display = 'block'; listBody.innerHTML = '';
    let grandTotal = 0;
    
    window.buyerCartData.forEach((c, i) => {
        grandTotal += c.total;
        let shopName = localDB.tenants[c.shopKey] ? localDB.tenants[c.shopKey].shopName : "ሱቅ";
        listBody.innerHTML += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="color:var(--text-color);"><b>${c.itemName}</b><br><small style="color:var(--accent-color)">[${shopName}]</small></td>
            <td style="color:var(--text-color);">${c.qty}</td>
            <td style="color:var(--success-color);"><b>${c.total}</b></td>
            <td><button class="btn-expense btn-sm" onclick="removeFromBuyerCart(${i})">❌ አጥፋ</button></td>
        </tr>`;
    });
    
    let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 0;
    let vatAmount = (grandTotal * vatRate) / 100;
    let finalTotal = grandTotal + vatAmount;
    
    if (cartTotalBar) {
        if (vatRate > 0) {
            cartTotalBar.innerHTML = `
                <div style="font-size: 0.95rem;">የዕቃዎች ድምር (Subtotal): <span style="color: white;">${grandTotal.toFixed(2)}</span> ብር</div>
                <div style="font-size: 0.9rem; color: var(--danger-color);">ቫት (VAT ${vatRate}%): <span>${vatAmount.toFixed(2)}</span> ብር</div>
                <div style="border-top: 1px dashed #eab308; padding-top: 5px; margin-top: 5px;">ጠቅላላ ሂሳብ (Total): <span id="buyerCartTotalSum" style="color: var(--success-color); font-weight: bold;">${finalTotal.toFixed(2)}</span> ብር</div>
            `;
        } else {
            cartTotalBar.innerHTML = `አጠቃላይ ሂሳብ: <span id="buyerCartTotalSum" style="color: var(--success-color);">${grandTotal.toFixed(2)}</span> ብር`;
        }
    }
};

window.removeFromBuyerCart = function(i) { if(window.buyerCartData) { window.buyerCartData.splice(i, 1); renderBuyerCart(); } };

window.checkoutBuyerCart = function() {
    if(!window.buyerCartData || window.buyerCartData.length === 0) { showCustomAlert("ስህተት", "ምንም ዕቃ አልመረጡም!"); return;
    }
    
    showCustomConfirm("ትዕዛዝ ማረጋገጫ", "ሁሉንም የቅርጫት ትዕዛዞች ወደየሱቆቹ መላክ ይፈልጋሉ?", () => {
        let shops = {};
        window.buyerCartData.forEach(c => {
            if(!shops[c.shopKey]) shops[c.shopKey] = [];
            shops[c.shopKey].push(c);
        });

        for(let sKey in shops) {
            let t = localDB.tenants[sKey];
            if(!t.data.remoteCarts) t.data.remoteCarts = {};
            if(!t.data.remoteCarts[currentBuyer.username]) t.data.remoteCarts[currentBuyer.username] = [];
            
            shops[sKey].forEach(item => {
                t.data.remoteCarts[currentBuyer.username].push({
                    itemIdx: item.itemIdx, itemName: item.itemName, qty: item.qty, price: item.price, total: item.total
                });
            });
            localDB.tenants[sKey] = t;
        }
        
        window.buyerCartData = []; renderBuyerCart(); pushToFirebase();
        showCustomAlert("✅ ተሳክቷል", "ትዕዛዞችዎ በተሳካ ሁኔታ ተልከዋል! ሻጮች ሲያረጋግጡ የ'ተቆረጡ ደረሰኞች' ቦታ ላይ ይደርስዎታል።");
    });
};

// የደህንነት ማሻሻያ፡ ገዢዎች ሱቆችን ማየት እንዲችሉ ሚስጥራዊ መረጃዎች የተሰረዘበትን ብቻ እንዲያወርድ (Async Catalog Fetch) ተደርጓል
async function renderBuyerCatalog() {
    if(currentBuyer) {
        let badge = document.getElementById('buyerProfileBadge');
        if(badge) badge.innerText = `👤 የተጠቃሚ ስም: ${currentBuyer.username} | 📱 ስልክ: ${currentBuyer.phone}`;
        renderBuyerCart();
    }

    let container = document.getElementById('buyerShopsContainer');
    if(!container) return;
    
    // ገዥዎች ሱቆቹን ማየት እንዲችሉ ደህንነቱ በተጠበቀ ሁኔታ ሱቆችን ከፋየርቤዝ መሳብ (ሚስጥሮች ተቆርጠዋል)
    if (typeof db !== 'undefined' && (!localDB.tenants || Object.keys(localDB.tenants).length === 0)) {
        try {
            let snap = await db.ref('tirfe_system/tenants').once('value');
            if(snap.exists()) {
                let allT = snap.val();
                for(let k in allT) { 
                    delete allT[k].password;
                    delete allT[k].activationCode; 
                    delete allT[k].staffAccounts; delete allT[k].telegramToken; 
                    delete allT[k].bankAccount; 
                }
                localDB.tenants = allT;
            }
        } catch(e) { console.warn("Catalog fetch error:", e);
        }
    }

    container.innerHTML = '';
    let hasData = false;
    let query = document.getElementById('buyerSearchInput') ? document.getElementById('buyerSearchInput').value.trim().toLowerCase() : "";
    let categories = new Set();
    
    if (localDB.tenants) { Object.values(localDB.tenants).forEach(t => { if (t.status === "active") { categories.add(t.businessType || "አጠቃላይ ንግድ"); } });
    }
    
    let catContainer = document.getElementById('buyerCategoryContainer');
    if (catContainer) {
        let catHTML = `<button class="category-btn ${activeCategoryFilter === 'all' ? 'active' : ''}" onclick="setCategoryFilter('all')">🌐 ሁሉም</button>`;
        categories.forEach(cat => { catHTML += `<button class="category-btn ${activeCategoryFilter === cat ? 'active' : ''}" onclick="setCategoryFilter('${cat}')">🛍️ ${cat}</button>`; });
        catContainer.innerHTML = catHTML;
    }

    let myOrdersHTML = ""; let myReceiptsHTML = "";
    let liveBuyer = (currentBuyer && localDB.buyers) ? localDB.buyers[currentBuyer.username] : currentBuyer;

    if(liveBuyer && liveBuyer.receipts) {
        let reversed = [...liveBuyer.receipts].reverse();
        let filterDate = document.getElementById('buyerReceiptDateFilter') ? document.getElementById('buyerReceiptDateFilter').value : "";
        reversed.forEach(rec => {
            if (filterDate && rec.date !== filterDate) return;
            myReceiptsHTML += `<tr>
                <td><b>#${rec.recId}</b></td><td>${rec.date}</td>
                <td>${rec.itemName} (${rec.count})</td>
                <td style="color:var(--success-color);"><b>${rec.totalVal} ETB</b></td>
                <td><button class="btn-sm btn-add" onclick="viewBuyerReceipt('${rec.recId}')">📥 አውርድ</button></td>
            </tr>`;
        });
    }

    if (localDB.tenants) {
        Object.keys(localDB.tenants).forEach(tKey => {
            let t = localDB.tenants[tKey];
            if (t.status === "active") {
                let tBType = t.businessType || "አጠቃላይ ንግድ";
                if (activeCategoryFilter !== "all" && tBType !== activeCategoryFilter) return;
       
                let matchingItems = [];
                if (t.data && t.data.inventory) {
                    matchingItems = t.data.inventory.map((item, index) => ({...item, originalIdx: index})).filter(item => {
                        if (query === "") return true;
                        return item.name.toLowerCase().includes(query) || (item.model && item.model.toLowerCase().includes(query));
                    });
                }
                if (query !== "" && matchingItems.length === 0) return;
           
                hasData = true;
                let shopLogo = t.shopLogo || "https://cdn-icons-png.flaticon.com/512/869/869636.png";
                let tgLink = t.telegram && t.telegram !== "-" ? (t.telegram.startsWith('@') ? t.telegram.substring(1) : t.telegram) : "";
                
                let shopCardHTML = `
                <div class="shop-card">
                    <div class="shop-card-header">
                        <img src="${shopLogo}" class="shop-avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/869/869636.png'">
                        <div class="shop-meta">
                            <h3>${t.shopName}</h3>
                            <p>📍 አድራሻ፡ ${t.address || 'ያልተገለጸ'} <br><span style="color:var(--accent-color); font-size:0.75rem;">[${tBType}]</span></p>
                        </div>
                    </div>
                    <div style="margin-top:5px; font-size:0.85rem; color:#94a3b8; font-weight:bold;">📦 ዕቃዎች ዝርዝር፦</div>
                    <div class="shop-items-list">`;
                    
                if (matchingItems.length === 0) { shopCardHTML += `<p style="font-size:0.8rem; color:#64748b; padding:5px 0;">በአሁኑ ሰዓት የተመዘገበ ዕቃ የለም።</p>`;
                } 
                else {
                    matchingItems.forEach(item => {
                        let itemImg = item.imgUrl || "https://cdn-icons-png.flaticon.com/512/3342/3342137.png";
                        let modelDisplay = item.model && item.model !== "-" ? `<br><small style="color:var(--accent-color)">ሞዴል: ${item.model}</small>` : '';
                        let unitLabel = item.unitType === 'kg' ? 'ኪሎ' : (item.isAdvanced ? 'ሜትር' : 'ፍሬ');
                        let rem = item.qty - item.sold;
                        
                        shopCardHTML += `
                        <div class="catalog-item-card">
                            <img src="${itemImg}" class="catalog-item-img" onclick="viewImageFullscreen('${itemImg}')" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3342/3342137.png'">
                            <div class="catalog-item-info">
                                <span style="font-weight:bold; font-size:0.9rem;">${item.name}</span>${modelDisplay}
                                <div style="color:var(--warning-color); font-weight:bold; margin-top:2px;">${item.price} ETB <small>(${unitLabel})</small></div>
                                <div style="display:flex; gap:5px; margin-top:5px; flex-wrap:wrap;">
                                    <button class="btn-add btn-sm" onclick="openDeliveryOrderModal('${tKey}', ${item.originalIdx}, '${item.name}', ${item.price})">🚚 ዴሊቨሪ</button>
                                    <button class="btn-success btn-sm" style="background:var(--warning-color); color:#000;" onclick="buyFromShop('${tKey}', ${item.originalIdx}, '${item.name}', ${item.price}, ${rem})">🛒 ሱቅ ነኝ ግዛ</button>
                                </div>
                            </div>
                        </div>`;
                    });
                }
                
                shopCardHTML += `
                    </div>
                    <div class="shop-links">
                        <a href="tel:${t.phone}" class="btn-link-action" style="background:#22c55e; color:#fff;">📞 ስልክ፡ ${t.phone}</a>
                        ${tgLink ? `<a href="https://t.me/${tgLink}" target="_blank" class="btn-link-action" style="background:#0088cc; color:#fff;">✈️ ቴሌግራም</a>` : `<span class="btn-link-action" style="background:#334155; color:#64748b;">✈️ ቴሌግራም የለም</span>`}
                        ${t.googleMapsLink ? `<a href="${t.googleMapsLink}" target="_blank" class="btn-link-action" style="background:var(--accent-color); color:#000; grid-column: span 2; margin-top:4px;">📍 ጎግል ማፕ (Google Maps)</a>` : `<span class="btn-link-action" style="background:#334155; color:#64748b; grid-column: span 2; margin-top:4px;">📍 ሎኬሽን አልተጫነም</span>`}
                    </div>
                </div>`;
                
                container.innerHTML += shopCardHTML;

                if(liveBuyer && t.data && t.data.deliveryOrders) {
                    t.data.deliveryOrders.forEach(ord => {
                        if(ord.buyerUser === liveBuyer.username) {
                            let st = ord.status;
                            let badge = st === "pending" ? "በመጠባበቅ ላይ" : (st === "accepted" ? "በመንገድ ላይ" : (st === "completed" ? "ተረክበዋል" : "ተመልሷል"));
                            let cl = st === "pending" ? "text-warning" : (st === "accepted" ? "text-success" : "text-danger");
                            myOrdersHTML += `<tr>
                                <td>${t.shopName}</td><td>${ord.itemName} (x${ord.qty})</td>
                                <td>${ord.total} ETB</td><td>${ord.date}</td>
                                <td class="${cl}"><b>${badge}</b></td>
                            </tr>`;
                        }
                    });
                }
            }
        });
    }

    if(!hasData) { container.innerHTML = '<p style="text-align:center; color:#94a3b8; grid-column: 1/-1; padding:20px;">በተፈለገው ስም የተገኘ ምንም ሱቅ ወይም ዕቃ የለም።</p>';
    }
    
    let ordersBody = document.getElementById('buyerOrdersBody');
    if(ordersBody) {
        if(myOrdersHTML === "") ordersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">ምንም የዴሊቨሪ ትዕዛዝ አልጠየቁም።</td></tr>`;
        else ordersBody.innerHTML = myOrdersHTML;
    }
    
    let receiptsBody = document.getElementById('buyerReceiptsBody');
    if(receiptsBody) {
        if(myReceiptsHTML === "") receiptsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">የተቆረጠ ደረሰኝ የለም።</td></tr>`;
        else receiptsBody.innerHTML = myReceiptsHTML;
    }
}

window.viewBuyerReceipt = function(recId) {
    if (!currentBuyer || !localDB.buyers[currentBuyer.username]) return;
    let latestBuyerData = localDB.buyers[currentBuyer.username];
    if (!latestBuyerData.receipts) return;
    
    let rec = latestBuyerData.receipts.find(r => r.recId === parseInt(recId) || r.recId == recId);
    if(!rec) { showCustomAlert("ስህተት", "ይህ ደረሰኝ አልተገኘም!"); return; }
    
    let bName = latestBuyerData.username;
    let bPhone = latestBuyerData.phone;
    let subT = rec.subTotal !== undefined ? rec.subTotal : rec.totalVal;
    let vAmt = rec.vatAmount !== undefined ? rec.vatAmount : 0;
    
    if(rec.advancedItems) { 
        generateAdvancedReceipt(rec.advancedItems, subT, rec.seller, rec.recId, false, rec.shopName, rec.bType, bName, bPhone, vAmt, rec.ownerName, rec.ownerPhone);
    } 
    else { 
        generateAdvancedReceipt([{name: rec.itemName, count: rec.count, unitPrice: subT/rec.count, total: subT}], subT, rec.seller, rec.recId, false, rec.shopName, rec.bType, bName, bPhone, vAmt, rec.ownerName, rec.ownerPhone);
    }
};

window.openStaffManagement = function() {
    if(!currentTenant.staffAccounts) {
        currentTenant.staffAccounts = [];
        if(currentTenant.staffUser && currentTenant.staffPass) {
            currentTenant.staffAccounts.push({ name: "ነባር ሰራተኛ", gmail: "", phone: "", user: currentTenant.staffUser, pass: currentTenant.staffPass });
        }
    }
    tempStaffForms = JSON.parse(JSON.stringify(currentTenant.staffAccounts));
    if(tempStaffForms.length === 0) { tempStaffForms.push({ name: "", gmail: "", phone: "", user: "", pass: "" });
    }
    
    renderStaffForms(); openModalContainer();
    document.querySelectorAll('.modal-card').forEach(m => m.classList.add('hidden'));
    document.getElementById('staffManageModal').classList.remove('hidden');
};

window.addStaffFormRow = function() {
    if(tempStaffForms.length >= 3) { showCustomAlert("ማሳሰቢያ", "ከ 3 ሰራተኛ በላይ በአንድ ጊዜ መመዝገብ አይቻልም!");
        return; }
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
            if(tempStaffForms[j].user === tempStaffForms[i].user) { showCustomAlert("ስህተት", "ዩዘርኔም በፎርሙ ውስጥ ተደግሟል!");
                return; }
            if(tempStaffForms[j].phone === tempStaffForms[i].phone) { showCustomAlert("ስህተት", "ስልክ ቁጥር በፎርሙ ውስጥ ተደግሟል!");
                return; }
        }
    }
    currentTenant.staffAccounts = tempStaffForms;
    saveAndRefresh(); closeActiveModal();
    showCustomAlert("ተሳክቷል", "የሰራተኞች መረጃ በተሳካ ሁኔታ ተመዝግቧል!");
};

function configureBank() {
    if(currentUserRole === "staff") { showCustomAlert("🏦 የባንክ ሂሳብ መረጃ", `የአሰሪው የባንክ ሂሳብ ቁጥር (CBE/Telebirr)፦ ${currentTenant.bankAccount || "ያልተገናኘ"}`);
        return; }
    
    showFormModal("🏦 የባንክ እና የቴሌግራም አገናኝ መቼት", [
        { id: "telegramToken", label: "የቴሌግራም ቦት ቶከን (Telegram Bot Token)", type: "text", placeholder: "Token...", defaultValue: currentTenant.telegramToken || "" },
        { id: "telegramChatId", label: "የቴሌግራም ቻት ID (Telegram Chat ID)", type: "text", placeholder: "Chat ID...", defaultValue: currentTenant.telegramChatId || "" },
        { id: "bankAccountNumber", label: "የባንክ ሂሳብ ቁጥር (CBE/Telebirr)", type: "text", placeholder: "የባንክ ቁጥር...", defaultValue: currentTenant.bankAccount || "" }
    ], (res) => {
        currentTenant.telegramToken = res.telegramToken.trim(); currentTenant.telegramChatId = res.telegramChatId.trim(); currentTenant.bankAccount = res.bankAccountNumber.trim();
        saveAndRefresh(); showCustomAlert("ተሳክቷል", "የማያያዣ መቼቶች በተሳካ ሁኔታ ተቀምጠዋል!");
    });
}
