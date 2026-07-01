// 1. ሞተረኛ ሎጊን ሲያደርግ ገፁን መረጃዎች ማሳያ (ከ main_auth.js ጋር የሚገናኝ)
function renderMotorPage() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    
    // ሀ. የፕሮፋይል ባጅ መሙላት
    const badge = document.getElementById('motorProfileBadge');
    if (badge) {
        badge.innerText = `ሰላም, ${currentMotor.firstName} ${currentMotor.lastName} (@${currentMotor.username})`;
    }

    // ለ. ሴቲንግ ፎርም ላይ የነበሩትን መረጃዎች መሙላት
    document.getElementById('motSetEmail').value = currentMotor.email || '';
    document.getElementById('motSetPhone').value = currentMotor.phone || '';
    document.getElementById('motSetTelegram').value = currentMotor.telegramToken || currentMotor.tgToken || '';
    document.getElementById('motSetPassword').value = currentMotor.password || '';

    // ሐ. ዳሽቦርድ መረጃዎች (ክሬዲት እና ያደረሳቸው ብዛት)
    const credit = currentMotor.credit || 0;
    document.getElementById('motorCreditDisplay').innerText = credit.toFixed(2) + ' ETB';
    document.getElementById('motorTotalDelivered').innerText = currentMotor.totalDelivered || 0;
    
    // --- አዲስ የተጨመረ የገዥ ክፍያ ማሳያ ---
    let incomingFee = currentMotor.incomingFee || 0;
    let feeDisplay = document.getElementById('motorIncomingFeeDisplay');
    let clearBtn = document.getElementById('btnMotorClearFee');
    if (feeDisplay) feeDisplay.innerText = incomingFee.toFixed(2) + ' ETB';
    
    if (incomingFee > 0) {
        if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
        if (clearBtn) clearBtn.classList.add('hidden');
    }

    // መ. የስራ ሁኔታ (Status Toggle - Online/Offline)
    let isOnline = currentMotor.status === 'online';
    const statusToggle = document.getElementById('motorStatusToggle');
    const statusText = document.getElementById('motorStatusText');
    
    if (statusToggle && statusText) {
        statusToggle.checked = isOnline;
        statusText.innerText = isOnline ? 'ኦንላይን (Online)' : 'ኦፍላይን (Offline)';
        statusText.style.color = isOnline ? 'var(--success-color)' : 'var(--danger-color)';
    }

    // ሠ. ቴብሎችን (ትዕዛዞች እና ታሪክ) መሳል
    renderMotorOrders();
    renderMotorHistory();
}

// 2. የፕሮፋይል ሲቲንግ መክፈቻና መዝጊያ
function toggleMotorSettings() {
    const settingsSection = document.getElementById('motorSettingsSection');
    if (settingsSection) {
        settingsSection.classList.toggle('hidden');
    }
}

// 3. የተስተካከለውን ሲቲንግ ሴቭ ማድረጊያ
function saveMotorSettings() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    const email = document.getElementById('motSetEmail').value.trim();
    const phone = document.getElementById('motSetPhone').value.trim();
    const pass = document.getElementById('motSetPassword').value.trim();
    const tg = document.getElementById('motSetTelegram').value.trim();
    
    if (email) currentMotor.email = email;
    if (phone) currentMotor.phone = phone;
    if (tg) {
        currentMotor.tgToken = tg;
        currentMotor.telegramToken = tg;
    }
    if (pass) currentMotor.password = pass;
    
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();

    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, "✅ የፕሮፋይል ማስተካከያዎ (Settings) በትክክል ተቀምጧል።");
    }

    alert("ማስተካከያው በትክክል ተቀምጧል!");
    toggleMotorSettings();
    renderMotorPage();
}

// 4. ኦንላይን/ኦፍላይን መቀየሪያ
function toggleMotorOnlineStatus() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    const isChecked = document.getElementById('motorStatusToggle').checked;
    
    currentMotor.status = isChecked ? 'online' : 'offline';
    localDB.motors[currentMotor.username] = currentMotor;
    
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();
    
    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, `🔄 የስራ ሁኔታዎ ወደ ${isChecked ? 'ኦንላይን (Online)' : 'ኦፍላይን (Offline)'} ተቀይሯል።`);
    }

    renderMotorPage();
}

// 5. ክሬዲት ሞዳል መክፈቻ
function openMotorCreditModal() {
    const modal = document.getElementById('motorCreditModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('motorCreditAmount').value = '';
    }
}

