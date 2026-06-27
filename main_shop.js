function openTenantProfileEditor() {
    if(currentUserRole === "staff") { showCustomAlert("ክልክል", "ይህን መረጃ እና የይለፍ ቃል ማስተካከል የሚችለው የሱቁ ባለቤት ብቻ ነው!");
    return; }

    showFormModal("⚙️ የሱቅ መረጃ እና ምስጢራዊ ኮድ ማስተካከያ", [
        { id: "shopName", label: "የሱቅ ስም", type: "text", defaultValue: currentTenant.shopName },
        { id: "phone", label: "የሱቅ ስልክ ቁጥር", type: "text", defaultValue: currentTenant.phone },
        { id: "gmail", label: "ኢሜል (Gmail)", type: "email", defaultValue: currentTenant.gmail || "" },
        { id: "mapsLink", label: "የጎግል ማፕ ሊንክ (Google Maps URL)", type: "text", defaultValue: currentTenant.googleMapsLink || "" },
        { id: "newLogo", label: "የሱቅ ፎቶ/ሎጎ ለመቀየር (አማራጭ)", type: "file" },
        { id: "newPassword", label: "አዲስ ምስጢራዊ ኮድ / ፓስዎርድ ለመቀየር (ባዶ ከሆነ አይቀየርም)", type: "password", placeholder: "አዲስ ነባር ኮድ" }
    ], (res, fileInput) => {
        let updateTenantData = function(base64Logo) {
            currentTenant.shopName = res.shopName.trim();
            currentTenant.phone = res.phone.trim();
            currentTenant.gmail = res.gmail.trim();
            currentTenant.googleMapsLink = res.mapsLink.trim();
            if(base64Logo) currentTenant.shopLogo = base64Logo;
            if (res.newPassword && res.newPassword.trim() !== "") { currentTenant.password = res.newPassword.trim();
            }
            saveAndRefresh();
            showCustomAlert("ተሳክቷል", "የሱቅዎ መረጃ በተሳካ ሁኔታ ተስተካክሏል!");
        };
        if(fileInput && fileInput.files[0]) { processImageUpload(fileInput.files[0], updateTenantData); } else { updateTenantData(""); }
    });
}

function logout() { currentTenant = null; currentRevenueOfficer = null; localStorage.removeItem('tirfe_active_session'); switchView('welcomeGateway'); }
function saveAndRefresh() { localDB.tenants[currentTenant.username] = currentTenant; saveToLocalStorage(); pushToFirebase(); renderApp();
checkTimeLock(); }

function addItemDirectly() {
    if(currentUserRole === "staff") return;
    let name = document.getElementById('itemName').value.trim();
    let model = document.getElementById('itemModel').value.trim();
    let cost = parseFloat(document.getElementById('itemCost').value) || 0;
    let price = parseFloat(document.getElementById('itemPrice').value) || 0;
    let qty = parseInt(document.getElementById('itemQty').value) || 0;
    let fileInput = document.getElementById('itemImgFile'); let file = fileInput.files[0];
    
    if(!name || cost <= 0 || price <= 0 || qty <= 0) { showCustomAlert("ስህተት", "እባክዎ ትክክለኛ የዕቃ መረጃ ያስገቡ!");
    return; }
    
    let proceedAdd = function(imgBase64) {
        let inv = currentTenant.data.inventory || [];
        let existingItem = inv.find(item => item.name.toLowerCase() === name.toLowerCase() && (!item.model || item.model.toLowerCase() === model.toLowerCase()));
        if (existingItem) {
            existingItem.qty += qty; existingItem.cost = cost;
            existingItem.price = price;
            if(imgBase64) existingItem.imgUrl = imgBase64;
            showCustomAlert("🔄 ዕቃው ተሞልቷል", `"${name}" አስቀድሞ ስለነበረ አዲሱ ብዛት ተደምሮበታል። አጠቃላይ የነበረው ብዛት፦ ${existingItem.qty}`);
        } else {
            inv.push({ name, model: model || "-", cost, price, qty, sold: 0, profit: 0, imgUrl: imgBase64 || "", unitType: "pcs" });
        }
        currentTenant.data.inventory = inv; saveAndRefresh();
        
        document.getElementById('itemName').value = ''; document.getElementById('itemModel').value = '';
        document.getElementById('itemCost').value = ''; document.getElementById('itemPrice').value = ''; 
        document.getElementById('itemQty').value = ''; document.getElementById('itemImgFile').value = '';
    };
    if(file) processImageUpload(file, proceedAdd); else proceedAdd("");
}

function openExpenseModal() {
    showFormModal("አዲስ ወጪ መዝግብ", [
        { id: "reason", label: "የወጪ ምክንያት", type: "text", placeholder: "ምሳሌ፡ ለመብራት ክፍያ" },
        { id: "amount", label: "የገንዘብ መጠን (ETB)", type: "number", placeholder: "0.00" }
    ], (res) => {
        let amount = parseFloat(res.amount) || 0; let reason = res.reason.trim();
        if(!reason || amount <= 0) return;
        let d = currentTenant.data || {}; if(!d.expenses) d.expenses = [];
        d.expenses.push({ reason, amount, date: getTodayFormatted(), time: new Date().toLocaleTimeString('en-GB') });
        currentTenant.data = d; saveAndRefresh();
    });
}

function openDebtModal() {
    let inv = currentTenant.data.inventory || [];
    if (inv.length === 0) { showCustomAlert("⚠️ ዕቃ አልተገኘም", "ዕዳ ለመመዝገብ አስቀድሞ በዕቃዎች ዝርዝር ውስጥ ቢያንስ አንድ ዕቃ መኖር አለበት!"); return;
    }

    let itemOptions = inv.map((item, index) => { return { value: index, label: `${item.name} (${item.price} ETB)` }; });
    showFormModal("አዲስ የዕዳ መዝገብ", [
        { id: "customer", label: "የባለዕዳ ሙሉ ስም", type: "text", placeholder: "የሰውየው ስም..." },
        { id: "phone", label: "ስልክ ቁጥር", type: "text", placeholder: "09..." },
        { id: "itemIdx", label: "የወሰደው የዕቃ አይነት", type: "select", options: itemOptions },
        { id: "qty", label: "የዕቃው ብዛት", type: "number", placeholder: "1", defaultValue: "1" },
        { id: "date", label: "ቀን", type: "date", defaultValue: getTodayFormatted() }
    ], (res) => {
        let customer = res.customer.trim(); let phone = res.phone.trim();
        let itemIdx = parseInt(res.itemIdx); let qty = parseInt(res.qty) || 0;
        let selectedDate = res.date ? res.date : getTodayFormatted();

        if (!customer || qty <= 0 || isNaN(itemIdx)) { showCustomAlert("ስህተት", "እባክዎ የተሟላና ትክክለኛ መረጃ ያስገቡ!"); return; }

        let selectedItem = inv[itemIdx]; let calculatedAmount = selectedItem.price * qty;
        
        let d = currentTenant.data || {}; if (!d.debts) d.debts = [];
        d.debts.push({ customer: customer, phone: phone || "-", itemName: selectedItem.name, qty: qty, amount: calculatedAmount, paid: 0, date: selectedDate });
        selectedItem.sold += qty; currentTenant.data = d; saveAndRefresh();
        sendTelegramAlert(`💳 አዲስ እዳ ተመዘገበ (${currentUserRole === 'staff' ? 'በሰራተኛ' : 'በአሰሪ'})፦\nባለእዳ፦ ${customer}\nእቃ፦ ${selectedItem.name} (${qty})\nየታሰበ ሂሳብ፦ ${calculatedAmount} ETB\nቀን፦ ${selectedDate}`);
        showCustomAlert("ተሳክቷል", `${customer} በዕዳ የወሰደው ሂሳብ በራሱ ተባዝቶ ገብቷል፦ ${calculatedAmount} ETB`);
    });
}

function collectDebt(idx) {
    let debt = currentTenant.data.debts[idx]; let remaining = debt.amount - debt.paid;
    showFormModal(`${debt.customer} እዳ ክፍያ መቀበያ`, [
        { id: "amount", label: `የተከፈለው ገንዘብ (ቀሪ ዕዳ፡ ${remaining} ETB)`, type: "number", placeholder: "0.00", defaultValue: remaining }
    ], (res) => {
        let amt = parseFloat(res.amount) || 0;
        if(amt <= 0 || amt > remaining) { showCustomAlert("ስህተት", "የክፍያ መጠን ልክ አይደለም!"); return; }
        debt.paid += amt; currentTenant.data.collectedCreditToday = (parseFloat(currentTenant.data.collectedCreditToday) || 0) + amt;
        saveAndRefresh();
        
        sendTelegramAlert(`💵 የዕዳ ክፍያ ተሰበሰበ (${currentUserRole === 'staff' ? 'በሰራተኛ' : 'በአሰሪ'})፦\nከ ${debt.customer} ላይ ${amt} ETB ተቀብለዋል።`);
        showCustomAlert("ክፍያ ተፈጽሟል", `${debt.customer} እዳ ከፍሏል!`);
    });
}

