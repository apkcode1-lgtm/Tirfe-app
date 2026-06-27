window.saveAdminEmailSettings = function() {
    let email = document.getElementById('adminEmailConfig').value.trim();
    let pass = document.getElementById('adminAppPassConfig').value.trim();
    
    if(!localDB.adminSettings) localDB.adminSettings = {};
    localDB.adminSettings.adminEmail = email;
    localDB.adminSettings.adminAppPass = pass;
    
    pushToFirebase();
    showCustomAlert("ተሳክቷል", "የዋና አከራይ ኢሜል ማዋቀሪያ (SMTP) በተሳካ ሁኔታ ተቀምጧል!");
};

window.saveAdminSystemSettings = function() {
    let tgToken = document.getElementById('adminTgToken').value.trim();
    let tgChatId = document.getElementById('adminTgChatId').value.trim();
    let bankAccount = document.getElementById('adminBankInfo').value.trim();
    if(!localDB.adminSettings) localDB.adminSettings = {};
    localDB.adminSettings.tgToken = tgToken;
    localDB.adminSettings.tgChatId = tgChatId;
    localDB.adminSettings.bankAccount = bankAccount;
    pushToFirebase();
    showCustomAlert("ተሳክቷል", "የዋና አከራይ ቴሌግራም እና ባንክ መረጃ በተሳካ ሁኔታ ተቀምጧል!");
};

window.openVATSettings = function() {
    let currentVat = (localDB.adminSettings && localDB.adminSettings.vatRate) ? localDB.adminSettings.vatRate : 0;
    showFormModal("🧾 የቫት (VAT) ማስተካከያ", [
        { id: "vatRate", label: "የቫት መጠን በመቶኛ (%) ያስገቡ፦", type: "number", placeholder: "ምሳሌ: 15", defaultValue: currentVat }
    ], (res) => {
        let vat = parseFloat(res.vatRate) || 0;
        if(!localDB.adminSettings) localDB.adminSettings = { tgToken: '', tgChatId: '', bankAccount: '', vatRate: 0 };
        localDB.adminSettings.vatRate = vat;
        pushToFirebase();
        showCustomAlert("ተሳክቷል", `የቫት መጠን ወደ ${vat}% በተሳካ ሁኔታ ተስተካክሏል! ይህ መጠን በተከራዮች ገፅ ላይ ይታያል።`);
    });
};

window.openTariffSettings = function() {
    showFormModal("💰 የኪራይ ታሪፍ ማስተካከያ", [
        { id: "tariffTier", label: "የታሪፍ ደረጃ ይምረጡ", type: "select", options: [{value: "low", label: "ዝቅተኛ (Low)"}, {value: "medium", label: "መካከለኛ (Medium)"}, {value: "high", label: "ከፍተኛ (High)"}] },
        { id: "tariffAmount", label: "የብር መጠን ያስገቡ (ETB)", type: "number", placeholder: "0.00" }
    ], (res) => {
        if(!localDB.tariffs) localDB.tariffs = { low: 500, medium: 1000, high: 2000 };
        localDB.tariffs[res.tariffTier] = parseFloat(res.tariffAmount) || 0; 
        pushToFirebase();
        showCustomAlert("ተሳክቷል", `ታሪፉ ለ "${res.tariffTier}" በተሳካ ሁኔታ ወደ ${res.tariffAmount} ETB ተቀይሯል! አዲስ ሲመዘገቡ ይህ ዋጋ ይመጣል።`);
    });
};

