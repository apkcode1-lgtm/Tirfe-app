window.saveAdminSystemSettings = function() {
    let tgToken = document.getElementById('adminTgToken').value.trim();
    let tgChatId = document.getElementById('adminTgChatId').value.trim();
    let bankAccount = document.getElementById('adminBankInfo').value.trim();

    if(!localDB.adminSettings) localDB.adminSettings = {};
    localDB.adminSettings.tgToken = tgToken;
    localDB.adminSettings.tgChatId = tgChatId;
    localDB.adminSettings.bankAccount = bankAccount;
    pushAdminFirebase();

    showCustomAlert("ተሳክቷል", "የዋና አከራይ ቴሌግራም እና ባንክ መረጃ በተሳካ ሁኔታ ተቀምጧል!");
};

window.openVATSettings = function() {
    let currentVat = (localDB.adminSettings && localDB.adminSettings.vatRate) ? localDB.adminSettings.vatRate : 0;

    showFormModal("🧾 የቫት (VAT) ማስተካከያ", [
        { id: "vatRate", label: "የቫት መጠን በመቶኛ (%) ያስገቡ፦", type: "number", placeholder: "ምሳሌ: 15", defaultValue: currentVat }
    ], (res) => {
        let vat = parseFloat(res.vatRate) || 0;
        if(!localDB.adminSettings) localDB.adminSettings = { tgToken: '', tgChatId: '', bankAccount: '', vatRate: 0, motorTariff: 0, deliveryCommissionRate: 10 };
        localDB.adminSettings.vatRate = vat;
        pushTenantFirebase();
        showCustomAlert("ተሳክቷል", `የቫት መጠን ወደ ${vat}% በተሳካ ሁኔታ ተስተካክሏል! ይህ መጠን በተከራዮች ገፅ ላይ ይታያል።`);
    });
};

window.openTariffSettings = function() {
    showFormModal("💰 የኪራይ ታሪፍ ማስተካከያ", [
        { id: "tariffTier", label: "የታሪፍ ደረጃ ይምረጡ", type: "select", options: [{value: "low", label: "ዝቅተኛ (Low)"}, {value: "medium", label: "መካከለኛ (Medium)"}, {value: "high", label: "ከፍተኛ (High)"}] },
        { id: "tariffAmount", label: "የብር መጠን ያስገቡ (ETB)", type: "number", placeholder: "0.00" }
    ], (res) => {
        if(!localDB.tariffs) localDB.tariffs = { low: 500, medium: 1000, high: 2000 };
        
        let oldAmount = localDB.tariffs[res.tariffTier];
        let newAmount = parseFloat(res.tariffAmount) || 0;
        
        localDB.tariffs[res.tariffTier] = newAmount; 
        
        let updatedCount = 0;
        if (localDB.tenants) {
            Object.keys(localDB.tenants).forEach(key => {
                if (localDB.tenants[key].registrationFee === oldAmount) {
                    localDB.tenants[key].registrationFee = newAmount;
                    updatedCount++;
                }
            });
        }
        
        pushTenantFirebase();
        renderAdminPanel(); 
        showCustomAlert("ተሳክቷል", `ታሪፉ ለ "${res.tariffTier}" በተሳካ ሁኔታ ወደ ${newAmount} ETB ተቀይሯል! አዲስ ሲመዘገቡ ይህ ዋጋ ይመጣል።\n\n${updatedCount > 0 ? `እንዲሁም ${updatedCount} ነባር ተከራዮች ላይ የታሪፍ ማስተካከያ ተደርጓል።` : ''}`);
    });
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

    if(localDB.businessTypes.includes(newType)) {
        showCustomAlert("ማሳሰቢያ", `"${newType}" የሚለው የንግድ ዘርፍ ከዚህ በፊት ተመዝግቧል! አዲስ ያስገቡ።`);
        return;
    }
    
    localDB.businessTypes.push(newType);
    pushTenantFirebase();
    if (typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
    renderBizTypesList();
    inputField.value = ''; 
};

window.deleteBizType = function(bizName) {
    showCustomConfirm("ማረጋገጫ", `እርግጠኛ ነዎት "${bizName}" የሚለውን የንግድ ዘርፍ ማጥፋት ይፈልጋሉ?`, () => {
        if(!localDB.businessTypes) return;
        localDB.businessTypes = localDB.businessTypes.filter(b => b !== bizName);
        pushToFirebase();
        if (typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
        renderBizTypesList();
    });
};

window.openAdminTenantEditor = function(user) {
    let t = localDB.tenants[user];
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
        t.shopName = res.shopName.trim();
        t.fullName = res.fullName.trim();
        t.phone = res.phone.trim(); t.telegram = res.telegram.trim();
        t.googleMapsLink = res.mapsLink.trim(); t.address = res.address.trim();
        t.businessType = res.businessType.trim();
        t.registrationFee = parseFloat(res.registrationFee) || 0;
        t.expiryDate = res.expiryDate;
        
        localDB.tenants[user] = t; pushTenantFirebase(); renderAdminPanel();
        showCustomAlert("ተሳክቷል", "የተከራዩ መረጃ በተሳካ ሁኔታ ተሻሽሏል!");
    });
}