function openDrawerModal() {
    showFormModal("ከሳጥን ብር ማንሻ / የተነሳ መመለሻ", [
        { id: "actionType", label: "የድርጊት ዓይነት ይምረጡ፦", type: "select", options: [{ value: "withdraw", label: "💸 ከሳጥን ብር ማንሻ (Withdrawal)" }, { value: "return", label: "📥 የተነሳ ብር መመለሻ (Repayment/Return)" }] },
        { id: "reason", label: "ምክንያት / ማስታወሻ", type: "text", placeholder: "ምሳሌ፡ ለመልስ መለወጫ / የወሰድኩትን መለስኩ" },
        { id: "amount", label: "የገንዘብ መጠን (ETB)", type: "number", placeholder: "0.00" }
    ], (res) => 
    {
        let amount = parseFloat(res.amount) || 0; let reason = res.reason.trim(); let action = res.actionType;
        if(!reason || amount <= 0) return;
        let d = currentTenant.data || {}; if(!d.drawerLog) d.drawerLog = [];
        let finalAmount = action === "withdraw" ? amount : -amount;
        let displayType = action === "withdraw" ? "ገንዘብ ተነሳ" : "ገንዘብ ተመለሰ";
        d.drawerLog.push({ reason: `${action === "withdraw" ? "⚠️ [የተነሳ] " : "✅ [የተመለሰ] "} ${reason}`, amount: finalAmount, time: new Date().toLocaleTimeString('en-GB') });
        currentTenant.data = d; saveAndRefresh();
        sendTelegramAlert(`💸 ከሳጥን ${displayType} (${currentUserRole === 'staff' ? 'በሰራተኛ' : 'በአሰሪ'})፦\nምክንያት፡ ${reason}\nመጠን፡ ${amount} ETB`);
    });
}

function openSettlementModal() {
    if(currentUserRole === "staff") return;
    showFormModal("📊 የሂሳብ ማወራረጃ ማዕከል", [
        { id: "periodType", label: "የማወራረጃ ዓይነት ይምረጡ፦", type: "select", options: [{ value: "monthly", label: "📅 የወር ሂሳብ (Monthly)" }, { value: "yearly", label: "📆 የአመት ሂሳብ (Yearly)" }] },
        { id: "periodDate", label: "ወር / አመት ይምረጡ (ለወር: YYYY-MM, ለአመት: YYYY)፦", type: "text", placeholder: "ምሳሌ: 2026-06 ወይም 2026", defaultValue: getTodayFormatted().substring(0,7) },
        { id: "bankBalance", label: "በባንክ / ቴሌብር ላይ ያለ ጠቅላላ ገንዘብ (ETB)፦", type: "number", placeholder: "0.00" }
    ], (res) => 
    {
        let type = res.periodType; let periodStr = res.periodDate.trim(); let bankAmt = parseFloat(res.bankBalance) || 0;
        let d = currentTenant.data || {}; let hist = d.history || [];
        let tSales = 0, tProfit = 0, tExp = 0, tDraws = 0, tReported = 0;
        let matchedEntries = hist.filter(h => {
            if(type === "monthly") return h.date.startsWith(periodStr) && !h.isMonthlyArchive;
            if(type === "yearly") return h.date.startsWith(periodStr) && !h.isMonthlyArchive;
            return false;
        });
        matchedEntries.forEach(h => {
            tSales += parseFloat(h.sales) || 0; tProfit += parseFloat(h.profit) || 0;
            tExp += parseFloat(h.expenses) || 0; tDraws += parseFloat(h.draws) || 0; tReported += parseFloat(h.reportedCash) || 0;
        });
        let currentStockValue = 0;
        (d.inventory || []).forEach(item => { let remaining = Math.max(0, item.qty - item.sold); currentStockValue += (item.cost * remaining); });
        let totalDebtRemaining = 0; (d.debts || []).forEach(debt => { totalDebtRemaining += (debt.amount - debt.paid); });
        let expectedBank = tSales - tExp - tDraws - totalDebtRemaining;
        if(expectedBank < 0) expectedBank = 0;
        let variance = bankAmt - expectedBank;

        let AmharicSummary = `======= 📊 ማወራረጃ (${periodStr}) =======\n• የተጣራ አጠቃላይ ሽያጭ፡ ${tSales.toFixed(2)} ETB\n• አጠቃላይ ወጪዎች፡ ${tExp.toFixed(2)} ETB\n• የተጣራ ትርፍ፡ ${tProfit.toFixed(2)} ETB\n• ከካዝና የተነሳ፡ ${tDraws.toFixed(2)} ETB\n• የተሰበሰበ ካሽ ሪፖርት፡ ${tReported.toFixed(2)} ETB\n----------------------------------------\n• በሱቅ ያለ ዕቃ ካፒታል፡ ${currentStockValue.toFixed(2)} ETB\n• ያልተሰበሰ ቀሪ ዕዳ፡ ${totalDebtRemaining.toFixed(2)} ETB\n----------------------------------------\n• ሲስተሙ የሚጠብቀው ገንዘብ (Expected)፦ ${expectedBank.toFixed(2)} ETB\n• እርስዎ ያስገቡት የባንክ መጠን፦ ${bankAmt.toFixed(2)} ETB\n• ልዩነት (Variance)፦ ${variance.toFixed(2)} ETB\n`;
        showCustomAlert("📊 ማወራረጃ ማጠቃለያ", AmharicSummary);
        sendTelegramAlert(`📊 ሂሳብ ማወራረጃ ሪፖርት (${periodStr})፦\n${AmharicSummary}`);
    });
}

function triggerShiftReport() {
    let d = currentTenant.data || {}; let session = d.sessionData || {};
    let sysSales = parseFloat(d.collectedCreditToday || 0); let todayProfit = 0; let inv = d.inventory || [];
    inv.forEach(item => { sysSales += (item.price * item.sold); todayProfit += (item.price - item.cost) * item.sold; });
    showFormModal("🔒 የዕለት ሂሳብ ሪፖርት መዝጊያ ማቅረቢያ", [
        { id: "reportedCash", label: "በእጅዎ የሚገኘውን ትክክለኛ የጥሬ ገንዘብ (Cash) መጠን ያስገቡ፦", type: "number", placeholder: "0.00" }
    ], (res) => {
        let reported = parseFloat(res.reportedCash) || 0; let tExp = 0; let tDraw = 0; let formattedDateToday = getTodayFormatted();
        (d.expenses || []).forEach(e => { if (e.date === formattedDateToday) tExp += parseFloat(e.amount) || 0; });
        (d.drawerLog || []).forEach(dr => tDraw += parseFloat(dr.amount) || 0);
        let creditSalesToday = 0;
        (d.debts || []).forEach(debt => { if(debt.date === formattedDateToday) creditSalesToday += debt.amount; });

        let expectedCash = ((parseFloat(session.initialFloat) || 0) + sysSales) - creditSalesToday - tExp - tDraw;
        let variance = reported - expectedCash;
        let statusText = variance === 0 ? "ትክክል (Balanced)" : `ልዩነት አለ (${variance} ETB)`;
        d.shiftClosed = true; d.reportedCash = reported; d.variance = variance; d.expectedCash = expectedCash;
        
        document.getElementById('shiftStatusAlert').classList.add('hidden');
        let msg = `የዕለቱ ሂሳብ በተሳካ ሁኔታ ተዘጋጅቷል!\nሁኔታ፡ ${statusText}\nበሲስተሙ የሚጠበቅ ካሽ፡ ${expectedCash} ETB\nየቀረበው ካሽ፡ ${reported} ETB`;
        showCustomAlert("ሪፖርት ቀርቧል", msg);
        
        if(!d.history) d.history = [];
        d.history.push({
            date: formattedDateToday, employee: session.employee || "ሰራተኛ", sales: sysSales, 
            profit: todayProfit - tExp, expenses: tExp, draws: tDraw, reportedCash: reported, expectedCash: expectedCash, variance: variance, isMonthlyArchive: false
        });
        currentTenant.data = d; saveAndRefresh();
        sendTelegramAlert(`🔒 የዕለት ሂሳብ ተዘግቷል (${currentUserRole === 'staff' ? 'በሰራተኛ' : 'በአሰሪ'}):\n${msg}`);
    });
}

function startNewDaySession() {
    if(currentUserRole === "staff") return; let d = currentTenant.data || {};
    if(d.sessionActive && !d.shiftClosed) { showCustomAlert("ክልክል!", "መጀመሪያ የትላንቱን (ወይም የዛሬውን) የዕለት ሂሳብ 'የዕለት ሂሳብ ዝጋ' በሚለው ዘግተው ሪፖርት ማቅረብ አለብዎት!"); return;
    }

    showCustomConfirm("አዲስ ቀን መጀመር", "የዛሬውን ቀን ሂሳብ ሙሉ በሙሉ አጽድተው ለአዲስ ቀን ማዘጋጀት ይፈልጋሉ? (የወር ትርፍዎ አይጠፋም)", () => {
        let inv = d.inventory || [];
        inv.forEach(item => { item.qty = Math.max(0, item.qty - item.sold); item.sold = 0; });
        d.sessionActive = false; d.shiftClosed = false; d.drawerLog = []; d.collectedCreditToday = 0;
        currentTenant.data = d; saveAndRefresh(); checkMorningSession();
        sendTelegramAlert(`🔄 አዲስ የሥራ ቀን በአሰሪ ተጀምሯል! የትላንትና ሂሳብ ተሰርዞ ወደ አዲስ ቀን ተሸጋግረዋል።`);
    });
}

function clearAllTenantData() {
    if(currentUserRole === "staff") return;
    showCustomConfirm("ሁሉንም ዳታ ማጽዳት", "ሁሉንም ዳታ ለማጥፋት እርግጠኛ ኖት?", () => {
        currentTenant.data = { sessionActive: false, shiftClosed: false, inventory: [], expenses: [], debts: [], drawerLog: [], history: [], receipts: [], deliveryOrders: [], remoteCarts: {}, accumulatedVat: 0, lastMonthlyResetDate: new Date().getTime(), taxReceipts: [] };
        saveAndRefresh(); checkMorningSession();
    });
}

