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
        { id: "b_password", 
        label: "የይለፍ ቃል (Password)", type: "text", defaultValue: currentBuyer.password }
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
        } else { localDB.buyers[newU] = currentBuyer;
        }
        
        pushToFirebase(); renderBuyerCatalog();
        showCustomAlert("✅ ተሳክቷል", "ፕሮፋይልዎ በትክክል ተስተካክሏል!");
    });
};

window.openDeliveryOrderModal = function(shopKey, itemIdx, itemName, price) {
    if(!currentBuyer) { showCustomAlert("ማሳሰቢያ", "እባክዎ መጀመሪያ እንደ ገዥ ይግቡ/ይመዝገቡ!");
    return; }
    
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
    if(!currentBuyer) { showCustomAlert("ማሳሰቢያ", "እባክዎ መጀመሪያ እንደ ገዥ ይግቡ/ይመዝገቡ!");
    return; }
    
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
    if(!window.buyerCartData || window.buyerCartData.length === 0) { showCustomAlert("ስህተት", "ምንም ዕቃ አልመረጡም!"); return;
    }
    
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
        } catch(e) { console.warn("Catalog fetch error:", e);
        }
    }

    container.innerHTML = '';
    let hasData = false;
    let query = document.getElementById('buyerSearchInput') ?
    document.getElementById('buyerSearchInput').value.trim().toLowerCase() : "";
    let categories = new Set();
    
    if (localDB.tenants) { Object.values(localDB.tenants).forEach(t => { if (t.status === "active") { categories.add(t.businessType || "አጠቃላይ ንግድ"); } });
    }
    
    let catContainer = document.getElementById('buyerCategoryContainer');
    if (catContainer) {
        let catHTML = `<button class="category-btn ${activeCategoryFilter === 'all' ? 'active' : ''}" onclick="setCategoryFilter('all')">🌐 ሁሉም</button>`;
        categories.forEach(cat => { catHTML += `<button class="category-btn ${activeCategoryFilter === cat ? 'active' : ''}" onclick="setCategoryFilter('${cat}')">🛍️ ${cat}</button>`; });
        catContainer.innerHTML = catHTML;
    }

    let myOrdersHTML = ""; let myReceiptsHTML = "";
    let liveBuyer = (currentBuyer && localDB.buyers) ?
    localDB.buyers[currentBuyer.username] : currentBuyer;

    // ሁሉንም እቃዎች በተናጠል አቀላቅሎ ለመጫን ዝግጅት
    let allItems = [];

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

                if (t.data && t.data.inventory) {
                    t.data.inventory.forEach((item, index) => {
                        let isItemMatch = query === "" || isShopMatch || 
                                          item.name.toLowerCase().includes(query) || 
                                          (item.model && item.model.toLowerCase().includes(query));
                        if (isItemMatch) {
                            allItems.push({
                                ...item,
                                originalIdx: index,
                                shopKey: tKey,
                                tenant: t
                            });
                        }
                    });
                }

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

    // 1. ምርቶችን በቋሚነት ማቀላቀያ (Stable Mix Engine) - የአንድን ሱቅ ምርቶች በተለያየ ቦታ ይበትናል
    allItems.sort((a, b) => {
        let scoreA = (a.name.charCodeAt(0) || 0) + (a.shopKey.charCodeAt(0) || 0) + a.originalIdx;
        let scoreB = (b.name.charCodeAt(0) || 0) + (b.shopKey.charCodeAt(0) || 0) + b.originalIdx;
        return (scoreA % 7) - (scoreB % 7) || scoreA - scoreB;
    });

    // 2. Option 2: የሚንቀሳቀስ የስላይደር ማውጫ (Featured Product Carousel) ማመንጫ
    let carouselHTML = '';
    if (allItems.length > 0) {
        hasData = true;
        let carouselItems = allItems.slice(0, 8); // እስከ 8 ምርቶችን ለስላይደሩ መምረጥ
        carouselHTML += `
        <div class="featured-carousel-section" style="grid-column: 1 / -1; margin-bottom: 20px; width: 100%; overflow: hidden; background: rgba(15, 23, 42, 0.4); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
            <h3 style="color: var(--accent-color); margin: 0 0 12px 0; font-size: 1.05rem; display: flex; align-items: center; gap: 6px;">
                ✨ ተለይተው የቀረቡ ዕቃዎች (Featured Products)
            </h3>
            <div class="carousel-track-container" style="width: 100%; overflow-x: auto; display: flex; gap: 12px; padding-bottom: 4px; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;">
        `;
        
        carouselItems.forEach(item => {
            let itemImg = item.imgUrl || "https://cdn-icons-png.flaticon.com/512/3342/3342137.png";
            carouselHTML += `
                <div class="carousel-item-card" style="flex: 0 0 170px; background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; justify-content: space-between;">
                    <div onclick="viewImageFullscreen('${itemImg}')" style="cursor: pointer;">
                        <img src="${itemImg}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3342/3342137.png'">
                        <div style="font-weight: bold; font-size: 0.85rem; color: #fff; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</div>
                        <div style="color: var(--warning-color); font-size: 0.85rem; font-weight: bold; margin-top: 2px;">${item.price} ETB</div>
                        <div style="color: #94a3b8; font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">🏬 ${item.tenant.shopName}</div>
                    </div>
                    <button class="btn-add btn-sm" style="width: 100%; margin-top: 8px; padding: 5px 0; font-size: 0.75rem; border-radius: 4px;" onclick="openDeliveryOrderModal('${item.shopKey}', ${item.originalIdx}, '${item.name}', ${item.price})">🚚 እዘዝ</button>
                </div>
            `;
        });
        
        carouselHTML += `
            </div>
        </div>
        <div style="grid-column: 1 / -1; margin-bottom: 12px; margin-top: 5px;"><h3 style="color: #fff; font-size: 1.1rem; margin: 0; font-weight: 600;">🛍️ አጠቃላይ የዕቃዎች ዝርዝር (All Mixed Products)</h3></div>
        `;

        container.innerHTML = carouselHTML;

        // እቃዎችን በተናጠል ካርድ ማቅረቢያ (Mixed Products Grid HTML)
        allItems.forEach(item => {
            let t = item.tenant;
            let itemImg = item.imgUrl || "https://cdn-icons-png.flaticon.com/512/3342/3342137.png";
            let modelDisplay = item.model && item.model !== "-" ? `<br><small style="color:var(--accent-color)">ሞዴል: ${item.model}</small>` : '';
            let unitLabel = item.unitType === 'kg' ? 'ኪሎ' : (item.isAdvanced ? 'ሜትር' : 'ፍሬ');
            let rem = item.qty - item.sold;
            let shopLogo = t.shopLogo || "https://cdn-icons-png.flaticon.com/512/869/869636.png";
            let tgLink = t.telegram && t.telegram !== "-" ? (t.telegram.startsWith('@') ? t.telegram.substring(1) : t.telegram) : "";
            
            let singleProductHTML = `
            <div class="shop-card" style="display: flex; flex-direction: column; justify-content: space-between; margin-bottom: 0;">
                <div>
                    <div class="shop-card-header" style="padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                        <img src="${shopLogo}" class="shop-avatar" onerror="this.src='https://cdn-icons-png.flaticon.com/512/869/869636.png'" style="width:28px; height:28px; margin:0;">
                        <div class="shop-meta" style="margin:0;">
                            <h3 style="font-size: 0.85rem; margin:0; line-height:1.2;">${t.shopName}</h3>
                            <span style="color:#64748b; font-size:0.7rem;">📍 ${t.address || 'ያልተገለጸ'}</span>
                        </div>
                    </div>
                    <div class="catalog-item-card" style="background:transparent; padding:0; border:none; box-shadow:none; margin:0;">
                        <img src="${itemImg}" class="catalog-item-img" onclick="viewImageFullscreen('${itemImg}')" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3342/3342137.png'">
                        <div class="catalog-item-info">
                            <span style="font-weight:bold; font-size:0.9rem; color:#fff;">${item.name}</span>${modelDisplay}
                            <div style="color:var(--warning-color); font-weight:bold; margin-top:2px;">${item.price} ETB <small>(${unitLabel})</small></div>
                            <div style="color:#94a3b8; font-size:0.75rem; margin-top:2px;">ቀሪ፡ ${rem}</div>
                        </div>
                    </div>
                </div>
                <div style="margin-top:12px;">
                    <div style="display:flex; gap:5px; margin-bottom:6px;">
                        <button class="btn-add btn-sm" style="flex:1;" onclick="openDeliveryOrderModal('${item.shopKey}', ${item.originalIdx}, '${item.name}', ${item.price})">🚚 ዴሊቨሪ</button>
                        <button class="btn-success btn-sm" style="flex:1; background:var(--warning-color); color:#000;" onclick="buyFromShop('${item.shopKey}', ${item.originalIdx}, '${item.name}', ${item.price}, ${rem})">🛒 ሱቅ ግዛ</button>
                    </div>
                    <div class="shop-links" style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; padding:0; margin:0;">
                        <a href="tel:${t.phone}" class="btn-link-action" style="background:#22c55e; color:#fff; padding:4px; font-size:0.75rem; text-align:center; border-radius:4px; display:block; text-decoration:none;">📞 ደውል</a>
                        ${tgLink ? `<a href="https://t.me/${tgLink}" target="_blank" class="btn-link-action" style="background:#0088cc; color:#fff; padding:4px; font-size:0.75rem; text-align:center; border-radius:4px; display:block; text-decoration:none;">✈️ ቴሌግራም</a>` : `<span class="btn-link-action" style="background:#334155; color:#64748b; padding:4px; font-size:0.75rem; text-align:center; border-radius:4px; display:block;">✈️ የለም</span>`}
                    </div>
                </div>
            </div>`;
            container.innerHTML += singleProductHTML;
        });

        // ስላይደሩ በየራሱ እንዲንቀሳቀስ ማድረጊያ (Auto-Scroll Interval Script)
        setTimeout(() => {
            let track = document.querySelector('.carousel-track-container');
            if (track && !track.dataset.animated) {
                track.dataset.animated = "true";
                setInterval(() => {
                    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
                        track.scrollLeft = 0;
                    } else {
                        track.scrollLeft += 160;
                    }
                }, 3500);
            }
        }, 600);
    }

    if (!hasData) { 
        container.innerHTML = '<p style="text-align:center; color:#94a3b8; grid-column: 1/-1; padding:20px;">በተፈለገው ስም የተገኘ ምንም ሱቅ ወይም ዕቃ የለም።</p>';
    }
    
    let liveBuyerReceipts = (currentBuyer && localDB.buyers) ? localDB.buyers[currentBuyer.username] : currentBuyer;
    if(liveBuyerReceipts && liveBuyerReceipts.receipts) {
        let reversed = [...liveBuyerReceipts.receipts].reverse();
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
}
