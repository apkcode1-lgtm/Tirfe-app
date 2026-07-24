function triggerShiftReport() {
    let d = currentTenant.data || {}; let session = d.sessionData || {};
    let sysSales = parseFloat(d.collectedCreditToday || 0); let todayProfit = 0; let inv = d.inventory || [];
    inv.forEach(item => { sysSales += (item.price * item.sold); todayProfit += (item.price - item.cost) * item.sold; });
    showFormModal("🔒 የዕለት ሂሳብ ሪፖርት መዝጊያ ማቅረቢያ", [
        { id: "reportedCash", label: "በእጅዎ የሚገኘውን ትክክለኛ የጥሬ ገንዘብ (Cash) መጠን ያስገቡ፦", type: "number", placeholder: "0.00" }
    ], (res) => {
        let reported = parseFloat(res.reportedCash) || 0; let tExp = 0; let tDraw = 0; let formattedDateToday = getTodayFormatted();
        (d.expenses || []).forEach(e => { if (e.date === formattedDateToday) tExp += parseFloat(e.amount) || 0; });
        (d.drawerLog || []).forEach(dr => tDraw += parseFloat(dr.amount) || 0);
        let creditSalesToday = 0;
        (d.debts || []).forEach(debt => { if(debt.date === formattedDateToday) creditSalesToday += debt.amount; });

        let expectedCash = ((parseFloat(session.initialFloat) || 0) + sysSales) - creditSalesToday - tExp - tDraw;
        let variance = reported - expectedCash;
        let statusText = variance === 0 ? "ትክክል (Balanced)" : `ልዩነት አለ (${variance} ETB)`;
        d.shiftClosed = true; d.reportedCash = reported; d.variance = variance; d.expectedCash = expectedCash;
        
        document.getElementById('shiftStatusAlert').classList.add('hidden');
        let msg = `የዕለቱ ሂሳብ በተሳካ ሁኔታ ተዘጋጅቷል!\nሁኔታ፡ ${statusText}\nበሲስተሙ የሚጠበቅ ካሽ፡ ${expectedCash} ETB\nየቀረበው ካሽ፡ ${reported} ETB`;
        showCustomAlert("ሪፖርት ቀርቧል", msg);
        
        if(!d.history) d.history = [];
        d.history.push({
            date: formattedDateToday, employee: session.employee || "ሰራተኛ", sales: sysSales, 
            profit: todayProfit - tExp, expenses: tExp, draws: tDraw, reportedCash: reported, expectedCash: expectedCash, variance: variance, isMonthlyArchive: false
        });
        currentTenant.data = d; saveAndRefresh();
        sendTelegramAlert(`🔒 የዕለት ሂሳብ ተዘግቷል (${currentUserRole === 'staff' ? 'በሰራተኛ' : 'በአሰሪ'}):\n${msg}`);
    });
}

function checkMorningSession() {
    let d = currentTenant.data || {};
    if (!d.sessionActive) {
        showFormModal("የቀኑ መጀመሪያ መመዝገቢያ (የካዝና ማስሞያ)", [
            { id: "employee", label: "የገቢ አድራጊው/ሰራተኛው ስም ያስገቡ፦", type: "text", placeholder: "ስም", defaultValue: currentUserRole === "staff" ? "ሰራተኛ" : "አሰሪ" },
            { id: "initialFloat", label: "ጠዋት በካዝና/ሳጥን ውስጥ የተገኘ መነሻ ገንዘብ (Float)፦", type: "number", placeholder: "0.00", defaultValue: "0" }
        ], (res) => {
            d.sessionData = { date: getTodayFormatted(), loginTime: new Date().toLocaleTimeString('en-GB'), employee: res.employee || "ሰራተኛ", initialFloat: parseFloat(res.initialFloat) || 0 };
            d.sessionActive = true; d.shiftClosed = false; d.expenses = d.expenses || []; 
            d.drawerLog = []; d.debts = d.debts || []; d.receipts = d.receipts || [];
            d.deliveryOrders = d.deliveryOrders || []; d.collectedCreditToday = 0;
            currentTenant.data = d; 
            document.getElementById('receiptDateFilter').value = getTodayFormatted();
            saveAndRefresh();
        });
    } else { renderApp(); }
}