/* --- የንግድ ዘርፍ ማስተዳደሪያ (Business Type Manager) --- */
window.populateAllBizTypeDropdowns = function() {
    let bizTypes = localDB.businessTypes || ["አጠቃላይ ንግድ"];
    let optionsHTML = `<option value="">-- የንግድ ዘርፍ ይምረጡ (ግዴታ) --</option>`;
    
    // Sort alphabetically for better UX
    let sortedBizTypes = [...bizTypes].sort((a, b) => a.localeCompare(b));
    sortedBizTypes.forEach(b => {
        optionsHTML += `<option value="${b}">${b}</option>`;
    });

    let pubSelect = document.getElementById('pub_newBusinessType');
    let adminSelect = document.getElementById('newBusinessType');
    
    if(pubSelect) {
        let currentVal = pubSelect.value;
        pubSelect.innerHTML = optionsHTML;
        if(currentVal && bizTypes.includes(currentVal)) pubSelect.value = currentVal;
    }
    
    if(adminSelect) {
        let currentVal = adminSelect.value;
        adminSelect.innerHTML = optionsHTML;
        if(currentVal && bizTypes.includes(currentVal)) adminSelect.value = currentVal;
    }
};

window.openBizTypeManager = function() {
    let modal = document.getElementById('bizTypeModal');
    if(modal) {
        modal.classList.remove('hidden');
        document.getElementById('modalOverlay').classList.remove('hidden');
        renderBizTypesList();
    }
};

