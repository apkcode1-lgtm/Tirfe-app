// ---------------------------------------------------------------------
// REGISTRATION LOGIC WITH FIREBASE AUTH (NO PASSWORD IN REALTIME DB)
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
                    
                    if(!localDB.buyers) localDB.buyers = {};
                    localDB.buyers[pendingRegistrationData.user] = { 
                        username: pendingRegistrationData.user, phone: pendingRegistrationData.phone, 
                        name: pendingRegistrationData.name, email: pendingRegistrationData.email,
                        joinDate: new Date().getTime(), receipts: [], 
                        status: "active" 
                    }; // ❌ Password ዳታቤዝ ላይ እንዳይቀመጥ ተሰርዟል
                    
                    if(isOnline && typeof db !== 'undefined') {
                        db.ref(`tirfe_system/buyers/${pendingRegistrationData.user}`).set(localDB.buyers[pendingRegistrationData.user]).catch(err => console.log(err));
                        db.ref(`tirfe_system/usernames/${pendingRegistrationData.user}`).set({ role: 'buyer' });
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

                    let proceedReg = function(shopLogoBase64) {
                        let timestampNow = new Date().getTime();
                        localDB.tenants[user] = { 
                            shopName: shop, fullName: fullName, phone: phone, telegram: telegram || "-", address: address || "-",
                            businessType: businessType, googleMapsLink: mapsLink || "", shopLogo: shopLogoBase64 || "", gmail: newEmail,
                            region: region, zone: zone, woreda: woreda, kebele: kebele, houseNo: houseNo, tinNumber: tinNum, tradeRegistration: tradeReg,
                            username: user, codeCreatedAt: timestampNow, // ❌ Password እና activationCode ተሰርዟል
                            isActivated: true, contractType: contractType, expiryDate: expiryDate, registrationFee: registrationFee,
                            status: "active", theme: "theme-deepblue", staffAccounts: [],
                            data: { sessionActive: false, shiftClosed: false, inventory: [], expenses: [], debts: [], drawerLog: [], history: [], receipts: [], deliveryOrders: [], remoteCarts: {}, accumulatedVat: 0, lastMonthlyResetDate: timestampNow } 
                        };
                        
                        if(isOnline && typeof db !== 'undefined') {
                            db.ref(`tirfe_system/tenants/${user}`).set(localDB.tenants[user]).catch(err => console.log(err));
                            db.ref(`tirfe_system/usernames/${user}`).set({ role: 'tenant' });

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

// ... (የመጀመሪያዎቹ የፎርም መረጃዎች እንዳሉ ይቀጥላሉ)

if(regSubmitBtn) { regSubmitBtn.disabled = true; regSubmitBtn.innerText = "ፎቶዎችን ወደ ሰርቨር በመጫን ላይ..."; }

let checkUser = await isSystemDataTaken(user, phone, "", "");
if (checkUser) { 
    showCustomAlert("⚠️ ምዝገባው አልተሳካም", checkUser);
    if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
    return;
}

try {
    // 1. ፎቶዎቹን በቀጥታ ወደ Firebase Storage መጫን
    let idCardUrl = await uploadImageToStorage(idCardInput.files[0], "idCard", user);
    let licenseUrl = await uploadImageToStorage(licenseInput.files[0], "license", user);

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

                if(!localDB.motors) localDB.motors = {};
                localDB.motors[user] = {
                    firstName: firstName, lastName: lastName, phone: phone, email: email,
                    username: user, telegramToken: tgToken, plateNumber: plateNumber,
                    region: region, zone: zone, woreda: woreda,
                    // ❌ Base64 ተሰርዟል፣ ✅ አሁን ከ Storage የተገኘው የፎቶ ሊንክ (URL) ብቻ ዳታቤዝ ላይ ይቀመጣል
                    idCardImage: idCardUrl, 
                    licenseImage: licenseUrl,
                    joinDate: new Date().getTime(),
                    status: "pending" 
                };
                
                if(isOnline && typeof db !== 'undefined') {
                    db.ref(`tirfe_system/motors/${user}`).set(localDB.motors[user]).catch(err => console.log(err));
                }
                pushToFirebase();
                
                let nowForReg = new Date();
                let timeStampReg = nowForReg.toLocaleDateString('am-ET') + " " + nowForReg.toLocaleTimeString('am-ET');
                let tgMsg = `🏍️ አዲስ ሞተረኛ ተመዝግቧል!\n👤 ሙሉ ስም: ${firstName} ${lastName}\n🔑 ዩዘርኔም: @${user}\n📞 ስልክ: ${phone}\n🏍️ ታርጋ: ${plateNumber}`;
                            
                if(typeof sendAdminTelegramAlert === 'function') sendAdminTelegramAlert(tgMsg);

                showCustomAlert("✅ ተሳክቷል", "በተሳካ ሁኔታ ተመዝግበዋል! መረጃዎ ሲረጋገጥ ሲስተሙን መጠቀም ይችላሉ።");
                if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
                switchView('welcomeGateway');
            } catch(error) {
                showCustomAlert("ስህተት", "ምዝገባ አልተሳካም (Firebase): " + error.message);
            }
        });
    };
    
} catch (uploadError) {
    showCustomAlert("ስህተት", "መታወቂያ ወይም መንጃ ፈቃድ ምስሎችን ወደ ሰርቨር መጫን አልተቻለም! " + uploadError.message);
    if(regSubmitBtn) { regSubmitBtn.disabled = false; regSubmitBtn.innerText = "ተመዝገብ (Submit)"; }
}

