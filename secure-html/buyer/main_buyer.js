// የገዥ (Buyer) ሲስተም ዋና ኮዶች (main_buyer.js)
window.clearBuyerData = function() {
    if(!currentBuyer) return;
    showCustomConfirm("⚠️ እርግጠኛ ነዎት?", "ይህ እርምጃ የእርስዎን የተቆረጡ ደረሰኞች እና ጊዜያዊ የትዕዛዝ መረጃዎች ያጠፋል። በእርግጥ ማጥፋት ይፈልጋሉ?", () => {
        let buyerUsername = currentBuyer.username;
        // 1. መረጃዎችን ከ LocalStorage ላይ ማጥፋት (አካውንቱን / ፕሮፋይሉን ሳንነካ)
        if (localDB.buyers && localDB.buyers[buyerUsername]) {
            localDB.buyers[buyerUsername].receipts = [];
            currentBuyer.receipts = []; // አሁን ሎጊን ያደረገውንም ዩዘር ዳታ ማፅዳት
            saveToLocalStorage();
        }
        // የ Cart መረጃንም ባዶ ማድረግ
        window.buyerCartData = [];
        // 2. ከ Firebase ላይ ማጥፋት (ሪፍሬሽ ሲደረግ እንዳይመለስ)
        if (typeof db !== 'undefined' && navigator.onLine) {
            db.ref(`tirfe_system/buyers/${buyerUsername}/receipts`).remove().then(() => {
                showCustomAlert("✅ ተሳክቷል", "የደረሰኝ እና የትዕዛዝ መረጃዎችዎ በተሳካ ሁኔታ ተጠርገዋል!");
                renderBuyerCatalog();
            }).catch(err => {
                console.error("Firebase delete error:", err);
                // ስህተት ቢፈጠርም ሎካል ላይ ስለጠፋ ፔጁን አፕዴት እናደርገዋለን
                showCustomAlert("✅ ተሳክቷል", "መረጃዎ ጸድቷል፣ ነገር ግን ከኢንተርኔት ጋር ላይገናኝ ይችላል።");
                renderBuyerCatalog();
            });
        } else {
            showCustomAlert("✅ ተሳክቷል", "የደረሰኝ መረጃዎችዎ ተጠርገዋል። (Offline)");
            renderBuyerCatalog();
        }
    });
};
// ----------------------------------------------------
window.openBuyerProfileSettings = function() {
    if(!currentBuyer) return;
    // ✅ ኢሜል/ፓስዎርድ ከዚህ ውስጥ ተነስተዋል፤ ለብቻቸው 🔑/📧 2-ደረጃ ማረጋገጫ ባላቸው ፈንክሽኖች ብቻ ይቀየራሉ
    showFormModal("⚙️ የፕሮፋይል ሲቲንግ", [
        { id: "b_name", label: "ሙሉ ስም (Name)", type: "text", defaultValue: currentBuyer.name },
        { id: "b_username", label: "መግቢያ ስም (Username)", type: "text", defaultValue: currentBuyer.username },
        { id: "b_phone", label: "ስልክ ቁጥር (Phone)", type: "tel", defaultValue: currentBuyer.phone }
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
        currentBuyer.phone = newP; 
        if(oldU !== newU) {
            localDB.buyers[newU] = currentBuyer;
            delete localDB.buyers[oldU];
            localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'buyer', loginMode: 'buyer', username: newU }));
        } else { 
            localDB.buyers[newU] = currentBuyer;
        }
        pushBuyerFirebase();
        renderBuyerCatalog();
        showCustomAlert("✅ ተሳክቷል", "ፕሮፋይልዎ በትክክል ተስተካክሏል!");
    });
};
// ==========================================================
// 🔑 የይለፍ ቃል ቀይር - 2-ደረጃ ፍሎው (ደረጃ1፡ ነባሩን ማረጋገጥ → ደረጃ2፡ አዲሱን ማስገባት)
// ==========================================================
window.changeBuyerPassword = function() {
    if(!currentBuyer) return;
    let oldEmail = currentBuyer.email;
    showFormModal("🔒 ደረጃ 1/2 - ማረጋገጫ", [
        { id: "curPass", label: "የይለፍ ቃል ለመቀየር የአሁኑን የይለፍ ቃል ያስገቡ፦", type: "password", placeholder: "የአሁኑ ፓስዎርድ" }
    ], async (res) => {
        let curPass = res.curPass ? res.curPass.trim() : "";
        if(!curPass) { showCustomAlert("ስህተት", "እባክዎ የአሁኑን ፓስዎርድ ያስገቡ!"); return; }
        try {
            let cred = firebase.auth.EmailAuthProvider.credential(oldEmail, curPass);
            await auth.currentUser.reauthenticateWithCredential(cred);
        } catch(error) {
            console.error("Buyer Password Reauth Error:", error);
            let errMsg = "ማረጋገጫው አልተሳካም! " + (error.message || "");
            if(error.code === 'auth/wrong-password') errMsg = "❌ ያስገቡት የአሁኑ ፓስዎርድ ትክክል አይደለም!";
            if(error.code === 'auth/too-many-requests') errMsg = "❌ በጣም ብዙ ጊዜ ተሞክሯል፣ እባክዎ ትንሽ ቆይተው ደግመው ይሞክሩ!";
            showCustomAlert("❌ ስህተት", errMsg);
            return;
        }
        showFormModal("🔑 ደረጃ 2/2 - አዲስ የይለፍ ቃል", [
            { id: "newPass", label: "አዲስ የይለፍ ቃል፦", type: "password", placeholder: "ቢያንስ 6 ፊደል/ቁጥር" },
            { id: "newPass2", label: "አዲሱን የይለፍ ቃል ደግመው ያስገቡ፦", type: "password", placeholder: "አዲስ የይለፍ ቃል ያረጋግጡ" }
        ], async (res2) => {
            let newPass = res2.newPass ? res2.newPass.trim() : "";
            let newPass2 = res2.newPass2 ? res2.newPass2.trim() : "";
            if(!newPass || newPass.length < 6) { showCustomAlert("ስህተት", "አዲሱ የይለፍ ቃል ቢያንስ 6 ፊደል/ቁጥር ሊኖረው ይገባል!"); return; }
            if(newPass !== newPass2) { showCustomAlert("ስህተት", "ያስገቧቸው ሁለት አዲስ የይለፍ ቃሎች አይመሳሰሉም!"); return; }
            try {
                await auth.currentUser.updatePassword(newPass);
                localDB.buyers[currentBuyer.username] = currentBuyer;
                pushBuyerFirebase();
                showCustomAlert("ተሳክቷል", "የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል! ከዚህ በኋላ በአዲሱ የይለፍ ቃል ብቻ ሎጊን ያድርጉ።");
            } catch(error) {
                console.error("Buyer Update Password Error:", error);
                let errMsg = "የይለፍ ቃል ማስቀመጥ አልተቻለም! " + (error.message || "");
                if(error.code === 'auth/requires-recent-login') errMsg = "❌ ደህንነት ችግር፡ እባክዎ Logout አድርገው እንደገና ሎጊን ካደረጉ በኋላ ይሞክሩ!";
                if(error.code === 'auth/weak-password') errMsg = "❌ አዲሱ ፓስዎርድ ደካማ ነው (ቢያንስ 6 ፊደል/ቁጥር ያስፈልጋል)!";
                showCustomAlert("❌ ስህተት", errMsg);
            }
        });
    });
};
// ==========================================================
// 📧 ኢሜል ቀይር - 2-ደረጃ ፍሎው (ደረጃ1፡ ነባሩን ማረጋገጥ → ደረጃ2፡ አዲሱን ማስገባት)
// ==========================================================
window.changeBuyerEmail = function() {
    if(!currentBuyer) return;
    let oldEmail = currentBuyer.email;
    showFormModal("🔒 ደረጃ 1/2 - ማረጋገጫ", [
        { id: "curPass", label: "ኢሜል ለመቀየር የአሁኑን የይለፍ ቃል ያስገቡ፦", type: "password", placeholder: "የአሁኑ ፓስዎርድ" }
    ], async (res) => {
        let curPass = res.curPass ? res.curPass.trim() : "";
        if(!curPass) { showCustomAlert("ስህተት", "እባክዎ የአሁኑን ፓስዎርድ ያስገቡ!"); return; }
        try {
            let cred = firebase.auth.EmailAuthProvider.credential(oldEmail, curPass);
            await auth.currentUser.reauthenticateWithCredential(cred);
        } catch(error) {
            console.error("Buyer Email Reauth Error:", error);
            let errMsg = "ማረጋገጫው አልተሳካም! " + (error.message || "");
            if(error.code === 'auth/wrong-password') errMsg = "❌ ያስገቡት የአሁኑ ፓስዎርድ ትክክል አይደለም!";
            if(error.code === 'auth/too-many-requests') errMsg = "❌ በጣም ብዙ ጊዜ ተሞክሯል፣ እባክዎ ትንሽ ቆይተው ደግመው ይሞክሩ!";
            showCustomAlert("❌ ስህተት", errMsg);
            return;
        }
        showFormModal("📧 ደረጃ 2/2 - አዲስ ኢሜል", [
            { id: "newEmail", label: "አዲስ ኢሜል (Gmail)፦", type: "email", placeholder: "newemail@gmail.com" },
            { id: "newEmail2", label: "አዲሱን ኢሜል ደግመው ያስገቡ፦", type: "email", placeholder: "አዲስ ኢሜል ያረጋግጡ" }
        ], async (res2) => {
            let newEmail = res2.newEmail ? res2.newEmail.trim() : "";
            let newEmail2 = res2.newEmail2 ? res2.newEmail2.trim() : "";
            if(!newEmail) { showCustomAlert("ስህተት", "እባክዎ አዲሱን ኢሜል ያስገቡ!"); return; }
            if(newEmail.toLowerCase() !== newEmail2.toLowerCase()) { showCustomAlert("ስህተት", "ያስገቧቸው ሁለት አዲስ ኢሜሎች አይመሳሰሉም!"); return; }
            if(newEmail.toLowerCase() === String(oldEmail || "").toLowerCase()) { showCustomAlert("ስህተት", "አዲሱ ኢሜል ካለው ኢሜል ጋር ተመሳሳይ ነው!"); return; }
            try {
             await auth.currentUser.updateEmail(newEmail);
                currentBuyer.email = newEmail;
                localDB.buyers[currentBuyer.username] = currentBuyer;
                pushBuyerFirebase();
                renderBuyerCatalog();                showCustomAlert("ተሳክቷል", "ኢሜልዎ በተሳካ ሁኔታ ተቀይሯል! ከዚህ በኋላ በአዲሱ ኢሜል ብቻ ሎጊን ያድርጉ።");
            } catch(error) {
                console.error("Buyer Update Email Error:", error);
                let errMsg = "ኢሜል ማስቀመጥ አልተቻለም! " + (error.message || "");
                if(error.code === 'auth/requires-recent-login') errMsg = "❌ ደህንነት ችግር፡ እባክዎ Logout አድርገው እንደገና ሎጊን ካደረጉ በኋላ ይሞክሩ!";
                if(error.code === 'auth/email-already-in-use') errMsg = "❌ ይህ ኢሜል በሌላ አካውንት ተይዟል!";
                if(error.code === 'auth/invalid-email') errMsg = "❌ የገቡት ኢሜል ቅርፅ ትክክል አይደለም!";
                showCustomAlert("❌ ስህተት", errMsg);
            }
        });
    });
};
window.addToBuyerCart = function(shopKey, itemIdx, itemName, price, availableRem) {
    if(!currentBuyer) { showCustomAlert("ማሳሰቢያ", "እባክዎ መጀመሪያ እንደ ገዥ ይግቡ/ይመዝገቡ!"); return; 
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
    // 🔒 PRIVACY FIX
    let orderKey = `${shopKey}_${orderId}`;
    let t = localDB.tenants[shopKey];
    if(localDB.myOrders && localDB.myOrders[orderKey]) {
        let ord = localDB.myOrders[orderKey];
        {
            ord.deliveryFeePaid = fee;
            // 
            function pushFeeToMotor(motorUsername) {
                if (typeof db === 'undefined' || !navigator.onLine || !motorUsername) return;
                let motorFeeUpdate = {};
                motorFeeUpdate[`tirfe_system/motors/${motorUsername}/incomingFee`] = fee;
                motorFeeUpdate[`tirfe_system/motors/${motorUsername}/lastUpdated`] = Date.now();
                db.ref().update(motorFeeUpdate);
                if (typeof sendMotorTelegramAlert === 'function') {
                    sendMotorTelegramAlert(motorUsername, `💸 አዲስ የዴሊቨሪ ክፍያ ተልኮልዎታል!\n\nገዥው ${fee} ETB ሲስተሙ ላይ አስገብቷል። እባክዎ ዳሽቦርድዎን ያረጋግጡ።`);
                }
            }
            if (ord.motorUser) {
                pushFeeToMotor(ord.motorUser);
            } else if (typeof db !== 'undefined' && navigator.onLine) {

                // 🔒 SECURITY/PRIVACY FIX:
                if (!t || !t.locationKey) {
                    console.warn("ሞተረኛ ፍለጋ አልተቻለም: የሱቁ locationKey አልተገኘም።");
                } else {
                    db.ref('tirfe_system/motors').orderByChild('locationKey').equalTo(t.locationKey).once('value').then(snap => {
                        let areaMotors = snap.val() || {};
                        Object.keys(areaMotors).forEach(mUser => {
                            let m = areaMotors[mUser];
                            let matched = (m.activeOrders || []).find(mo => mo.orderId == orderId || mo.buyerPhone == ord.buyerPhone);
                            if (matched && matched.status === 'accepted') {
                                ord.motorUser = mUser;
                                pushFeeToMotor(mUser);
                                db.ref(`tirfe_system/tenants/${shopKey}/data/deliveryOrders`).transaction((currentOrders) => {
                                    if (!currentOrders) return currentOrders;
                                    let ordersArr = Array.isArray(currentOrders) ? currentOrders : Object.values(currentOrders);
                                    let i2 = ordersArr.findIndex(o => o && o.orderId == orderId);

                                    if (i2 > -1) ordersArr[i2].motorUser = mUser;

                                    return ordersArr;

                                }).then((result) => {

                                    db.ref(`tirfe_system/tenants/${shopKey}/lastUpdated`).set(Date.now());

                                    // 🔒 PRIVACY FIX: ጠቅላላ deliveryOrders array ወደ buyer_catalog
                                    // (ሁሉም ገዢ ማንበብ ወደሚችለው) ከመጻፍ ይልቅ የተነካውን ትዕዛዝ ብቻ ለራሱ

                                    // ገዢ per-user node ላይ mirror እናደርጋለን።

                                    if (result.committed) {

                                        let ordersArr = result.snapshot.val() || [];

                                        let changedOrder = ordersArr.find(o => o && o.orderId == orderId);

                                        if (changedOrder) mirrorOrderToBuyer(changedOrder, shopKey);

                                    }

                                });

                            }

                        });

                    }).catch(err => console.warn("ማሳሰቢያ: ሞተረኛ ፍለጋ አልተሳካም:", err));

                }

            }



            localDB.myOrders[orderKey] = ord;

            saveToLocalStorage();

            pushBuyerFirebase();

            if (typeof db !== 'undefined' && navigator.onLine) {

                // 🆕 FIX: read→modify→write ሳይሆን transaction() ስለሆነ ከሌላ ጎን (ለምሳሌ

                // ሻጭ በራሱ በኩል) ተመሳሳይ ደቂቃ ላይ ለውጥ ቢያደርግ ዳታ አይጠፋም/አይደገምም።

                db.ref(`tirfe_system/tenants/${shopKey}/data/deliveryOrders`).transaction((currentOrders) => {
                    if (!currentOrders) return currentOrders;

                    let ordersArr = Array.isArray(currentOrders) ? currentOrders : Object.values(currentOrders);

                    let i3 = ordersArr.findIndex(o => o && o.orderId == orderId);

                    if (i3 > -1) ordersArr[i3].deliveryFeePaid = fee;

                    return ordersArr;

                }).then((result) => {

                    if (result.committed) {

                        db.ref(`tirfe_system/tenants/${shopKey}/lastUpdated`).set(Date.now());

                        // 🔒 PRIVACY FIX: ጠቅላላ deliveryOrders array ወደ buyer_catalog

                        // (ሁሉም ገዢ ማንበብ ወደሚችለው) ከመጻፍ ይልቅ የተነካውን ትዕዛዝ ብቻ ለራሱ

                        // ገዢ per-user node ላይ mirror እናደርጋለን።

                        let ordersArr = result.snapshot.val() || [];

                        let changedOrder = ordersArr.find(o => o && o.orderId == orderId);

                        if (changedOrder) mirrorOrderToBuyer(changedOrder, shopKey);

                    }

                });

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



// 🔒 PRIVACY FIX: ከዚህ በፊት የሱቁ ጠቅላላ deliveryOrders array (ማለትም ያ ሱቅ ላይ ያዘዙት

// ሁሉም ገዢዎች ትዕዛዝ - ስልክ ቁጥር፣ አድራሻ፣ የጎግል ማፕ ሊንክ ጨምሮ) ወደ 'buyer_catalog' node ይገለበጥ

// ነበር - ያ node ላይ ደግሞ ማንኛውም ገዢ (setupBuyerListeners) ስለሚያዳምጥ የሌላ ገዢ የግል መረጃ

// ወደ ራሱ IndexedDB/localStorage ይወርድ ነበር። አሁን ለእያንዳንዱ order የተለየ per-buyer node

// (tirfe_system/buyer_orders/{ራሱ ገዢ username}/...) ላይ ብቻ ስለምንጽፍ፣ ገዢው የራሱን ትዕዛዝ

// ብቻ ነው ማየት/ማውረድ የሚችለው (ይህ Firebase Security Rules ደግሞ ማስከበር አለበት - ከታች ማስታወሻ ይመልከቱ)።

function mirrorOrderToBuyer(order, shopKey) {

    if (typeof db === 'undefined' || !navigator.onLine || !order || !order.buyerUser) return;

    let path = `tirfe_system/buyer_orders/${order.buyerUser}/${shopKey}_${order.orderId}`;

    db.ref(path).set({

        shopKey: shopKey, orderId: order.orderId, itemName: order.itemName,

        total: order.total, status: order.status, transport: order.transport,

        deliveryFeePaid: order.deliveryFeePaid || 0, motorUser: order.motorUser || null,

        // 🔒 ማስታወሻ: buyerPhone/address/mapLink እዚህ ማካተት ችግር የለውም ምክንያቱም ይህ node

        // ራሱ ለዚያ ገዢ ብቻ የተገደበ ነው (የራሱ ዳታ) - ችግር የነበረው ይህ ወደ ጋራ 'buyer_catalog'

        // ሲገለበጥ (ለሌላ ገዢዎችም ስለሚደርስ) ብቻ ነው።

        buyerPhone: order.buyerPhone, address: order.address, mapLink: order.mapLink,
        date: order.date, lastUpdated: Date.now()

    }).catch(err => console.error("Buyer order mirror failed:", err));

}



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
            let newCartItems = [];

            window.buyerCartData.forEach(item => {

                newCartItems.push({

                    itemIdx: item.itemIdx, 

                    itemName: item.itemName, qty: item.qty, price: item.price, total: item.total

                });

            });



            // 🔒 SECURITY/RACE-CONDITION FIX (v2): once('value') → .update() የነበረው

            // read-modify-write pattern atomic ስላልነበረ፣ ተመሳሳይ ደቂቃ/ሰከንድ ላይ ሌላ ጽሁፍ

            // (ለምሳሌ ተመሳሳይ ገዢ ከሌላ ትር/መሳሪያ፣ ወይም ሌላ ሂደት) ወደዚሁ path ቢጽፍ አንዱ የሌላውን

            // ውጤት ይደመስስ ነበር። transaction() ደግሞ Firebase server ራሱ ግጭት ካጋጠመ

            // ራሱ በራሱ በጣም የቅርብ ጊዜውን ዳታ ላይ ደግሞ ስለሚተገብር ምንም ትዕዛዝ ፈጽሞ አይጠፋም።

            if (typeof db !== 'undefined' && navigator.onLine) {

                db.ref(`tirfe_system/tenants/${shopKey}/data/remoteCarts/${currentBuyer.username}`)

                  .transaction((currentCart) => {

                      let latestCart = currentCart || [];

                      newCartItems.forEach(ci => latestCart.push(ci));

                      return latestCart;

                  })

                  .then((result) => {
                      if (result.committed) {

                          // የሻጩ real-time listener (shouldUpdateLocal) tenant root ላይ

                          // ያለው lastUpdated ሲቀየር ብቻ ስለሚነቃ፣ ያንን ለብቻ እናዘምናለን።

                          db.ref(`tirfe_system/tenants/${shopKey}/lastUpdated`).set(Date.now());

                      } else {

                          showCustomAlert("ስህተት", "ትዕዛዝ መላክ አልተቻለም፣ እባክዎ ደግመው ይሞክሩ።");

                      }

                  })

                  .catch(err => {

                      console.error("Cart transaction failed:", err);

                      showCustomAlert("ስህተት", "ትዕዛዝ መላክ አልተቻለም፣ እባክዎ ደግመው ይሞክሩ።");

                  });

            } else {

                if(!t.data) t.data = {};

                if(!t.data.remoteCarts) t.data.remoteCarts = {};

                if(!t.data.remoteCarts[currentBuyer.username]) t.data.remoteCarts[currentBuyer.username] = [];

                newCartItems.forEach(ci => t.data.remoteCarts[currentBuyer.username].push(ci));

                t.lastUpdated = Date.now();

                localDB.tenants[shopKey] = t;

                saveToLocalStorage();

                // 🆕 FIX: pushBuyerFirebase() የገዢውን ራሱን ዳታ ብቻ ስለሚልክ (የሻጩን tenant ዳታ
                // አይደለም)፣ ኦፍላይን ሆኖ ትዕዛዝ ሲላክ ወደ ሻጩ በጭራሽ አይደርስም ነበር። አሁን የሻጩን ዳታ

                // (አዲሱን remoteCart ጨምሮ) በቀጥታ ወደ actionQueue በመጨመር ሲመለስ እንዲላክ ተደርጓል።

                queueAction('UPDATE', 'tenants', shopKey, cleanData(t));

            }



            window.buyerCartData = [];

            renderBuyerCart();

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
            let confirmMsg = `የታዘዙ ዕቃዎች: ${combinedItems}\nየትራንስፖርት: ${res.transport === 'car' ? '🚗 መኪና' : '🏍️ ሞተረኛ'}\n\nጠቅላላ የሚጠበቅ ሂሳብ: ${finalTotal.toFixed(2)} ETB\n\nይህንን ትዕዛዝ ወደ ሻጩ መላክ እርግጠኛ ነዎት?`;
            showCustomConfirm("📦 የትዕዛዝ ማረጋገጫ (Order Checkout)", confirmMsg, () => {
                let orderId = Math.floor(100000 + Math.random() * 900000);
                let newOrder = {
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
                };
                if (typeof db !== 'undefined' && navigator.onLine) {
                   db.ref(`tirfe_system/tenants/${shopKey}/data/deliveryOrders`).transaction((currentOrders) => {
                        let ordersArr = currentOrders ? (Array.isArray(currentOrders) ? currentOrders : Object.values(currentOrders)) : [];
                        // Check to prevent double-click duplicates
                        if(!ordersArr.find(o => o && o.orderId === orderId)) {
                            ordersArr.push(newOrder);
                        }
                        return ordersArr;
                    }).then((result) => {
                        if (result.committed) {
                            db.ref(`tirfe_system/tenants/${shopKey}/lastUpdated`).set(Date.now());
                           mirrorOrderToBuyer(newOrder, shopKey);
                        }
                    });
                } else {
                    if(!t.data) t.data = {};
                    if(!t.data.deliveryOrders) t.data.deliveryOrders = [];
                    t.data.deliveryOrders.push(newOrder);
                    t.lastUpdated = Date.now();
                    localDB.tenants[shopKey] = t;
                    saveToLocalStorage();
                    queueAction('UPDATE', 'buyer_orders', `${newOrder.buyerUser}/${shopKey}_${newOrder.orderId}`, {
                        shopKey: shopKey, orderId: newOrder.orderId, itemName: newOrder.itemName,
                        total: newOrder.total, status: newOrder.status, transport: newOrder.transport,
                        deliveryFeePaid: newOrder.deliveryFeePaid || 0, motorUser: null,
                        date: newOrder.date, lastUpdated: Date.now()
                    });
                    // 🆕 FIX: pushBuyerFirebase
                    queueAction('UPDATE', 'tenants', shopKey, cleanData(t));
                }
                window.buyerCartData = [];
                renderBuyerCart();
                showCustomAlert("ተሳክቷል", "ትዕዛዝዎ በዴሊቨሪ ለሻጩ ተልኳል። ሻጩ ሲቀበለው በገጽዎ ላይ 'በመንገድ ላይ ነው' የሚል ምልክት ያያሉ።");
                renderBuyerCatalog();
            });
        });
    }
};
window.renderBuyerCatalog = async function() {
    if (typeof setupSecureUserListeners === 'function') setupSecureUserListeners();
    if (!window.buyerDateFiltersInitialized) {
        let d = new Date();
        let todayStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
        let histFilter = document.getElementById('buyerOrderHistoryDateFilter');
        if (histFilter && !histFilter.value) histFilter.value = todayStr;
        let recFilter = document.getElementById('buyerReceiptDateFilter');
        if (recFilter && !recFilter.value) recFilter.value = todayStr;
        window.buyerDateFiltersInitialized = true;
    }
    // -------------------------------------------------------------------------
    if(currentBuyer) {
        let badge = document.getElementById('buyerProfileBadge');
        if(badge) badge.innerText = `👤 የተጠቃሚ ስም: ${currentBuyer.username} | 📱 ስልክ: ${currentBuyer.phone}`;
        renderBuyerCart();
    }
    let container = document.getElementById('buyerShopsContainer');
    if(!container) return;
    if (typeof db !== 'undefined' && (!localDB.tenants || Object.keys(localDB.tenants).length === 0)) {
        try {
            let snap = await db.ref('tirfe_system/buyer_catalog').once('value');
            if(snap.exists()) {
                localDB.tenants = snap.val();
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

                // 🔒 PRIVACY FIX
                if (liveBuyer && localDB.myOrders) {
                    Object.values(localDB.myOrders).filter(ord => ord.shopKey === tKey).forEach(ord => {
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
                        let rowHtml = `<tr>
                            <td>${t.shopName}<br><small style="color:var(--accent-color)">${transportBadge}</small></td>
                            <td>${ord.itemName}</td>
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
// 🆕 Promise)
window.addEventListener('DOMContentLoaded', () => {
    const runCatalog = () => { if (typeof window.renderBuyerCatalog === 'function') window.renderBuyerCatalog(); };
    if (window.dbReadyPromise && typeof window.dbReadyPromise.then === 'function') {
        window.dbReadyPromise.then(runCatalog);
    } else {
        runCatalog();
    }
});