// 6. ክሬዲት ሲሞላ ገንዘቡን ወደ አካውንቱ ማስገቢያ
function submitMotorCredit() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    const amountInput = document.getElementById('motorCreditAmount').value;
    const amount = parseFloat(amountInput);

    if (isNaN(amount) || amount <= 0) {
        alert("እባክዎ ትክክለኛ የብር መጠን ያስገቡ!");
        return;
    }

    if (typeof currentMotor.credit === 'undefined') currentMotor.credit = 0;
    currentMotor.credit += amount;

    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();

    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, `💰 ሂሳብዎ ላይ ${amount} ብር ክሬዲት ተሞልቷል!\nአጠቃላይ ክሬዲት፡ ${currentMotor.credit} ETB`);
    }

    alert(`በትክክል ${amount} ብር ክሬዲት ተሞልቷል!`);
    
    if (typeof closeActiveModal === 'function') closeActiveModal();
    renderMotorPage();
}

// 7. ትዕዛዞችን ማሳያ (Active Deliveries)
function renderMotorOrders() {
    const tbody = document.getElementById('motorActiveOrdersBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    let activeOrders = currentMotor.activeOrders || [];
    if (activeOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">በአሁኑ ሰዓት የተመደበ ምንም ትዕዛዝ የለም</td></tr>`;
        return;
    }

    activeOrders.forEach((order, index) => {
        let tr = document.createElement('tr');
        let actionBtn = "";
        let statusBadge = "";

        if(order.status === 'pending_motor') {
            statusBadge = `<span class="badge-warning">አዲስ ጥሪ (በመጠባበቅ ላይ)</span><br>`;
            actionBtn = `<button class="btn-add btn-sm" onclick="acceptMotorOrder(${index})">✋ ተቀበል (Accept)</button>`;
        } else {
            statusBadge = `<span class="badge-success">በእርስዎ የተያዘ</span><br>`;
            actionBtn = `<button class="btn-sell btn-sm" onclick="completeMotorOrder(${index})">✅ አድርሻለሁ</button>`;
        }

        tr.innerHTML = `
            <td>${order.shopName}<br><a href="${order.shopMap}" target="_blank" style="color:var(--accent-color);">📍 የሻጭ ማፕ</a> | 📞 ${order.shopPhone}</td>
            <td>${order.buyerName}<br><a href="${order.buyerMap}" target="_blank" style="color:var(--accent-color);">📍 የገዥ ማፕ</a> | 📞 ${order.buyerPhone}</td>
            <td>${order.itemName} (x${order.qty})<br><strong style="color:var(--warning-color);">${order.totalPrice} ETB</strong><br>${statusBadge}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 8. ማስተካከያ የተደረገበት ሞተረኛ ኦርደሩን ሲቀበል (Lock & Link)
window.acceptMotorOrder = function(index) {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    
    // ማስተካከያ: ክፍያ ሳይጨርስ አዲስ እንዳይቀበል መቆለፊያ (Lock Mechanism)
    if (currentMotor.incomingFee > 0) {
        alert("⚠️ እባክዎ መጀመሪያ የያዙትን ትዕዛዝ በማድረስ ከገዥ የተላከውን ክፍያ ያረጋግጡ (ዳሽቦርድዎ ላይ 0.00 ይሁን)! ከዚያ በኋላ ብቻ አዲስ ትዕዛዝ መቀበል ይችላሉ።");
        return;
    }
    
    let acceptedOrder = currentMotor.activeOrders[index];
    acceptedOrder.status = 'accepted';
    
    let poolId = acceptedOrder.poolId;
    if(poolId && localDB.motors) {
        Object.keys(localDB.motors).forEach(mUser => {
            if(mUser !== currentMotor.username) {
                let otherMotor = localDB.motors[mUser];
                if(otherMotor.activeOrders) {
                    otherMotor.activeOrders = otherMotor.activeOrders.filter(o => o.poolId !== poolId);
                    if(typeof isOnline !== 'undefined' && isOnline && typeof db !== 'undefined') {
                        db.ref(`tirfe_system/motors/${mUser}`).set(otherMotor).catch(err => console.error(err));
                    }
                }
            }
        });
    }

    // ማስተካከያ: ገዥው ሞተረኛውን እንዲያውቅ ትዕዛዙን አገናኝ
    let shopKey = acceptedOrder.shopKey;
    if (!shopKey) {
        let foundKey = Object.keys(localDB.tenants).find(k => localDB.tenants[k].shopName === acceptedOrder.shopName);
        if (foundKey) shopKey = foundKey;
    }
    
    if (shopKey && localDB.tenants[shopKey] && localDB.tenants[shopKey].data && localDB.tenants[shopKey].data.deliveryOrders) {
        let shopOrders = localDB.tenants[shopKey].data.deliveryOrders;
        let sOrd = shopOrders.find(o => o.orderId == acceptedOrder.orderId || (o.buyerPhone == acceptedOrder.buyerPhone && o.itemName == acceptedOrder.itemName));
        if (sOrd) {
            sOrd.motorUser = currentMotor.username; // ሞተረኛው ተመዝግቧል
            sOrd.status = 'accepted';
            if (typeof db !== 'undefined' && isOnline) {
                db.ref(`tirfe_system/tenants/${shopKey}/data/deliveryOrders`).set(shopOrders);
            }
        }
    }

    let tgMessage = `📦 አዲስ ትዕዛዝ ተቀብለዋል!\n\n` +
                    `📱 የገዥ ስልክ: ${acceptedOrder.buyerPhone || '-'}\n` +
                    `📍 ገዥ ያለበት ቦታ: ${acceptedOrder.address || '-'}\n` +
                    `🗺️ የገዥ ጎግል ማፕ: ${acceptedOrder.buyerMap || '-'}\n\n` +
                    `📞 የሻጭ ስልክ: ${acceptedOrder.shopPhone || '-'}\n` +
                    `🗺️ የሻጭ ጎግል ማፕ: ${acceptedOrder.shopMap || '-'}\n\n` +
                    `🛍️ የዕቃው አይነት: ${acceptedOrder.itemName || '-'}\n` +
                    `🔢 የዕቃው ብዛት: ${acceptedOrder.qty || '-'}\n\n` +
                    `መልካም ስራ!\nአድራሻውን ተጠቅመው እቃውን ያድርሱ።`;
                    
    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, tgMessage);
    }

    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();

    alert("ትዕዛዙን በተሳካ ሁኔታ ተቀብለዋል! ዝርዝር መረጃው በቴሌግራም ተልኮልዎታል።");
    renderMotorPage();
};

// አዲስ የተጨመረ: ሞተረኛው ብሩን ሲቀበል (Recycle to 0.00 & Commission Deduction)
window.clearIncomingFee = function() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    
    if(!confirm("እርግጠኛ ነዎት ክፍያውን ከገዥው ተቀብለዋል? ይህ ማሳያውን ወደ 0.00 ይመልሰዋል።")) return;
    
    // የሲስተሙ ባለቤት ኮሚሽን ስሌት (ከክሬዲት ላይ ለመቁረጥ)
    let feeCollected = currentMotor.incomingFee || 0;
    let commRate = (localDB.adminSettings && localDB.adminSettings.deliveryCommissionRate) ? (localDB.adminSettings.deliveryCommissionRate / 100) : 0.10; // Default 10%
    let commissionAmount = feeCollected * commRate;
    
    currentMotor.credit = (currentMotor.credit || 0) - commissionAmount; // ኮሚሽኑን ከክሬዲት ቀንሶታል
    currentMotor.incomingFee = 0; // ማሳያውን ወደ 0.00 ይመልሳል (Recycle)
    
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();
    
    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, `✅ ክፍያ ተረጋግጧል!\n\nገዥው የከፈለው: ${feeCollected} ETB\nየተቆረጠ ኮሚሽን: ${commissionAmount} ETB\n\nአሁን አዲስ ትዕዛዝ መቀበል ይችላሉ!`);
    }
    
    alert(`✅ ክፍያው ተረጋግጧል! ማሳያው ወደ 0.00 ተመልሷል። (ኮሚሽን ${commissionAmount} ETB ተቆርጧል)። አሁን አዲስ ትዕዛዝ መቀበል ይችላሉ።`);
    renderMotorPage();
};

// 9. የስራ ታሪክ ማሳያ (Delivery History)
function renderMotorHistory() {
    const tbody = document.getElementById('motorHistoryBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let history = currentMotor.history || [];
    
    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">ባዶ ነው</td></tr>`;
        return;
    }

    let reversedHistory = [...history].reverse();
    reversedHistory.forEach(record => {
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${record.date}</td>
            <td>${record.shopName}</td>
            <td>${record.buyerName}</td>
            <td style="color: var(--success-color); font-weight: bold;">+${record.earned} ETB</td>
        `;
        tbody.appendChild(tr);
    });
}

// 10. ትዕዛዝ ማድረሱን ማረጋገጫ
function completeMotorOrder(index) {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    if(!confirm("እርግጠኛ ነዎት እቃውን ለደንበኛው አስረክበዋል? (ገዥው አሁን ሲስተሙ ላይ ክፍያውን ይሞላል)")) return;
    
    let order = currentMotor.activeOrders[index];
    
    if(!currentMotor.history) currentMotor.history = [];
    currentMotor.history.push({
        date: new Date().toLocaleDateString('am-ET'),
        shopName: order.shopName,
        buyerName: order.buyerName,
        earned: order.deliveryFee || 0
    });
    
    currentMotor.activeOrders.splice(index, 1);
    currentMotor.totalDelivered = (currentMotor.totalDelivered || 0) + 1;
    
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();

    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, `✅ ትዕዛዝ በተሳካ ሁኔታ አድረሷል!\n\n🏢 ሱቅ: ${order.shopName}\n👤 ደንበኛ: ${order.buyerName}\n\nእባክዎ ደንበኛው ክፍያውን ሲስተሙ ላይ እስኪያስገባ ይጠብቁ!`);
    }

    alert("ትዕዛዙን በተሳካ ሁኔታ ስላደረሱ እናመሰግናለን! እባክዎ ደንበኛው ክፍያውን ሲያስገባ ክፍያዎ ዳሽቦርድ ላይ እስኪመጣ ይጠብቁ።");
    renderMotorPage();
}

// 11. ከሞተረኛ ሲስተም መውጫ (Logout)
function logoutMotor() {
    if(!confirm("ከሲስተሙ መውጣት ይፈልጋሉ?")) return;
    currentMotor = null;
    document.getElementById('motorPage').classList.add('hidden');
    document.getElementById('welcomeGateway').classList.remove('hidden');
}

// 12. የሞተረኛን ፎቶዎች መጠን መቀነሻ (Compression)
function compressMotorImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = event => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; 
                const MAX_HEIGHT = 800; 
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = error => reject(error);
        };
        reader.onerror = error => reject(error);
    });
}

// 13. የሞተረኛን ምዝገባ ማካሄጃ ዋና ኮድ
async function processMotorRegistration() {
    const fName = document.getElementById('mot_firstName').value.trim();
    const lName = document.getElementById('mot_lastName').value.trim();
    const phone = document.getElementById('mot_phone').value.trim();
    const email = document.getElementById('mot_email').value.trim();
    const user = document.getElementById('mot_username').value.trim().toLowerCase();
    const tg = document.getElementById('mot_tgToken').value.trim();
    const plate = document.getElementById('mot_plateNumber').value.trim();
    const region = document.getElementById('mot_region').value;
    const zone = document.getElementById('mot_zone').value;
    const woreda = document.getElementById('mot_woreda').value;

    const idFile = document.getElementById('mot_idCardFile').files[0];
    const licFile = document.getElementById('mot_licenseFile').files[0];

    if (!fName || !lName || !phone || !email || !user || !tg || !plate || !region || !idFile || !licFile) {
        if(typeof showCustomAlert === 'function') showCustomAlert("ስህተት", "እባክዎ ሁሉንም የሞተረኛ መረጃዎች እና ፎቶዎች በትክክል ያስገቡ!");
        else alert("እባክዎ ሁሉንም የሞተረኛ መረጃዎች እና ፎቶዎች በትክክል ያስገቡ!");
        return;
    }

    const btn = document.getElementById('regSubmitBtn');
    const originalText = btn.innerText;

    btn.innerText = "ፎቶዎችን በማዘጋጀት ላይ...";
    btn.disabled = true;
    
    try {
        if (typeof isSystemDataTaken === 'function') {
            let checkUser = await isSystemDataTaken(user, phone, "", "");
            if (checkUser) { 
                if(typeof showCustomAlert === 'function') showCustomAlert("⚠️ ምዝገባው አልተሳካም", checkUser);
                else alert(checkUser);
                btn.innerText = originalText;
                btn.disabled = false;
                return;
            }
        } else if (typeof localDB.motors !== 'undefined' && localDB.motors[user]) {
            if(typeof showCustomAlert === 'function') showCustomAlert("ስህተት", "ይህ ዩዘርኔም (Username) በሌላ ሰው ተይዟል። እባክዎ ሌላ ይሞክሩ።");
            else alert("ይህ ዩዘርኔም (Username) በሌላ ሰው ተይዟል። እባክዎ ሌላ ይሞክሩ።");
            btn.innerText = originalText;
            btn.disabled = false;
            return;
        }

        const idBase64 = await compressMotorImage(idFile);
        const licBase64 = await compressMotorImage(licFile);

        btn.innerText = "OTP በመላክ ላይ...";
        
        if(typeof triggerOTPFlow === 'function') {
            pendingRegType = 'motor';
            triggerOTPFlow(email);
            
            onVerifySuccess = () => {
                showFormModal("🔒 የይለፍ ቃል ይፍጠሩ", [
                    { id: "newPass", label: "ለሞተረኛ አካውንትዎ አዲስ የይለፍ ቃል ይፍጠሩ፦", type: "password", placeholder: "ሚስጥራዊ ፓስዎርድ" }
                ], async (res) => {
                    if(!res.newPass) { 
                        if(typeof showCustomAlert === 'function') showCustomAlert("ስህተት", "ፓስዎርድ አልፈጠሩም!"); 
                        return; 
                    }
                    await finalizeMotorRegistration(res.newPass, idBase64, licBase64);
                });
            };
        } else {
            let defaultPass = prompt("እባክዎ ለመግቢያ የሚሆን የይለፍ ቃል ይፍጠሩ:");
            if(!defaultPass) { alert("ፓስዎርድ አልፈጠሩም!"); btn.innerText = originalText; btn.disabled = false; return; }
            await finalizeMotorRegistration(defaultPass, idBase64, licBase64);
        }

    } catch (err) {
        if(typeof showCustomAlert === 'function') showCustomAlert("ስህተት", "በፎቶው መጠን የተነሳ ችግር ተፈጥሯል። እባክዎ አነስ ያለ ፎቶ ይሞክሩ።");
        else alert("በፎቶው መጠን የተነሳ ችግር ተፈጥሯል። እባክዎ አነስ ያለ ፎቶ ይሞክሩ።");
        console.error(err);
        btn.innerText = originalText;
        btn.disabled = false;
    }

    async function finalizeMotorRegistration(passwordToSave, preCompressedId, preCompressedLic) {
        try {
            btn.innerText = "እየመዘገበ ነው... እባክዎ ይጠብቁ";
            btn.disabled = true;

            if (typeof localDB.motors === 'undefined') localDB.motors = {};
            
            localDB.motors[user] = {
                role: 'motor',
                firstName: fName,
                lastName: lName,
                phone: phone,
                email: email,
                username: user,
                password: passwordToSave,
                telegramToken: tg, 
                tgToken: tg,
                plateNumber: plate,
                region: region,
                zone: zone,
                woreda: woreda,
                idCardPhoto: preCompressedId, 
                licensePhoto: preCompressedLic, 
                credit: 0,
                totalDelivered: 0,
                status: 'offline', 
                activeOrders: [],
                history: [],
                registeredDate: new Date().toLocaleDateString('am-ET')
             };
             
            if (typeof db !== 'undefined' && db) {
                db.ref(`tirfe_system/motors/${user}`).set(localDB.motors[user]).catch(err => console.log(err));
            }
            
            if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
            if (typeof pushToFirebase === 'function') pushToFirebase();

            let tgMsg = `🏍️ አዲስ ሞተረኛ ተመዝግቧል!\n\n👤 ስም: ${fName} ${lName}\n🔑 ዩዘርኔም: ${user}\n📞 ስልክ: ${phone}\n📍 አድራሻ: ${region} / ${zone} / ${woreda}\n\nአስተዳዳሪ (Admin) ገፅ ላይ በመግባት ማረጋገጥ ይችላሉ።`;
            if(typeof sendAdminTelegramAlert === 'function') sendAdminTelegramAlert(tgMsg);

            if(typeof showCustomAlert === 'function') {
                showCustomAlert("✅ ተሳክቷል", "የሞተረኛ ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል! አሁን መግባት (Login) ይችላሉ።");
            } else {
                alert("የሞተረኛ ምዝገባዎ በተሳካ ሁኔታ ተጠናቋል! አሁን መግባት (Login) ይችላሉ።");
            }

            document.getElementById('unifiedMotorForm').querySelectorAll('input').forEach(i => i.value = '');
            if(typeof goToGateway === 'function') goToGateway();
            else if(typeof switchView === 'function') switchView('welcomeGateway');
        } catch (err) {
            console.error(err);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }

    btn.innerText = originalText;
    btn.disabled = false;
}