window.toggleTenantListView = function() {
    let section = document.getElementById('adminTenantsSection');
    if(section) section.classList.toggle('hidden');
};

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
    ], async (res) => {
        let user = res.revUser.trim().toLowerCase();
        let email = (res.revEmail || "").trim();
        let pass = res.revPass;

        if(!user || !pass || !res.revName || !res.revRegion || !res.revZone || !res.revWoreda || !email) { 
            showCustomAlert("ስህተት", "እባክዎ መሠረታዊ መረጃዎችን (ኢሜልን ጨምሮ) ሙሉ በሙሉ ይሙሉ!"); return; 
        }

        if(!localDB.revenueAuthorities) localDB.revenueAuthorities = {};
        if(localDB.revenueAuthorities[user]) { showCustomAlert("ስህተት", "ይህ ዩዘርኔም አስቀድሞ ተይዟል!");
            return; }
        try {
            let userCredential = await auth.createUserWithEmailAndPassword(email, pass);
            localDB.revenueAuthorities[user] = {
                uid: userCredential.user.uid, // ለወደፊት ለማጥፋት እንዲረዳ UID እናስቀምጣለን
                username: user,
                authUser: user,
                authName: (res.revName || "").trim(),
                authPhone: (res.revPhone || "").trim(),
                authEmail: email,
                authPass: pass,
                authRegion: (res.revRegion || "").trim(),
                authZone: (res.revZone || "").trim(),
                authWoreda: (res.revWoreda || "").trim(),
                status: "active"
            };

            pushAdminRecordUpdate('revenueAuthorities', user, localDB.revenueAuthorities[user]);
            
            if(typeof updateAllLocationDropdowns === 'function') {
                updateAllLocationDropdowns();
            }

            showCustomAlert("✅ ተሳክቷል", "የገቢዎች ባለስልጣን አካውንት በተሳካ ሁኔታ ተመዝግቧል!");
            if(document.getElementById('adminRevenueSection') && !document.getElementById('adminRevenueSection').classList.contains('hidden')){
                renderAdminRevenueList();
            }
        } catch (error) {
            showCustomAlert("ስህተት", "አካውንት መፍጠር አልተሳካም (Firebase): " + error.message);
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
    showCustomConfirm("ገቢ ማጥፊያ", "ይህንን የገቢ ባለስልጣን አካውንት ሙሉ በሙሉ ማጥፋት ይፈልጋሉ?", async () => {
        let revRecord = localDB.revenueAuthorities[key];
        let authUid = revRecord.uid;
        
        if (authUid) {
            try {
                let response = await fetch('/api/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: authUid })
                });
                if(!response.ok) throw new Error("Backend API Error");
            } catch (error) {
                console.error("Firebase Auth delete failed:", error);
            }
        }
        
        // 🆕 ሌላ ገቢዎች ተመሳሳይ ቦታ ላይ ከሌለ ብቻ public_locations ያጥፋ
        let locKey = `${revRecord.authRegion}_${revRecord.authZone}_${revRecord.authWoreda}`;
        delete localDB.revenueAuthorities[key];
        pushAdminRecordDelete('revenueAuthorities', key);
        
        let stillUsedByOthers = Object.values(localDB.revenueAuthorities).some(r =>
            `${r.authRegion}_${r.authZone}_${r.authWoreda}` === locKey
        );
        if(!stillUsedByOthers) {
            delete localDB.public_locations[locKey];
            pushAdminRecordDelete('public_locations', locKey);
        }
        
        if(typeof updateAllLocationDropdowns === 'function') {
            updateAllLocationDropdowns();
        }

        renderAdminRevenueList();
        showCustomAlert("ተሳክቷል", "የገቢዎች ባለስልጣን አካውንት ሙሉ በሙሉ ጠፍቷል።");
    });
};