// 1. የፎርጌት ማረጋገጫ (Firebase sendPasswordResetEmail በመጠቀም የተስተካከለ)
async function triggerForgotPassword() {
    showFormModal("🔑 የይለፍ ቃል ማደሻ", [
        // አሁን ዩዘርኔም አያስፈልግም፣ ኢሜል ብቻ በቂ ነው
        { id: "f_email", label: "የተመዘገቡበትን ኢሜል (Gmail) ያስገቡ፦", type: "email" }
    ], async (res) => {
        let e = res.f_email.trim();
        if(!e) { showCustomAlert("ስህተት", "እባክዎ ኢሜል ያስገቡ!"); return; }

        // ሎዲንግ እያደረገ መሆኑን ለተጠቃሚው ማሳወቂያ
        let submitBtn = document.querySelector('#formModalFooter button.btn-add');
        if(submitBtn) { submitBtn.innerText = "በመላክ ላይ (Loading)..."; submitBtn.disabled = true; }

        try {
            // ፓስዋርድ ሪሴት ሊንክ በቀጥታ በ Firebase Auth ይላካል
            await auth.sendPasswordResetEmail(e);
            
            if(submitBtn) { submitBtn.innerText = "እሺ (OK)"; submitBtn.disabled = false; }
            closeActiveModal(); 
            
            showCustomAlert("✅ ተሳክቷል", `የይለፍ ቃል መቀየሪያ ሊንክ ወደ ${e} ተልኳል።\n\nእባክዎ ኢሜልዎን ከፍተው በሚላክልዎት ሊንክ አዲሱን የይለፍ ቃልዎን ይፍጠሩ።`);
        } catch(error) {
            if(submitBtn) { submitBtn.innerText = "እሺ (OK)"; submitBtn.disabled = false; }
            console.error("Forgot Password Error: ", error);
            
            let errMsg = "የይለፍ ቃል መቀየሪያ መላክ አልተቻለም! እባክዎ እንደገና ይሞክሩ።";
            if(error.code === 'auth/user-not-found') errMsg = "በዚህ ኢሜል የተመዘገበ አካውንት የለም!";
            if(error.code === 'auth/invalid-email') errMsg = "የኢሜል አድራሻው ቅርፅ ትክክል አይደለም!";
            
            showCustomAlert("❌ ስህተት", errMsg);
        }
    });
}

// 2. የ OTP ማሳያ (ለምዝገባ ብቻ ስለሚያገለግል እንዳለ ይቀጥላል)
function triggerOTPFlow(emailAddress) {
    emailVerificationCode = Math.floor(10000 + Math.random() * 90000).toString();
    
    let emailDisp = document.getElementById('verifyEmailDisplay');
    if(emailDisp) emailDisp.innerText = emailAddress;
    
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