function renderHistoryTable() {
    let d = currentTenant.data || {}; let historyBody = document.getElementById('historyBody');
    historyBody.innerHTML = '<tr><th>ቀን/ዓይነት</th><th>ሰራተኛ/ወቅት</th><th>ሽያጭ</th><th>ትርፍ</th><th>ሪፖርት ካሽ</th><th>ልዩነት</th></tr>';
    let historyList = d.history || []; let filterValue = document.getElementById('historyDateFilter').value;
    let filtered = historyList.filter(h => { if(!filterValue) return true; return h.date === filterValue; });
    if(filtered.length === 0) { historyBody.innerHTML += '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">በተፈለገው ቀን ምንም ታሪክ የለም</td></tr>';
    } 
    else {
        filtered.forEach(h => {
            let vColor = h.variance === 0 ? 'var(--success-color)' : 'var(--danger-color)';
            let rowStyle = h.isMonthlyArchive ? `style="background: rgba(192, 132, 252, 0.15); border-left: 4px solid var(--purple-color);"` : '';
            historyBody.innerHTML += `<tr ${rowStyle}>
                <td><b>${h.date}</b></td><td>${h.employee}</td><td style="color:var(--success-color)">${h.sales}</td>
                <td style="color:var(--accent-color)"><b>${h.profit}</b></td><td>${h.reportedCash || 0}</td>
                <td style="${rowStyle ? '' : 'color:'+vColor}"><b>${h.variance || 0}</b></td>
            </tr>`;
        });
    }
}

window.acceptDelivery = function(idx) {
    let ord = currentTenant.data.deliveryOrders[idx];
    let item = currentTenant.data.inventory[ord.itemIdx];
    let neededMeters = item.isAdvanced && item.unitType !== 'kg' ? ord.qty * item.unitPerPack : ord.qty;
    if(item.qty - item.sold < neededMeters) { showCustomAlert("ስህተት", "ይህንን ትዕዛዝ ለማስተናገድ በቂ ክምችት የሎትም!"); return;
    }
    
    ord.status = "accepted"; saveAndRefresh();
    showCustomAlert("ተቀብለዋል", "ትዕዛዙ ተቀባይነት አግኝቷል! እቃው በመንገድ ላይ ነው ተብሎ ምልክት ተደርጎበታል።");
};

window.completeDelivery = function(idx) {
    let ord = currentTenant.data.deliveryOrders[idx]; let item = currentTenant.data.inventory[ord.itemIdx];
    let neededMeters = item.isAdvanced && item.unitType !== 'kg' ? ord.qty * item.unitPerPack : ord.qty;
    item.sold += neededMeters; ord.status = "completed";
    let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 0;
    let collectedVat = 0;
    if(vatRate > 0) {
        collectedVat = (ord.total * vatRate) / 100;
        if(!currentTenant.data.accumulatedVat) currentTenant.data.accumulatedVat = 0;
        currentTenant.data.accumulatedVat += collectedVat;
    }
    
    generateDigitalReceipt(ord.itemName, ord.qty, ord.total, ord.orderId, null, true, ord.buyerUser, ord.buyerPhone, collectedVat);
    saveAndRefresh();
};

window.returnDelivery = function(idx) { let ord = currentTenant.data.deliveryOrders[idx]; ord.status = "returned"; saveAndRefresh(); showCustomAlert("ተመልሷል", "እቃው ተመልሷል!"); };

window.handleRemoteCartCheckout = function(buyerUser) {
    let t = currentTenant.data;
    let remoteCart = t.remoteCarts[buyerUser];
    if(!remoteCart || remoteCart.length === 0) return;
    
    showCustomConfirm("ክፍያ መቀበያ (Remote Checkout)", `የ ${buyerUser} ትዕዛዝ ክፍያ ተቀብለዋል? ደረሰኝ ይቆረጥ?`, () => {
        let grandTotal = 0; let receiptItems = [];
        remoteCart.forEach(c => {
            let item = t.inventory[c.itemIdx];
            let neededMeters = item.isAdvanced && item.unitType !== 'kg' ? c.qty * item.unitPerPack : c.qty;
            item.sold += neededMeters; grandTotal += c.total;
            receiptItems.push({ name: c.itemName, count: c.qty, unitPrice: c.price, total: c.total });
        });
        
        delete t.remoteCarts[buyerUser];
        let currentSeller = currentUserRole === 'staff' ? 'ሰራተኛ (Employee)' : 'ባለቤት (Employer)';
        let bPhone = localDB.buyers[buyerUser] ? localDB.buyers[buyerUser].phone : "";

        let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 0;
        let collectedVat = 0;
        
        if(vatRate > 0) {
            collectedVat = (grandTotal * vatRate) / 100;
            if(!currentTenant.data.accumulatedVat) currentTenant.data.accumulatedVat = 0;
            currentTenant.data.accumulatedVat += collectedVat;
        }

        generateAdvancedReceipt(receiptItems, grandTotal, currentSeller, null, true, null, null, buyerUser, bPhone, collectedVat);
        saveAndRefresh();
        sendTelegramAlert(`🛍️ የኦንላይን ሽያጭ (Remote Cart Checkout)፦\nየገዢ ስም: ${buyerUser}\nጠቅላላ ሂሳብ፡ ${grandTotal} ETB`);
    });
};

