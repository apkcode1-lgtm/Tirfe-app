function logoutBuyer() {
    currentBuyer = null;
    localStorage.removeItem('tirfe_active_session');
    switchView('welcomeGateway');
}

window.openBuyerProfileSettings = function() {
    if(!currentBuyer) return;
    showFormModal("⚙️ የፕሮፋይል ሲቲንግ", [
        { id: "b_name", label: "ሙሉ ስም (Name)", type: "text", defaultValue: currentBuyer.name },
        { id: "b_username", label: "መግቢያ ስም (Username)", type: "text", defaultValue: currentBuyer.username },
        { id: "b_email", label: "ኢሜል (Gmail)", type: "email", defaultValue: currentBuyer.email || "" },
        { id: "b_phone", label: "ስልክ ቁጥር (Phone)", type: "tel", defaultValue: currentBuyer.phone },
        { id: "b_password", label: "የይለፍ ቃል (Password)", type: "text", defaultValue: currentBuyer.password }
    ], async (res) => {
        let newU = res.b_username.trim().toLowerCase();
        let newP = res.b_phone.trim();
        
        if(newU !== currentBuyer.username || newP !== currentBuyer.phone) {
            let takenMsg = await isSystemDataTaken(newU, newP, "", currentBuyer.username);
            if(takenMsg) { showCustomAlert("ስህተት (Error)", takenMsg); return; }
        }

        let oldU = currentBuyer.username;
        currentBuyer.name = res.b_name.trim();
        currentBuyer.username = newU;
        currentBuyer.email = res.b_email.trim(); currentBuyer.phone = newP; currentBuyer.password = res.b_password.trim();
        
        if(oldU !== newU) {
            localDB.buyers[newU] = currentBuyer;
            delete localDB.buyers[oldU];
            localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'buyer', loginMode: 'buyer', username: newU }));
        } else { localDB.buyers[newU] = currentBuyer; }
        
        pushToFirebase(); renderBuyerCatalog();
        showCustomAlert("✅ ተሳክቷል", "ፕሮፋይልዎ በትክክል ተስተካክሏል!");
    });
};

window.openDeliveryOrderModal = function(shopKey, itemIdx, itemName, price) {
    if(!currentBuyer) { showCustomAlert("ማሳሰቢያ", "እባክዎ መጀመሪያ እንደ ገዥ ይግቡ/ይመዝገቡ!"); return; }
    
    showFormModal("🚚 " + itemName + " - ዴሊቨሪ ማዘዣ", [
        { id: "phone", label: "ስልክ ቁጥርዎ", type: "text", defaultValue: currentBuyer.phone },
        { id: "address", label: "ያሉበት ትክክለኛ አድራሻ / ሰፈር", type: "text", placeholder: "ምሳሌ: ቦሌ ሚካኤል፣ ህንፃ 3..." },
        { id: "mapLink", label: "የጎግል ማፕ ሊንክ (አማራጭ)", type: "text", placeholder: "https://maps.google.com/..." },
        { id: "qty", label: "የሚፈልጉት ብዛት", type: "number", defaultValue: "1" }
    ], 
    (res) => {
        let qty = parseFloat(res.qty) || 0;
        if(qty <= 0 || !res.address) { showCustomAlert("ስህተት", "እባክዎ አድራሻዎን እና የሚፈልጉትን ብዛት በትክክል ይሙሉ!"); return; }

        let t = localDB.tenants[shopKey];
        if(!t.data.deliveryOrders) t.data.deliveryOrders = [];

        let orderId = Math.floor(100000 + Math.random() * 900000);
        t.data.deliveryOrders.push({
            orderId: orderId, buyerUser: currentBuyer.username, buyerPhone: res.phone,
            address: res.address, mapLink: res.mapLink, itemIdx: itemIdx, itemName: itemName,
            qty: qty, price: price, total: qty * price, status: "pending", date: getTodayFormatted()
        });
        
        localDB.tenants[shopKey] = t; pushToFirebase();
        showCustomAlert("ተሳክቷል", "ትዕዛዝዎ ለሻጩ ተልኳል። ሻጩ ሲቀበለው በገጽዎ ላይ 'በመንገድ ላይ ነው' የሚል ምልክት ያያሉ።");
        renderBuyerCatalog();
    });
};

