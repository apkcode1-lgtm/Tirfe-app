function logout() { currentTenant = null; currentRevenueOfficer = null; localStorage.removeItem('tirfe_active_session'); switchView('welcomeGateway'); }
function saveAndRefresh() { localDB.tenants[currentTenant.username] = currentTenant; saveToLocalStorage(); pushToFirebase(); renderApp(); checkTimeLock(); }

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

function renderHistoryTable() {
    let d = currentTenant.data || {}; let historyBody = document.getElementById('historyBody');
    historyBody.innerHTML = '<tr><th>ቀን/ዓይነት</th><th>ሰራተኛ/ወቅት</th><th>ሽያጭ</th><th>ትርፍ</th><th>ሪፖርት ካሽ</th><th>ልዩነት</th></tr>';
    let historyList = d.history || []; let filterValue = document.getElementById('historyDateFilter').value;
    let filtered = historyList.filter(h => { if(!filterValue) return true; return h.date === filterValue; });
    if(filtered.length === 0) { historyBody.innerHTML += '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">በተፈለገው ቀን ምንም ታሪክ የለም</td></tr>';
    } else {
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
    // እንዳይደገም (Double-click protection) እና Overwrite እንዳይሆን
    if (ord.status !== "pending") {
        showCustomAlert("ማሳሰቢያ", "ይህ ትዕዛዝ አስቀድሞ ተቀባይነት አግኝቷል!");
        return;
    }

    let item = currentTenant.data.inventory[ord.itemIdx];
    let neededMeters = item.isAdvanced && item.unitType !== 'kg' ? ord.qty * item.unitPerPack : ord.qty;
    if(item.qty - item.sold < neededMeters) { showCustomAlert("ስህተት", "ይህንን ትዕዛዝ ለማስተናገድ በቂ ክምችት የሎትም!"); return; }
    
    ord.status = "accepted";
    if(ord.transport === 'motor') {
        let matchedMotorsCount = 0;
        let poolId = "POOL_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
        ord.poolId = poolId;
        
        if(localDB.motors) {
            Object.keys(localDB.motors).forEach(mUser => {
                let motor = localDB.motors[mUser];
                if(motor.region === currentTenant.region && motor.zone === currentTenant.zone && motor.woreda === currentTenant.woreda) {
                    
                    let newOrderObj = {
                        poolId: poolId,
                        shopUsername: currentTenant.username,
                        shopName: currentTenant.shopName,
                        shopPhone: currentTenant.phone,
                        shopMap: currentTenant.googleMapsLink || "-",
                        buyerName: ord.buyerUser,
                        buyerPhone: ord.buyerPhone,
                        buyerMap: ord.mapLink || "-",
                        address: ord.address || "-",
                        itemName: ord.itemName,
                        qty: ord.qty,
                        totalPrice: ord.total,
                        deliveryFee: ord.deliveryFee || 0,
                        status: 'pending_motor'
                    };
                    
                    matchedMotorsCount++;

                    if(typeof isOnline !== 'undefined' && isOnline && typeof db !== 'undefined') {
                        // የተስተካከለ:- የሞተረኛውን አዲስ ትዕዛዞች (activeOrders) ብቻ ከፋየርቤዝ አውጥቶ ይጨምራል እንጂ የድሮውን መረጃ ደርቦ መላክ የለበትም
                        db.ref(`tirfe_system/motors/${mUser}/activeOrders`).once('value').then(snap => {
                            let liveOrders = snap.exists() ? (snap.val() || []) : [];
                            if(!Array.isArray(liveOrders)) {
                                liveOrders = Object.values(liveOrders);
                            }
                            liveOrders.push(newOrderObj);
                            db.ref(`tirfe_system/motors/${mUser}/activeOrders`).set(liveOrders).catch(err => console.error(err));
                        }).catch(err => console.error(err));
                    }
                    if (typeof sendMotorTelegramAlert === 'function') {
                        sendMotorTelegramAlert(mUser, `🔔 አዲስ የዴሊቨሪ ትዕዛዝ!\n\nሱቅ: ${currentTenant.shopName}\nአድራሻ: ${currentTenant.region} / ${currentTenant.zone} / ${currentTenant.woreda}\nዕቃ: ${ord.itemName} (ብዛት: ${ord.qty})\n\nእባክዎ ሲስተም ውስጥ ገብተው ትዕዛዙን ይቀበሉ።`);
                    }
                }
            });
        }
        
        if(matchedMotorsCount > 0) {
            showCustomAlert("ተቀብለዋል", `ትዕዛዙ ተቀባይነት አግኝቷል! በአካባቢዎ (ክልል/ዞን/ወረዳ) ለሚገኙ ${matchedMotorsCount} ሞተረኞች ጥሪ ተልኳል።`);
        } else {
            showCustomAlert("ማሳሰቢያ", "ትዕዛዙ ተቀባይነት አግኝቷል ነገር ግን በአካባቢዎ የተመዘገበ ሞተረኛ አልተገኘም።");
        }
    } else {
        showCustomAlert("ተቀብለዋል", "ትዕዛዙ ተቀባይነት አግኝቷል! እቃው በመንገድ ላይ ነው ተብሎ ምልክት ተደርጎበታል።");
    }

    saveAndRefresh();
};

window.completeDelivery = function(idx) {
    let ord = currentTenant.data.deliveryOrders[idx];
    // Double click protection
    if (ord.status === "completed") {
        showCustomAlert("ማሳሰቢያ", "ይህ ትዕዛዝ አስቀድሞ ተጠናቋል!");
        return;
    }

    let item = currentTenant.data.inventory[ord.itemIdx];
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

window.returnDelivery = function(idx) { 
    let ord = currentTenant.data.deliveryOrders[idx]; 
    if (ord.status === "returned") return;
    ord.status = "returned"; 
    saveAndRefresh(); 
    showCustomAlert("ተመልሷል", "እቃው ተመልሷል!"); 
};

window.handleRemoteCartCheckout = function(buyerUser) {
    let t = currentTenant.data;
    let remoteCart = t.remoteCarts[buyerUser];
    if(!remoteCart || remoteCart.length === 0) return;
    showCustomConfirm("ክፍያ መቀበያ (Remote Checkout)", `የ ${buyerUser} ትዕዛዝ ክፍያ ተቀብለዋል? ደረሰኝ ይቆረጥ?`, () => {
        // Double check condition to prevent overlapping
        if(!t.remoteCarts[buyerUser]) return;
        
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