// --- አዲሱ የግብር ደረሰኝ ማሳያ ሎጂክ ---
window.renderTenantTaxReceipts = function() {
    if(!currentTenant || !currentTenant.data) return;
    let tbody = document.getElementById('tenantTaxReceiptsBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    let receipts = currentTenant.data.taxReceipts || [];
    let filterDateInput = document.getElementById('tenantTaxReceiptDateFilter');
    let filterDate = filterDateInput ? filterDateInput.value : "";
    
    let filtered = receipts.filter(r => {
        if(!filterDate) return true;
        return r.date === filterDate;
    });
    if(filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">ምንም የተቆረጠ የግብር ደረሰኝ የለም</td></tr>`;
        return;
    }
    
    let reversed = [...filtered].reverse();
    reversed.forEach((rec) => {
        let originalIdx = receipts.indexOf(rec);
        tbody.innerHTML += `<tr>
            <td><b>#${rec.recId}</b><br><small style="color: #94a3b8;">${rec.date}</small></td>
            <td>${rec.reason}</td>
            <td style="color:var(--success-color); font-weight:bold;">${parseFloat(rec.amount).toFixed(2)} ETB</td>
            <td>${rec.officerName}<br><small style="color: #94a3b8;">📞 ${rec.officerPhone}</small></td>
            <td><button class="btn-config btn-sm" onclick="viewTaxReceiptDetail(${originalIdx})">👁️ ሙሉ ደረሰኝ እይ</button></td>
        </tr>`;
    });
};

window.viewTaxReceiptDetail = function(idx) {
    if(!currentTenant || !currentTenant.data || !currentTenant.data.taxReceipts) return;
    let rec = currentTenant.data.taxReceipts[idx];
    if(!rec) return;
    let detailHtml = `
        <div style="text-align:center; border-bottom: 2px dashed #3b82f6; padding-bottom: 10px; margin-bottom: 10px;">
            <h2 style="margin: 0; color: #000; font-size: 1.4rem;">የግብር ክፍያ ደረሰኝ</h2>
            <p style="margin: 5px 0 0 0; color: #555; font-size: 0.9rem;">የገቢዎች ባለስልጣን ማረጋገጫ</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; color: #000; font-size: 0.95rem;">
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>የደረሰኝ ቁጥር:</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd; font-weight:bold;">#${rec.recId}</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>ቀን:</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd;">${rec.date}</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>የተከፈለ መጠን:</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd; color: #10b981; font-weight: bold; font-size: 1.1rem;">${parseFloat(rec.amount).toFixed(2)} ETB</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>የክፍያ ምክንያት:</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd;">${rec.reason}</td></tr>
            
            <tr><td colspan="2" style="background: rgba(0,0,0,0.05); padding: 8px; font-weight: bold; text-align: center; margin-top: 10px;">የግብር ከፋይ (ተከራይ) መረጃ</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>የከፋይ ስም:</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd;">${rec.tenantName}</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>የድርጅት/ሱቅ ስም:</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd;">${rec.tenantShop}</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>TIN ቁጥር:</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd;">${rec.tenantTin}</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>ስልክ ቁጥር:</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd;">${rec.tenantPhone}</td></tr>
            
            <tr><td colspan="2" style="background: rgba(0,0,0,0.05); padding: 8px; font-weight: bold; text-align: center; margin-top: 10px;">የተቀባይ (ባለስልጣን) መረጃ</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>የባለስልጣኑ ስም:</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd;">${rec.officerName}</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>አድራሻ (ክልል/ዞን/ወረዳ):</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd;">${rec.officerRegion} / ${rec.officerZone} / ${rec.officerWoreda}</td></tr>
            <tr><td style="padding: 5px; border-bottom: 1px solid #ddd;"><b>ስልክ ቁጥር:</b></td> <td style="padding: 5px; border-bottom: 1px solid #ddd;">${rec.officerPhone}</td></tr>
        </table>
        <div style="margin-top: 20px; text-align: center; font-size: 0.8rem; color: #555; font-style: italic;">ይህ ደረሰኝ በሲስተሙ የተመዘገበ ህጋዊ ሰነድ ነው።</div>
    `;
    
    document.getElementById('taxReceiptDetailBody').innerHTML = detailHtml;
    openModalContainer();
    document.getElementById('taxReceiptDetailModal').classList.remove('hidden');
};

function renderApp() {
    let d = currentTenant.data || {}; let session = d.sessionData || {};
    if(d.sessionActive) { document.getElementById('sessionDisplay').innerText = `📅 ${session.date} | 👤 አስገቢ፡ ${session.employee} | 💰 መነሻ ካዝና፡ ${session.initialFloat} ETB`; }
    
    let headerRow = document.getElementById('inventoryTableHeader');
    if (currentUserRole === "staff") { headerRow.innerHTML = `<th>የዕቃ ስም</th><th>ሞዴል</th><th>መሸጫ ዋጋ</th><th>የተሸጠው</th><th>ቀሪ ክምችት</th><th>ድርጊት (Cart)</th>`; } 
    else { headerRow.innerHTML = `<th>የዕቃ ስም</th><th>ሞዴል</th><th>መግዣ</th><th>መሸጫ (ች/ጅምላ)</th><th>የነበረው</th><th>የተሸጠው</th><th>ቀሪ</th><th>ትርፍ</th><th>እርምጃ</th>`; }

    let tbody = document.getElementById('inventoryBody');
    tbody.innerHTML = '';
    let collectedCredit = parseFloat(d.collectedCreditToday) || 0;
    let tSales = collectedCredit; let todayProfit = 0;
    let tExp = 0;
    let tDraw = 0; let currentTotalCapital = 0;
    let expensesList = d.expenses || [];
    expensesList.forEach(e => tExp += parseFloat(e.amount) || 0);
    
    let drawsList = d.drawerLog || []; drawsList.forEach(dr => tDraw += parseFloat(dr.amount) || 0);
    let query = document.getElementById('inventorySearchInput') ? document.getElementById('inventorySearchInput').value.trim().toLowerCase() : "";

    let inv = d.inventory || [];
    inv.forEach((item, idx) => {
        let remaining = Math.max(0, item.qty - item.sold); 
        let profit = (item.price - item.cost) * item.sold; 
        tSales += (item.price * item.sold); todayProfit += profit; currentTotalCapital += (item.cost * remaining);
        if (query !== "" && !item.name.toLowerCase().includes(query)) return;

        let rowClass = remaining <= 3 ? 'low-stock-row' : '';
        let stockBadge = remaining <= 3 ? '<span class="low-stock-badge">⚠️</span>' : '';
        let itemModelText = item.model || "-";
        let wholesaleText = item.wholesalePrice ? ` / ${item.wholesalePrice}` : '';
        let priceDisplay = `${item.price}${wholesaleText}`;
        
        let sellAction = `
            <div style="display:flex; gap:5px; align-items:center;">
                <input type="number" id="quickQty_${idx}" style="width:60px; padding:4px; margin:0;" placeholder="ብዛት" value="1">
                <select id="quickType_${idx}" style="width:70px; padding:4px; margin:0; ${item.wholesalePrice > 0 ? '' : 'display:none;'}">
                    <option value="retail">ችርቻሮ</option><option value="wholesale">ጅምላ</option>
                </select>
                <button class="btn-sell btn-sm" onclick="addToMainCart(${idx})">➕ ሽጥ</button>
                ${currentUserRole === "owner" ? `<button class="btn-expense btn-sm" onclick="deleteInventoryItem(${idx})" style="margin-left:5px;">🗑️</button>` : ''}
            </div>`;

        let displayQty = item.qty; let displaySold = item.sold; let displayRem = remaining;
        if(item.isAdvanced || item.unitType === 'kg') {
            let uLabel = item.unitType === 'kg' ? ' ኪሎ' : ' ሜትር';
            displayQty = `${item.qty}${uLabel}`; displaySold = `${item.sold}${uLabel}`; displayRem = `${remaining}${uLabel}`;
        }

        if (currentUserRole === "staff") {
            tbody.innerHTML += `<tr class="${rowClass}">
                <td><strong>${item.name}</strong> ${stockBadge}</td><td>${itemModelText}</td><td>${item.price} ETB</td>
                <td><b>${displaySold}</b></td><td style="${remaining <= 3 ? 'color:#f87171;font-weight:bold;' : ''}">${displayRem}</td><td>${sellAction}</td>
            </tr>`;
        } else {
            tbody.innerHTML += `<tr class="${rowClass}">
                <td><strong>${item.name}</strong> ${stockBadge}</td><td>${itemModelText}</td><td>${item.cost}</td>
                <td>${priceDisplay}</td><td>${displayQty}</td><td><b>${displaySold}</b></td><td>${displayRem}</td><td>${profit}</td><td>${sellAction}</td>
            </tr>`;
        }
    });

    let formattedDateToday = getTodayFormatted(); let todayExpensesTotal = 0; let creditSalesToday = 0;
    expensesList.forEach(e => { if (e.date === formattedDateToday) todayExpensesTotal += parseFloat(e.amount) || 0; });
    (d.debts || []).forEach(debt => { if (debt.date === formattedDateToday) creditSalesToday += debt.amount; });
    
    let finalCashInHand = ((parseFloat(session.initialFloat) || 0) + tSales) - creditSalesToday - todayExpensesTotal - tDraw;
    if (d.shiftClosed) { todayProfit = 0; finalCashInHand = 0; }

    document.getElementById('totalInCash').innerText = finalCashInHand.toFixed(1) + " ETB";
    let sellerTotalBuyersEl = document.getElementById('sellerTotalBuyers');
    if(sellerTotalBuyersEl) sellerTotalBuyersEl.innerText = localDB.buyers ? Object.keys(localDB.buyers).length : 0;
    
    let accVatDisplay = document.getElementById('tenantAccumulatedVatDisplay');
    if(accVatDisplay) {
        let accVat = (d.accumulatedVat) ? parseFloat(d.accumulatedVat) : 0;
        accVatDisplay.innerText = accVat.toFixed(2) + " ETB";
    }

    if (currentUserRole === "owner") {
        let monthlyProfit = todayProfit - todayExpensesTotal;
        let historyList = d.history || []; historyList.forEach(h => { if(!h.isMonthlyArchive) monthlyProfit += parseFloat(h.profit) || 0; });
        document.getElementById('totalCapital').innerText = currentTotalCapital.toFixed(1) + " ETB";
        document.getElementById('todayNetProfit').innerText = (todayProfit - todayExpensesTotal).toFixed(1) + " ETB";
        document.getElementById('monthlyNetProfit').innerText = monthlyProfit.toFixed(1) + " ETB";
        document.getElementById('monthlyExpenses').innerText = tExp.toFixed(1) + " ETB";
        document.getElementById('totalDraws').innerText = tDraw.toFixed(1) + " ETB";
        if (myChart) { myChart.data.datasets[0].data = [currentTotalCapital, tSales, todayProfit - todayExpensesTotal]; myChart.update(); }
        renderHistoryTable();
    }

    let remoteBody = document.getElementById('sellerRemoteCartsBody');
    if(remoteBody) {
        remoteBody.innerHTML = "";
        let remoteCarts = d.remoteCarts || {}; let hasRemotes = false;
        Object.keys(remoteCarts).forEach(bUser => {
            let items = remoteCarts[bUser];
            if(items && items.length > 0) {
                hasRemotes = true; let totalSum = 0; let detailsHTML = "";
                items.forEach(i => {
                    totalSum += i.total; let invItem = d.inventory[i.itemIdx];
                    let modelTxt = (invItem && invItem.model && invItem.model !== "-") ? `(ሞዴል: ${invItem.model})` : "";
                    detailsHTML += `<div style="font-size:0.8rem; margin-bottom:2px; color: var(--accent-color);">▪ ${i.itemName} ${modelTxt} - ብዛት: ${i.qty}</div>`;
                });
               
                remoteBody.innerHTML += `<tr>
                    <td>👤 ${bUser}</td><td>${detailsHTML}</td><td><b style="color:var(--success-color)">${totalSum} ETB</b></td>
                    <td><button class="btn-sell btn-sm" onclick="handleRemoteCartCheckout('${bUser}')">✅ ክፍያ ተቀበል (Checkout)</button></td>
                </tr>`;
            }
        });
        if(!hasRemotes) remoteBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">በአሁኑ ሰዓት የገዥዎች Cart ትዕዛዝ የለም።</td></tr>`;
    }

    let delBody = document.getElementById('sellerDeliveryBody');
    if(delBody) {
        delBody.innerHTML = "";
        let orders = d.deliveryOrders || [];
        let hasDel = false;
        orders.forEach((ord, idx) => {
            if(ord.status === "completed" || ord.status === "returned") return;
            hasDel = true;
            let statusBadge = ord.status === "pending" ? `<span class="badge-warning">በመጠባበቅ ላይ</span>` : `<span class="badge-success">በመንገድ ላይ</span>`;
            let actions = "";
            if(ord.status === "pending") { actions = `<button class="btn-sell btn-sm" onclick="acceptDelivery(${idx})">ተቀበል (Accept)</button>`; } 
            else if(ord.status === "accepted") {
                actions = `<button class="btn-sell btn-sm" onclick="completeDelivery(${idx})">ተረክቦ ደረሰኝ ቆርጥ</button>
                           <button class="btn-expense btn-sm" style="margin-top:4px;" onclick="returnDelivery(${idx})">እቃው ተመለሰ</button>`;
            }
            let invItem = d.inventory[ord.itemIdx];
  
            let modelTxt = (invItem && invItem.model && invItem.model !== "-") ? `(ሞዴል: ${invItem.model})` : "";
            delBody.innerHTML += `<tr>
                <td>👤 ${ord.buyerUser}<br>📞 ${ord.buyerPhone}</td>
                <td>📍 ${ord.address} <br> ${ord.mapLink ? `<a href="${ord.mapLink}" target="_blank" style="color:var(--accent-color);">Map Link</a>` : ''}</td>
                <td>📦 <b style="color:var(--accent-color);">${ord.itemName}</b> <br> ${modelTxt} <br> ብዛት: ${ord.qty}</td>
                <td>${ord.total} ETB</td><td>${statusBadge}</td><td>${actions}</td>
            </tr>`;
        });
        if(!hasDel) delBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">በአሁኑ ሰዓት ምንም አዲስ የዴሊቨሪ ትዕዛዝ የለም።</td></tr>`;
    }

    let creditBody = document.getElementById('creditBody');
    creditBody.innerHTML = '<tr><th>ባለዕዳ / ስልክ</th><th>የወሰደው ዕቃ (ብዛት)</th><th>ጠቅላላ ዕዳ</th><th>ቀሪ</th><th>ድርጊት</th></tr>';
    let debts = d.debts || [];
    if(debts.length === 0) { creditBody.innerHTML += '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">ምንም የዕዳ መዝገብ የለም</td></tr>';
    } 
    else {
        debts.forEach((debt, idx) => {
            let remaining = debt.amount - debt.paid;
            if (remaining > 0) {
                let itemDisplay = debt.itemName ? `${debt.itemName} (${debt.qty || 1} ፍሬ)` : "-";
                creditBody.innerHTML += `<tr>
                 <td><b>${debt.customer}</b><br><small style="color:#94a3b8">${debt.phone}</small><br><small style="color:var(--warning-color)">📅 ${debt.date || ''}</small></td>
                    <td>${itemDisplay}</td><td>${debt.amount} ETB</td>
                    <td style="color:var(--danger-color)"><b>${remaining} ETB</b></td>
                    <td><button class="btn-sell btn-sm" onclick="collectDebt(${idx})">ክፍያ</button></td>
                </tr>`;
            }
        });
    }

    let drawBody = document.getElementById('drawBody');
    drawBody.innerHTML = '<tr><th>ምክንያት</th><th>የተወሰደው</th><th>ሰዓት</th></tr>';
    if(drawsList.length === 0) { drawBody.innerHTML += '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">ምንም የተነሳ ገንዘብ የለም</td></tr>';
    } 
    else {
        drawsList.forEach(dr => {
            let isReturn = dr.amount < 0; let displayAmt = isReturn ? Math.abs(dr.amount) + " ETB (መለሰ)" : dr.amount + " ETB";
            let displayColor = isReturn ? "var(--success-color)" : "var(--purple-color)";
            let tbodyColor = `style="color:${displayColor}; font-weight:bold;"`;
            drawBody.innerHTML += `<tr><td>${dr.reason}</td><td ${tbodyColor}>${displayAmt}</td><td>${dr.time}</td></tr>`;
        });
    }

    let receiptHistoryBody = document.getElementById('receiptHistoryTableBody');
    receiptHistoryBody.innerHTML = '';
    let pastReceipts = d.receipts || [];
    let receiptFilterDate = document.getElementById('receiptDateFilter').value;
    if (!receiptFilterDate) { receiptHistoryBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; font-weight: bold;">📅 እባክዎ ደረሰኞችን ለማየት መጀመሪያ ቀን ይምረጡ!</td></tr>';
    } 
    else {
        let filteredReceipts = pastReceipts.filter(rec => rec.date === receiptFilterDate);
        if (filteredReceipts.length === 0) { receiptHistoryBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">የመረጡት ቀን (${receiptFilterDate}) የተቆረጠ ምንም ደረሰኝ የለም።</td></tr>`;
        } 
        else {
            let reversedReceipts = [...pastReceipts].reverse();
            reversedReceipts.forEach((rec, originalIdx) => {
                let actualIdx = pastReceipts.length - 1 - originalIdx;
                if (rec.date === receiptFilterDate) {
                    receiptHistoryBody.innerHTML += `<tr>
                        <td><b>#${rec.recId}</b></td><td>${rec.date}</td><td>${rec.itemName}</td><td>${rec.count}</td>
                        <td class="text-success"><b>${rec.totalVal} ETB</b></td><td><span class="text-warning">${rec.seller}</span></td>
                        <td><button class="btn-config btn-sm" onclick="viewPastReceipt(${actualIdx})">👁️ ድጋሚ እይ / Print</button></td>
                    </tr>`;
                }
            });
        }
    }
    
    renderMainCart();
    checkTimeLock();
    if(typeof renderTenantTaxReceipts === 'function') renderTenantTaxReceipts();
}

function initChart() {
    let canvasElement = document.getElementById('businessChart');
    if (!canvasElement || currentUserRole === "staff") return;
    let ctx = canvasElement.getContext('2d');
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['ካፒታል', 'የዛሬ ሽያጭ', 'የዛሬ ትርፍ'],
            datasets: [{ label: 'የገንዘብ መጠን (ETB)', data: [0, 0, 0], backgroundColor: ['#38bdf8', '#4ade80', '#fbbf24'], borderRadius: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } }
        }
    });
}

