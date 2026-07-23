function openTenantProfileEditor() {
    if(currentUserRole === "staff") { 
        showCustomAlert("ክልክል", "ይህን መረጃ እና የይለፍ ቃል ማስተካከል የሚችለው የሱቁ ባለቤት ብቻ ነው!");
        return; 
    }

    showFormModal("⚙️ የሱቅ መረጃ እና ምስጢራዊ ኮድ ማስተካከያ", [
        { id: "shopName", label: "የሱቅ ስም", type: "text", defaultValue: currentTenant.shopName },
        { id: "phone", label: "የሱቅ ስልክ ቁጥር", type: "text", defaultValue: currentTenant.phone },
        { id: "gmail", label: "ኢሜል (Gmail)", type: "email", defaultValue: currentTenant.gmail || "" },
        { id: "mapsLink", label: "የጎግል ማፕ ሊንክ (Google Maps URL)", type: "text", defaultValue: currentTenant.googleMapsLink || "" },
        { id: "telegramToken", label: "የቴሌግራም ቦት ቶከን (Telegram Bot Token)", type: "text", defaultValue: currentTenant.telegramToken || "" },
        { id: "telegramChatId", label: "የቴሌግራም ቻት አይዲ (Telegram Chat ID)", type: "text", defaultValue: currentTenant.telegramChatId || "" },
        { id: "newLogo", label: "የሱቅ ፎቶ/ሎጎ ለመቀየር (አማራጭ)", type: "file" },
        { id: "newPassword", label: "አዲስ ምስጢራዊ ኮድ / ፓስዎርድ ለመቀየር (ባዶ ከሆነ አይቀየርም)", type: "password", placeholder: "አዲስ ነባር ኮድ" }
    ], (res, fileInput) => {
      
        let updateTenantData = function(base64Logo) {
            currentTenant.shopName = res.shopName.trim();
            currentTenant.phone = res.phone.trim();
            currentTenant.gmail = res.gmail.trim();
            currentTenant.googleMapsLink = res.mapsLink.trim();
            currentTenant.telegramToken = res.telegramToken.trim();
            currentTenant.telegramChatId = res.telegramChatId.trim();
            
            if(base64Logo) currentTenant.shopLogo = base64Logo;
            if (res.newPassword && res.newPassword.trim() !== "") { 
                currentTenant.password = res.newPassword.trim();
            }
            saveAndRefresh();
            showCustomAlert("ተሳክቷል", "የሱቅዎ መረጃ በተሳካ ሁኔታ ተስተካክሏል!");
        };
        if(fileInput && fileInput.files[0]) { processImageUpload(fileInput.files[0], updateTenantData); } else { updateTenantData(""); }
    });
}

function addItemDirectly() {
    if(currentUserRole === "staff") return;
    let name = document.getElementById('itemName').value.trim();
    let model = document.getElementById('itemModel').value.trim();
    let cost = parseFloat(document.getElementById('itemCost').value) || 0;
    let price = parseFloat(document.getElementById('itemPrice').value) || 0;
    let qty = parseInt(document.getElementById('itemQty').value) || 0;
    let fileInput = document.getElementById('itemImgFile'); let file = fileInput.files[0];
    
    if(!name || cost <= 0 || price <= 0 || qty <= 0) { 
        showCustomAlert("ስህተት", "እባክዎ ትክክለኛ የዕቃ መረጃ ያስገቡ!");
        return; 
    }
    
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
        let d = currentTenant.data || {}; if(!d.expenses) 
            d.expenses = [];
        d.expenses.push({ reason, amount, date: getTodayFormatted(), time: new Date().toLocaleTimeString('en-GB') });
        currentTenant.data = d; saveAndRefresh();
    });
}

