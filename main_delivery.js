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

    // ሐ. 25 ብር እገዳ እና ኮሚሽን ማሳያ
    let commRate = (localDB.adminSettings && localDB.adminSettings.deliveryCommissionRate) ?
        localDB.adminSettings.deliveryCommissionRate : 10;
    let commDisplay = document.getElementById('motorCommissionRateDisplay');
    if (commDisplay) commDisplay.innerText = commRate + '%';

    const credit = currentMotor.credit || 0;
    // ክሬዲቱ ከ25 ብር በታች ከሆነ እና ታግዷል (blocked) ካልተባለ፣ እገዳውን በራስ-ሰር ጀምር
    if (credit <= 25 && currentMotor.status !== 'blocked') {
        currentMotor.status = 'blocked';
        localDB.motors[currentMotor.username] = currentMotor;
        if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
        if (typeof pushToFirebase === 'function') pushToFirebase();
    }

    let overlay = document.getElementById('motorBlockedOverlay');
    let mainContent = document.getElementById('motorMainContent');
    let statusToggle = document.getElementById('motorStatusToggle');
    let statusText = document.getElementById('motorStatusText');
    if (currentMotor.status === 'blocked') {
        if (overlay) overlay.classList.remove('hidden');
        if (mainContent) mainContent.classList.add('hidden');
        if (statusToggle) { statusToggle.checked = false; statusToggle.disabled = true; }
        if (statusText) { statusText.innerText = 'ታግዷል (Blocked)';
        statusText.style.color = 'var(--danger-color)'; }
    } else {
        if (overlay) overlay.classList.add('hidden');
        if (mainContent) mainContent.classList.remove('hidden');
        if (statusToggle) statusToggle.disabled = false;
        
        let isOnline = currentMotor.status === 'online';
        if (statusToggle) statusToggle.checked = isOnline;
        if (statusText) {
            statusText.innerText = isOnline ?
            'ኦንላይን (Online)' : 'ኦፍላይን (Offline)';
            statusText.style.color = isOnline ? 'var(--success-color)' : 'var(--danger-color)';
        }
    }

    // መ. ዳሽቦርድ መረጃዎች (ክሬዲት እና ያደረሳቸው ብዛት)
    document.getElementById('motorCreditDisplay').innerText = credit.toFixed(2) + ' ETB';
    document.getElementById('motorTotalDelivered').innerText = currentMotor.totalDelivered || 0;
    
    // ሠ. የገዥ ክፍያ ማሳያ
    let incomingFee = currentMotor.incomingFee || 0;
    let feeDisplay = document.getElementById('motorIncomingFeeDisplay');
    let clearBtn = document.getElementById('btnMotorClearFee');
    if (feeDisplay) feeDisplay.innerText = incomingFee.toFixed(2) + ' ETB';
    if (incomingFee > 0) {
        if (clearBtn) clearBtn.classList.remove('hidden');
    } else {
        if (clearBtn) clearBtn.classList.add('hidden');
    }

    // --- አዲሱ የቀን እና የወር ገቢ ስሌት (Daily & Monthly Income) ---
    let dailyIncome = 0;
    let monthlyIncome = 0;
    
    let now = new Date();
    // የኢትዮጵያ የስራ ቀን የሚጀምረው ጧት 1:00 (7:00 AM) ስለሆነ፣ ከሰአቱ ላይ 7 ሰአት እንቀንሳለን (ወደ ዜሮ እንዲመለስ)
    let currentBusinessTime = new Date(now.getTime() - 7 * 60 * 60 * 1000);
    let currentBizDateStr = currentBusinessTime.toISOString().split('T')[0]; // YYYY-MM-DD
    let currentBizMonthStr = currentBizDateStr.substring(0, 7);
    // YYYY-MM

    if (currentMotor.history) {
        currentMotor.history.forEach(record => {
            let recTime = record.isoDate ? new Date(record.isoDate) : new Date(); // አሮጌ ሂስትሪ ካለ ዛሬን ይወስዳል
            let recBizTime = new Date(recTime.getTime() - 7 * 60 * 60 * 1000);
            let recBizDateStr = recBizTime.toISOString().split('T')[0];
            let recBizMonthStr = recBizDateStr.substring(0, 7);

            let earned = parseFloat(record.earned) || 0;
            
            if (recBizDateStr === currentBizDateStr) {
                dailyIncome += earned;
            }
            // የወሩ መግቢያ (ቀን 1) ሲሆን አውቶማቲክ ቆጠራው 0 ይሆናል ምክንያቱም የወሩ ስም ይቀየራል
            if (recBizMonthStr === currentBizMonthStr) {
                monthlyIncome += earned;
            }
        });
    }

    let dailyDisp = document.getElementById('motorDailyIncome');
    if (dailyDisp) dailyDisp.innerText = dailyIncome.toFixed(2) + ' ETB';
    let monthlyDisp = document.getElementById('motorMonthlyIncome');
    if (monthlyDisp) monthlyDisp.innerText = monthlyIncome.toFixed(2) + ' ETB';
    // -----------------------------------------------------------

    // ረ. ቴብሎችን (ትዕዛዞች እና ታሪክ) መሳል
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
    if (currentMotor.status === 'blocked') return; // ታግዶ ከሆነ እንዳይቀይር

    const isChecked = document.getElementById('motorStatusToggle').checked;
    
    currentMotor.status = isChecked ?
    'online' : 'offline';
    localDB.motors[currentMotor.username] = currentMotor;
    
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();
    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, `🔄 የስራ ሁኔታዎ ወደ ${isChecked ? 'ኦንላይን (Online)' : 'ኦፍላይን (Offline)'} ተቀይሯል።`);
    }

    renderMotorPage();
}
// በ utils.js ወይም main_delivery.js ውስጥ የሚቀመጥ ፈንክሽን
function openMotorCreditModal() {
    try {
        // አሁን የሰራነውን የቨርሴል API መጥራት
        const response = await fetch('/api/chapa-initiate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amountToCharge,
                motorist_id: motoristId,
                email: "motorist@example.com", // የሞተረኛው እውነተኛ ኢሜይል ቢሆን ይመረጣል
                first_name: "Abebe",
                last_name: "Bekele"
            })
        });

        const result = await response.json();

        if (result.status === 'success' && result.checkout_url) {
            // ሞተረኛውን በቀጥታ ወደ ቻፓ የባንክ መክፈያ ገጽ መውሰድ (Redirect)
            window.location.href = result.checkout_url;
        } else {
            alert("ይቅርታ፣ የክፍያ ሂደቱን መጀመር አልተቻለም፦ " + result.message);
        }

    } catch (error) {
        console.error("Payment Error:", error);
        alert("የኔትወርክ ችግር አጋጥሟል! እባክዎ እንደገና ይሞክሩ።");
    }
}

