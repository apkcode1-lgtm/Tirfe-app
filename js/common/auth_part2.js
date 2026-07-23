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