function openDebtModal() {
    let inv = currentTenant.data.inventory || [];
    if (inv.length === 0) { 
        showCustomAlert("⚠️ ዕቃ አልተገኘም", "ዕዳ ለመመዝገብ አስቀድሞ በዕቃዎች ዝርዝር ውስጥ ቢያንስ አንድ ዕቃ መኖር አለበት!");
        return;
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

function openDrawerModal() {
    showFormModal("ከሳጥን ብር ማንሻ / የተነሳ መመለሻ", [
        { id: "actionType", label: "የድርጊት ዓይነት ይምረጡ፦", type: "select", options: [{ value: "withdraw", label: "💸 ከሳጥን ብር ማንሻ (Withdrawal)" }, { value: "return", label: "📥 የተነሳ ብር መመለሻ (Repayment/Return)" }] },
        { id: "reason", label: "ምክንያት / ማስታወሻ", type: "text", placeholder: "ምሳሌ፡ ለመልስ መለወጫ / የወሰድኩትን መለስኩ" },
        { id: "amount", label: "የገንዘብ መጠን (ETB)", type: "number", placeholder: "0.00" }
    ], (res) => {
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
    ], (res) => {
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

function startNewDaySession() {
    if(currentUserRole === "staff") return;
    let d = currentTenant.data || {};
    if(d.sessionActive && !d.shiftClosed) { 
        showCustomAlert("ክልክል!", "መጀመሪያ የትላንቱን (ወይም የዛሬውን) የዕለት ሂሳብ 'የዕለት ሂሳብ ዝጋ' በሚለው ዘግተው ሪፖርት ማቅረብ አለብዎት!");
        return;
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
    
    // ማስተካከያ፦ ተጠቃሚው ሲያጠፋ የትኞቹ መረጃዎች እንደማይጠፉ የሚገልጽ ማስጠንቀቂያ ተጨምሯል
    showCustomConfirm("ዳታ ማጽዳት", "የዕለት፣ የወጪ፣ የዕዳ እና ሌሎች ጊዜያዊ ሪፖርቶችን ለማጥፋት እርግጠኛ ኖት?\n\n(ማሳሰቢያ፦ የዕቃ ዝርዝር፣ የተሰበሰበ ቫት፣ የሰራተኛ መረጃ እና የሲስተም ሴቲንጎች አይጠፉም!)", () => {
        
        let d = currentTenant.data || {};
        
        // ማስተካከያ፦ እቃው፣ ካፒታሉ እና ቫቱ እንዳይጠፋ ነባሩን ዳታ ለብቻ ማስቀረት
        let preservedInventory = d.inventory || []; 
        let preservedVat = d.accumulatedVat || 0;
        
        currentTenant.data = { 
            sessionActive: false, 
            shiftClosed: false, 
            inventory: preservedInventory, // የተመዘገበው እቃ እና ካፒታል እንዳይጠፋ ይከላከላል
            expenses: [], 
            debts: [], 
            drawerLog: [], 
            history: [], 
            receipts: [], 
            deliveryOrders: [], 
            remoteCarts: {}, 
            accumulatedVat: preservedVat, // የተሰበሰበው ቫት እንዳይጠፋ ይከላከላል
            lastMonthlyResetDate: new Date().getTime(), 
            taxReceipts: [] 
        };
        
        saveAndRefresh(); checkMorningSession();
    });
}

function initChart() {
    let canvasElement = document.getElementById('businessChart');
    if (!canvasElement || currentUserRole === "staff") return;
    let ctx = canvasElement.getContext('2d');
    
    if (window.myChart) window.myChart.destroy();
    
    window.myChart = new Chart(ctx, {
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
        
        if(!name || packCount <= 0 || unitPerPack <= 0 || totalCost <= 0 || retailPrice <= 0) { 
            showCustomAlert("ስህተት", "እባክዎ የተሟላ እና ትክክለኛ መረጃ ያስገቡ!");
            return; 
        }

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

function deleteInventoryItem(idx) { 
    if(currentUserRole === "staff") return;
    showCustomConfirm("እቃ መሰረዣ", "ይህንን እቃ ማጥፋት ይፈልጋሉ?", () => { 
        currentTenant.data.inventory.splice(idx, 1); saveAndRefresh(); 
    });
}

// አከፋፋዮች 
let selectedSupplierItem = "";

// ሻጩ "ግዛ" የሚለውን በተን ሲነካ ፖፓፑን የሚከፍት ፋንክሽን
function openBuyPopup(itemName, price) {
    selectedSupplierItem = itemName;
    document.getElementById('modalItemDetail').innerText = "የተመረጠው እቃ፦ " + itemName + " (" + price + " ETB)";
    document.getElementById('supplierBuyModal').classList.remove('hidden');
}

// ትዕዛዙን አረጋግጦ ወደ አከፋፋዩ ዳሽቦርድ የሚልከው ፋንክሽን
function submitOrderToSupplier() {
    let qty = document.getElementById('orderQty').value;
    let country = document.getElementById('orderCountry').value;
    let phone = document.getElementById('orderPhone').value;
    let area = document.getElementById('orderArea').value;

    if(!qty || !country || !phone || !area) {
        return alert("እባክዎ ሁሉንም የመላኪያ መረጃዎች ያሟሉ!");
    }

    // እዚህ ጋ ወደፊት ከዳታቤዝ (Firebase) ጋር ሲገናኝ በቀጥታ ወደ አከፋፋዩ ገጽ ይልከዋል
    alert("ትዕዛዝዎ በተሳካ ሁኔታ ተላልፏል!\nእቃ፦ " + selectedSupplierItem + "\nብዛት፦ " + qty + "\nአድራሻ፦ " + area + "\nአከፋፋዩ መረጃውን አይቶ ያደርስልዎታል!");
    
    // ፎርሙን መዝጋት
    document.getElementById('supplierBuyModal').classList.add('hidden');
}