// 5. ክሬዲት ሞዳል መክፈቻ
function openMotorCreditModal() {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('motorCreditModal');
    
    if (overlay) overlay.classList.remove('hidden');
    
    // ሌሎች ክፍት የሆኑ ሞዳሎች ካሉ መዝጊያ
    document.querySelectorAll('.modal-card').forEach(m => {
        if(m.id !== 'motorCreditModal') m.classList.add('hidden');
    });
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
    // ማስተካከያ:- አድሚን ጋር ለመላክ ቀድሞ የነበረውን መጠን ማስቀመጫ
    let oldCredit = currentMotor.credit;
    
    currentMotor.credit += amount;
    // ክሬዲቱ ከ25 ብር በላይ ከሆነ አውቶማቲካሊ ብሎኩን ያነሳዋል
    let wasBlocked = currentMotor.status === 'blocked';
    if (wasBlocked && currentMotor.credit > 25) {
        currentMotor.status = 'offline';
    }

    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();
    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, `💰 ሂሳብዎ ላይ ${amount} ብር ክሬዲት ተሞልቷል!\nአጠቃላይ ክሬዲት፡ ${currentMotor.credit} ETB`);
    }

    // አዲስ የተጨመረ ማስተካከያ:- ክሬዲት ሲሞላ ለአድሚኑ/አከራዩ በቴሌግራም መላክ
    if (typeof sendAdminTelegramAlert === 'function') {
        let nowForCredit = new Date();
        let timeStampCredit = nowForCredit.toLocaleDateString('am-ET') + " " + nowForCredit.toLocaleTimeString('am-ET');
        let adminCreditMsg = `💰 ሞተረኛ ክሬዲት ሞልቷል!\n\n` +
                             `👤 ዩዘርኔም: @${currentMotor.username}\n` +
                             `📉 ቀድሞ የነበረው: ${oldCredit.toFixed(2)} ETB\n` +
                             `💵 አዲስ የተሞላው: ${amount.toFixed(2)} ETB\n` +
                             `🏦 አጠቃላይ ክሬዲት: ${currentMotor.credit.toFixed(2)} ETB\n` +
                             `📅 የተሞላበት ጊዜ: ${timeStampCredit}`;
        sendAdminTelegramAlert(adminCreditMsg);
    }

    if (typeof closeActiveModal === 'function') {
        closeActiveModal();
    } else {
        let overlay = document.getElementById('modalOverlay');
        let modal = document.getElementById('motorCreditModal');
        if(overlay) overlay.classList.add('hidden');
        if(modal) modal.classList.add('hidden');
    }

    if (wasBlocked && currentMotor.credit <= 25) {
        alert(`በትክክል ${amount} ብር ክሬዲት ተሞልቷል!\n\n⚠️ ሆኖም አሁንም ክሬዲትዎ ከ25 ብር በታች ስለሆነ እገዳው (Block) አልተነሳም። እባክዎ ተጨማሪ ክሬዲት ይሙሉ!`);
    } else if (wasBlocked && currentMotor.credit > 25) {
        alert(`በትክክል ${amount} ብር ክሬዲት ተሞልቷል!\n\n✅ አሁን ክሬዲትዎ ከ25 ብር በላይ ስለሆነ ሲስተሙ እገዳውን አንስቶልዎታል! አሁን ስራ መቀጠል ይችላሉ።`);
    } else {
        alert(`በትክክል ${amount} ብር ክሬዲት ተሞልቷል!`);
    }
    
    renderMotorPage();
}