function checkMorningSession() {
    let d = currentTenant.data || {};
    if (!d.sessionActive) {
        showFormModal("የቀኑ መጀመሪያ መመዝገቢያ (የካዝና ማስሞያ)", [
            { id: "employee", label: "የገቢ አድራጊው/ሰራተኛው ስም ያስገቡ፦", type: "text", placeholder: "ስም", defaultValue: currentUserRole === "staff" ? "ሰራተኛ" : "አሰሪ" },
            { id: "initialFloat", label: "ጠዋት በካዝና/ሳጥን ውስጥ የተገኘ መነሻ ገንዘብ (Float)፦", type: "number", placeholder: "0.00", defaultValue: "0" }
        ], (res) => {
            d.sessionData = { date: getTodayFormatted(), loginTime: new Date().toLocaleTimeString('en-GB'), employee: res.employee || "ሰራተኛ", initialFloat: parseFloat(res.initialFloat) || 0 };
            d.sessionActive = true; d.shiftClosed = false; d.expenses = d.expenses || []; 
            d.drawerLog = []; d.debts = d.debts || []; d.receipts = d.receipts || [];
            d.deliveryOrders = d.deliveryOrders || []; d.collectedCreditToday = 0;
            currentTenant.data = d; 
            document.getElementById('receiptDateFilter').value = getTodayFormatted();
            saveAndRefresh();
        });
    } else { renderApp(); }
}

function openItemRegistrationChoice() {
    showFormModal("የዕቃ ምዝገባ አማራጭ", [
        { id: "regType", label: "እባክዎ የሚመዘግቡትን የዕቃ ልኬት አይነት ይምረጡ፦", type: "select", options: [{value: "standard", label: "📦 መደበኛ (በፍሬ / ልኬት የሌለው)"}, {value: "advanced", label: "📏/⚖️ በጥቅል/ሜትር ወይም በኪሎግራም"}] }
    ], (res) => {
        if(res.regType === "standard") { document.getElementById('itemName').focus(); showCustomAlert("መረጃ", "መደበኛ ዕቃዎችን ከታች ባለው 'የዕቃ ስም' በሚለው ፎርም ቀጥታ መመዝገብ ይችላሉ።"); } 
        else if(res.regType === "advanced") { openAdvancedRegistration(); }
    });
}

function openAdvancedRegistration() {
    showFormModal(`📏/⚖️ በጥቅል/ሜትር ወይም በኪሎግራም የሚለካ ዕቃ መዝግብ`, [
        { id: "unitType", label: "የልኬት አይነት ይምረጡ", type: "select", options: [{value: "meter", label: "📏 በሜትር (Meter)"}, {value: "kg", label: "⚖️ በኪሎግራም (KG)"}] },
        { id: "name", label: "የዕቃ ስም (ምሳሌ፡ የኤሌክትሪክ ገመድ/ስኳር)", type: "text", placeholder: `ስም` },
        { id: "model", label: "ሞዴል / አይነት", type: "text", placeholder: "-" },
        { id: "packCount", label: "ስንት ጥቅል (Package/Roll/Sack) ገባ?", type: "number", placeholder: "0" },
        { id: "unitPerPack", label: "በአንድ ጥቅል ውስጥ ያለው ጠቅላላ ሜትር/ኪሎ", type: "number", placeholder: "0" },
        { id: "totalCost", label: `የጠቅላላ ዕቃው የገባበት ዋጋ (ካፒታል)`, type: "number", placeholder: "0" },
        { id: "retailPrice", label: "የ 1 ሜትር/ኪሎ መሸጫ ዋጋ (ችርቻሮ)", type: "number", placeholder: "0" },
        { id: "wholesalePrice", label: "በጅምላ (በጥቅል/ጆንያ) ሲሸጥ የአንድ ጥቅል መሸጫ ዋጋ", type: "number", placeholder: "0" },
        { id: "advImgFile", label: "የዕቃው ፎቶ ከጋላሪ ይምረጡ (አማራጭ)፡", type: "file" }
    ], (res, fileInputObj) => {
        let name = res.name.trim();
        let packCount = parseFloat(res.packCount) || 0; let unitPerPack = parseFloat(res.unitPerPack) || 0;
        let totalQtyInMeters = packCount * unitPerPack;
        let totalCost = parseFloat(res.totalCost) || 0; let retailPrice = parseFloat(res.retailPrice) || 0;
        if(!name || packCount <= 0 || unitPerPack <= 0 || totalCost <= 0 || retailPrice <= 0) { showCustomAlert("ስህተት", "እባክዎ የተሟላ እና ትክክለኛ መረጃ ያስገቡ!");
        return; }

        let proceedAdd = function(imgBase64) {
            let inv = currentTenant.data.inventory || [];
            let existingItem = inv.find(item => item.name.toLowerCase() === name.toLowerCase() && (!item.model || item.model.toLowerCase() === (res.model || "-").toLowerCase()));
            let unitCostPerMeter = totalCost / totalQtyInMeters;

            if (existingItem) {
                existingItem.qty += totalQtyInMeters;
                existingItem.cost = unitCostPerMeter; existingItem.price = retailPrice; existingItem.wholesalePrice = parseFloat(res.wholesalePrice) || 0; existingItem.unitPerPack = unitPerPack;
                if(imgBase64) existingItem.imgUrl = imgBase64;
                showCustomAlert("🔄 ዕቃው ተሞልቷል", `"${name}" አስቀድሞ ስለነበረ አዲሱ ብዛት ተደምሮበታል። አጠቃላይ የነበረው፦ ${existingItem.qty}`);
            } else {
                inv.push({ name: name, model: res.model || "-", cost: unitCostPerMeter, price: retailPrice, qty: totalQtyInMeters, sold: 0, profit: 0, imgUrl: imgBase64 || "", wholesalePrice: parseFloat(res.wholesalePrice) || 0, isAdvanced: true, unitType: res.unitType, unitPerPack: unitPerPack });
                showCustomAlert("ተሳክቷል", `ዕቃው በተሳካ ሁኔታ ተመዝግቧል! አጠቃላይ ብዛት: ${totalQtyInMeters} ${res.unitType === 'kg' ? 'ኪሎ' : 'ሜትር'}`);
            }
            currentTenant.data.inventory = inv; saveAndRefresh();
        };
        if(fileInputObj && fileInputObj.files[0]) { processImageUpload(fileInputObj.files[0], proceedAdd); } else { proceedAdd(""); }
    });
}