window.toggleAdminMotorsView = function() {
    let main = document.getElementById('adminDashboardMain');
    let section = document.getElementById('adminMotorsSection');
    if(main && section) {
        main.classList.toggle('hidden');
        section.classList.toggle('hidden');
        if(typeof renderAdminMotors === "function") renderAdminMotors();
    }
};

window.openMotorTariffSettings = function() {
    let currentComm = (localDB.adminSettings && localDB.adminSettings.deliveryCommissionRate) !== undefined ? localDB.adminSettings.deliveryCommissionRate : 10;
    
    showFormModal("🏍️ የሞተረኛ ኮሚሽን ማስተካከያ", [
        { id: "deliveryCommissionRate", label: "የሞተረኛ ኮሚሽን መጠን (%) ያስገቡ፦", type: "number", placeholder: "ምሳሌ: 10", defaultValue: currentComm }
    ], (res) => {
        let rate = parseFloat(res.deliveryCommissionRate) || 0;
        if(!localDB.adminSettings) localDB.adminSettings = { tgToken: '', tgChatId: '', bankAccount: '', vatRate: 0, motorTariff: 0, deliveryCommissionRate: 10 };
        localDB.adminSettings.deliveryCommissionRate = rate;
        pushMotorFirebase();
        showCustomAlert("ተሳክቷል", `የሞተረኛ ኮሚሽን መጠን ወደ ${rate}% በተሳካ ሁኔታ ተስተካክሏል! ይህ መጠን ሞተረኞች ክፍያ ሲቀበሉ ይቆረጣል።`);
    });
};