// 7. ትዕዛዞችን ማሳያ (Active Deliveries) - አዲስ ማስተካከያ (Point 1)
function renderMotorOrders() {
    const tbody = document.getElementById('motorActiveOrdersBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let activeOrders = currentMotor.activeOrders || [];
    if (activeOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">በአሁኑ ሰዓት የተመደበ ምንም ትዕዛዝ የለም</td></tr>`;
        return;
    }

    // ማስተካከያ: ሞተረኛው አስቀድሞ የተቀበለው ትዕዛዝ ወይም ያልተወራረደ ክፍያ ካለው ማረጋገጫ
    let feeReceived = (currentMotor.incomingFee && parseFloat(currentMotor.incomingFee) > 0);
    let hasActiveJob = activeOrders.some(o => o.status === 'accepted') || feeReceived;
    activeOrders.forEach((order, index) => {
        let tr = document.createElement('tr');
        let actionBtn = "";
        let statusBadge = "";

        if(order.status === 'pending_motor') {
            statusBadge = `<span class="badge-warning">አዲስ ጥሪ (በመጠባበቅ ላይ)</span><br>`;
            
            // ሌላ የተቀበለው ስራ ካለ አዳዲስ ጥሪዎች ላይ በተኑን እናፈዝዘዋለን (Disable)
            if (hasActiveJob) {
                actionBtn = `<button class="btn-add btn-sm" style="background-color: #64748b; color: #cbd5e1; cursor: not-allowed; opacity: 0.5;" disabled>🔒 በስራ ላይ ነዎት</button>`;
            } else {
                actionBtn = `<button class="btn-add btn-sm" onclick="acceptMotorOrder(${index})">✋ ተቀበል (Accept)</button>`;
            }
        } else {
            statusBadge = `<span class="badge-success">በእርስዎ የተያዘ</span><br>`;
            
            if(feeReceived) {
                // ብሩ ገብቷል፣ በተኑ አረንጓዴ ሆኖ መነካት ይችላል
                actionBtn = `<button class="btn-sell btn-sm" onclick="completeMotorOrder(${index})">✅ አድርሻለሁ (Deliver)</button>`;
            } else {
                // ክፍያ ስላልገባ በተኑ ፍዝዝ ብሎ ይቆለፋል (Disabled)
                actionBtn = `<button class="btn-sell btn-sm" style="background-color: #64748b; color: #cbd5e1; cursor: not-allowed; opacity: 0.7;"
                disabled>⏳ ክፍያ አልገባም</button>`;
            }
        }

        tr.innerHTML = `
            <td>${order.shopName}<br><a href="${order.shopMap}" target="_blank" style="color:var(--accent-color);">📍 የሻጭ ማፕ</a> |
            📞 ${order.shopPhone}</td>
            <td>${order.buyerName}<br><a href="${order.buyerMap}" target="_blank" style="color:var(--accent-color);">📍 የገዥ ማፕ</a> |
            📞 ${order.buyerPhone}</td>
            <td>${order.itemName} (x${order.qty})<br><strong style="color:var(--warning-color);">${order.totalPrice} ETB</strong><br>${statusBadge}</td>
            <td>${actionBtn}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 8. ኦርደር ሲቀበል (Lock & Link)
window.acceptMotorOrder = function(index) {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    // ክፍያ ሳይጨርስ አዲስ እንዳይቀበል መቆለፊያ
    if (currentMotor.incomingFee > 0) {
        alert("⚠️ እባክዎ መጀመሪያ የያዙትን ትዕዛዝ በማድረስ ከገዥ የተላከውን ክፍያ ያረጋግጡ (ዳሽቦርድዎ ላይ 0.00 ይሁን)! ከዚያ በኋላ ብቻ አዲስ ትዕዛዝ መቀበል ይችላሉ።");
        return;
    }

    // ተጨማሪ ማረጋገጫ: ሌላ የተቀበለው ትዕዛዝ ካለ ይከለክላል
    let hasActiveJob = currentMotor.activeOrders.some(o => o.status === 'accepted');
    if (hasActiveJob) {
        alert("⚠️ አስቀድመው የተቀበሉት ሌላ ትዕዛዝ አለ! እባክዎ መጀመሪያ ያንን ያድርሱ።");
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

    let shopKey = acceptedOrder.shopKey;
    if (!shopKey) {
        let foundKey = Object.keys(localDB.tenants).find(k => localDB.tenants[k].shopName === acceptedOrder.shopName);
        if (foundKey) shopKey = foundKey;
    }
    
    if (shopKey && localDB.tenants[shopKey] && localDB.tenants[shopKey].data && localDB.tenants[shopKey].data.deliveryOrders) {
        let shopOrders = localDB.tenants[shopKey].data.deliveryOrders;
        let sOrd = shopOrders.find(o => o.orderId == acceptedOrder.orderId || (o.buyerPhone == acceptedOrder.buyerPhone && o.itemName == acceptedOrder.itemName));
        if (sOrd) {
            sOrd.motorUser = currentMotor.username;
            sOrd.status = 'accepted';
            if (typeof db !== 'undefined' && isOnline) {
                db.ref(`tirfe_system/tenants/${shopKey}/data/deliveryOrders`).set(shopOrders);
            }
        }
    }

    let tgMessage = `📦 አዲስ ትዕዛዝ ተቀብለዋል!\n\n` +
                    `📱 የገዥ ስልክ: ${acceptedOrder.buyerPhone ||
                    '-'}\n` +
                    `📍 ገዥ ያለበት ቦታ: ${acceptedOrder.address ||
                    '-'}\n` +
                    `🗺️ የገዥ ጎግል ማፕ: ${acceptedOrder.buyerMap ||
                    '-'}\n\n` +
                    `📞 የሻጭ ስልክ: ${acceptedOrder.shopPhone ||
                    '-'}\n` +
                    `🗺️ የሻጭ ጎግል ማፕ: ${acceptedOrder.shopMap ||
                    '-'}\n\n` +
                    `🛍️ የዕቃው አይነት: ${acceptedOrder.itemName ||
                    '-'}\n` +
                    `🔢 የዕቃው ብዛት: ${acceptedOrder.qty ||
                    '-'}\n\n` +
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
// ብሩን ሲቀበል (ኮሚሽን ቆርጦ 0.00 ያደርጋል፣ ከ 25 በታች ከሆነም ይዘጋል)
window.clearIncomingFee = function() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    if(!confirm("እርግጠኛ ነዎት ክፍያውን ከገዥው ተቀብለዋል? ይህ ማሳያውን ወደ 0.00 ይመልሰዋል።")) return;
    
    let feeCollected = currentMotor.incomingFee || 0;
    // የሲስተሙ ባለቤት ኮሚሽን ስሌት
    let commRate = (localDB.adminSettings && localDB.adminSettings.deliveryCommissionRate) ? (localDB.adminSettings.deliveryCommissionRate / 100) : 0.10;
    let commissionAmount = feeCollected * commRate;
    
    currentMotor.credit = (currentMotor.credit || 0) - commissionAmount;
    // ኮሚሽኑን ከክሬዲት ቀንሶታል
    currentMotor.incomingFee = 0;
    // ማሳያውን ወደ 0.00 ይመልሳል
    
    // ክሬዲቱ 25 እና ከዚያ በታች ከሆነ አካውንቱን እገደው (Block)
    if (currentMotor.credit <= 25) {
        currentMotor.status = 'blocked';
    }

    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();
    if (typeof sendMotorTelegramAlert === 'function') {
        let blockMsg = currentMotor.status === 'blocked' ?
        "\n\n⚠️ ክሬዲትዎ 25 ብር ስለደረሰ አካውንትዎ ታግዷል! እባክዎ ክሬዲት ይሙሉ።" : "\n\nአሁን አዲስ ትዕዛዝ መቀበል ይችላሉ!";
        sendMotorTelegramAlert(currentMotor.username, `✅ ክፍያ ተረጋግጧል!\n\nገዥው የከፈለው: ${feeCollected} ETB\nየተቆረጠ ኮሚሽን: ${commissionAmount} ETB` + blockMsg);
    }
    
    if (currentMotor.status === 'blocked') {
        alert(`✅ ክፍያው ተረጋግጧል! (ኮሚሽን ${commissionAmount} ETB ተቆርጧል)።\n⚠️ ክሬዲትዎ 25 ብር እና ከዚያ በታች ስለሆነ ሲስተሙ አካውንትዎን አግዶታል። እባክዎ ክሬዲት ይሙሉ።`);
    } else {
        alert(`✅ ክፍያው ተረጋግጧል! ማሳያው ወደ 0.00 ተመልሷል። (ኮሚሽን ${commissionAmount} ETB ተቆርጧል)። አሁን አዲስ ትዕዛዝ መቀበል ይችላሉ።`);
    }
    
    renderMotorPage();
};
// 9. የስራ ታሪክ ማሳያ (Delivery History with Date Filter)
function renderMotorHistory() {
    const tbody = document.getElementById('motorHistoryBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let history = currentMotor.history || [];
    // የ Date Picker ማጣሪያ
    let filterInput = document.getElementById('motorHistoryDateFilter');
    let filterDate = filterInput && filterInput.value ?
    filterInput.value : null;

    let todayStr = new Date().toISOString().split('T')[0]; // የዛሬ ቀን በ YYYY-MM-DD

    let filteredHistory = history.filter(record => {
        let recDateStr = todayStr;
        // isoDate ካለው ከዛ ላይ ቀኑን ይወስዳል
        if (record.isoDate) {
            recDateStr = record.isoDate.split('T')[0];
        }
        
        if (filterDate) {
            // ተጠቃሚው መርጦ ከሆነ የተመረጠውን ብቻ
            return recDateStr === filterDate;
        } else {
            // ካልመረጠ የዛሬውን ብቻ (ፊት ለፊት እንዳያጨናንቀው)
            return recDateStr === todayStr;
        }
    });
    if (filteredHistory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">በዚህ ቀን የተመዘገበ ታሪክ የለም</td></tr>`;
        return;
    }

    let reversedHistory = [...filteredHistory].reverse();
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
    if(!confirm("እርግጠኛ ነዎት እቃውን ለደንበኛው አስረክበዋል?")) return;
    
    let order = currentMotor.activeOrders[index];
    
    // ማስተካከያ 1: ክፍያ ከዕቃው ዋጋ እንዳይሆን!
    // ትክክለኛውን የዴሊቨሪ ክፍያ 'ከገዥ የተላከ ክፍያ' (incomingFee) ላይ ብቻ እንዲመሰረት አድርገናል
    let actualFee = parseFloat(currentMotor.incomingFee);
    // ለጥንቃቄ (ክፍያው ከ 0.00 ካልተቀየረ አያስጨርሰውም)
    if (isNaN(actualFee) || actualFee <= 0) {
        alert("⚠️ የዴሊቨሪ ክፍያ ገና አልገባም! እባክዎ ዳሽቦርድ ላይ 'ከገዥ የተላከ ክፍያ' ከ 0.00 እስኪቀየር ይጠብቁ።");
        return;
    }
    
    if(!currentMotor.history) currentMotor.history = [];
    currentMotor.history.push({
        date: new Date().toLocaleDateString('am-ET'),
        isoDate: new Date().toISOString(), // ለዳሽቦርድ ስሌት ይጠቅማል
        shopName: order.shopName,
        buyerName: order.buyerName,
        earned: actualFee // ከዕቃው ዋጋ ሳይሆን ትክክለኛው የዴሊቨሪ ክፍያ ይመዘገባል!
    });
    currentMotor.activeOrders.splice(index, 1);
    currentMotor.totalDelivered = (currentMotor.totalDelivered || 0) + 1;
    
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();

    if (typeof sendMotorTelegramAlert === 'function') {
        sendMotorTelegramAlert(currentMotor.username, `✅ ትዕዛዝ በተሳካ ሁኔታ አድረሷል!\n\n🏢 ሱቅ: ${order.shopName}\n👤 ደንበኛ: ${order.buyerName}\n💵 ያገኙት ክፍያ: ${actualFee} ETB`);
    }

    alert("ትዕዛዙን በተሳካ ሁኔታ ስላደረሱ እናመሰግናለን! አሁን ከዳሽቦርድዎ ላይ '✅ ክፍያ ተቀብያለሁ (ወደ 0.00 መልስ)' የሚለውን በመጫን ኮሚሽን አወራርደው አዲስ ስራ መቀበል ይችላሉ።");
    renderMotorPage();
}
// 11. ከሞተረኛ ሲስተም መውጫ (Logout)
function logoutMotor() {
    if(!confirm("ከሲስተሙ መውጣት ይፈልጋሉ?")) return;
    
    // በቀጥታ የተስተካከለውንና Firebaseን የሚያጠፋውን ዋናውን የሎግአውት ፈንክሽን መጥራት
    if (typeof window.logout === 'function') {
        window.logout();
    } else {
        window.location.replace("index.html");
    }
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

    // --- አዲሱ የሞተረኛ ቁጥር መቆጣጠሪያ (Quota Check) ---
    let locKey = `${region}_${zone}_${woreda}`;
    let quota = (localDB.motorQuotas && localDB.motorQuotas[locKey] !== undefined) ? parseInt(localDB.motorQuotas[locKey]) : null;
    if (quota !== null) {
        let currentCount = 0;
        if (localDB.motors) {
            Object.values(localDB.motors).forEach(m => {
                if (m.region === region && m.zone === zone && m.woreda === woreda) {
                    currentCount++;
                }
            });
        }
        if (currentCount >= quota) {
            if(typeof showCustomAlert === 'function') {
                showCustomAlert("⚠️ ምዝገባ ተዘግቷል", `ይቅርታ! በዚህ አካባቢ (${region}/${zone}/${woreda}) የተፈቀደው የሞተረኛ ብዛት ጣሪያ (${quota}) ስለሞላ አሁን መመዝገብ አይችሉም።`);
            } else {
                alert(`ይቅርታ! በዚህ አካባቢ (${region}/${zone}/${woreda}) የተፈቀደው የሞተረኛ ብዛት ጣሪያ (${quota}) ስለሞላ አሁን መመዝገብ አይችሉም።`);
            }
            return;
        }
    }
    // ---------------------------------------------

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
            if(!defaultPass) { alert("ፓስዎርድ አልፈጠሩም!"); btn.innerText = originalText; btn.disabled = false; return;
            }
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

            // ማስተካከያ:- አዲስ ሞተረኛ ሲመዘገብ የተስማማንባቸውን መረጃዎች አካተን ወደ አድሚን እንልካለን
            let nowForReg2 = new Date();
            let timeStampReg2 = nowForReg2.toLocaleDateString('am-ET') + " " + nowForReg2.toLocaleTimeString('am-ET');
            let tgMsg = `🏍️ አዲስ ሞተረኛ ተመዝግቧል!\n\n` +
                        `👤 ሙሉ ስም: ${fName} ${lName}\n` +
                        `🔑 ዩዘርኔም: @${user}\n` +
                        `📞 ስልክ: ${phone}\n` +
                        `🏍️ የታርጋ ቁጥር / ሞተር: ${plate}\n` +
                        `📍 አድራሻ: ${region} / ${zone} / ${woreda}\n` +
                        `📅 የተመዘገበበት ጊዜ: ${timeStampReg2}\n\n` +
                        `አስተዳዳሪ (Admin) ገፅ ላይ በመግባት ማረጋገጥ ይችላሉ።`;
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

// 14. የሞተረኛን ዳታ ማጽጃ (Clear Data)
window.clearMotorData = function() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    
    if(!confirm("እርግጠኛ ነዎት የሞተረኛ ዳታዎን (የስራ ታሪክ፣ የተቀበሏቸው ትዕዛዞች፣ ያደረሱት ብዛት ወዘተ) ሙሉ በሙሉ ማጥፋት ይፈልጋሉ?\n\nማሳሰቢያ፦ ይህ እርምጃ ክሬዲትዎን አያጠፋም! ነገር ግን ሌላ እርምጃ አይቀለበስም።")) {
        return;
    }

    // ዳታዎችን ወደ ዜሮ (ባዶ) መመለስ (ክሬዲት እና አካውንት አይጠፋም)
    currentMotor.history = [];
    currentMotor.activeOrders = [];
    currentMotor.totalDelivered = 0;
    currentMotor.incomingFee = 0;

    localDB.motors[currentMotor.username] = currentMotor;
    
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();

    alert("✅ የሞተረኛ ዳታዎ በተሳካ ሁኔታ ፀድቶ አዲስ ጀምሯል!");
    renderMotorPage();
   
}