window.buyFromShop = function(shopKey, itemIdx, itemName, price, availableRem) {
    if(!currentBuyer) { showCustomAlert("ማሳሰቢያ", "እባክዎ መጀመሪያ እንደ ገዥ ይግቡ/ይመዝገቡ!"); return; }
    
    showFormModal("🛒 " + itemName + " - ወደ ቅርጫት (Cart) ማስገቢያ", [
        { id: "qty", label: "የሚፈልጉት ብዛት", type: "number", defaultValue: "1" }
    ], (res) => {
        let qty = parseFloat(res.qty) || 0;
        if(qty <= 0) { showCustomAlert("ስህተት", "የተሳሳተ ብዛት!"); return; }
        if(qty > availableRem) { showCustomAlert("ብዛት የለም", "የጠየቁት ብዛት በአሁኑ ሰዓት ከስቶር የለም (አልቋል)!"); return; }

        let existIdx = window.buyerCartData.findIndex(c => c.shopKey === shopKey && c.itemIdx === itemIdx);
        if(existIdx > -1) {
            let totalWanted = window.buyerCartData[existIdx].qty + qty;
            if(totalWanted > availableRem) { showCustomAlert("ስህተት", "ከክምችት በላይ ነው!"); return; }
            window.buyerCartData[existIdx].qty += qty;
            window.buyerCartData[existIdx].total = window.buyerCartData[existIdx].qty * price;
        } else {
            window.buyerCartData.push({ shopKey: shopKey, itemIdx: itemIdx, itemName: itemName, qty: qty, price: price, total: qty * price });
        }
        renderBuyerCart();
        showCustomAlert("🛒 በቅርጫትዎ ውስጥ ገብቷል", "ትዕዛዙ Cart ውስጥ ገብቷል። ሲጨርሱ ከላይ 'እርግጠኛ ነኝ ትዕዛዙን ላክ' የሚለውን ይጫኑ።");
    });
};