function openSellChoiceModal() {
    document.getElementById('inventorySearchInput').focus();
    showCustomAlert("መረጃ", "እባክዎ ከታች ካለው የዕቃዎች ዝርዝር (ቴብል) ላይ '➕ ሽጥ' የሚለውን በመጫን ወደ ቅርጫት (Cart) ያስገቡ እና ክፍያ ይፈፅሙ።");
}

window.addToMainCart = function(idx) {
    if(currentTenant.data.shiftClosed) { showCustomAlert("ስህተት", "የዕለቱ ፈረቃ ተዘግቷል! ማሸጥ አይቻልም።"); return;
    }
    
    let qtyInput = document.getElementById(`quickQty_${idx}`); let qty = parseFloat(qtyInput.value) || 0;
    let typeSelect = document.getElementById(`quickType_${idx}`); let isWholesale = typeSelect && typeSelect.value === 'wholesale';
    let item = currentTenant.data.inventory[idx];
    let rem = item.qty - item.sold;
    if(qty <= 0) { showCustomAlert("ስህተት", "የተሳሳተ ብዛት ነው!"); return;
    }

    let unitPriceToUse = (isWholesale && item.wholesalePrice > 0) ? item.wholesalePrice : item.price;
    let neededMeters = qty;
    if(isWholesale && item.isAdvanced) { neededMeters = qty * item.unitPerPack; }

    if(neededMeters > rem) { showCustomAlert("ስህተት", "ከክምችት በላይ ነው!");
    return; }

    let existIdx = mainCart.findIndex(c => c.index === idx && c.isWholesale === isWholesale);
    if(existIdx > -1) {
        let totalNeeded = mainCart[existIdx].deductedMeters + neededMeters;
        if(totalNeeded > rem) { showCustomAlert("ስህተት", "ከክምችት በላይ ነው!"); return; }
        mainCart[existIdx].qty += qty;
        mainCart[existIdx].deductedMeters += neededMeters; mainCart[existIdx].total = mainCart[existIdx].qty * unitPriceToUse;
    } else {
        let nName = item.name + (isWholesale ? (item.isAdvanced ? " (በጥቅል)" : " (በጅምላ)") : "");
        mainCart.push({ index: idx, name: nName, qty: qty, deductedMeters: neededMeters, price: unitPriceToUse, total: qty * unitPriceToUse, isWholesale: isWholesale });
    }
    
    qtyInput.value = '1'; renderMainCart();
};

window.renderMainCart = function() {
    let container = document.getElementById('cartItemsList'); let totalEl = document.getElementById('cartTotalSum'); let emptyMsg = document.getElementById('emptyCartMsg');
    if(!mainCart || mainCart.length === 0) { container.innerHTML = ""; emptyMsg.style.display = "block"; if(totalEl) totalEl.innerText = "0"; return;
    }
    
    emptyMsg.style.display = "none";
    let html = '<table style="width:100%; border-collapse:collapse; margin-bottom:10px;">';
    let grandTotal = 0;
    
    mainCart.forEach((c, i) => {
        grandTotal += c.total;
        html += `<tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
            <td style="padding:8px 0; color:var(--text-color);">${c.name}</td><td style="color:var(--text-color);">${c.qty}</td>
            <td style="color:var(--text-color);">${c.price} ETB</td><td style="color:var(--success-color);"><b>${c.total} ETB</b></td>
            <td style="text-align:right;"><button class="btn-expense btn-sm" onclick="removeMainCartItem(${i})">❌</button></td>
        </tr>`;
    });
    html += '</table>'; 
    
    let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 0;
    let vatAmount = (grandTotal * vatRate) / 100;
    let finalTotal = grandTotal + vatAmount;
    let summaryHtml = `
        <div style="text-align: right; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-top: 10px;">
            <div style="color: #bbb; font-size: 0.9rem;">Subtotal / ሂሳብ: <b>${grandTotal.toFixed(2)} ETB</b></div>
            ${vatRate > 0 ? `<div style="color: var(--warning-color); font-size: 0.9rem;">VAT / ቫት (${vatRate}%): <b>+${vatAmount.toFixed(2)} ETB</b></div>` : ''}
            <div style="font-size: 1.2rem; color: var(--success-color); margin-top: 5px; font-weight: bold;">Grand Total / ድምር: <b>${finalTotal.toFixed(2)} ETB</b></div>
        </div>
    `;
    container.innerHTML = html + summaryHtml; 
    if(totalEl) totalEl.innerText = finalTotal.toFixed(2);
};

window.removeMainCartItem = function(i) { mainCart.splice(i, 1); renderMainCart(); };

window.checkoutMainCart = function() {
    if(!mainCart || mainCart.length === 0) { showCustomAlert("ስህተት", "እባክዎ መጀመሪያ ከቴብሉ እቃ ወደ ቅርጫቱ ያስገቡ!");
    return; }
    
    let grandTotal = 0; let currentSeller = currentUserRole === 'staff' ? 'ሰራተኛ (Employee)' : 'ባለቤት (Employer)';
    let receiptItems = [];
    
    mainCart.forEach(c => {
        let item = currentTenant.data.inventory[c.index]; item.sold += c.deductedMeters; grandTotal += c.total;
        receiptItems.push({ name: c.name, count: c.qty, unitPrice: c.price, total: c.total });
    });
    let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 0;
    let collectedVat = 0;
    if(vatRate > 0) {
        collectedVat = (grandTotal * vatRate) / 100;
        if(!currentTenant.data.accumulatedVat) currentTenant.data.accumulatedVat = 0;
        currentTenant.data.accumulatedVat += collectedVat;
    }

    let finalTotal = grandTotal + collectedVat;
    sendTelegramAlert(`🛍️ የሽያጭ ማስታወቂያ (${currentSeller})፦\nየሱቅ ስም: ${currentTenant.shopName}\nየተሸጡ ዕቃዎች፡ ${receiptItems.length} አይነት\nጠቅላላ ሂሳብ፡ ${finalTotal.toFixed(2)} ETB`);
    mainCart = []; saveAndRefresh(); renderMainCart();
    generateAdvancedReceipt(receiptItems, grandTotal, currentSeller, null, true, null, null, null, null, collectedVat);
};

// አዲሱ የፈጣን ቫት ቫሊዴሽን (Validation)
window.validateQuickVatPrice = function() {
    let priceInput = document.getElementById('specialVatItemPrice');
    let warningText = document.getElementById('quickVatWarning');
    let submitBtn = document.getElementById('btnQuickVatSubmit');
    if(!priceInput || !warningText || !submitBtn) return;
    
    let price = parseFloat(priceInput.value) || 0;
    if(price >= 3000) {
        warningText.style.display = 'block';
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    } else {
        warningText.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    }
};

window.toggleVatReceiptPanel = function() {
    let panel = document.getElementById('tenantVatReceiptSection');
    if(panel) {
        panel.classList.toggle('hidden');
        document.getElementById('vatCurrentDateSpan').innerText = getTodayFormatted();
        let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 15;
        let vatDisplay = document.getElementById('specialVatPercentDisplay');
        if(vatDisplay) vatDisplay.value = "ቫት: " + vatRate + "%";
    }
};

