// የገዥ (Buyer) ሲስተም ዋና ኮዶች (main_buyer.js)
// ==========================================

window.buyerCartData = window.buyerCartData || [];

function logoutBuyer() {
    currentBuyer = null;
    window.buyerCartData = [];
    localStorage.removeItem('tirfe_active_session');
    // የሎግ አውት (Logout) ችግርን ለመፍታት ሙሉ በሙሉ ፔጁን ሪፍሬሽ ያደርገዋል
    location.reload();
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
        currentBuyer.email = res.b_email.trim();
        currentBuyer.phone = newP; 
        currentBuyer.password = res.b_password.trim();

        if(oldU !== newU) {
            localDB.buyers[newU] = currentBuyer;
            delete localDB.buyers[oldU];
            localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'buyer', loginMode: 'buyer', username: newU }));
        } else { 
            localDB.buyers[newU] = currentBuyer;
        }
        
        pushToFirebase(); 
        renderBuyerCatalog();
        showCustomAlert("✅ ተሳክቷል", "ፕሮፋይልዎ በትክክል ተስተካክሏል!");
    });
};

window.addToBuyerCart = function(shopKey, itemIdx, itemName, price, availableRem) {
    if(!currentBuyer) { showCustomAlert("ማሳሰቢያ", "እባክዎ መጀመሪያ እንደ ገዥ ይግቡ/ይመዝገቡ!"); return; }
    
    // የተለየ ሱቅ ማረጋገጫ (Single Shop Validation)
    if(window.buyerCartData && window.buyerCartData.length > 0) {
        if(window.buyerCartData[0].shopKey !== shopKey) {
            let sName = localDB.tenants[window.buyerCartData[0].shopKey] ? localDB.tenants[window.buyerCartData[0].shopKey].shopName : "ሌላ ሱቅ";
            showCustomAlert("ማሳሰቢያ", `በአንድ ጊዜ የአንድ ሱቅ ዕቃዎችን ብቻ ነው ወደ ካርት ማስገባት የሚቻለው!\n\nካርትዎ ውስጥ የ "${sName}" ዕቃዎች አሉ። እባክዎ መጀመሪያ ካርት ውስጥ ያለውን ትዕዛዝ ያጠናቅቁ ወይም ያጥፉ።`);
            return;
        }
    }
    
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
        renderBuyerCatalog();
        showCustomAlert("🛒 በቅርጫትዎ ውስጥ ገብቷል", "ትዕዛዙ Cart ውስጥ ገብቷል። ተጨማሪ ዕቃ መምረጥ ይችላሉ፣ ሲጨርሱ ከካርት ላይ የትዕዛዝ ምርጫዎን ይምረጡ።");
    });
};