window.renderBuyerCart = function() {
    let section = document.getElementById('buyerCartSection');
    let listBody = document.getElementById('buyerCartList');
    let cartTotalBar = section.querySelector('.cart-total-bar');

    if(!window.buyerCartData || window.buyerCartData.length === 0) {
        section.style.display = 'none';
        listBody.innerHTML = ''; 
        if(cartTotalBar) cartTotalBar.innerHTML = `አጠቃላይ ሂሳብ: <span id="buyerCartTotalSum" style="color: var(--success-color);">0</span> ብር`;
        return;
    }

    section.style.display = 'block'; listBody.innerHTML = '';
    let grandTotal = 0;
    
    window.buyerCartData.forEach((c, i) => {
        grandTotal += c.total;
        let shopName = localDB.tenants[c.shopKey] ? localDB.tenants[c.shopKey].shopName : "ሱቅ";
        listBody.innerHTML += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="color:var(--text-color);"><b>${c.itemName}</b><br><small style="color:var(--accent-color)">[${shopName}]</small></td>
            <td style="color:var(--text-color);">${c.qty}</td>
            <td style="color:var(--success-color);"><b>${c.total}</b></td>
            <td><button class="btn-expense btn-sm" onclick="removeFromBuyerCart(${i})">❌ አጥፋ</button></td>
        </tr>`;
    });
    
    let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 0;
    let vatAmount = (grandTotal * vatRate) / 100;
    let finalTotal = grandTotal + vatAmount;
    
    if (cartTotalBar) {
        if (vatRate > 0) {
            cartTotalBar.innerHTML = `
                <div style="font-size: 0.95rem;">የዕቃዎች ድምር (Subtotal): <span style="color: white;">${grandTotal.toFixed(2)}</span> ብር</div>
                <div style="font-size: 0.9rem; color: var(--danger-color);">ቫት (VAT ${vatRate}%): <span>${vatAmount.toFixed(2)}</span> ብር</div>
                <div style="border-top: 1px dashed #eab308; padding-top: 5px; margin-top: 5px;">ጠቅላላ ሂሳብ (Total): <span id="buyerCartTotalSum" style="color: var(--success-color); font-weight: bold;">${finalTotal.toFixed(2)}</span> ብር</div>
            `;
        } else {
            cartTotalBar.innerHTML = `አጠቃላይ ሂሳብ: <span id="buyerCartTotalSum" style="color: var(--success-color);">${grandTotal.toFixed(2)}</span> ብር`;
        }
    }
};

window.removeFromBuyerCart = function(i) { if(window.buyerCartData) { window.buyerCartData.splice(i, 1); renderBuyerCart(); } };

window.checkoutBuyerCart = function() {
    if(!window.buyerCartData || window.buyerCartData.length === 0) { showCustomAlert("ስህተት", "ምንም ዕቃ አልመረጡም!"); return; }
    
    showCustomConfirm("ትዕዛዝ ማረጋገጫ", "ሁሉንም የቅርጫት ትዕዛዞች ወደየሱቆቹ መላክ ይፈልጋሉ?", () => {
        let shops = {};
        window.buyerCartData.forEach(c => {
            if(!shops[c.shopKey]) shops[c.shopKey] = [];
            shops[c.shopKey].push(c);
        });

        for(let sKey in shops) {
            let t = localDB.tenants[sKey];
            if(!t.data.remoteCarts) t.data.remoteCarts = {};
            if(!t.data.remoteCarts[currentBuyer.username]) t.data.remoteCarts[currentBuyer.username] = [];
            
            shops[sKey].forEach(item => {
                t.data.remoteCarts[currentBuyer.username].push({
                    itemIdx: item.itemIdx, itemName: item.itemName, qty: item.qty, price: item.price, total: item.total
                });
            });
            localDB.tenants[sKey] = t;
        }
        
        window.buyerCartData = []; renderBuyerCart(); pushToFirebase();
        showCustomAlert("✅ ተሳክቷል", "ትዕዛዞችዎ በተሳካ ሁኔታ ተልከዋል! ሻጮች ሲያረጋግጡ የ'ተቆረጡ ደረሰኞች' ቦታ ላይ ይደርስዎታል።");
    });
};

async function renderBuyerCatalog() {
    if(currentBuyer) {
        let badge = document.getElementById('buyerProfileBadge');
        if(badge) badge.innerText = `👤 የተጠቃሚ ስም: ${currentBuyer.username} | 📱 ስልክ: ${currentBuyer.phone}`;
        renderBuyerCart();
    }

    let container = document.getElementById('buyerShopsContainer');
    if(!container) return;
    
    if (typeof db !== 'undefined' && (!localDB.tenants || Object.keys(localDB.tenants).length === 0)) {
        try {
            let snap = await db.ref('tirfe_system/tenants').once('value');
            if(snap.exists()) {
                let allT = snap.val();
                for(let k in allT) { 
                    delete allT[k].password;
                    delete allT[k].activationCode; 
                    delete allT[k].staffAccounts; delete allT[k].telegramToken; 
                    delete allT[k].bankAccount; 
                }
                localDB.tenants = allT;
            }
        } catch(e) { console.warn("Catalog fetch error:", e); }
    }

    container.innerHTML = '';
    let hasData = false;
    let query = document.getElementById('buyerSearchInput') ? document.getElementById('buyerSearchInput').value.trim().toLowerCase() : "";
    let categories = new Set();
    
    if (localDB.tenants) { Object.values(localDB.tenants).forEach(t => { if (t.status === "active") { categories.add(t.businessType || "አጠቃላይ ንግድ"); } }); }
    
    let catContainer = document.getElementById('buyerCategoryContainer');
    if (catContainer) {
        let catHTML = `<button class="category-btn ${activeCategoryFilter === 'all' ? 'active' : ''}" onclick="setCategoryFilter('all')">🌐 ሁሉም</button>`;
        categories.forEach(cat => { catHTML += `<button class="category-btn ${activeCategoryFilter === cat ? 'active' : ''}" onclick="setCategoryFilter('${cat}')">🛍️ ${cat}</button>`; });
        catContainer.innerHTML = catHTML;
    }

    let myOrdersHTML = ""; let myReceiptsHTML = "";
    let liveBuyer = (currentBuyer && localDB.buyers) ? localDB.buyers[currentBuyer.username] : currentBuyer;

    if(liveBuyer && liveBuyer.receipts) {
        let reversed = [...liveBuyer.receipts].reverse();
        let filterDate = document.getElementById('buyerReceiptDateFilter') ? document.getElementById('buyerReceiptDateFilter').value : "";
        reversed.forEach(rec => {
            if (filterDate && rec.date !== filterDate) return;
            myReceiptsHTML += `<tr>
                <td><b>#${rec.recId}</b></td><td>${rec.date}</td>
                <td>${rec.itemName} (${rec.count})</td>
                <td style="color:var(--success-color);"><b>${rec.totalVal} ETB</b></td>
                <td><button class="btn-sm btn-add" onclick="viewBuyerReceipt('${rec.recId}')">📥 አውርድ</button></td>
            </tr>`;
        });
    }

    if (localDB.tenants) {
        Object.keys(localDB.tenants).forEach(tKey => {
            let t = localDB.tenants[tKey];
            if (t.status === "active") {
                let tBType = t.businessType || "አጠቃላይ ንግድ";
                if (activeCategoryFilter !== "all" && tBType !== activeCategoryFilter) return;

                let isShopMatch = false;
                if (query !== "") {
                    let uName = t.username ? t.username.toLowerCase() : tKey.toLowerCase();
                    isShopMatch = (uName === query || uName.includes(query)) ||
                                  (t.shopName && t.shopName.toLowerCase().includes(query)) ||
                                  (t.phone && t.phone.includes(query));
                }

                let matchingItems = [];
                if (t.data && t.data.inventory) {
                    matchingItems = t.data.inventory.map((item, index) => ({...item, originalIdx: index})).filter(item => {
                        if (query === "") return true;
                        if (isShopMatch) return true;
                        return item.name.toLowerCase().includes(query) || (item.model && item.model.toLowerCase().includes(query));
                    });
                }
                
                if (query !== "" && !isShopMatch && matchingItems.length === 0) return;
                
                hasData = true;
                let shopLogo = t.shopLogo || "https://cdn-icons-png.flaticon.com/512/869/869636.png";
                let tgLink = t.telegram && t.telegram !== "-" ? (t.telegram.startsWith('@') ? t.telegram.substring(1) : t.telegram) : "";
                let shopCardHTML = `
                <div class="shop-card">
                    <div class="shop-card-header">
                        <img src="${shopLogo}" class="shop-avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/869/869636.png'">
                        <div class="shop-meta">
                            <h3>${t.shopName}</h3>
                            <p>📍 አድራሻ፡ ${t.address || 'ያልተገለጸ'} <br><span style="color:var(--accent-color); font-size:0.75rem;">[${tBType}]</span></p>
                        </div>
                    </div>
                    <div style="margin-top:5px; font-size:0.85rem; color:#94a3b8; font-weight:bold;">📦 ዕቃዎች ዝርዝር፦</div>
                    <div class="shop-items-list">`;
                
                if (matchingItems.length === 0) { 
                    shopCardHTML += `<p style="font-size:0.8rem; color:#64748b; padding:5px 0;">በአሁኑ ሰዓት የተመዘገበ ዕቃ የለም።</p>`;
                } else {
                    matchingItems.forEach(item => {
                        let itemImg = item.imgUrl || "https://cdn-icons-png.flaticon.com/512/3342/3342137.png";
                        let modelDisplay = item.model && item.model !== "-" ? `<br><small style="color:var(--accent-color)">ሞዴል: ${item.model}</small>` : '';
                        let unitLabel = item.unitType === 'kg' ? 'ኪሎ' : (item.isAdvanced ? 'ሜትር' : 'ፍሬ');
                        let rem = item.qty - item.sold;
                        
                        shopCardHTML += `
                        <div class="catalog-item-card">
                            <img src="${itemImg}" class="catalog-item-img" onclick="viewImageFullscreen('${itemImg}')" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3342/3342137.png'">
                            <div class="catalog-item-info">
                                <span style="font-weight:bold; font-size:0.9rem;">${item.name}</span>${modelDisplay}
                                <div style="color:var(--warning-color); font-weight:bold; margin-top:2px;">${item.price} ETB <small>(${unitLabel})</small></div>
                                <div style="display:flex; gap:5px; margin-top:5px; flex-wrap:wrap;">
                                    <button class="btn-add btn-sm" onclick="openDeliveryOrderModal('${tKey}', ${item.originalIdx}, '${item.name}', ${item.price})">🚚 ዴሊቨሪ</button>
                                    <button class="btn-success btn-sm" style="background:var(--warning-color); color:#000;" onclick="buyFromShop('${tKey}', ${item.originalIdx}, '${item.name}', ${item.price}, ${rem})">🛒 ሱቅ ነኝ ግዛ</button>
                                </div>
                            </div>
                        </div>`;
                    });
                }
                
                shopCardHTML += `
                    </div>
                    <div class="shop-links">
                        <a href="tel:${t.phone}" class="btn-link-action" style="background:#22c55e; color:#fff;">📞 ስልክ፡ ${t.phone}</a>
                        ${tgLink ? `<a href="https://t.me/${tgLink}" target="_blank" class="btn-link-action" style="background:#0088cc; color:#fff;">✈️ ቴሌግራም</a>` : `<span class="btn-link-action" style="background:#334155; color:#64748b;">✈️ ቴሌግራም የለም</span>`}
                        ${t.googleMapsLink ? `<a href="${t.googleMapsLink}" target="_blank" class="btn-link-action" style="background:var(--accent-color); color:#000; grid-column: span 2; margin-top:4px;">📍 ጎግል ማፕ (Google Maps)</a>` : `<span class="btn-link-action" style="background:#334155; color:#64748b; grid-column: span 2; margin-top:4px;">📍 ሎኬሽን አልተጫነም</span>`}
                    </div>
                </div>`;
                
                container.innerHTML += shopCardHTML;

                if(liveBuyer && t.data && t.data.deliveryOrders) {
                    t.data.deliveryOrders.forEach(ord => {
                        if(ord.buyerUser === liveBuyer.username) {
                            let st = ord.status;
                            let badge = st === "pending" ? "በመጠባበቅ ላይ" : (st === "accepted" ? "በመንገድ ላይ" : (st === "completed" ? "ተረክበዋል" : "ተመልሷል"));
                            let cl = st === "pending" ? "text-warning" : (st === "accepted" ? "text-success" : "text-danger");
                            myOrdersHTML += `<tr>
                                <td>${t.shopName}</td><td>${ord.itemName} (x${ord.qty})</td>
                                <td>${ord.total} ETB</td><td>${ord.date}</td>
                                <td class="${cl}"><b>${badge}</b></td>
                            </tr>`;
                        }
                    });
                }
            }
        });
    }

    if(!hasData) { container.innerHTML = '<p style="text-align:center; color:#94a3b8; grid-column: 1/-1; padding:20px;">በተፈለገው ስም የተገኘ ምንም ሱቅ ወይም ዕቃ የለም።</p>'; }
    
    let ordersBody = document.getElementById('buyerOrdersBody');
    if(ordersBody) {
        if(myOrdersHTML === "") ordersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">ምንም የዴሊቨሪ ትዕዛዝ አልጠየቁም።</td></tr>`;
        else ordersBody.innerHTML = myOrdersHTML;
    }
    
    let receiptsBody = document.getElementById('buyerReceiptsBody');
    if(receiptsBody) {
        if(myReceiptsHTML === "") receiptsBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">የተቆረጠ ደረሰኝ የለም።</td></tr>`;
        else receiptsBody.innerHTML = myReceiptsHTML;
    }
}

window.viewBuyerReceipt = function(recId) {
    if (!currentBuyer || !localDB.buyers[currentBuyer.username]) return;
    let latestBuyerData = localDB.buyers[currentBuyer.username];
    if (!latestBuyerData.receipts) return;
    
    let rec = latestBuyerData.receipts.find(r => r.recId === parseInt(recId) || r.recId == recId);
    if(!rec) { showCustomAlert("ስህተት", "ይህ ደረሰኝ አልተገኘም!"); return; }
    
    let bName = latestBuyerData.username;
    let bPhone = latestBuyerData.phone;
    let subT = rec.subTotal !== undefined ? rec.subTotal : rec.totalVal;
    let vAmt = rec.vatAmount !== undefined ? rec.vatAmount : 0;
    
    if(rec.advancedItems) { 
        generateAdvancedReceipt(rec.advancedItems, subT, rec.seller, rec.recId, false, rec.shopName, rec.bType, bName, bPhone, vAmt, rec.ownerName, rec.ownerPhone);
    } else { 
        generateAdvancedReceipt([{name: rec.itemName, count: rec.count, unitPrice: subT/rec.count, total: subT}], subT, rec.seller, rec.recId, false, rec.shopName, rec.bType, bName, bPhone, vAmt, rec.ownerName, rec.ownerPhone);
    }
};