window.renderBizTypesList = function() {
    let container = document.getElementById('bizTypeListContainer');
    if(!container) return;
    if(!localDB.businessTypes) localDB.businessTypes = ["አጠቃላይ ንግድ"];
    
    container.innerHTML = '';
    let sortedBizTypes = [...localDB.businessTypes].sort((a, b) => a.localeCompare(b));
    
    if(sortedBizTypes.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8; font-size:0.9rem;">ምንም የተመዘገበ የንግድ ዘርፍ የለም።</p>';
        return;
    }

    sortedBizTypes.forEach((b, index) => {
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 6px; margin-bottom: 5px;">
                <span style="color: white; font-weight: bold;">${b}</span>
                <button class="btn-expense btn-sm" onclick="deleteBizType('${b}')" style="padding: 4px 10px;">🗑️ አጥፋ</button>
            </div>
        `;
    });
};

window.addNewBizType = function() {
    let inputField = document.getElementById('newBizTypeName');
    let newType = inputField.value.trim();
    
    if(!newType) {
        showCustomAlert("ስህተት", "እባክዎ የንግድ ዘርፍ ስም ያስገቡ!");
        return;
    }
    
    if(!localDB.businessTypes) localDB.businessTypes = [];
    
    // Duplicate Check
    if(localDB.businessTypes.includes(newType)) {
        showCustomAlert("ማሳሰቢያ", `"${newType}" የሚለው የንግድ ዘርፍ ከዚህ በፊት ተመዝግቧል! አዲስ ያስገቡ።`);
        return;
    }
    
    localDB.businessTypes.push(newType);
    pushToFirebase();
    populateAllBizTypeDropdowns();
    renderBizTypesList();
    inputField.value = ''; // clear input
};

window.deleteBizType = function(bizName) {
    showCustomConfirm("ማረጋገጫ", `እርግጠኛ ነዎት "${bizName}" የሚለውን የንግድ ዘርፍ ማጥፋት ይፈልጋሉ?`, () => {
        if(!localDB.businessTypes) return;
        localDB.businessTypes = localDB.businessTypes.filter(b => b !== bizName);
        pushToFirebase();
        populateAllBizTypeDropdowns();
        renderBizTypesList();
    });
};

document.addEventListener('DOMContentLoaded', () => {
    // ፔጁ ሲከፈት የንግድ ዘርፎችን ወደ dropdowns ይጫናል
    setTimeout(populateAllBizTypeDropdowns, 1000); 
});
/* -------------------------------------------------------- */

function autoFillCapitalFee() {
    let capital = document.getElementById('newCapitalTier').value;
    let feeInput = document.getElementById('newRegistrationFee');
    let tariffs = localDB.tariffs || { low: 500, medium: 1000, high: 2000 };
    
    if (capital === 'low') feeInput.value = tariffs.low;
    else if (capital === 'medium') feeInput.value = tariffs.medium;
    else if (capital === 'high') feeInput.value = tariffs.high;
    else feeInput.value = '';
}

function registerTenant() {
    let shop = document.getElementById('newShopName').value.trim();
    let fullName = document.getElementById('newFullName').value.trim();
    let user = document.getElementById('newUsername').value.trim().toLowerCase();
    let phone = document.getElementById('newPhone').value.trim();
    let newEmail = document.getElementById('newEmail').value.trim();
    let telegram = document.getElementById('newTelegram').value.trim();
    let region = document.getElementById('newRegion').value.trim();
    let zone = document.getElementById('newZone').value.trim();
    let woreda = document.getElementById('newWoreda').value.trim();
    let kebele = document.getElementById('newKebele').value.trim();
    let houseNo = document.getElementById('newHouseNo').value.trim();
    let tinNum = document.getElementById('newTin').value.trim();
    let tradeReg = document.getElementById('newTradeReg').value.trim();
    let mapsLink = document.getElementById('newMapsLink').value.trim();
    let address = document.getElementById('newAddress').value.trim();
    let businessType = document.getElementById('newBusinessType').value.trim() || 'አጠቃላይ ንግድ';
    let registrationFee = parseFloat(document.getElementById('newRegistrationFee').value) || 0;
    let contractType = document.getElementById('newContractType').value;
    let expiryDate = document.getElementById('newExpiryDate').value;
    
    if(!shop || !user || !expiryDate || !fullName || !phone || !newEmail || !region || !zone || !woreda || !kebele || !houseNo || !tinNum || !tradeReg || !businessType) { 
        showCustomAlert("ስህተት", "እባክዎ መሠረታዊ እና አስገዳጅ መረጃዎችን ሙሉ በሙሉ ያሟሉ!");
        return; 
    }

    let checkUser = isSystemDataTaken(user, phone, "", "");
    if (checkUser) { showCustomAlert("⚠️ ምዝገባው አልተሳካም", checkUser); return; }

    pendingRegType = 'admin_tenant';
    triggerOTPFlow(newEmail);

    onVerifySuccess = () => {
        let fileInput = document.getElementById('newShopLogoFile');
        let file = fileInput.files[0];
        
        let proceedRegistration = function(shopLogoBase64) {
            let genCode = generateRandomCode();
            let timestampNow = new Date().getTime();
            localDB.tenants[user] = { 
                shopName: shop, fullName: fullName, phone: phone, telegram: telegram || "-", address: address || "-",
                businessType: businessType, googleMapsLink: mapsLink || "", shopLogo: shopLogoBase64 || "", gmail: newEmail,
                region: region, zone: zone, woreda: woreda, kebele: kebele, houseNo: houseNo, tinNumber: tinNum, tradeRegistration: tradeReg,
                username: user, password: genCode, activationCode: genCode, codeCreatedAt: timestampNow,
                isActivated: false, contractType: contractType, expiryDate: expiryDate, registrationFee: registrationFee,
                status: "active", theme: "theme-deepblue", staffAccounts: [],
                data: { sessionActive: false, shiftClosed: false, inventory: [], expenses: [], debts: [], drawerLog: [], history: [], receipts: [], deliveryOrders: [], remoteCarts: {}, accumulatedVat: 0, lastMonthlyResetDate: timestampNow } 
            };
            pushToFirebase(); renderAdminPanel();
            
            document.getElementById('newShopName').value = ''; document.getElementById('newFullName').value = '';
            document.getElementById('newUsername').value = ''; document.getElementById('newEmail').value = '';
            document.getElementById('newPhone').value = ''; document.getElementById('newTelegram').value = '';
            document.getElementById('newMapsLink').value = ''; document.getElementById('newAddress').value = ''; 
            document.getElementById('newBusinessType').value = ''; document.getElementById('newExpiryDate').value = '';
            document.getElementById('newRegistrationFee').value = ''; document.getElementById('newShopLogoFile').value = '';
            document.getElementById('newCapitalTier').value = '';
            document.getElementById('newRegion').value = ''; document.getElementById('newZone').value = '';
            document.getElementById('newWoreda').value = ''; document.getElementById('newKebele').value = '';
            document.getElementById('newHouseNo').value = '';
            document.getElementById('newTin').value = ''; document.getElementById('newTradeReg').value = '';
            
            showCustomAlert("ተሳክቷል", "አዲሱ ተከራይ በተሳካ ሁኔታ ተመዝግቧል! መግቢያ ኮዳቸው: " + genCode + " ነው::");
        };
        if(file) processImageUpload(file, proceedRegistration); else proceedRegistration("");
    };
}

function openAdminTenantEditor(user) {
    let t = localDB.tenants[user];
    
    // Dynamic Select options for business type
    let bizOptions = (localDB.businessTypes || ["አጠቃላይ ንግድ"]).map(b => ({ value: b, label: b }));

    showFormModal(`✍️ የተከራይ መረጃ ማሻሻያ (${t.shopName})`, [
        { id: "shopName", label: "የሱቅ ስም", type: "text", defaultValue: t.shopName },
        { id: "fullName", label: "የተከራይ ሙሉ ስም", type: "text", defaultValue: t.fullName },
        { id: "phone", label: "ስልክ ቁጥር", type: "text", defaultValue: t.phone },
        { id: "telegram", label: "ቴሌግራም", type: "text", defaultValue: t.telegram },
        { id: "mapsLink", label: "ጎግል ማፕ ሊንክ", type: "text", defaultValue: t.googleMapsLink || "" },
        { id: "address", label: "አድራሻ (ሀገር/ከተማ)", type: "text", defaultValue: t.address },
        { id: "businessType", label: "የንግድ ዘርፍ", type: "select", options: bizOptions, defaultValue: t.businessType || "አጠቃላይ ንግድ" },
        { id: "registrationFee", label: "የመመዝገቢያ/ኪራይ ክፍያ (ETB)", type: "number", defaultValue: t.registrationFee || 0 },
        { id: "expiryDate", label: "የውል ማብቂያ ቀን", type: "date", defaultValue: t.expiryDate }
    ], (res) => {
        t.shopName = res.shopName.trim(); t.fullName = res.fullName.trim();
        t.phone = res.phone.trim(); t.telegram = res.telegram.trim();
        t.googleMapsLink = res.mapsLink.trim(); t.address = res.address.trim();
        t.businessType = res.businessType.trim(); t.registrationFee = parseFloat(res.registrationFee) || 0;
        t.expiryDate = res.expiryDate;
        
        localDB.tenants[user] = t; pushToFirebase(); renderAdminPanel();
        showCustomAlert("ተሳክቷል", "የተከራዩ መረጃ በተሳካ ሁኔታ ተሻሽሏል!");
    });
}

window.toggleAdminBuyersView = function() {
    let main = document.getElementById('adminDashboardMain'); let section = document.getElementById('adminBuyersSection');
    if(main && section) { main.classList.toggle('hidden'); section.classList.toggle('hidden'); renderAdminBuyers(); }
};

window.toggleTenantListView = function() {
    let section = document.getElementById('adminTenantsSection');
    if(section) section.classList.toggle('hidden');
};

/* --- የገቢዎች (Revenue) ሲስተም አስተዳደር --- */
window.toggleAdminRevenueView = function() {
    let main = document.getElementById('adminDashboardMain');
    let section = document.getElementById('adminRevenueSection');
    if(main && section) {
        main.classList.toggle('hidden');
        section.classList.toggle('hidden');
        if(typeof renderAdminRevenueList === "function") renderAdminRevenueList();
    }
};

window.openRevenueRegistrationModal = function() {
    showFormModal("🏛️ አዲስ የገቢዎች ባለስልጣን መመዝገቢያ", [
        { id: "revName", label: "የባለስልጣኑ ሙሉ ስም", type: "text" },
        { id: "revUser", label: "መግቢያ ስም (Username)", type: "text" },
        { id: "revPhone", label: "ስልክ ቁጥር (ግዴታ 10 አሃዝ)", type: "tel" },
        { id: "revEmail", label: "ኢሜል (Gmail)", type: "email" },
        { id: "revPass", label: "የይለፍ ቃል (Password)", type: "password" },
        { id: "revRegion", label: "የሚቆጣጠረው ክልል", type: "text" },
        { id: "revZone", label: "ዞን", type: "text" },
        { id: "revWoreda", label: "ወረዳ", type: "text" }
    ], (res) => {
        let user = res.revUser.trim().toLowerCase();
        if(!user || !res.revPass || !res.revName || !res.revRegion || !res.revZone || !res.revWoreda) { 
            showCustomAlert("ስህተት", "እባክዎ መሠረታዊ መረጃዎችን ይሙሉ!"); return; 
        }

        if(!localDB.revenueAuthorities) localDB.revenueAuthorities = {};
 
        if(localDB.revenueAuthorities[user]) { showCustomAlert("ስህተት", "ይህ ዩዘርኔም አስቀድሞ ተይዟል!"); return; }

        localDB.revenueAuthorities[user] = {
            username: user,
            authUser: user,
            authName: (res.revName || "").trim(),
            authPhone: (res.revPhone || "").trim(),
            authEmail: (res.revEmail || "").trim(),
            authPass: res.revPass,
            authRegion: (res.revRegion || "").trim(),
            authZone: (res.revZone || "").trim(),
            authWoreda: (res.revWoreda || "").trim(),
            status: "active"
        };
        pushToFirebase();
        
        // ምርጫዎቹ ሪፍሬሽ ሳይደረግ ወዲያውኑ ለተከራይ እንዲታዩ መላክ
        if(typeof updateAllLocationDropdowns === 'function') {
            updateAllLocationDropdowns();
        }

        showCustomAlert("✅ ተሳክቷል", "የገቢዎች ባለስልጣን አካውንት በተሳካ ሁኔታ ተመዝግቧል!");
        if(document.getElementById('adminRevenueSection') && !document.getElementById('adminRevenueSection').classList.contains('hidden')){
            renderAdminRevenueList();
        }
    });
};

window.renderAdminRevenueList = function() {
    let tbody = document.getElementById('adminRevenueTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    if(!localDB.revenueAuthorities) localDB.revenueAuthorities = {};

    let hasData = false;
    Object.keys(localDB.revenueAuthorities).forEach(key => {
        hasData = true;
        let r = localDB.revenueAuthorities[key];
        let rName = r.authName || '-';
        let rContact = `📞 ${r.authPhone || '-'}<br>📧 ${r.authEmail || '-'}`;
        let rRegion = `${r.authRegion || '-'}/${r.authZone || '-'}/${r.authWoreda || '-'}`;

        tbody.innerHTML += `<tr>
            <td>👤 <b>${rName}</b><br><code>${key}</code></td>
            <td>${rContact}</td>
            <td>${rRegion}</td>
            <td>
                <button class="btn-expense btn-sm" onclick="deleteRevenueAuth('${key}')">🗑️ አጥፋ</button>
            </td>
        </tr>`;
    });
    if(!hasData) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">ምንም የተመዘገበ የገቢዎች ባለስልጣን የለም።</td></tr>`;
    }
};

window.deleteRevenueAuth = function(key) {
    showCustomConfirm("ገቢ ማጥፊያ", "ይህንን የገቢ ባለስልጣን አካውንት ማጥፋት ይፈልጋሉ?", () => {
        delete localDB.revenueAuthorities[key];
        pushToFirebase();
        
        // ዳታው ሲጠፋ ምርጫውም አብሮ እንዲስተካከል
        if(typeof updateAllLocationDropdowns === 'function') {
            updateAllLocationDropdowns();
        }

        renderAdminRevenueList();
    });
};
/* ---------------------------------------------------- */

function renderAdminPanel() {
    if(localDB.adminSettings) {
        let tk = document.getElementById('adminTgToken'); if(tk && tk.value==='') tk.value = localDB.adminSettings.tgToken || "";
        let ci = document.getElementById('adminTgChatId'); if(ci && ci.value==='') ci.value = localDB.adminSettings.tgChatId || "";
        let bi = document.getElementById('adminBankInfo'); if(bi && bi.value==='') bi.value = localDB.adminSettings.bankAccount || "";
        let ae = document.getElementById('adminEmailConfig'); if(ae && ae.value==='') ae.value = localDB.adminSettings.adminEmail || "";
        let ap = document.getElementById('adminAppPassConfig'); if(ap && ap.value==='') ap.value = localDB.adminSettings.adminAppPass || "";
    }
    
    let tbody = document.getElementById('tenantTableBody');
    tbody.innerHTML = '';
    let query = document.getElementById('adminSearchInput') ? document.getElementById('adminSearchInput').value.trim().toLowerCase() : "";
    let totalTenants = 0; let activeTenants = 0;
    let totalFeesCollected = 0; let alertsHTML = '';
    let needsPush = false;
    
    Object.keys(localDB.tenants).forEach(key => {
        let t = localDB.tenants[key]; totalTenants++;
        if (t.status === "active") activeTenants++;
        totalFeesCollected += (parseFloat(t.registrationFee) || 0);

        if(t.status === "active" && t.expiryDate) {
            let exp = new Date(t.expiryDate); let now = new Date(); let diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
          
            if(diff <= 5 && diff >= 0) {
                alertsHTML += `<div style="background:rgba(244,63,94,0.1); border:1px solid var(--danger-color); padding:10px; border-radius:8px; margin-bottom:10px; color:var(--danger-color);">⚠️ <b>ማሳሰቢያ፡</b> የተከራይ <b>${t.shopName} (${t.fullName})</b> ውል ሊያልቅ <b>${diff}</b> ቀን ይቀረዋል! እባክዎ ያነጋግሯቸው።</div>`;
                if(!t.expiryNotified) {
                    sendAdminTelegramAlert(`⚠️ የውል ማብቂያ ማሳወቂያ!\n\nየተከራይ ውል ሊያልቅ ${diff} ቀን ብቻ ቀርቶታል!\n\n👤 ስም: ${t.fullName}\n🔑 ዩዘርኔም: ${t.username}\n📞 ስልክ: ${t.phone}\n✈️ ቴሌግራም: ${t.telegram || "አልገባም"}`);
                    t.expiryNotified = true; localDB.tenants[key] = t;
                    needsPush = true;
                }
            } else if (diff > 5 && t.expiryNotified) {
                t.expiryNotified = false;
                localDB.tenants[key] = t; needsPush = true;
            }
        }

        if (query !== "" && !t.username.toLowerCase().includes(query)) return;
        let statusBadge = t.status === "active" ? `<span class="badge-success">Active</span>` : `<span class="badge-danger">Blocked</span>`;
        let profileInfo = `👤 <b>${t.fullName || '-'}</b><br>📞 ${t.phone || '-'}<br>📍 ${t.address || '-'}<br>✈️ ${t.telegram || '-'}`;
        let codeDisplay = "";
        if (!t.isActivated) { 
            codeDisplay = `⏱️ ጊዜያዊ ኮድ: <b class="text-warning" style="font-size:1.1rem; background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:4px;">${t.activationCode}</b>`;
        } else { 
            codeDisplay = `<span class="text-success">🔒 ተከራዩ የራሱን ምስጢር ቆልፏል</span>`;
        }
        
        let staffCnt = t.staffAccounts ? t.staffAccounts.length : 0;
        let loginInfo = `👤 አባል ስም: <code>${t.username}</code><br>${codeDisplay}<br>🛠️ ሰራተኛ: <code>${staffCnt} የተመዘገቡ</code>`;
        let contractDisplay = `<span>${t.contractType || 'በወር'}</span><br><b class="text-warning">${t.registrationFee || 0} ETB</b>`;
        let bType = t.businessType || 'አጠቃላይ ንግድ';
        tbody.innerHTML += `<tr>
            <td><b>${t.shopName}</b><br><span style="color:var(--accent-color); font-size:0.8rem;">[${bType}]</span></td>
            <td>${profileInfo}</td><td>${loginInfo}</td><td>${contractDisplay}</td>
            <td style="color:var(--danger-color)"><b>${t.expiryDate || '-'}</b></td><td>${statusBadge}</td>
            <td>
                <button class="btn-add btn-sm" onclick="openAdminTenantEditor('${t.username}')">✍️ አሻሽል</button>
                <button class="btn-config btn-sm" onclick="toggleTenantStatus('${t.username}')">ሁኔታ ቀይር</button>
                <button class="btn-expense btn-sm" onclick="deleteTenant('${t.username}')">Delete</button>
                <button class="btn-add btn-sm" style="margin-top:4px;" onclick="regenerateTenantCode('${t.username}')">🔄 አዲስ ኮድ</button>
            </td>
        </tr>`;
    });

    document.getElementById('adminExpiryAlerts').innerHTML = alertsHTML;
    document.getElementById('adminTotalTenants').innerText = totalTenants;
    document.getElementById('adminActiveTenants').innerText = activeTenants;
    document.getElementById('adminTotalFees').innerText = totalFeesCollected.toFixed(1) + " ETB";
    document.getElementById('adminTotalBuyers').innerText = Object.keys(localDB.buyers || {}).length;
    
    renderAdminBuyers();
    if(typeof renderAdminRevenueList === "function") renderAdminRevenueList();
    if(needsPush) pushToFirebase();
}

window.deleteBuyer = function(username) {
    showCustomConfirm("ገዥ ማጥፊያ", "ይህንን ገዥ ማጥፋት ይፈልጋሉ?", () => { delete localDB.buyers[username]; pushToFirebase(); renderAdminBuyers(); });
};

function renderAdminBuyers() {
    let tbody = document.getElementById('adminBuyersTableBody'); if(!tbody) return;
    tbody.innerHTML = ''; if(!localDB.buyers) return;
    Object.values(localDB.buyers).forEach(b => {
        let status = b.status === "blocked" ? '<span class="badge-danger">Blocked / ታግዷል</span>' : '<span class="badge-success">Active / ይሰራል</span>';
        let actionText = b.status === "blocked" ? "Unblock" : "Block";
        let actionClass = b.status === "blocked" ? "btn-add" : "btn-warning";
        tbody.innerHTML += `<tr>
            <td>👤 ${b.username}</td><td>📞 ${b.phone}</td><td>${status}</td>
            <td style="display:flex; gap:5px;">
                <button class="${actionClass} btn-sm" onclick="toggleBuyerStatus('${b.username}')">🚫 ${actionText}</button>
                <button class="btn-expense btn-sm" onclick="deleteBuyer('${b.username}')">🗑️ አጥፋ</button>
            </td>
        </tr>`;
    });
}

window.toggleBuyerStatus = function(username) {
    if(localDB.buyers && localDB.buyers[username]) {
        let b = localDB.buyers[username];
        b.status = b.status === "blocked" ? "active" : "blocked";
        pushToFirebase(); renderAdminBuyers(); showCustomAlert("ተስተካክሏል", "የገዥው መረጃ ሁኔታ ተቀይሯል።");
    }
};

function regenerateTenantCode(user) {
    let t = localDB.tenants[user]; let newCode = generateRandomCode();
    t.activationCode = newCode; t.password = newCode;
    t.codeCreatedAt = new Date().getTime(); t.isActivated = false; 
    localDB.tenants[user] = t; pushToFirebase(); renderAdminPanel();
    showCustomAlert("ኮድ ተለውጧል", `ለተከራዩ አዲስ ኮድ ተፈጥሯል፦ ${newCode}`);
}

function toggleTenantStatus(user) { 
    let t = localDB.tenants[user]; t.status = t.status === "active" ? "blocked" : "active";
    pushToFirebase(); renderAdminPanel();
}

function deleteTenant(user) { 
    showCustomConfirm("ተከራይ ማጥፊያ", "ይህንን ተከራይ ሙሉ በሙሉ ለማጥፋት እርግጠኛ ኖት?", () => { delete localDB.tenants[user]; pushToFirebase(); renderAdminPanel(); });
}