window.renderAdminMotors = function() {
    let tbody = document.getElementById('adminMotorsTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    if(!localDB.motors) localDB.motors = {};
    
    let query = document.getElementById('adminMotorSearchInput') ? document.getElementById('adminMotorSearchInput').value.trim().toLowerCase() : "";
    let hasData = false;
    Object.keys(localDB.motors).forEach(key => {
        let m = localDB.motors[key];
        if (query !== "" && !m.username.toLowerCase().includes(query)) return;
        hasData = true;

        let mName = `${m.firstName} ${m.lastName}`;
        let mContact = `📞 ${m.phone}<br>📧 ${m.email}`;
        let mLocation = `<b>ሰሌዳ:</b> ${m.plateNumber}<br>📍 ${m.region}/${m.zone}/${m.woreda}`;
        let creditDisp = `<br><span style="color: #f59e0b; font-weight: bold; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">💳 ክሬዲት: ${(m.credit || 0).toFixed(2)} ETB</span>`;
        
        let statusBadge = "";
        let actionText = "";
        let actionClass = "";

        if (m.status === "pending") {
            statusBadge = `<span class="badge-warning">Pending (በጥበቃ)</span>`;
            actionText = "✅ አጽድቅ (Approve)";
            actionClass = "btn-success";
        } else if (m.status === "active") {
            statusBadge = `<span class="badge-success">Active (ይሰራል)</span>`;
            actionText = "🚫 አግድ (Block)";
            actionClass = "btn-warning";
        } else {
            statusBadge = `<span class="badge-danger">Blocked (ታግዷል)</span>`;
            actionText = "🔓 ክፈት (Unblock)";
            actionClass = "btn-add";
        }

        tbody.innerHTML += `<tr>
            <td>👤 <b>${mName}</b><br><code>${m.username}</code>${creditDisp}</td>
            <td>${mContact}</td>
            <td>${mLocation}</td>
            <td>
                <button class="btn-config btn-sm" onclick="viewMotorDocs('${key}')">📄 ሰነዶች እይ</button>
            </td>
            <td>${statusBadge}</td>
            <td style="display:flex; gap:5px; flex-wrap:wrap;">
                <button class="${actionClass} btn-sm" onclick="toggleMotorStatus('${key}')">${actionText}</button>
                <button class="btn-expense btn-sm" onclick="deleteMotor('${key}')">🗑️ ሰርዝ</button>
            </td>
        </tr>`;
    });

    if(!hasData) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">ምንም የተመዘገበ ሞተረኛ የለም።</td></tr>`;
    }
};

window.toggleMotorStatus = function(username) {
    if(localDB.motors && localDB.motors[username]) {
        let m = localDB.motors[username];
        if (m.status === "pending" || m.status === "blocked") {
            m.status = "active";
        } else {
            m.status = "blocked";
        }
        
        pushAdminRecordUpdate('motors', username, m); 
        renderAdminMotors();
        showCustomAlert("ተስተካክሏል", "የሞተረኛው ሁኔታ በተሳካ ሁኔታ ተቀይሯል።");
    }
};

window.deleteMotor = function(username) {
    showCustomConfirm("ሞተረኛ ማጥፊያ", "ይህንን ሞተረኛ ሙሉ በሙሉ ለማጥፋት እርግጠኛ ኖት?", async () => { 
        let authUid = localDB.motors[username].uid;
        
        if (authUid) {
            try {
                let response = await fetch('/api/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: authUid })
                });
                if(!response.ok) throw new Error("Backend API Error");
            } catch (error) {
                console.error("Firebase Auth delete failed:", error);
            }
        }

        delete localDB.motors[username];
        pushAdminRecordDelete('motors', username);
        renderAdminMotors(); 
        showCustomAlert("ተሳክቷል", "ሞተረኛው ሙሉ በሙሉ ተሰርዟል።");
    });
};

window.viewMotorDocs = function(username) {
    if(localDB.motors && localDB.motors[username]) {
        let m = localDB.motors[username];
        let htmlContent = `
            <div style="text-align: center;">
                <h4 style="color:var(--accent-color); margin-bottom: 5px;">የነዋሪነት መታወቂያ</h4>
                <img src="${m.idCardImage}" style="max-width:100%; border-radius:8px; border:2px solid #38bdf8; margin-bottom: 15px; cursor: pointer;"
                onclick="viewImageFullscreen('${m.idCardImage}')">
                <h4 style="color:var(--accent-color); margin-bottom: 5px;">መንጃፍቃድ</h4>
                <img src="${m.licenseImage}" style="max-width:100%; border-radius:8px; border:2px solid #38bdf8; cursor: pointer;"
                onclick="viewImageFullscreen('${m.licenseImage}')">
                <p style="font-size: 0.8rem; color:#94a3b8; margin-top: 10px;">ለማጉላት ፎቶዎቹን ይጫኑ</p>
            </div>
        `;

        document.getElementById('alertTitle').innerText = `የ ${m.firstName} ሰነዶች`;
        document.getElementById('alertMessage').innerHTML = htmlContent;
        openModalContainer();
        document.getElementById('alertModal').classList.remove('hidden');
        document.querySelector('#alertModal .btn-add').onclick = function() { 
            closeActiveModal();
            document.getElementById('alertMessage').innerHTML = ""; 
        };
    }
};

