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
    if(tenant.status === "blocked") { 
        errorElement.innerText = "🔒 አካውንትዎ ታግዷል!"; return true;
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

window.openStaffManagement = function() {
    if(!currentTenant.staffAccounts) {
        currentTenant.staffAccounts = [];
        if(currentTenant.staffUser && currentTenant.staffPass) {
            currentTenant.staffAccounts.push({ name: "ነባር ሰራተኛ", gmail: "", phone: "", user: currentTenant.staffUser, pass: currentTenant.staffPass });
        }
    }
    tempStaffForms = JSON.parse(JSON.stringify(currentTenant.staffAccounts));
    if(tempStaffForms.length === 0) { tempStaffForms.push({ name: "", gmail: "", phone: "", user: "", pass: "" }); }
    
    renderStaffForms(); openModalContainer();
    document.querySelectorAll('.modal-card').forEach(m => m.classList.add('hidden'));
    document.getElementById('staffManageModal').classList.remove('hidden');
};

window.addStaffFormRow = function() {
    if(tempStaffForms.length >= 3) { 
        showCustomAlert("ማሳሰቢያ", "ከ 3 ሰራተኛ በላይ በአንድ ጊዜ መመዝገብ አይቻልም!");
        return; 
    }
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
            <input type="text" id="s_pass_${idx}" placeholder="የይለፍ ቃል (Password)" value="${s.pass && s.pass.length === 64 ? '********' : s.pass}">
        </div>`;
    });
};

window.saveAllStaff = async function() {
    for(let i=0; i<tempStaffForms.length; i++) {
        tempStaffForms[i].name = document.getElementById(`s_name_${i}`).value.trim();
        tempStaffForms[i].gmail = document.getElementById(`s_gmail_${i}`).value.trim();
        tempStaffForms[i].phone = document.getElementById(`s_phone_${i}`).value.trim();
        tempStaffForms[i].user = document.getElementById(`s_user_${i}`).value.trim().toLowerCase();
        
        let enteredPass = document.getElementById(`s_pass_${i}`).value.trim();
        
        if(!tempStaffForms[i].name || !tempStaffForms[i].phone || !tempStaffForms[i].user || !enteredPass) {
            showCustomAlert("ስህተት", `እባክዎ ለሰራተኛ ${i+1} አስፈላጊ መረጃዎችን ይሙሉ!`);
            return;
        }
        let takenMsg = await isSystemDataTaken(tempStaffForms[i].user, tempStaffForms[i].phone, currentTenant.username, "");
        if (takenMsg) { 
            showCustomAlert("ስህተት", `ሰራተኛ ${i+1}: ${takenMsg}`);
            return; 
        }

        for(let j=0; j<i; j++) {
            if(tempStaffForms[j].user === tempStaffForms[i].user) { 
                showCustomAlert("ስህተት", "ዩዘርኔም በፎርሙ ውስጥ ተደግሟል!");
                return; 
            }
            if(tempStaffForms[j].phone === tempStaffForms[i].phone) { 
                showCustomAlert("ስህተት", "ስልክ ቁጥር በፎርሙ ውስጥ ተደግሟል!");
                return; 
            }
        }

        if (enteredPass && enteredPass !== '********' && enteredPass.length !== 64) {
            tempStaffForms[i].rawPass = enteredPass;
            tempStaffForms[i].pass = await hashPassword(enteredPass);
        } else if (enteredPass === '********') {
            tempStaffForms[i].pass = currentTenant.staffAccounts[i].pass;
        } else {
            tempStaffForms[i].pass = enteredPass;
        }
    }
    
    for(let i=0; i<tempStaffForms.length; i++) {
        let staff = tempStaffForms[i];
        if (staff.gmail && staff.rawPass) {
            try {
                await auth.createUserWithEmailAndPassword(staff.gmail, staff.rawPass);
            } catch (fbErr) {
                console.warn(`Staff Firebase Auth creation failed for ${staff.gmail}: ${fbErr.message}`);
            }
            delete staff.rawPass;
        }
    }

    currentTenant.staffAccounts = tempStaffForms;
    saveAndRefresh(); closeActiveModal();
    
    if(isOnline && typeof db !== 'undefined') {
        tempStaffForms.forEach(staff => {
            if(staff.user && staff.pass) {
                db.ref(`tirfe_system/staffAccounts/${staff.user}`).set({
                    name: staff.name,
                    gmail: staff.gmail,
                    phone: staff.phone,
                    user: staff.user,
                    pass: staff.pass,
                    tenantUsername: currentTenant.username
                }).catch(err => console.error("Staff Save Error:", err));
            }
        });
    }

    showCustomAlert("ተሳክቷል", "የሰራተኞች መረጃ በተሳካ ሁኔታ ተመዝግቧል!");
};

function configureBank() {
    if(currentUserRole === "staff") { 
        showCustomAlert("🏦 የባንክ ሂሳብ መረጃ", `የአሰሪው የባንክ ሂሳብ ቁጥር (CBE/Telebirr)፦ ${currentTenant.bankAccount || "ያልተገናኘ"}`);
        return; 
    }
    
    showFormModal("🏦 የባንክ እና የቴሌግራም አገናኝ መቼት", [
        { id: "telegramToken", label: "የቴሌግራም ቦት ቶከን (Telegram Bot Token)", type: "text", placeholder: "Token...", defaultValue: currentTenant.telegramToken || "" },
        { id: "telegramChatId", label: "የቴሌግራም ቻት ID (Telegram Chat ID)", type: "text", placeholder: "Chat ID...", defaultValue: currentTenant.telegramChatId || "" },
        { id: "bankAccountNumber", label: "የባንክ ሂሳብ ቁጥር (CBE/Telebirr)", type: "text", placeholder: "የባንክ ቁጥር...", defaultValue: currentTenant.bankAccount || "" }
    ], (res) => {
        currentTenant.telegramToken = res.telegramToken.trim(); currentTenant.telegramChatId = res.telegramChatId.trim(); currentTenant.bankAccount = res.bankAccountNumber.trim();
        saveAndRefresh(); showCustomAlert("ተሳክቷል", "የማያያዣ መቼቶች በተሳካ ሁኔታ ተቀምጠዋል!");
    });
}
// የዕለቱን ሂሳብ መዝጊያ ሪፖርት የሚያስነሳ ፋንክሽን (ይህን መጨረሻ ላይ ይጨምሩ)
window.triggerShiftReport = function() {
    // እርግጠኛ መሆንዎን የሚጠይቅ መልዕክት
    if(typeof showCustomAlert === 'function') {
        showCustomAlert("ሪፖርት", "የዕለት ሂሳብ መዝጊያ ሂደት ተጀምሯል...");
    } else {
        alert("የዕለት ሂሳብ መዝጊያ ሂደት ተጀምሯል...");
    }
    
    // ማሳሰቢያ፦ የሪፖርት ማቅረቢያ ዋናውን ኮድ (ሂሳብ ማስላቱን እና ሪፖርት መላኩን) እዚህ ውስጥ ይፃፉ።
};
window.logout = function() {
    // 1. መውጣቱን ለተጠቃሚው ማሳወቅ (አማራጭ)
    console.log("ከሲስተም እየወጣ ነው...");

    // 2. ከፋየርቤዝ (Firebase) አገልጋይ ላይ ደህንነቱ በተጠበቀ ሁኔታ ሳይን አውት ማድረግ
    if (typeof auth !== 'undefined' && auth.signOut) {
        auth.signOut().then(() => {
            // ፋየርቤዝ በተሳካ ሁኔታ ካስወጣ በኋላ ወደ ሆም ፔጅ ይመልሳል
            window.location.replace("index.html");
        }).catch((error) => {
            console.error("በመውጣት ሂደት ላይ ስህተት ተፈጥሯል:", error);
            // ስህተት ቢፈጠርም አፑ እንዳይፈዝዝ በግድ ወደ ሆም ፔጅ ይመልሳል
            window.location.replace("index.html");
        });
    } else {
        // የፋየርቤዝ ግንኙነት ከሌለ ወይም ቀጥታ ለሚሰሩ (Offline)
        window.location.replace("index.html");
    }
};


