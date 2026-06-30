// =========================================================================
// የሞተረኛ (Delivery/Motor) ማዕከላዊ የጃቫስክሪፕት ፋይል (main_delivery.js)
// =========================================================================

// 1. ሞተረኛ ሎጊን ሲያደርግ ገፁን መረጃዎች ማሳያ (ከ main_auth.js ጋር የሚገናኝ)
function renderMotorPage() {
    // currentMotor በሎጊን ጊዜ (main_auth.js) የሚፈጠር ግሎባል ቬርያብል ነው
    if (typeof currentMotor === 'undefined' || !currentMotor) return;

    // ሀ. የፕሮፋይል ባጅ መሙላት
    const badge = document.getElementById('motorProfileBadge');
    if (badge) {
        badge.innerText = `ሰላም, ${currentMotor.firstName} ${currentMotor.lastName} (@${currentMotor.username})`;
    }

    // ለ. ሴቲንግ ፎርም ላይ የነበሩትን መረጃዎች መሙላት
    document.getElementById('motSetEmail').value = currentMotor.email || '';
    document.getElementById('motSetPhone').value = currentMotor.phone || '';
    document.getElementById('motSetTelegram').value = currentMotor.tgToken || '';
    document.getElementById('motSetPassword').value = currentMotor.password || '';

    // ሐ. ዳሽቦርድ መረጃዎች (ክሬዲት እና ያደረሳቸው ብዛት)
    const credit = currentMotor.credit || 0;
    document.getElementById('motorCreditDisplay').innerText = credit.toFixed(2) + ' ETB';
    document.getElementById('motorTotalDelivered').innerText = currentMotor.totalDelivered || 0;

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
    if (tg) currentMotor.tgToken = tg;
    if (pass) currentMotor.password = pass;

    // ዳታቤዝ ላይ አፕዴት ማድረግ
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();

    alert("ማስተካከያው በትክክል ተቀምጧል!");
    toggleMotorSettings(); // ሴቲንጉን መልሶ ይደብቀዋል
    renderMotorPage();     // ገፁን አዲስ ያደርገዋል
}

// 4. ኦንላይን/ኦፍላይን መቀየሪያ
function toggleMotorOnlineStatus() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    
    const isChecked = document.getElementById('motorStatusToggle').checked;
    
    // Status ወደ ዳታቤዝ ማስገባት
    currentMotor.status = isChecked ? 'online' : 'offline';
    localDB.motors[currentMotor.username] = currentMotor;
    
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();
    
    renderMotorPage();
}

// 5. ክሬዲት ሞዳል መክፈቻ (መዋቅር)
function openMotorCreditModal() {
    const modal = document.getElementById('motorCreditModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('motorCreditAmount').value = '';
    }
}

// 6. ክሬዲት ሲሞላ ገንዘቡን ወደ አካውንቱ ማስገቢያ (ለጊዜው እዚሁ የሚደምር መዋቅር ነው)
function submitMotorCredit() {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;

    const amountInput = document.getElementById('motorCreditAmount').value;
    const amount = parseFloat(amountInput);

    if (isNaN(amount) || amount <= 0) {
        alert("እባክዎ ትክክለኛ የብር መጠን ያስገቡ!");
        return;
    }

    // አሁን ባለው ክሬዲት ላይ የተሞላውን መደመር
    if (typeof currentMotor.credit === 'undefined') currentMotor.credit = 0;
    currentMotor.credit += amount;

    // ወደ ዳታቤዝ ማስቀመጥ
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();

    alert(`በትክክል ${amount} ብር ክሬዲት ተሞልቷል!`);
    
    if (typeof closeActiveModal === 'function') closeActiveModal();
    renderMotorPage();
}

// 7. ትዕዛዞችን ማሳያ (Active Deliveries) - በቀጣይ ኦርደር ሲላክለት እዚህ ይገባል
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
        tr.innerHTML = `
            <td>${order.shopName}<br><a href="${order.shopMap}" target="_blank" style="color:var(--accent-color);">📍 ማፕ</a> | 📞 ${order.shopPhone}</td>
            <td>${order.buyerName}<br><a href="${order.buyerMap}" target="_blank" style="color:var(--accent-color);">📍 ማፕ</a> | 📞 ${order.buyerPhone}</td>
            <td>${order.itemName} (x${order.qty})<br><strong style="color:var(--warning-color);">${order.totalPrice} ETB</strong></td>
            <td>
                <button class="btn-sell btn-sm" onclick="completeMotorOrder(${index})">✅ አድርሻለሁ</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 8. የስራ ታሪክ ማሳያ (Delivery History)
function renderMotorHistory() {
    const tbody = document.getElementById('motorHistoryBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    let history = currentMotor.history || [];
    
    if (history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">ባዶ ነው</td></tr>`;
        return;
    }

    // አዲሱ ታሪክ ከላይ እንዲመጣ ሪቨርስ እናደርገዋለን (reverse)
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

// 9. ትዕዛዝ ማድረሱን ማረጋገጫ እና ወደ ታሪክ (History) ማዛወሪያ
function completeMotorOrder(index) {
    if (typeof currentMotor === 'undefined' || !currentMotor) return;
    
    if(!confirm("እርግጠኛ ነዎት እቃውን ለደንበኛው አስረክበዋል?")) return;
    
    let order = currentMotor.activeOrders[index];
    
    // ሀ. መረጃውን ወደ ታሪክ (history) ማስገባት
    if(!currentMotor.history) currentMotor.history = [];
    currentMotor.history.push({
        date: new Date().toLocaleDateString('am-ET'),
        shopName: order.shopName,
        buyerName: order.buyerName,
        earned: order.deliveryFee || 0
    });

    // ለ. ከአክቲቭ ኦርደር ላይ ማጥፋት
    currentMotor.activeOrders.splice(index, 1);
    
    // ሐ. ያደረሳቸውን አጠቃላይ ብዛት መጨመር
    currentMotor.totalDelivered = (currentMotor.totalDelivered || 0) + 1;

    // ማሳሰቢያ፦ የክሬዲት መቀነስ/መቁረጥ ስሌት (Credit Deduct Logic) ገና አልተሰራም። 
    // በቀጣይ ትዕዛዝ ሲያደርስ ክሬዲት የሚቆርጥ ከሆነ እዚህ ጋር ይጨመራል፦
    // currentMotor.credit -= order.platformFee;

    // ዳታቤዝ አፕዴት
    localDB.motors[currentMotor.username] = currentMotor;
    if (typeof saveToLocalStorage === 'function') saveToLocalStorage();
    if (typeof pushToFirebase === 'function') pushToFirebase();

    alert("ትዕዛዙን በተሳካ ሁኔታ ስላደረሱ እናመሰግናለን!");
    renderMotorPage();
}

// 10. ከሞተረኛ ሲስተም መውጫ (Logout)
function logoutMotor() {
    if(!confirm("ከሲስተሙ መውጣት ይፈልጋሉ?")) return;
    
    currentMotor = null;
    document.getElementById('motorPage').classList.add('hidden');
    document.getElementById('welcomeGateway').classList.remove('hidden');
}