window.submitDeliveryFee = function(shopKey, orderId) {
    let feeInput = document.getElementById(`delFee_${shopKey}_${orderId}`);
    if(!feeInput) return;
    let fee = parseFloat(feeInput.value) || 0;
    if(fee <= 0) {
        showCustomAlert("ስህተት", "እባክዎ ለዴሊቨሪ የከፈሉትን ትክክለኛ የብር መጠን ያስገቡ!");
        return;
    }

    let t = localDB.tenants[shopKey];
    if(t && t.data && t.data.deliveryOrders) {
        let ord = t.data.deliveryOrders.find(o => o.orderId == orderId);
        if(ord) {
            ord.deliveryFeePaid = fee;
            let motorAssigned = false;
            
            if (ord.motorUser && localDB.motors[ord.motorUser]) {
                localDB.motors[ord.motorUser].incomingFee = fee;
                if (typeof db !== 'undefined' && navigator.onLine) {
                    db.ref(`tirfe_system/motors/${ord.motorUser}`).set(localDB.motors[ord.motorUser]);
                }
                if (typeof sendMotorTelegramAlert === 'function') {
                    sendMotorTelegramAlert(ord.motorUser, `💸 አዲስ የዴሊቨሪ ክፍያ ተልኮልዎታል!\n\nገዥው ${fee} ETB ሲስተሙ ላይ አስገብቷል። እባክዎ ዳሽቦርድዎን ያረጋግጡ።`);
                }
                motorAssigned = true;
            } else {
                Object.values(localDB.motors).forEach(m => {
                    if (m.activeOrders) {
                        let matched = m.activeOrders.find(mo => mo.orderId == orderId || mo.buyerPhone == ord.buyerPhone);
                        if (matched && matched.status === 'accepted') {
                            m.incomingFee = fee;
                            if (typeof db !== 'undefined' && navigator.onLine) {
                                db.ref(`tirfe_system/motors/${m.username}`).set(m);
                            }
                            ord.motorUser = m.username; 
                            motorAssigned = true;
                            if (typeof sendMotorTelegramAlert === 'function') {
                                sendMotorTelegramAlert(m.username, `💸 አዲስ የዴሊቨሪ ክፍያ ተልኮልዎታል!\n\nገዥው ${fee} ETB ሲስተሙ ላይ አስገብቷል። እባክዎ ዳሽቦርድዎን ያረጋግጡ።`);
                            }
                        }
                    }
                });
            }
            if(!motorAssigned) {
                console.warn("ማሳሰቢያ: ይህንን ትዕዛዝ የተቀበለ ሞተረኛ ገና አልተገኘም።");
            }

            localDB.tenants[shopKey] = t;
            pushToFirebase();
            if (typeof db !== 'undefined' && navigator.onLine) {
                db.ref(`tirfe_system/tenants/${shopKey}/data/deliveryOrders`).set(t.data.deliveryOrders);
            }

            showCustomAlert("✅ ተሳክቷል", "የዴሊቨሪ ክፍያ መጠን በተሳካ ሁኔታ ገብቷል! መረጃው በቀጥታ ለሞተረኛው ተልኳል።");
            renderBuyerCatalog();
        }
    }
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

window.checkoutBuyerCart = function(orderType) {
    if(!window.buyerCartData || window.buyerCartData.length === 0) { showCustomAlert("ስህተት", "ምንም ዕቃ አልመረጡም!"); return; }

    let shopKey = window.buyerCartData[0].shopKey;
    let t = localDB.tenants[shopKey];
    if(!t) return;

    let grandTotal = 0;
    let itemNamesArr = [];
    window.buyerCartData.forEach(c => {
        grandTotal += c.total;
        itemNamesArr.push(`${c.itemName} (x${c.qty})`);
    });
    let combinedItems = itemNamesArr.join("፣ ");

    if(orderType === 'shop') {
        showCustomConfirm("🛒 ሱቅ ሄጄ እወስዳለሁ", "ሁሉንም የቅርጫት ትዕዛዞች 'ሱቅ ሄጄ እወስዳለሁ' በሚል ወደ ሱቁ መላክ ይፈልጋሉ?", () => {
            if(!t.data) t.data = {};
            if(!t.data.remoteCarts) t.data.remoteCarts = {};
            if(!t.data.remoteCarts[currentBuyer.username]) t.data.remoteCarts[currentBuyer.username] = [];

            window.buyerCartData.forEach(item => {
                t.data.remoteCarts[currentBuyer.username].push({
                    itemIdx: item.itemIdx, itemName: item.itemName, qty: item.qty, price: item.price, total: item.total
                });
            });

            localDB.tenants[shopKey] = t;
            if (typeof db !== 'undefined' && navigator.onLine) {
                db.ref(`tirfe_system/tenants/${shopKey}/data/remoteCarts`).set(t.data.remoteCarts);
            }

            window.buyerCartData = [];
            renderBuyerCart(); pushToFirebase();
            showCustomAlert("✅ ተሳክቷል", "ትዕዛዞችዎ በተሳካ ሁኔታ ተልከዋል! ሱቁ ሲያረጋግጥ የ'ተቆረጡ ደረሰኞች' ቦታ ላይ ይደርስዎታል።");
        });
    } else if(orderType === 'delivery') {
        showFormModal("🚚 ዴሊቨሪ ማዘዣ", [
            { id: "phone", label: "ስልክ ቁጥርዎ (ግዴታ)", type: "text", defaultValue: currentBuyer.phone },
            { id: "address", label: "ያሉበት ትክክለኛ አድራሻ / ሰፈር (ግዴታ)", type: "text", placeholder: "ምሳሌ: ቦሌ ሚካኤል፣ ህንፃ 3..." },
            { id: "mapLink", label: "የጎግል ማፕ ሊንክ (አማራጭ)", type: "text", placeholder: "https://maps.google.com/..." },
            { id: "transport", label: "የትራንስፖርት ምርጫ (ግዴታ)", type: "select", options: [
                { value: "", label: "-- ይምረጡ --" },
                { value: "motor", label: "🏍️ ሞተረኛ" },
                { value: "car", label: "🚗 መኪና" }
            ]}
        ], (res) => {
            if(!res.address || !res.phone || !res.transport) {
                showCustomAlert("ስህተት", "እባክዎ ያላስገቡት ወይም ያልመረጡት የፎርም ዝርዝር አለ! ሁሉንም ግዴታ የሆኑትን በትክክል ይሙሉ!");
                return;
            }

            let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 0;
            let vatAmount = (grandTotal * vatRate) / 100;
            let finalTotal = grandTotal + vatAmount;
            
            // የኤችቲኤምኤል ታጎች እንዳይታዩ ወደ ንፁህ ፅሁፍ (Plain Text) ተቀይሯል፣ እና አላስፈላጊ የቫት ትንታኔ ወጥቷል
            let confirmMsg = `የታዘዙ ዕቃዎች: ${combinedItems}\nየትራንስፖርት: ${res.transport === 'car' ? '🚗 መኪና' : '🏍️ ሞተረኛ'}\n\nጠቅላላ የሚጠበቅ ሂሳብ: ${finalTotal.toFixed(2)} ETB\n\nይህንን ትዕዛዝ ወደ ሻጩ መላክ እርግጠኛ ነዎት?`;

            showCustomConfirm("📦 የትዕዛዝ ማረጋገጫ (Order Checkout)", confirmMsg, () => {
                if(!t.data) t.data = {};
                if(!t.data.deliveryOrders) t.data.deliveryOrders = [];

                let orderId = Math.floor(100000 + Math.random() * 900000);
                t.data.deliveryOrders.push({
                    orderId: orderId, buyerUser: currentBuyer.username, buyerPhone: res.phone,
                    address: res.address, mapLink: res.mapLink,
                    itemIdx: window.buyerCartData[0].itemIdx, // Primary ID for legacy logic
                    itemName: combinedItems,
                    qty: 1, // Quantity representing 1 grouped package
                    price: grandTotal, 
                    total: grandTotal,
                    status: "pending", date: getTodayFormatted(),
                    transport: res.transport, deliveryFeePaid: 0,
                    cartItems: window.buyerCartData // Preserving original array
                });
                
                localDB.tenants[shopKey] = t;
                pushToFirebase();

                if (typeof db !== 'undefined' && navigator.onLine) {
                    db.ref(`tirfe_system/tenants/${shopKey}/data/deliveryOrders`).set(t.data.deliveryOrders);
                }

                window.buyerCartData = [];
                renderBuyerCart();
                showCustomAlert("ተሳክቷል", "ትዕዛዝዎ በዴሊቨሪ ለሻጩ ተልኳል። ሻጩ ሲቀበለው በገጽዎ ላይ 'በመንገድ ላይ ነው' የሚል ምልክት ያያሉ።");
                renderBuyerCatalog();
            });
        });
    }
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
                    delete allT[k].staffAccounts; 
                    delete allT[k].telegramToken; 
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
    
    if (localDB.tenants) { 
        Object.values(localDB.tenants).forEach(t => { if (t.status === "active") { categories.add(t.businessType || "አጠቃላይ ንግድ"); } });
    }
    
    let catContainer = document.getElementById('buyerCategoryContainer');
    if (catContainer) {
        let catHTML = `<button class="category-btn ${activeCategoryFilter === 'all' ? 'active' : ''}" onclick="setCategoryFilter('all')">🌐 ሁሉም</button>`;
        categories.forEach(cat => { catHTML += `<button class="category-btn ${activeCategoryFilter === cat ? 'active' : ''}" onclick="setCategoryFilter('${cat}')">🛍️ ${cat}</button>`; });
        catContainer.innerHTML = catHTML;
    }

    let activeOrdersHTML = "";
    let historyOrdersHTML = "";
    let myReceiptsHTML = "";
    let historyDateFilter = document.getElementById('buyerOrderHistoryDateFilter') ? document.getElementById('buyerOrderHistoryDateFilter').value : "";
    let liveBuyer = (currentBuyer && localDB.buyers) ? localDB.buyers[currentBuyer.username] : currentBuyer;
    
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
                            allItems.push({ ...item, originalIdx: index, shopKey: tKey, tenant: t });
                        }
                    });
                }

                if(liveBuyer && t.data && t.data.deliveryOrders) {
                    t.data.deliveryOrders.forEach(ord => {
                        if(ord.buyerUser === liveBuyer.username) {
                            let st = ord.status;
                            let badge = st === "pending" ? "በመጠባበቅ ላይ" : (st === "accepted" ? "በመንገድ ላይ" : (st === "completed" ? "ተረክበዋል" : "ተመልሷል"));
                            let cl = st === "pending" ? "text-warning" : (st === "accepted" ? "text-success" : (st === "completed" ? "text-success" : "text-danger"));
                            
                            let transportBadge = ord.transport === 'car' ? '🚗 መኪና' : (ord.transport === 'motor' ? '🏍️ ሞተረኛ' : '');

                            let feeSection = "";
                            if(ord.transport === "motor" && (st === "pending" || st === "accepted")) {
                                let feeValue = ord.deliveryFeePaid > 0 ? ord.deliveryFeePaid : "";
                                let isDisabled = ord.deliveryFeePaid > 0 ? "disabled" : "";
                                let btnText = ord.deliveryFeePaid > 0 ? "ገብቷል" : "አስገባ";
                                feeSection = `
                                <div style="margin-top: 8px; display: flex; gap: 5px; align-items: center; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                                    <input type="number" id="delFee_${tKey}_${ord.orderId}" placeholder="የዴሊቨሪ ክፍያ (ብር)" style="width: 130px; padding: 6px; margin: 0; font-size: 0.85rem;" value="${feeValue}" ${isDisabled}>
                                    <button class="btn-sell btn-sm" onclick="submitDeliveryFee('${tKey}', '${ord.orderId}')" ${isDisabled} style="padding: 6px 12px; white-space:nowrap;">${btnText}</button>
                                </div>`;
                            }
                            
                            let vatRate = (localDB.adminSettings && localDB.adminSettings.vatRate) ? parseFloat(localDB.adminSettings.vatRate) : 0;
                            let ordVat = (ord.total * vatRate) / 100;
                            let ordTotalWithVat = ord.total + ordVat;
                            let displayItemName = ord.cartItems ? ord.itemName : `${ord.itemName} (x${ord.qty})`;
                            
                            let rowHtml = `<tr>
                                <td>${t.shopName}<br><small style="color:var(--accent-color)">${transportBadge}</small></td>
                                <td>${displayItemName}</td>
                                <td>${ordTotalWithVat.toFixed(2)} ETB <br><small style="color:gray; font-size:0.7rem;">(ከነ ቫት)</small></td>
                                <td>${ord.date}</td>
                                <td class="${cl}"><b>${badge}</b>${feeSection}</td>
                             </tr>`;
                            
                            if(st === "pending" || st === "accepted") {
                                activeOrdersHTML += rowHtml;
                            } else {
                                if (!historyDateFilter || ord.date === historyDateFilter) {
                                    historyOrdersHTML += rowHtml;
                                }
                            }
                        }
                    });
                }
            }
        });
    }

    allItems.sort((a, b) => {
        let scoreA = (a.name.charCodeAt(0) || 0) + (a.shopKey.charCodeAt(0) || 0) + a.originalIdx;
        let scoreB = (b.name.charCodeAt(0) || 0) + (b.shopKey.charCodeAt(0) || 0) + b.originalIdx;
        return (scoreA % 7) - (scoreB % 7) || scoreA - scoreB;
    });
    
    let carouselHTML = '';
    if (allItems.length > 0) {
        hasData = true;
        let carouselItems = allItems.slice(0, 8);
        
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
                    <button class="btn-add btn-sm" style="width: 100%; margin-top: 8px; padding: 8px 0; font-size: 0.85rem; border-radius: 4px; font-weight:bold;" onclick="addToBuyerCart('${item.shopKey}', ${item.originalIdx}, '${item.name}', ${item.price}, ${item.qty - item.sold})">🛒 ወደ ካርት ጨምር</button>
                </div>
            `;
        });
        
        carouselHTML += `
            </div>
        </div>
        <div style="grid-column: 1 / -1; margin-bottom: 12px; margin-top: 5px;"><h3 style="color: #fff; font-size: 1.1rem; margin: 0; font-weight: 600;">🛍️ አጠቃላይ የዕቃዎች ዝርዝር (All Mixed Products)</h3></div>
        `;

        container.innerHTML = carouselHTML;

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
                        <button class="btn-success btn-block" style="background:var(--warning-color); color:#000; font-weight:bold; font-size: 1rem; padding: 10px;" onclick="addToBuyerCart('${item.shopKey}', ${item.originalIdx}, '${item.name}', ${item.price}, ${rem})">🛒 ወደ ካርት ጨምር (Add to Cart)</button>
                    </div>
                    <div class="shop-links" style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; padding:0; margin:0;">
                        <a href="tel:${t.phone}" class="btn-link-action" style="background:#22c55e; color:#fff; padding:4px; font-size:0.75rem; text-align:center; border-radius:4px; display:block; text-decoration:none;">📞 ደውል</a>
                        ${tgLink ? `<a href="https://t.me/${tgLink}" target="_blank" class="btn-link-action" style="background:#0088cc; color:#fff; padding:4px; font-size:0.75rem; text-align:center; border-radius:4px; display:block; text-decoration:none;">✈️ ቴሌግራም</a>` : `<span class="btn-link-action" style="background:#334155; color:#64748b; padding:4px; font-size:0.75rem; text-align:center; border-radius:4px; display:block;">✈️ የለም</span>`}
                    </div>
                </div>
            </div>`;
            container.innerHTML += singleProductHTML;
        });

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

    let activeOrdersBody = document.getElementById('buyerActiveOrdersBody');
    if(activeOrdersBody) {
        if(activeOrdersHTML === "") activeOrdersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">በአሁኑ ሰዓት ምንም ትዕዛዝ የለም።</td></tr>`;
        else activeOrdersBody.innerHTML = activeOrdersHTML;
    }

    let historyOrdersBody = document.getElementById('buyerHistoryOrdersBody');
    if(historyOrdersBody) {
        if(historyOrdersHTML === "") historyOrdersBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">በተመረጠው ቀን ያለቀ/የተመለሰ ትዕዛዝ የለም።</td></tr>`;
        else historyOrdersBody.innerHTML = historyOrdersHTML;
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