// የተስተካከለው የቫት ማውጫ ሎጅክ
window.generateStandaloneVatReceipt = function() {
    if(!currentTenant) return;
    let cName = document.getElementById('specialVatCustomerName').value.trim() || "የተከበረ ደንበኛ";
    let iName = document.getElementById('specialVatItemName').value.trim() || "የተለያዩ ዕቃዎች";
    let iModel = document.getElementById('specialVatItemModel').value.trim() || "-";
    let iPrice = parseFloat(document.getElementById('specialVatItemPrice').value) || 0;
    if(iPrice <= 0) { showCustomAlert("ስህተት", "እባክዎ ትክክለኛ የዕቃ ዋጋ ያስገቡ!"); return;
    }
    if(iPrice >= 3000) { showCustomAlert("ስህተት", "የብር መጠኑ ከ3000 እና ከዚያ በላይ ስለሆነ እባክዎ መደበኛውን ካርት (Cart) ይጠቀሙ!");
    return; }

    let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 15;
    let subTotal = iPrice;
    let iQty = 1;
    let vatAmount = (subTotal * vatRate) / 100;
    let grandTotal = subTotal + vatAmount;
    let recId = Math.floor(100000 + Math.random() * 900000);
    let dateStr = getTodayFormatted();
    
    // 1. የቫት ብሩን ወደ አጠቃላይ ቫት መደመሪያ ብቻ ይጨምራል
    if(!currentTenant.data.accumulatedVat) currentTenant.data.accumulatedVat = 0;
    currentTenant.data.accumulatedVat += vatAmount;
    
    // 2. ደረሰኙን ሂስትሪ ውስጥ ያስቀምጣል (በመለያ ታግ)
    if(!currentTenant.data.receipts) currentTenant.data.receipts = [];
    let displayItemName = `${iName} (ሞዴል: ${iModel}) [ፈጣን የቫት ደረሰኝ]`;
    let currentSeller = currentUserRole === 'staff' ? 'ሰራተኛ' : 'ባለቤት';
    let recObj = { 
        recId: recId, date: dateStr, itemName: displayItemName, count: iQty, 
        totalVal: grandTotal, subTotal: subTotal, vatAmount: vatAmount, 
        seller: currentSeller, advancedItems: [{name: displayItemName, count: iQty, unitPrice: subTotal, total: subTotal}], 
        shopName: currentTenant.shopName, bType: currentTenant.businessType, 
        buyerName: cName, buyerPhone: "-", ownerName: currentTenant.fullName, ownerPhone: currentTenant.phone,
        isQuickVat: true
    };
    currentTenant.data.receipts.push(recObj);
    
    saveAndRefresh(); // የዕለታዊ ሽያጭን እና ትርፍን አያዛባም ምክንያቱም ወደ Inventory ስላልገባ

    // 3. ደረሰኝ ማተሚያውን (Modal) ያዘምናሉ
    document.getElementById('recPrintShopName').innerText = currentTenant.shopName;
    document.getElementById('recPrintFullName').innerText = currentTenant.fullName;
    document.getElementById('recPrintBizType').innerText = currentTenant.businessType || "አጠቃላይ ንግድ";
    document.getElementById('recPrintTin').innerText = currentTenant.tinNumber || "-";
    document.getElementById('recPrintTradeReg').innerText = currentTenant.tradeRegistration || "-";
    document.getElementById('recPrintPhone').innerText = currentTenant.phone || "-";
    document.getElementById('recPrintEmail').innerText = currentTenant.gmail || "-";
    document.getElementById('recPrintRegion').innerText = currentTenant.region || "-";
    document.getElementById('recPrintZone').innerText = currentTenant.zone || "-";
    document.getElementById('recPrintWoreda').innerText = currentTenant.woreda || "-";
    document.getElementById('recPrintKebele').innerText = currentTenant.kebele || "-";
    document.getElementById('recPrintHouseNo').innerText = currentTenant.houseNo || "-";

    document.getElementById('recPrintCustomerName').innerText = cName;
    document.getElementById('recPrintCustomerTin').innerText = "-";
    document.getElementById('recPrintDate').innerText = dateStr;
    document.getElementById('recPrintReceiptId').innerText = "#" + recId;
    
    let tbody = document.getElementById('recPrintItemsBody');
    tbody.innerHTML = `<tr>
        <td style="padding: 4px 0; border-bottom: 1px dashed #ccc;">${iName} <br><small>ሞዴል: ${iModel}</small></td>
        <td style="padding: 4px 0; text-align: center; border-bottom: 1px dashed #ccc;">${iQty}</td>
        <td style="padding: 4px 0; text-align: right; border-bottom: 1px dashed #ccc;">${iPrice.toFixed(2)}</td>
        <td style="padding: 4px 0; text-align: right; border-bottom: 1px dashed #ccc;">${subTotal.toFixed(2)}</td>
    </tr>`;
    document.getElementById('recPrintSubTotal').innerText = subTotal.toFixed(2);
    document.getElementById('recPrintVatPercent').innerText = vatRate;
    document.getElementById('recPrintVatAmount').innerText = vatAmount.toFixed(2);
    document.getElementById('recPrintGrandTotal').innerText = grandTotal.toFixed(2);
    
    // ፎርሙን ባዶ ያደርጋል
    document.getElementById('specialVatCustomerName').value = "";
    document.getElementById('specialVatItemName').value = "";
    document.getElementById('specialVatItemModel').value = "";
    document.getElementById('specialVatItemPrice').value = "";
    if (typeof validateQuickVatPrice === "function") validateQuickVatPrice();

    document.getElementById('specialVatReceiptModal').classList.remove('hidden');
};

function generateAdvancedReceipt(itemsArray, subTotal, currentSeller, recId = null, saveToHistory = true, givenShopName = null, givenBType = null, buyerName = null, buyerPhone = null, passedVat = null, givenOwnerName = null, givenOwnerPhone = null) {
    if (!recId) recId = Math.floor(10000 + Math.random() * 90000);
    let dateStr = getTodayFormatted();
    let shopName = givenShopName || (currentTenant ? currentTenant.shopName : "የተለያዩ ሱቆች");
    let bType = givenBType || (currentTenant ? currentTenant.businessType : "አጠቃላይ ንግድ");
    
    let ownerName = givenOwnerName || (currentTenant ? currentTenant.fullName : "ያልተመዘገበ");
    let ownerPhone = givenOwnerPhone || (currentTenant ? currentTenant.phone : "ያልተመዘገበ");
    let shopLogo = (currentTenant && currentTenant.shopLogo) ? currentTenant.shopLogo : "https://cdn-icons-png.flaticon.com/512/869/869636.png";
    let displayBuyerName = buyerName;
    let displayBuyerPhone = buyerPhone;
    if (buyerName && localDB.buyers && localDB.buyers[buyerName] && !buyerPhone) { displayBuyerPhone = localDB.buyers[buyerName].phone;
    } 
    else if (currentBuyer && !buyerName) { displayBuyerName = currentBuyer.username; displayBuyerPhone = currentBuyer.phone;
    }

    let vatAmt = passedVat !== null ? passedVat : 0;
    let finalGrandTotal = subTotal + vatAmt;
    let rawTextForShare = `======= ${shopName.toUpperCase()} =======\nየንግድ ዘርፍ: ${bType}\nደረሰኝ ቁጥር: #${recId}\nየሸጠው ሰው: ${currentSeller}\nቀን: ${dateStr}\n---------------------------\n`;
    let tableRows = "";
    itemsArray.forEach(itm => {
        rawTextForShare += `ዕቃ: ${itm.name} | ብዛት: ${itm.count} | ዋጋ: ${itm.total} ETB\n`;
        tableRows += `<tr><td style="color:#000!important; border-bottom: 1px dashed #ddd; padding: 5px;"><b>${itm.name}</b></td><td style="color:#000!important; border-bottom: 1px dashed #ddd; padding: 5px;">${itm.count}</td><td style="color:#000!important; border-bottom: 1px dashed #ddd; padding: 5px;">${itm.unitPrice.toFixed(1)}</td><td style="color:#000!important; border-bottom: 1px dashed #ddd; padding: 5px;"><b>${itm.total} ETB</b></td></tr>`;
    });
    rawTextForShare += `---------------------------\n`;
    rawTextForShare += `Subtotal (ያለ ቫት): ${subTotal.toFixed(2)} ETB\n`;
    if(vatAmt > 0) rawTextForShare += `VAT / ቫት: +${vatAmt.toFixed(2)} ETB\n`;
    rawTextForShare += `ጠቅላላ ሂሳብ (Grand Total): ${finalGrandTotal.toFixed(2)} ETB\n`;

    if (displayBuyerName) { rawTextForShare += `ገዥ: ${displayBuyerName} | ስልክ: ${displayBuyerPhone || ''}\n`;
    }
    rawTextForShare += `እናመሰግናለን!`;

    if (saveToHistory && currentTenant) {
        if(!currentTenant.data.receipts) currentTenant.data.receipts = [];
        let mainName = itemsArray.length === 1 ? itemsArray[0].name : "የተለያዩ ዕቃዎች (" + itemsArray.length + ")";
        let mainCount = itemsArray.length === 1 ? itemsArray[0].count : "-";
        let recObj = { recId: recId, date: dateStr, itemName: mainName, count: mainCount, totalVal: finalGrandTotal, subTotal: subTotal, vatAmount: vatAmt, seller: currentSeller, advancedItems: itemsArray, shopName: shopName, bType: bType, buyerName: displayBuyerName, buyerPhone: displayBuyerPhone, ownerName: ownerName, ownerPhone: ownerPhone };
        currentTenant.data.receipts.push(recObj);
        
        if(displayBuyerName && localDB.buyers && localDB.buyers[displayBuyerName]) {
            if(!localDB.buyers[displayBuyerName].receipts) localDB.buyers[displayBuyerName].receipts = [];
            localDB.buyers[displayBuyerName].receipts.push(recObj);
        }
        saveAndRefresh();
    }

    let buyerSection = "";
    if (displayBuyerName) {
        buyerSection = `<div style="margin-top: 15px; border-top: 2px dashed #333; padding-top: 10px; text-align: left; font-size: 0.9rem;"><b>ገዥ:</b> ${displayBuyerName} <br><b>ስልክ ቁጥር:</b> ${displayBuyerPhone || ''}</div>`;
    }

    let vatHtml = vatAmt > 0 ?
        `<div style="display:flex; justify-content:space-between; margin-top:5px; font-size: 0.9rem; color: #555;">
            <span>Subtotal (ያለ ቫት):</span> <span>${subTotal.toFixed(2)} ETB</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:5px; font-size: 0.9rem; color: #555;">
            <span>VAT / ቫት:</span> <span>+${vatAmt.toFixed(2)} ETB</span>
        </div>` : "";
    let receiptHTML = `
    <div class="receipt-container" id="printableReceiptArea" style="background:#fff; color:#000; padding:15px; width:100%; max-width:350px; margin:0 auto;">
        <div class="receipt-header" style="display:flex; flex-direction:column; align-items:center;">
            <img src="${shopLogo}" style="width:60px; height:60px; border-radius:50%; margin-bottom:10px; object-fit:cover; border: 1px solid #ddd;"
            onerror="this.src='https://cdn-icons-png.flaticon.com/512/869/869636.png'">
            <h4 style="margin:0; font-size:1.3rem; color:#111; text-transform:uppercase;">${shopName}</h4>
            <p style="color:#565656; font-weight:bold; margin: 4px 0;">[ ${bType} ]</p>
            <p style="margin: 2px 0; font-size: 0.85rem;"><b>የባለቤት ስም:</b> ${ownerName}</p>
            <p style="margin: 2px 0; font-size: 0.85rem;"><b>ስልክ:</b> ${ownerPhone}</p>
            <div style="border-bottom: 2px dashed #333; width: 100%; margin: 10px 0;"></div>
            <p style="margin: 2px 0; font-size: 0.85rem; font-weight:bold;">ዲጂታል የሽያጭ ደረሰኝ</p>
            <p style="margin: 2px 0; font-size: 0.85rem;"><b>ቁጥር (No):</b> #${recId} | ቀን: ${dateStr}</p>
            <p style="margin: 2px 0; font-size: 0.85rem;"><b>የሻጭ ማንነት:</b> ${currentSeller}</p>
        </div>
        <table class="receipt-table" style="color:#000; width:100%; margin-top: 10px; border-collapse: collapse;">
            <thead><tr><th style="color:#000!important; text-align:left; border-bottom: 1px dashed #ddd; padding: 5px;">የዕቃ ስም</th><th style="color:#000!important; border-bottom: 1px dashed #ddd; padding: 5px;">ብዛት</th><th style="color:#000!important; border-bottom: 1px dashed #ddd; padding: 5px;">ነጠላ</th><th style="color:#000!important; border-bottom: 1px dashed #ddd; padding: 5px;">ጠቅላ局</th></tr></thead>
            <tbody>${tableRows}</tbody>
        </table>
        <div class="receipt-summary" style="margin-top: 15px; border-top: 2px dashed #333; padding-top: 8px; text-align: right; font-size: 0.95rem; font-weight: bold; color: #111;">
            ${vatHtml}
            <div style="display:flex; justify-content:space-between; margin-top:5px; font-size: 1.1rem; font-weight: 900;">
                <span>Grand Total (አጠቃላይ):</span> <span>${finalGrandTotal.toFixed(2)} ETB</span>
            </div>
        </div>
        ${buyerSection}
        <div class="receipt-footer" style="text-align: center; margin-top: 20px; font-size: 0.8rem; color: #777; font-style: italic;">~ ስለመጡ እናመሰግናለን! እንደገና ይጎብኙን ~</div>
    </div>
    <div class="receipt-actions-grid">
        <button class="btn-sell" onclick="window.print()">𖖨️ ደረሰኝ አትም (Print)</button>
        <button class="btn-add" onclick="downloadReceiptPDF('Receipt_${recId}')">📥 ፒዲኤፍ (PDF)</button>
        <button class="btn-config" style="background:#0088cc; color:white; grid-column: span 2;" onclick="shareToSocial('tg', \`${rawTextForShare}\`)">✈️ በቴሌግራም አጋራ</button>
        <button class="btn-expense" style="grid-column: span 2;" onclick="closeActiveModal()">❌ ዝጋ</button>
    </div>
    `;
    document.getElementById('formModalTitle').innerText = "🧾 የሽያጭ ደረሰኝ";
    document.getElementById('formModalBody').innerHTML = receiptHTML;
    document.getElementById('formModalFooter').innerHTML = '';
    openModalContainer(); document.getElementById('formModal').classList.remove('hidden');
}

