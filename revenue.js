window.saveRevenueProfileData = function() {
    if(!currentRevenueOfficer) return;
    let nName = document.getElementById('revOfficerName').value.trim();
    let nEmail = document.getElementById('revOfficerEmail').value.trim();
    let nPass = document.getElementById('revOfficerPassword').value.trim();

    if(nName) currentRevenueOfficer.authName = nName;
    if(nEmail) currentRevenueOfficer.authEmail = nEmail;
    if(nPass) currentRevenueOfficer.authPass = nPass;
    let targetUser = currentRevenueOfficer.authUser || currentRevenueOfficer.username;
    localDB.revenueAuthorities[targetUser] = currentRevenueOfficer;
    pushToFirebase();
    
    document.getElementById('revenueProfileSettingsCard').classList.add('hidden');
    renderRevenuePanel();
    showCustomAlert("ተሳክቷል", "የፕሮፋይል መረጃዎ (ስም፣ ኢሜል እና የይለፍ ቃል) በተሳካ ሁኔታ ተስተካክሏል!");
};

function renderRevenuePanel() {
    if(!currentRevenueOfficer) return;
    document.getElementById('revOfficerName').value = currentRevenueOfficer.authName || "";
    document.getElementById('revOfficerEmail').value = currentRevenueOfficer.authEmail || "";
    document.getElementById('revOfficerPassword').value = currentRevenueOfficer.authPass || "";
    document.getElementById('revenueOfficerProfile').innerText = `👤 ስም: ${currentRevenueOfficer.authName} | 📍 ምድብ: ${currentRevenueOfficer.authRegion} / ${currentRevenueOfficer.authZone} / ${currentRevenueOfficer.authWoreda}`;
    
    let mSum = currentRevenueOfficer.monthlyVat || 0;
    let aSum = currentRevenueOfficer.annualVat || 0;
    document.getElementById('revenueMonthlyVatSum').innerText = mSum.toFixed(2) + " ETB";
    document.getElementById('revenueAnnualVatSum').innerText = aSum.toFixed(2) + " ETB";
    let tbody = document.getElementById('revenueTenantsBody');
    tbody.innerHTML = '';
    let count = 0;
    if(localDB.tenants) {
        Object.values(localDB.tenants).forEach(t => {
            // ተከራዮችን በትክክል በየምድባቸው (ክልል፣ ዞን፣ ወረዳ) ማጣራት
            if(t.region === currentRevenueOfficer.authRegion &&
               t.zone === currentRevenueOfficer.authZone &&
               t.woreda === currentRevenueOfficer.authWoreda) {
            
       
                count++;
                let accumulatedVat = (t.data && t.data.accumulatedVat) ? parseFloat(t.data.accumulatedVat) : 0;
                let businessTypeDisplay = t.businessType || 'አጠቃላይ ንግድ';
                let gmailDisplay = t.gmail || 'አልገባም';
                
       
                tbody.innerHTML += `<tr>
                    <td><b>${t.fullName}</b><br><small style="color:var(--accent-color)">${t.shopName} | ${businessTypeDisplay}</small></td>
                    <td>📞 ${t.phone}<br>📧 ${gmailDisplay}</td>
                    <td>${t.region} / ${t.zone} / ${t.woreda}</td>
                    <td>${t.kebele} / ${t.houseNo}</td>
                    <td style="color:var(--warning-color); font-weight:bold;">${t.tinNumber}</td>
                    <td style="color:var(--warning-color); font-weight:bold;">${accumulatedVat.toFixed(2)} ETB</td>
                    <td><button class="btn-success btn-sm" onclick="payTenantVat('${t.username}')">ክፈል (Pay)</button></td>
                </tr>`;
            }
        });
    }
    
    if(count === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">በእርስዎ ምድብ የተመዘገበ ግብር ከፋይ (ተከራይ) እስካሁን የለም።</td></tr>`;
    }
}