window.renderAdminPanel = function() {
    if(localDB.adminSettings) {
        let tk = document.getElementById('adminTgToken');
        if(tk && tk.value==='') tk.value = localDB.adminSettings.tgToken || "";
        let ci = document.getElementById('adminTgChatId'); if(ci && ci.value==='') ci.value = localDB.adminSettings.tgChatId || "";
        let bi = document.getElementById('adminBankInfo'); if(bi && bi.value==='') bi.value = localDB.adminSettings.bankAccount || "";
        let ae = document.getElementById('adminEmailConfig');
        if(ae && ae.value==='') ae.value = localDB.adminSettings.adminEmail || "";
        let ap = document.getElementById('adminAppPassConfig'); if(ap && ap.value==='') ap.value = localDB.adminSettings.adminAppPass || "";
    }
    
    let tbody = document.getElementById('tenantTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    let query = document.getElementById('adminSearchInput') ? document.getElementById('adminSearchInput').value.trim().toLowerCase() : "";
    
    let totalTenants = 0; let activeTenants = 0;
    let totalFeesCollected = 0; let alertsHTML = '';
    let needsPush = false;
    
    Object.keys(localDB.tenants || {}).forEach(key => {
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
        
        let staffCnt = t.staffAccounts ? t.staffAccounts.length : 0;
        let loginInfo = `👤 አባል ስም: <code>${t.username}</code><br>🛠️ ሰራተኛ: <code>${staffCnt} የተመዘገቡ</code>`;
        
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
            </td>
        </tr>`;
    });

    let alertsContainer = document.getElementById('adminExpiryAlerts');
    if(alertsContainer) alertsContainer.innerHTML = alertsHTML;
    
    let totalTenantsElem = document.getElementById('adminTotalTenants');
    if(totalTenantsElem) totalTenantsElem.innerText = totalTenants;
    
    let activeTenantsElem = document.getElementById('adminActiveTenants');
    if(activeTenantsElem) activeTenantsElem.innerText = activeTenants;
    
    let totalFeesElem = document.getElementById('adminTotalFees');
    if(totalFeesElem) totalFeesElem.innerText = totalFeesCollected.toFixed(1) + " ETB";
    
    if(typeof renderAdminRevenueList === "function") renderAdminRevenueList();
    if(typeof renderAdminMotors === "function") renderAdminMotors();
    if(needsPush) pushToFirebase();
};
window.toggleTenantStatus = function(user) { 
    let t = localDB.tenants[user]; 
    t.status = t.status === "active" ? "blocked" : "active";
    pushAdminTenantUpdate(user, t); 
    renderAdminPanel();
};

window.deleteTenant = function(user) { 
    showCustomConfirm("ተከራይ ማጥፊያ", "ይህንን ተከራይ ሙሉ በሙሉ ለማጥፋት እርግጠኛ ኖት? እርምጃው አይቀለበስም።", async () => { 
        let authUid = localDB.tenants[user].uid;
        
        // ከ Firebase Authentication ላይ ለማጥፋት የ Backend API ን መጥራት
        if (authUid) {
            try {
                let response = await fetch('/api/delete-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: authUid })
                });
                if(!response.ok) throw new Error("Backend API Error");
            } catch (error) {
                console.error("Firebase Auth delete failed:", error);
                // Auth ማጥፋት ባይሳካም ዳታቤዙን ለማጥፋት ከፈለግክ ከስር ያለው ኮድ ይቀጥላል
            }
        }
        
        delete localDB.tenants[user]; 
        pushAdminTenantDelete(user); 
        renderAdminPanel(); 
        showCustomAlert("ተሳክቷል", "ተከራዩ ሙሉ በሙሉ ጠፍቷል።");
    });
};