function viewPastReceipt(idx) {
    let rec = currentTenant.data.receipts[idx];
    let subT = rec.subTotal !== undefined ? rec.subTotal : rec.totalVal;
    let vAmt = rec.vatAmount !== undefined ? rec.vatAmount : 0;
    
    if(rec.advancedItems) { 
        generateAdvancedReceipt(rec.advancedItems, subT, rec.seller, rec.recId, false, rec.shopName, rec.bType, rec.buyerName, rec.buyerPhone, vAmt, rec.ownerName, rec.ownerPhone);
    } else { 
        generateAdvancedReceipt([{name: rec.itemName, count: rec.count, unitPrice: subT/rec.count, total: subT}], subT, rec.seller, rec.recId, false, rec.shopName, rec.bType, rec.buyerName, rec.buyerPhone, vAmt, rec.ownerName, rec.ownerPhone);
    }
}

function generateDigitalReceipt(itemName, count, totalVal, recId = null, sellerRole = null, saveToHistory = true, buyerUserForReceipt = null, buyerPhoneForReceipt = null, vatAmount = 0) {
    let items = [{name: itemName, count: count, unitPrice: totalVal/count, total: totalVal}];
    let currentSeller = sellerRole || (currentUserRole === 'staff' ? 'ሰራተኛ (Employee)' : 'ባለቤት (Employer)');
    generateAdvancedReceipt(items, totalVal, currentSeller, recId, saveToHistory, null, null, buyerUserForReceipt, buyerPhoneForReceipt, vatAmount);
}

function deleteInventoryItem(idx) { 
    if(currentUserRole === "staff") return;
    showCustomConfirm("እቃ መሰረዣ", "ይህንን እቃ ማጥፋት ይፈልጋሉ?", () => { 
        currentTenant.data.inventory.splice(idx, 1); saveAndRefresh(); 
    });
}

function launchApp(tenant) {
    currentTenant = tenant;
    switchView('appPage');
    document.getElementById('shopTitle').innerText = tenant.shopName + (currentUserRole === "staff" ? " (የሰራተኛ ገጽ)" : " (የባለቤት ገጽ)");
    document.getElementById('roleSubTitle').innerText = currentUserRole === "staff" ? "🛠️ የተገደበ የሰራተኛ መሸጫ እና መመዝገቢያ ሞድ" : "👑 ሙሉ የሱቅና የኪራይ መቆጣጠሪያ ፓነል";
    document.getElementById('profShopName').innerText = tenant.shopName;
    document.getElementById('profGmail').innerText = tenant.gmail || "-";
    document.getElementById('profExpiry').innerText = tenant.expiryDate ? `${tenant.expiryDate} (${tenant.contractType})` : "ያልተገደበ";
    let rentDisplay = document.getElementById('tenantRentDisplay');
    if(rentDisplay) { rentDisplay.innerText = (tenant.registrationFee || 0) + " ETB";
    }

    let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 0;
    let rentAmount = parseFloat(tenant.registrationFee) || 0;
    let calculatedVat = (rentAmount * vatRate) / 100;
    let vatDisplay = document.getElementById('tenantVatDisplay');
    if(vatDisplay) { vatDisplay.innerText = calculatedVat.toFixed(2) + " ETB (" + vatRate + "%)"; }

    document.getElementById('receiptDateFilter').value = getTodayFormatted();
    let activeTheme = tenant.theme || 'theme-deepblue';
    document.body.className = activeTheme; document.getElementById('themeSelector').value = activeTheme;
    document.getElementById('inventorySearchInput').value = "";
    
    let staffRegBtns = document.querySelectorAll('#btn_staff_reg');
    if(staffRegBtns.length > 1) {
        for(let i = 1; i < staffRegBtns.length; i++) {
            staffRegBtns[i].remove();
        }
    }
    
    let singleStaffBtn = document.getElementById('btn_staff_reg');
    if (currentUserRole === "staff") {
        document.getElementById('ownerDashboard').classList.add('hidden');
        document.getElementById('chartContainer').classList.add('hidden');
        document.getElementById('btn_add_item').classList.add('hidden');
        document.getElementById('btn_expense').classList.add('hidden');
        document.getElementById('btn_next_day').classList.add('hidden');
        document.getElementById('btn_clear_all').classList.add('hidden');
        document.getElementById('owner_add_box').classList.add('hidden');
        document.getElementById('btn_settlement').classList.add('hidden');
        document.getElementById('historySection').classList.add('hidden');
        document.getElementById('tenantProfileSection').classList.add('hidden');
        if(singleStaffBtn) singleStaffBtn.classList.add('hidden');
    } else {
        document.getElementById('ownerDashboard').classList.remove('hidden');
        document.getElementById('chartContainer').classList.remove('hidden');
        document.getElementById('btn_add_item').classList.remove('hidden');
        document.getElementById('btn_expense').classList.remove('hidden');
        document.getElementById('btn_next_day').classList.remove('hidden');
        document.getElementById('btn_clear_all').classList.remove('hidden');
        document.getElementById('owner_add_box').classList.remove('hidden');
        document.getElementById('btn_settlement').classList.remove('hidden');
        document.getElementById('historySection').classList.remove('hidden');
        document.getElementById('tenantProfileSection').classList.remove('hidden');
        if(singleStaffBtn) singleStaffBtn.classList.remove('hidden');
        checkMonthlyAccessReset();
    }

    setTimeout(() => { if(currentUserRole === "owner") initChart(); checkMorningSession(); }, 200);
}

// Startup Calls
loadLocalStorageBackup();
checkAutomaticLogin();
handleOnlineStatus();