window.payTenantVat = function(username) {
    let t = localDB.tenants[username];
    if(!t || !t.data) return;
    let vatToPay = parseFloat(t.data.accumulatedVat) || 0;
    
    if(vatToPay <= 0) {
        showCustomAlert("ማሳሰቢያ", "ይህ ነጋዴ የሚከፍለው የተሰበሰበ የቫት መጠን የለበትም (0.00 ETB)።");
        return;
    }
    
    showCustomConfirm("ክፍያ ማረጋገጫ", `ከ ${t.fullName} (${t.shopName}) የተሰበሰበውን የቫት መጠን ${vatToPay.toFixed(2)} ETB መቀበልዎን እርግጠኛ ኖት?`, () => {
        if(!currentRevenueOfficer.monthlyVat) currentRevenueOfficer.monthlyVat = 0;
        if(!currentRevenueOfficer.annualVat) currentRevenueOfficer.annualVat = 0;

        currentRevenueOfficer.monthlyVat += vatToPay;
        currentRevenueOfficer.annualVat += vatToPay;
        
        let targetUser = currentRevenueOfficer.authUser || currentRevenueOfficer.username;
        localDB.revenueAuthorities[targetUser] = currentRevenueOfficer;

        // --- አዲሱ የግብር ደረሰኝ (Tax Receipt) ሎጂክ እዚህ ይገባል ---
        let recId = Math.floor(100000 + Math.random() * 900000);
        let todayDate = typeof getTodayFormatted === 'function' ? getTodayFormatted() : new Date().toISOString().split('T')[0];
        
        let newTaxReceipt = {
            recId: recId,
            date: todayDate,
            amount: vatToPay,
            officerName: currentRevenueOfficer.authName || "ያልተመዘገበ",
            officerPhone: currentRevenueOfficer.authPhone || "-",
            officerRegion: currentRevenueOfficer.authRegion || "-",
            officerZone: currentRevenueOfficer.authZone || "-",
            officerWoreda: currentRevenueOfficer.authWoreda || "-",
            tenantName: t.fullName || "-",
            tenantShop: t.shopName || "-",
            tenantPhone: t.phone || "-",
            tenantTin: t.tinNumber || "-",
            reason: "የቫት (VAT) ግብር ክፍያ"
        };

        if(!t.data.taxReceipts) t.data.taxReceipts = [];
        t.data.taxReceipts.push(newTaxReceipt);

        if(!localDB.taxReceipts) localDB.taxReceipts = [];
        localDB.taxReceipts.push(newTaxReceipt);
        // ----------------------------------------------------

        t.data.accumulatedVat = 0;
        localDB.tenants[username] = t;
    
        pushToFirebase();
        renderRevenuePanel();
        showCustomAlert("ተሳክቷል", "ክፍያው በተሳካ ሁኔታ ተሰብስቧል! የነጋዴው የተሰበሰበ ቫት 0.00 ሆኗል፤ እንዲሁም የግብር ደረሰኝ አውቶማቲክ ወደ ተከራዩ ተልኳል።");
    });
};

window.closeRevenueBudgetAnnual = function() {
    showCustomConfirm("በጀት መዝጊያ", "በእርግጥ የአመቱን በጀት መዝጋት ይፈልጋሉ? ይህ ድርጊት የወሩን እና የአመቱን የቫት ድምር ወደ 0.00 ይመልሰዋል።", () => {
        if(currentRevenueOfficer) {
            currentRevenueOfficer.monthlyVat = 0;
            currentRevenueOfficer.annualVat = 0;
            
            let targetUser = currentRevenueOfficer.authUser || currentRevenueOfficer.username;
        
            localDB.revenueAuthorities[targetUser] = currentRevenueOfficer;
            
            pushToFirebase();
            renderRevenuePanel();
            showCustomAlert("በጀት ተዘግቷል", "የአመቱ የቫት በጀት በተሳካ ሁኔታ ተዘግቶ ወደ 0.00 ተመልሷል።");
        }
    });
};
