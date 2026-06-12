<!DOCTYPE html>
<html lang="am">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, minimum-scale=0.5, maximum-scale=3.0">
    <title>ትርፌ የሱቅ መቆጣጠሪያ አፕሊኬشن - Ultimate v11.0</title>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js"></script>
    <script src="https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: #151f32;
            --text-color: #38bdf8;
            --accent-color: #38bdf8;
            --success-color: #4ade80;
            --danger-color: #f87171;
            --warning-color: #fbbf24;
            --purple-color: #c084fc;
            --border-color: rgba(255, 255, 255, 0.08);
        }

        .theme-deepblue { --bg-color: #0b0f19; --card-bg: #151f32; --accent-color: #38bdf8; --success-color: #4ade80; }
        .theme-emerald { --bg-color: #061e1a; --card-bg: #0b3c34; --accent-color: #2ec4b6; --success-color: #4ade80; }
        .theme-purple { --bg-color: #1a0933; --card-bg: #2d1254; --accent-color: #a29bfe; --success-color: #00cec9; }
        .theme-charcoal { --bg-color: #121212; --card-bg: #1e1e1e; --accent-color: #9b59b6; --success-color: #2ecc71; }

        * { 
            box-sizing: border-box; 
            margin: 0; 
            padding: 0; 
            font-family: system-ui, -apple-system, sans-serif;
        }
        
        html, body {
            width: 100%;
            min-height: 100vh;
            background-color: var(--bg-color); 
            color: var(--text-color); 
            padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
            font-size: calc(12px + 0.4vw); 
            -webkit-text-size-adjust: 100%;
        }
        
        .container { 
            width: 100%; 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 12px;
        }
        
        .hidden { display: none !important; }
        
        .text-success { color: var(--success-color) !important; }
        .text-danger { color: var(--danger-color) !important; }
        .text-warning { color: var(--warning-color) !important; }
        .text-purple { color: var(--purple-color) !important; }
        
        .gateway-box, .login-box {
            width: 100%;
            max-width: 450px; 
            margin: 40px auto;
            background-color: var(--card-bg); 
            padding: 30px 25px;
            border-radius: 16px; 
            box-shadow: 0 15px 35px rgba(0,0,0,0.5);
            text-align: center; 
            border: 1px solid var(--border-color);
        }
        .gateway-box h2, .login-box h2 { color: var(--success-color); font-size: 1.6rem; margin-bottom: 8px; font-weight: 800; }
        .gateway-box p, .login-box p { color: #94a3b8; font-size: 0.85rem; margin-bottom: 20px; }

        .gateway-btn {
            background-color: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--border-color);
            color: var(--text-color);
            padding: 15px;
            margin: 10px 0;
            width: 100%;
            border-radius: 10px;
            font-size: 1.05rem;
            font-weight: bold;
            cursor: pointer;
            text-align: left;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.2s;
        }
        .gateway-btn:hover {
            background-color: var(--accent-color);
            color: #000;
            transform: translateY(-2px);
        }

        input, select {
            width: 100%; 
            padding: 12px; 
            margin: 8px 0;
            border-radius: 8px; 
            border: 1px solid #3a506b;
            background-color: rgba(0,0,0,0.3); 
            color: white; 
            font-size: 1rem;
            outline: none;
        }
        input:focus, select:focus { border-color: var(--accent-color); }

        .welcome-header {
            text-align: center; 
            margin-bottom: 20px; 
            padding: 20px;
            background: linear-gradient(135deg, var(--card-bg), #0f172a);
            border-radius: 12px; 
            border: 1px solid var(--border-color);
        }
        .welcome-header h1 { color: var(--success-color); margin-bottom: 5px; font-size: 1.6rem; font-weight: 800; }
        .welcome-header p { color: var(--accent-color); font-size: 0.9rem; }

        .session-badge {
            display: block; 
            text-align: center; 
            color: var(--warning-color); 
            font-size: 0.85rem; 
            margin-bottom: 15px; 
            background: rgba(251, 191, 36, 0.08);
            padding: 10px; 
            border-radius: 8px; 
            border: 1px dashed var(--warning-color);
        }
        
        .dashboard {
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
            gap: 12px; 
            margin-bottom: 20px;
        }
        .card {
            background-color: var(--card-bg); 
            padding: 15px 12px; 
            border-radius: 10px; 
            text-align: center; 
            border: 1px solid var(--border-color); 
            border-left: 4px solid var(--accent-color);
        }
        .card h3 { margin: 0 0 6px 0; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; }
        .card p { margin: 0; font-size: 1.2rem; font-weight: bold; color: var(--success-color); word-break: break-all; }

        .actions { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); 
            gap: 10px; 
            margin-bottom: 20px; 
        }
        button { 
            padding: 12px 10px; 
            border: none; 
            border-radius: 8px; 
            font-weight: bold; 
            cursor: pointer; 
            font-size: 0.9rem;
            display: inline-flex; 
            align-items: center; 
            justify-content: center; 
            gap: 4px; 
        }
        .btn-block { width: 100%; }
        .btn-add { background-color: var(--accent-color); color: #000; }
        .btn-sell { background-color: var(--success-color); color: #000; }
        .btn-expense { background-color: #f43f5e; color: #fff; }
        .btn-credit { background-color: #f59e0b; color: #000; }
        .btn-draw { background-color: var(--purple-color); color: #000; }
        .btn-config { background-color: #64748b; color: #fff; }
        .btn-next-day { background-color: #a855f7; color: #fff; }
        .btn-clear { background-color: var(--danger-color); color: #000; }
        .btn-sm { padding: 6px 10px; font-size: 0.8rem; border-radius: 6px; }

        .section-box { 
            background-color: var(--card-bg); 
            padding: 15px; 
            border-radius: 12px; 
            margin-bottom: 20px; 
            border: 1px solid var(--border-color);
        }
        .section-box h2 { font-size: 1.2rem; margin-bottom: 12px; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; color: var(--accent-color); }

        .table-responsive { 
            width: 100%; 
            overflow-x: auto; 
            border-radius: 8px; 
            border: 1px solid var(--border-color); 
            -webkit-overflow-scrolling: touch;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            min-width: 500px; 
            background-color: var(--card-bg) !important; 
        }
        th, td { 
            padding: 12px 10px; 
            text-align: left; 
            border-bottom: 1px solid var(--border-color); 
            white-space: nowrap; 
            font-size: 0.9rem; 
            color: var(--text-color) !important; 
        }
        th { 
            background-color: rgba(0,0,0,0.5) !important; 
            color: var(--accent-color) !important; 
            font-weight: 600; 
        }

        .low-stock-row { background-color: rgba(248, 113, 113, 0.1) !important; }
        .low-stock-badge { background: #f87171 !important; color: #000 !important; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; margin-left: 5px; }

        .badge-danger { background: var(--danger-color); color: #000; padding: 2px 5px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
        .badge-success { background: var(--success-color); color: #000; padding: 2px 5px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }

        .grid-3 { display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 20px; }
        @media(min-width: 768px) {
            .grid-3 { grid-template-columns: repeat(3, 1fr); }
            .btn-clear { grid-column: span 2; }
        }

        .profile-data { background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--border-color); font-size: 0.9rem; }
        .profile-data label { font-weight: bold; color: #94a3b8; }
        .profile-data span { color: var(--warning-color); font-weight: bold; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 15px; }
        .modal-card { background-color: var(--card-bg); border-radius: 14px; width: 100%; max-width: 420px; padding: 20px; box-shadow: 0 15px 30px rgba(0,0,0,0.5); border: 1px solid var(--border-color); overflow-y: auto; max-height: 90vh; }
        .modal-header { margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; }
        .modal-header h3 { font-size: 1.2rem; color: var(--success-color); }
        .modal-body { margin-bottom: 15px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 8px; }
        
        .search-container { margin-bottom: 12px; }
        .search-input { border: 1px solid var(--accent-color); background: rgba(56, 189, 248, 0.05); }
        .offline-tag { background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; animation: blink 1.5s infinite; }
        @keyframes blink { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }

        .receipt-container {
            background-color: #ffffff;
            color: #333333;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', Courier, monospace;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .receipt-header { text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #333; padding-bottom: 10px; }
        .receipt-header h4 { margin: 0; font-size: 1.3rem; color: #111; text-transform: uppercase; }
        .receipt-header p { margin: 4px 0; font-size: 0.85rem; color: #565656; }
        .receipt-table { width: 100%; margin-top: 10px; border-collapse: collapse; }
        .receipt-table th, .receipt-table td { color: #222 !important; padding: 8px 5px; font-size: 0.85rem; border-bottom: 1px dashed #ddd; text-align: left; }
        .receipt-table th { background-color: #f5f5f5 !important; font-weight: bold; }
        .receipt-summary { margin-top: 15px; border-top: 2px dashed #333; padding-top: 8px; text-align: right; font-size: 0.95rem; font-weight: bold; color: #111; }
        .receipt-footer { text-align: center; margin-top: 20px; font-size: 0.8rem; color: #777; font-style: italic; }
        .receipt-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }

        .shops-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-top: 15px;
        }
        .shop-card {
            background-color: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 16px;
            transition: transform 0.2s;
        }
        .shop-card:hover { transform: translateY(-3px); border-color: var(--accent-color); }
        .shop-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 10px;
            margin-bottom: 12px;
        }
        .shop-avatar {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
            background: #252f48;
            border: 2px solid var(--accent-color);
        }
        .shop-meta h3 { color: var(--success-color); font-size: 1.2rem; }
        .shop-meta p { color: #94a3b8; font-size: 0.8rem; }
        .shop-links {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 10px;
        }
        .btn-link-action {
            padding: 6px;
            font-size: 0.8rem;
            text-decoration: none;
            border-radius: 6px;
            text-align: center;
            font-weight: bold;
        }
        .catalog-item-card {
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
            padding: 8px;
            margin-top: 8px;
            display: flex;
            gap: 10px;
            align-items: center;
            border: 1px solid rgba(255,255,255,0.03);
        }
        .catalog-item-img {
            width: 55px;
            height: 55px;
            border-radius: 6px;
            object-fit: cover;
            background: #1c273a;
        }
        .catalog-item-info { flex: 1; }

        /* -----------------------------------------------------------------
           🎯 አዲስ የተጨመረ - የንግድ ዘርፍ ማጣሪያ በተኖች (CSS)
        ----------------------------------------------------------------- */
        .category-filters {
            display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 15px; -webkit-overflow-scrolling: touch;
        }
        .category-btn {
            background: rgba(255,255,255,0.05); border: 1px solid var(--accent-color); color: var(--text-color);
            padding: 8px 16px; border-radius: 20px; white-space: nowrap; cursor: pointer; font-size: 0.9rem; transition: 0.3s;
        }
        .category-btn:hover { background: rgba(56, 189, 248, 0.2); }
        .category-btn.active { background: var(--accent-color); color: #000; font-weight: bold; }

        /* -----------------------------------------------------------------
           🎯 አዲስ፡ ፕሮፌሽናል የ OFFLINE ማሳያ ገጽታ መቆጣጠሪያ (CSS)
        ----------------------------------------------------------------- */
        .critical-offline-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background-color: #0b0f19;
            z-index: 99999;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            text-align: center;
        }
        .offline-status-card {
            background-color: #151f32;
            border: 1px solid rgba(248, 113, 113, 0.3);
            padding: 35px 25px;
            border-radius: 16px;
            max-width: 460px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        }
        .offline-status-card .icon-zone {
            font-size: 3.5rem;
            margin-bottom: 15px;
            animation: pulse-glow 2s infinite ease-in-out;
        }
        .offline-status-card h2 {
            color: #f87171;
            font-size: 1.6rem;
            margin-bottom: 12px;
            font-weight: 800;
        }
        .offline-status-card p {
            color: #94a3b8;
            font-size: 0.95rem;
            line-height: 1.6;
            margin-bottom: 25px;
        }
        .offline-loader {
            display: inline-block;
            width: 24px;
            height: 24px;
            border: 3px solid rgba(56, 189, 248, 0.2);
            border-radius: 50%;
            border-top-color: #38bdf8;
            animation: spin-loader 1s ease-in-out infinite;
            vertical-align: middle;
            margin-right: 10px;
        }
        .offline-status-card .footer-note {
            font-size: 0.8rem;
            color: #64748b;
            border-top: 1px solid rgba(255,255,255,0.05);
            padding-top: 15px;
            margin-top: 10px;
        }
        @keyframes spin-loader { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
            0% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1); opacity: 0.8; }
        }

        @media print {
            body * { visibility: hidden; }
            #printableReceiptArea, #printableReceiptArea * { visibility: visible; }
            #printableReceiptArea { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; padding: 0; }
        }
    </style>
</head>
<body class="theme-deepblue">

<div id="criticalOfflineScreen" class="critical-offline-overlay hidden">
    <div class="offline-status-card">
        <div class="icon-zone">📡</div>
        <h2>የመስመር ውጭ (Offline) ሁነታ</h2>
        <p>የእርስዎ መሣሪያ በአሁኑ ሰዓት ከበይነመረብ (Internet) ጋር አልተገናኘም። የውሂብ ደህንነትን ለመጠበቅ እና ከማዕከላዊው የባንክ ሲስተም ጋር እንዳይጋጭ ጊዜያዊ እገዳ ተጥሏል።</p>
        <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; margin-bottom: 15px; font-weight: bold; color: #38bdf8; font-size: 0.9rem;">
            <div class="offline-loader"></div> መስመር ላይ ለመመለስ በመሞከር ላይ...
        </div>
        <div class="footer-note">የኔትወርክ ግንኙነትዎ እንደተመለሰ አፕሊኬሽኑ በራሱ በራስ-ሰር ይከፈታል።</div>
    </div>
</div>

<div class="container">

    <div id="welcomeGateway" class="gateway-box">
        <h2>እንኳን ደህና መጡ! <span id="syncIndicator" class="hidden offline-tag">Offline ሞድ</span></h2>
        <p>እባክዎ መተግበሪያውን በምን ሁኔታ መጠቀም እንደሚፈልጉ ይምረጡ፦</p>
        <button class="gateway-btn" onclick="switchView('buyerPage')">🛍️ እኔ ገዢ ነኝ (የዕቃዎች ማሳያ ማውጫ)</button>
        <button class="gateway-btn" onclick="checkAdminPrivacyKey()">👑 እኔ አከራይ ነኝ (Main Owner)</button>
        <button class="gateway-btn" onclick="showLoginSection('merchant')">💼 እኔ ሱቅ ባለቤት ነኝ (Tenant Owner)</button>
        <button class="gateway-btn" onclick="showLoginSection('staff')">🛠️ እኔ ሰራተኛ ነኝ (Store Staff)</button>
    </div>

    <div id="loginPage" class="login-box hidden">
        <h2 id="loginTitle">ትርፌ አፕ (Tirfe Tech)</h2>
        <p id="loginDesc">የኪራይና የሱቅ መቆጣጠሪያ ማዕከላዊ ሲስተም v11.0</p>
        <input type="text" id="loginUser" placeholder="የተጠቃሚ ስም (Username)">
        <input type="password" id="loginPass" placeholder="የይለፍ ቃል / ጊዜያዊ ኮድ">
        <button class="btn-sell btn-block" onclick="handleLogin()">🔒 ደህንነቱ የተጠበቀ መግቢያ</button>
        <button class="btn-config btn-block" style="margin-top: 8px;" onclick="goToGateway()">⬅️ ወደ ኋላ ተመለስ</button>
        <p id="loginError" style="color: var(--danger-color); margin-top: 15px; font-size: 0.9rem; font-weight: bold;"></p>
    </div>

    <div id="buyerPage" class="hidden">
        <div class="welcome-header">
            <h1>🛍️ የዕቃዎችና የሱቆች ማውጫ መድረክ</h1>
            <p>በአቅራቢያዎ ያሉ ሱቆችን ምርቶች፣ ዋጋዎች እና አድራሻ እዚህ ያግኙ።</p>
            <button class="btn-expense" style="margin-top:10px;" onclick="goToGateway()">⬅️ ወደ ዋናው ምርጫ ተመለስ</button>
        </div>
        <div class="section-box">
            <h2>🛒 በአሁኑ ሰዓት በገበያ ላይ ያሉ ሱቆችና ዕቃዎች</h2>
            <div class="search-container">
                <input type="text" id="buyerSearchInput" class="search-input" placeholder="🔍 ዕቃ በስም ለመፈለግ እዚህ ይጻፉ..." oninput="renderBuyerCatalog()">
            </div>
            
            <div id="buyerCategoryContainer" class="category-filters"></div>
            
            <div id="buyerShopsContainer" class="shops-grid"></div>
        </div>
    </div>

    <div id="adminPage" class="hidden">
        <div class="welcome-header">
            <h1>የባለቤቱ ማዕከላዊ ቁጥጥር ፓነል</h1>
            <p>እዚህ ገጽ ላይ አዳዲስ ተከራዮችን መመዝገብ፣ የውል ሁኔታ መወሰን እና ማስተዳደር ይችላሉ።</p>
            <button class="btn-expense" style="margin-top: 15px; width:100%;" onclick="logout()">🚪 ከሲስተሙ ውጣ</button>
        </div>

        <div class="dashboard" style="margin-bottom: 20px;">
            <div class="card" style="border-left: 4px solid var(--accent-color);">
                <h3>ጠቅላላ ተከራዮች</h3>
                <p id="adminTotalTenants">0</p>
            </div>
            <div class="card" style="border-left: 4px solid var(--success-color);">
                <h3>ንቁ ተከራዮች</h3>
                <p id="adminActiveTenants">0</p>
            </div>
            <div class="card" style="border-left: 4px solid var(--warning-color);">
                <h3>ጠቅላላ የተሰበሰበ ክፍያ</h3>
                <p id="adminTotalFees">0.00 ETB</p>
            </div>
        </div>

        <div class="section-box">
            <h2>👤 አዲስ ተከራይ መመዝገቢያ</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="newShopName" placeholder="የሱቅ ስም (ምሳሌ፡ አልፋ)">
                <input type="text" id="newFullName" placeholder="የተከራይ ሙሉ ስም">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="newUsername" placeholder="መግቢያ ስም (Username)">
                <input type="text" id="newPhone" placeholder="ስልክ ቁጥር">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="newTelegram" placeholder="የቴሌግራም መግቢያ (ምሳሌ፡ alpha_shop)">
                <input type="text" id="newMapsLink" placeholder="የሱቅ ጎግል ማፕ ሊንክ (Google Maps URL)">
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <input type="text" id="newAddress" placeholder="ያለበት ሀገር / ከተማ / ክልል">
                <input type="text" id="newBusinessType" placeholder="የንግድ ዘርፍ (ምሳሌ፡ ኤሌክትሮኒክስ)">
            </div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 10px;">
                <input type="number" id="newRegistrationFee" placeholder="የመመዝገቢያ ክፍያ (Registration Fee)">
                <input type="text" id="newShopLogo" placeholder="የሱቅ ፕሮፋይል ፎቶ ሊንክ (Image URL)">
            </div>
            
            <label style="font-size: 0.85rem; color: var(--accent-color); display:block; margin-top: 8px;">የውል ዓይነት (Contract Type)፦</label>
            <select id="newContractType">
                <option value="በወር">በወር (Monthly)</option>
                <option value="በዓመት">በዓመት (Yearly)</option>
            </select>

            <label style="font-size: 0.85rem; color: var(--accent-color); display:block; margin-top: 8px;">የውል ማቂያ ቀን (Expiry Date)፦</label>
            <input type="date" id="newExpiryDate">

            <button class="btn-add btn-block" style="margin-top: 15px;" onclick="registerTenant()">➕ ተከራይ በቋሚነት መዝግብ</button>
        </div>

        <div class="section-box">
            <h2>📈 የተከራዮች ሁኔታ እና የውል መቆጣጠሪያ</h2>
            <div class="search-container">
                <input type="text" id="adminSearchInput" class="search-input" placeholder="🔍 ተከራይን በዩዘርኔም (Username) ብቻ በቀላሉ ለመፈለግ..." oninput="renderAdminPanel()">
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>የሱቅ ስም / ዘርፍ</th>
                            <th>የተከራይ መገለጫ (Profile)</th>
                            <th>የመግቢያ ዝርዝር / ኮድ</th>
                            <th>የውል ዓይነት / ክፍያ</th>
                            <th>የማቂያ ቀን</th>
                            <th>የአሁን ሁኔታ</th>
                            <th>እርምጃዎች</th>
                        </tr>
                    </thead>
                    <tbody id="tenantTableBody"></tbody>
                </table>
            </div>
        </div>
    </div>

    <div id="appPage" class="hidden">
        <div class="welcome-header">
            <h1 id="shopTitle">እንኳን ደህና መጡ ወደ " ትርፌ " መቆጣጠሪያ መተግበሪያ</h1>
            <p id="roleSubTitle">ቀልጣፋ፣ ዘመናዊ እና አስተማማኝ የሱቅዎ የሂሳብ ረዳት</p>
        </div>

        <div id="sessionDisplay" class="session-badge">የዕለቱ መፈላጊ መረጃ በመጠባበቅ ላይ...</div>
        <div id="shiftStatusAlert" class="session-badge hidden" style="color:var(--danger-color); background:rgba(244,63,94,0.1); border-color:var(--danger-color);">⚠️ ትኩረት፦ የዛሬው የስራ ሰዓት አብቅቷል። እባክዎ የዕለቱን ሂሳብ መዝጊያ ሪፖርት ያቅርቡ!</div>

        <div class="dashboard" id="ownerDashboard">
            <div class="card">
                <h3>የአሁን ካፒታል</h3>
                <p id="totalCapital" style="color: var(--accent-color);">0.00</p>
            </div>
            <div class="card">
                <h3>የዛሬ ትርፍ</h3>
                <p id="todayNetProfit">0.00</p>
            </div>
            <div class="card">
                <h3>የወር ትርፍ</h3>
                <p id="monthlyNetProfit" style="color: var(--warning-color);">0.00</p>
            </div>
            <div class="card">
                <h3>የዚህ ወር ወጪ</h3>
                <p id="monthlyExpenses" style="color: #f43f5e;">0.00</p>
            </div>
            <div class="card">
                <h3>ከሳጥን የተነሳ</h3>
                <p id="totalDraws" style="color: var(--purple-color);">0.00</p>
            </div>
        </div>

        <div class="dashboard" style="margin-top:-10px;">
            <div class="card" style="grid-column: span 2;">
                <h3>ማታ በካሽ ሳጥን መገኘት ያለበት</h3>
                <p id="totalInCash" style="color: #38bdf8; font-size: 1.5rem;">0.00 ETB</p>
            </div>
        </div>

        <div id="chartContainer" style="height: 220px; width: 100%; margin-bottom: 20px;">
            <canvas id="businessChart"></canvas>
        </div>

        <div class="actions">
            <button class="btn-add" id="btn_add_item" onclick="focusInventoryInput()">📦 አዲስ ዕቃ መዝግብ</button>
            <button class="btn-expense" id="btn_expense" onclick="openExpenseModal()">📉 ወጪ መዝግብ</button>
            <button class="btn-credit" onclick="openDebtModal()">💳 ዕዳ መዝግብ</button>
            <button class="btn-draw" onclick="openDrawerModal()">💸 ከሳጥን ብር ማንሻ / መልስ</button>
            <button class="btn-config" id="btn_settlement" style="background-color: #22c55e; color: black;" onclick="openSettlementModal()">📊 ሂሳብ ማወራረጃ</button>
            <button class="btn-config" onclick="configureBank()">🏦 የባንክ አፕ ማያያዣ</button>
            <button class="btn-next-day" id="btn_next_day" onclick="startNewDaySession()">🔄 አዲስ ቀን ጀምር</button>
            <button class="btn-clear" id="btn_clear_all" onclick="clearAllTenantData()">🗑️ ዳታ አጽዳ</button>
            <button class="btn-expense" id="btn_close_shift" style="background:#f59e0b; color:#000;" onclick="triggerShiftReport()">🔒 የዕለት ሂሳብ ዝጋ (ሪፖርት)</button>
        </div>

        <div class="section-box">
            <h2>📦 የዕቃዎች ዝርዝር እና ክምችት</h2>
            <div id="owner_add_box" style="background: rgba(255, 255, 255, 0.02); padding: 12px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--border-color);">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <input type="text" id="itemName" placeholder="የዕቃ ስም">
                    <input type="text" id="itemModel" placeholder="የዕቃው ሞዴል (Model)">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <input type="number" id="itemCost" placeholder="መግዣ ዋጋ (ካፒታል)">
                    <input type="number" id="itemPrice" placeholder="መሸጫ ዋጋ">
                    <input type="number" id="itemQty" placeholder="የመጣው ብዛት">
                </div>
                <input type="text" id="itemImgUrl" placeholder="የዕቃው ፎቶ ሊንክ (Image URL)">
                <button class="btn-sell btn-block" style="margin-top: 8px;" onclick="addItemDirectly()">📥 ዕቃውን በዝርዝር አስገባ</button>
            </div>
            <div class="search-container">
                <input type="text" id="inventorySearchInput" class="search-input" placeholder="🔍 የዕቃ ስም በመጻፍ በፍጥነት ይፈልጉ..." oninput="renderApp()">
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr id="inventoryTableHeader"></tr>
                    </thead>
                    <tbody id="inventoryBody"></tbody>
                </table>
            </div>
        </div>

        <div class="section-box">
            <h2>🧾 የደረሰኞች ማህደር (Receipt History)</h2>
            <div style="margin-bottom:15px; display: flex; gap: 10px; align-items: center; max-width: 400px;">
                <label style="font-size:0.9rem; color:var(--accent-color); white-space: nowrap;">📅 የደረሰኝ መፈለጊያ ቀን፦</label>
                <input type="date" id="receiptDateFilter" onchange="renderApp()" style="margin:0;">
            </div>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>ደረሰኝ ID</th>
                            <th>ቀን</th>
                            <th>የዕቃ ስም</th>
                            <th>ብዛት</th>
                            <th>ጠቅላላ ዋጋ</th>
                            <th>የሸጠው ሰው</th>
                            <th>እርምጃ</th>
                        </tr>
                    </thead>
                    <tbody id="receiptHistoryTableBody"></tbody>
                </table>
            </div>
        </div>

        <div class="grid-3">
            <div class="section-box">
                <h2>💳 የዕዳ መዝገብ</h2>
                <div class="table-responsive">
                    <table>
                        <tbody id="creditBody"></tbody>
                    </table>
                </div>
            </div>
            <div class="section-box">
                <h2>💸 ከሳጥን የተነሳ ገንዘብ / መልስ</h2>
                <div class="table-responsive">
                    <table>
                        <tbody id="drawBody"></tbody>
                    </table>
                </div>
            </div>
            <div class="section-box" id="historySection">
                <h2>📅 የቀደሙ ቀናት ታሪክ እና ማህደር</h2>
                <div style="margin-bottom:10px;">
                    <label style="font-size:0.8rem; color:var(--accent-color);">ቀን መምረጫ (Filter by Date)፦</label>
                    <input type="date" id="historyDateFilter" onchange="renderHistoryTable()">
                </div>
                <div class="table-responsive">
                    <table>
                        <tbody id="historyBody"></tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="section-box">
            <h2>⚙️ መቼቶች እና ፕሮፋይል</h2>
            <button class="btn-add btn-block" style="margin-bottom: 12px; padding: 10px;" onclick="openTenantProfileEditor()">⚙️ የሱቅ መረጃ እና ኮድ ማስተካከያ</button>
            <div class="profile-data"><label>የሱቅ ስም፡</label> <span id="profShopName">-</span></div>
            <div class="profile-data" id="expiryRowOwner"><label>የውል ማቂያ ቀን፡</label> <span id="profExpiry" style="color: var(--danger-color);">-</span></div>
            
            <div id="ownerStaffConfig" style="margin: 15px 0; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px; border:1px dashed var(--accent-color);">
                <h4 style="color:var(--accent-color); font-size:0.9rem; margin-bottom:8px;">🔐 ለሰራተኛ መግቢያ ኮድ መፍጠሪያ (Staff Credentials)</h4>
                <input type="text" id="staffUser" placeholder="የሰራተኛው መግቢያ ስም (Staff Username)">
                <input type="text" id="staffPass" placeholder="የሰራተኛው የይለፍ ቃል (Staff Password)">
                <button class="btn-sell btn-block" style="padding:8px;" onclick="saveStaffAccount()">💾 የሰራተኛ አካውንት አስቀምጥ</button>
            </div>

            <div class="profile-data">
                <label>የመተግበሪያ ገጽታ (Theme)፦</label> 
                <select id="themeSelector" onchange="changeTheme(this.value)" style="width: auto; margin: 0; padding: 4px 8px;">
                    <option value="theme-deepblue">Deep Blue</option>
                    <option value="theme-emerald">Emerald Green</option>
                    <option value="theme-purple">Royal Purple</option>
                    <option value="theme-charcoal">Charcoal Dark</option>
                </select>
            </div>
            <button class="btn-expense btn-block" style="margin-top: 20px; padding: 15px;" onclick="logout()">🚪 ከአፑ በሰላም ውጣ (Logout)</button>
        </div>
    </div>
</div>

<div id="modalOverlay" class="modal-overlay hidden">
    <div id="alertModal" class="modal-card hidden">
        <div class="modal-header"><h3 id="alertTitle" class="text-warning">መልዕክት</h3></div>
        <div class="modal-body"><p id="alertMessage"></p></div>
        <div class="modal-footer"><button class="btn-add" onclick="closeActiveModal()">እሺ</button></div>
    </div>
    
    <div id="confirmModal" class="modal-card hidden">
        <div class="modal-header"><h3 id="confirmTitle" class="text-danger">እርግጠኛ ኖት?</h3></div>
        <div class="modal-body"><p id="confirmMessage"></p></div>
        <div class="modal-footer">
            <button class="btn-expense" id="confirmYesBtn">አዎ</button>
            <button class="btn-add" onclick="closeActiveModal()">አይ</button>
        </div>
    </div>

    <div id="formModal" class="modal-card hidden">
        <div class="modal-header"><h3 id="formModalTitle" class="text-success">መረጃ ማስገቢያ</h3></div>
        <div class="modal-body" id="formModalBody"></div>
        <div class="modal-footer" id="formModalFooter"></div>
    </div>
</div>

<script>
    const firebaseConfig = { databaseURL: "https://tirfe-app-v2-300c2-default-rtdb.firebaseio.com/" };
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    let localDB = { tenants: {} };
    let currentTenant = null;
    let currentUserRole = "owner"; 
    let myChart = null;
    let currentLoginMode = "merchant"; 
    let isOnline = true;

    // አዲስ የተጨመረ ግሎባል ቫርያብል - የገዢዎችን ማጣሪያ ለመያዝ
    let activeCategoryFilter = "all";

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    /* -----------------------------------------------------------------
       🎯 አዲስ/የተቀየረ፦ የኢንተርኔት መጥፋትን በዘመናዊ መንገድ መቆጣጠሪያ (JavaScript)
    ----------------------------------------------------------------- */
    function handleOnlineStatus() {
        isOnline = navigator.onLine;
        const tag = document.getElementById('syncIndicator');
        const criticalScreen = document.getElementById('criticalOfflineScreen');
        
        if(!isOnline) {
            if(tag) tag.classList.remove('hidden');
            if(criticalScreen) criticalScreen.classList.remove('hidden');
        } else {
            if(tag) tag.classList.add('hidden');
            if(criticalScreen) criticalScreen.classList.add('hidden');
            pushToFirebase();
        }
    }

    // አዲስ የተጨመረ - የንግድ ዘርፍ ማጣሪያ በተን ሲነካ የሚሰራ
    function setCategoryFilter(cat) {
        activeCategoryFilter = cat;
        renderBuyerCatalog();
    }

    function loadLocalStorageBackup() {
        let backup = localStorage.getItem('tirfe_local_db');
        if(backup) {
            localDB = JSON.parse(backup);
        }
    }

    function saveToLocalStorage() {
        localStorage.setItem('tirfe_local_db', JSON.stringify(localDB));
    }

    function sendTelegramAlert(message) {
        if (!currentTenant || !currentTenant.telegramToken || !currentTenant.telegramChatId) return;
        const token = currentTenant.telegramToken;
        const chatId = currentTenant.telegramChatId;
        const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;
        fetch(url).catch(err => console.log("Telegram Error: ", err));
    }

    loadLocalStorageBackup();
    checkAutomaticLogin();

    handleOnlineStatus();

    db.ref('tirfe_system').on('value', (snapshot) => {
        if(snapshot.exists()) {
            localDB = snapshot.val();
            if(!localDB.tenants) localDB.tenants = {};
            saveToLocalStorage();
            
            if(currentTenant) {
                let checkTenant = localDB.tenants[currentTenant.username];
                if(!checkTenant || checkTenant.status === "blocked") { logout(); return; }
                currentTenant = checkTenant;
                renderApp();
            }
            renderBuyerCatalog();
            if(!document.getElementById('adminPage').classList.contains('hidden')) { renderAdminPanel(); }
        }
    }, (error) => {
        console.log("Firebase Error, running offline mode.");
        isOnline = false;
        handleOnlineStatus();
    });

    function checkAutomaticLogin() {
        let savedSession = localStorage.getItem('tirfe_active_session');
        if (savedSession) {
            let session = JSON.parse(savedSession);
            currentUserRole = session.role;
            currentLoginMode = session.loginMode;
            
            if (session.role === 'admin') {
                setTimeout(() => { switchView('adminPage'); renderAdminPanel(); }, 300);
            } else if (localDB.tenants && localDB.tenants[session.username]) {
                let t = localDB.tenants[session.username];
                currentTenant = t;
                setTimeout(() => { launchApp(t); }, 300);
            }
        }
    }

    setInterval(() => {
        let now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();

        if(hours === 22 && currentTenant && currentTenant.data && currentTenant.data.sessionActive && !currentTenant.data.shiftClosed) {
            document.getElementById('shiftStatusAlert').classList.remove('hidden');
        }

        if(hours === 6 && minutes === 0 && currentTenant && currentTenant.data && currentTenant.data.shiftClosed) {
            currentTenant.data.sessionActive = false;
            currentTenant.data.shiftClosed = false;
            saveAndRefresh();
        }
    }, 60000);

    function switchView(targetId) {
        document.getElementById('welcomeGateway').classList.add('hidden');
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('buyerPage').classList.add('hidden');
        document.getElementById('adminPage').classList.add('hidden');
        document.getElementById('appPage').classList.add('hidden');

        document.getElementById(targetId).classList.remove('hidden');
        if (targetId === 'buyerPage') renderBuyerCatalog();
    }

    function checkAdminPrivacyKey() {
        showFormModal("🔒 የማስተር ሴኪዩሪቲ ማረጋገጫ", [
            { id: "masterKey", label: "እባክዎ የአከራይ ማስተር ሴኪዩሪቲ ኮድ (Master Security Key) ያስገቡ፦", type: "password", placeholder: "ማስተር ኮድ" }
        ], (res) => {
            if (res.masterKey === "tirfe-secure-2026") {
                showLoginSection('admin');
            } else {
                showCustomAlert("⛔ መግባት አልተፈቀደም", "ያስገቡት ማስተር ሴኪዩሪቲ ኮድ የተሳሳተ ስለሆነ ገጹን መክፈት አይችሉም!");
            }
        });
    }

    function showLoginSection(mode) {
        currentLoginMode = mode;
        document.getElementById('loginError').innerText = "";
        document.getElementById('loginUser').value = "";
        document.getElementById('loginPass').value = "";
        
        if (mode === 'admin') {
            document.getElementById('loginTitle').innerText = "👑 የባለቤት (Admin) መግቢያ በር";
            document.getElementById('loginDesc').innerText = "አዳዲስ ሱቆችን ለመመዝገብ እና ውል ለማስተዳደር ይግቡ";
            document.getElementById('loginUser').placeholder = "የአስተዳዳሪ ስም (Admin Username)";
            document.getElementById('loginPass').placeholder = "የአስተዳዳሪ ይለፍ ቃል (Password)";
        } else if (mode === 'merchant') {
            document.getElementById('loginTitle').innerText = "💼 የሱቅ ባለቤቶች (Tenant) መግቢያ";
            document.getElementById('loginDesc').innerText = "የሱቅዎን ሂሳብ፣ ትርፍ እና ክምችት በባለቤትነት ለመቆጣጠር ይግቡ";
            document.getElementById('loginUser').placeholder = "የሱቅ ባለቤት ስም (Tenant Username)";
            document.getElementById('loginPass').placeholder = "የባለቤት ይለፍ ቃል (Password)";
        } else if (mode === 'staff') {
            document.getElementById('loginTitle').innerText = "🛠️ የሱቅ ሰራተኞች መግቢያ በር";
            document.getElementById('loginDesc').innerText = "በሱቅ ባለቤቱ የተሰጠዎትን የሰራተኛ መግቢያ ስም እና ኮድ ይጠቀሙ";
            document.getElementById('loginUser').placeholder = "የሰራተኛ ስም (Staff Username)";
            document.getElementById('loginPass').placeholder = "የሰራተኛ ይለፍ ቃል (Staff Password)";
        }
        switchView('loginPage');
    }

    function goToGateway() { switchView('welcomeGateway'); }

    function handleLogin() {
        let user = document.getElementById('loginUser').value.trim().toLowerCase();
        let pass = document.getElementById('loginPass').value.trim();
        let error = document.getElementById('loginError');

        if(currentLoginMode === 'admin') {
            if(user === "admin" && pass === "admin123") {
                localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'admin', loginMode: 'admin', username: 'admin' }));
                switchView('adminPage');
                renderAdminPanel();
            } else {
                error.innerText = "❌ የተሳሳተ የአስተዳዳሪ (Admin) ስም ወይም ይለፍ ቃል ነው!";
            }
            return;
        }

        let tenant = localDB.tenants ? localDB.tenants[user] : null;

        if (currentLoginMode === 'merchant') {
            if (tenant) {
                if (isTenantExpired(tenant, error)) return;
                
                if (!tenant.isActivated) {
                    if (tenant.activationCode === pass) {
                        let now = new Date().getTime();
                        let twentyFourHours = 24 * 60 * 60 * 1000;
                        if ((now - tenant.codeCreatedAt) > twentyFourHours) {
                            error.innerText = "❌ ይህ ጊዜያዊ ኮድ ከ24 ሰዓት በላይ ስለቆየ ጊዜው አልፏል! እባክዎ አከራዩን አዲስ ኮድ ይጠይቁ።";
                            return;
                        }
                        
                        showFormModal("🔒 የፕራይቬሲ ፓስዎርድ ማቀናበሪያ", [
                            { id: "securePass", label: "ለእርስዎ ብቻ የሚሆን ጠንካራ ምስጢራዊ ፓስዎርድ ይፍጠሩ (አከራዩ ማየት አይችልም)፦", type: "password", placeholder: "አዲስ ፓስዎርድ" }
                        ], (res) => {
                            let sp = res.securePass.trim();
                            if (!sp) { showCustomAlert("ስህተት", "የይለፍ ቃል ባዶ መሆን አይችልም!"); return; }
                            tenant.password = sp; 
                            tenant.isActivated = true;
                            localDB.tenants[user] = tenant;
                            pushToFirebase();
                            currentUserRole = "owner";
                            localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'owner', loginMode: 'merchant', username: user }));
                            launchApp(tenant);
                        });
                        return;
                    } else {
                        error.innerText = "❌ የተሳሳተ ጊዜያዊ መግቢያ ኮድ ነው!";
                        return;
                    }
                } else {
                    if (String(tenant.password).trim() === pass) {
                        currentUserRole = "owner";
                        localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'owner', loginMode: 'merchant', username: user }));
                        launchApp(tenant);
                        return;
                    }
                }
            }
            error.innerText = "❌ የተሳሳተ የሱቅ ባለቤት ስም ወይም የይለፍ ቃል! (ወይም ገና አልነቃም)";
            return;
        }

        if (currentLoginMode === 'staff') {
            if(localDB.tenants) {
                for (let tKey in localDB.tenants) {
                    let t = localDB.tenants[tKey];
                    if (t.staffUser && t.staffUser === user && String(t.staffPass).trim() === pass) {
                        if (isTenantExpired(t, error)) return;
                        currentUserRole = "staff";
                        localStorage.setItem('tirfe_active_session', JSON.stringify({ role: 'staff', loginMode: 'staff', username: t.username }));
                        launchApp(t);
                        return;
                    }
                }
            }
            error.innerText = "❌ የሰራተኛ ስም ወይም የይለፍ ቃል ስህተት ነው!";
            return;
        }
    }

    function isTenantExpired(tenant, errorElement) {
        if(tenant.expiryDate) {
            let today = new Date(); today.setHours(0,0,0,0);
            let expiry = new Date(tenant.expiryDate); expiry.setHours(0,0,0,0);
            if(today > expiry) {
                tenant.status = "blocked";
                localDB.tenants[tenant.username] = tenant;
                pushToFirebase();
                errorElement.innerText = "🔒 የኪራይ ውልዎ ጊዜ አልቋል! እባክዎ ባለቤቱን ያነጋግሩ።";
                return true;
            }
        }
        if(tenant.status === "blocked") { errorElement.innerText = "🔒 አካውንትዎ ታግዷል!"; return true; }
        return false;
    }

    function checkMonthlyAccessReset() {
        if (!currentTenant || !currentTenant.data) return;
        
        let now = new Date();
        let currentTimestamp = now.getTime();
        
        if (!currentTenant.data.lastMonthlyResetDate) {
            currentTenant.data.lastMonthlyResetDate = currentTenant.codeCreatedAt || currentTimestamp;
            saveAndRefresh();
            return;
        }
        
        let diffTime = Math.abs(currentTimestamp - currentTenant.data.lastMonthlyResetDate);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays >= 30) {
            let d = currentTenant.data;
            let expensesList = d.expenses || [];
            let totalMonthlyExp = 0;
            expensesList.forEach(e => totalMonthlyExp += parseFloat(e.amount) || 0);
            
            let totalMonthlySales = 0;
            let totalMonthlyProfit = 0;
            let inv = d.inventory || [];
            inv.forEach(item => {
                totalMonthlySales += (item.price * item.sold);
                totalMonthlyProfit += (item.price - item.cost) * item.sold;
            });
            
            let finalMonthlyNetProfit = totalMonthlyProfit - totalMonthlyExp;
            
            if(!d.history) d.history = [];
            
            let lastResetObj = new Date(d.lastMonthlyResetDate);
            let formattedPeriod = `${lastResetObj.toLocaleDateString('am-ET')} - ${now.toLocaleDateString('am-ET')}`;
            
            d.history.push({
                date: "የወር ማጠቃለያ",
                employee: formattedPeriod,
                sales: totalMonthlySales,
                profit: finalMonthlyNetProfit,
                expenses: totalMonthlyExp,
                draws: 0,
                reportedCash: d.reportedCash || 0,
                expectedCash: d.expectedCash || 0,
                variance: d.variance || 0,
                isMonthlyArchive: true
            });
            
            d.expenses = [];
            d.lastMonthlyResetDate = currentTimestamp; 
            
            localDB.tenants[currentTenant.username] = currentTenant;
            saveToLocalStorage();
            pushToFirebase();
            
            showCustomAlert("📅 አዲስ ወር ጀምሯል", `ያለፈው 30 ቀናት የሱቅ ወጪና የሂሳብ መረጃዎች ተጠቅልለው ማህደር (Archive) ውስጥ ገብተዋል። ለአዲሱ ወር ወጪው ከ 0 ተጀምሯል።`);
        }
    }

    function launchApp(tenant) {
        currentTenant = tenant;
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('appPage').classList.remove('hidden');
        
        document.getElementById('shopTitle').innerText = tenant.shopName + (currentUserRole === "staff" ? " (የሰራተኛ ገጽ)" : " (የባለቤት ገጽ)");
        document.getElementById('roleSubTitle').innerText = currentUserRole === "staff" ? "🛠️ የተገደበ የሰራተኛ መሸጫ እና መመዝገቢያ ሞድ" : "👑 ሙሉ የሱቅና የኪራይ መቆጣጠሪያ ፓነል";
        document.getElementById('profShopName').innerText = tenant.shopName;
        document.getElementById('profExpiry').innerText = tenant.expiryDate ? `${tenant.expiryDate} (${tenant.contractType})` : "ያልተገደበ";
        
        let activeTheme = tenant.theme || 'theme-deepblue';
        document.body.className = activeTheme;
        document.getElementById('themeSelector').value = activeTheme;
        document.getElementById('inventorySearchInput').value = "";

        if (currentUserRole === "staff") {
            document.getElementById('ownerDashboard').classList.add('hidden');
            document.getElementById('chartContainer').classList.add('hidden');
            document.getElementById('btn_add_item').classList.add('hidden');
            document.getElementById('btn_expense').classList.add('hidden');
            document.getElementById('btn_next_day').classList.add('hidden');
            document.getElementById('btn_clear_all').classList.add('hidden');
            document.getElementById('owner_add_box').classList.add('hidden');
            document.getElementById('ownerStaffConfig').classList.add('hidden');
            document.getElementById('expiryRowOwner').classList.add('hidden');
            document.getElementById('btn_settlement').classList.add('hidden');
        } else {
            document.getElementById('ownerDashboard').classList.remove('hidden');
            document.getElementById('chartContainer').classList.remove('hidden');
            document.getElementById('btn_add_item').classList.remove('hidden');
            document.getElementById('btn_expense').classList.remove('hidden');
            document.getElementById('btn_next_day').classList.remove('hidden');
            document.getElementById('btn_clear_all').classList.remove('hidden');
            document.getElementById('owner_add_box').classList.remove('hidden');
            document.getElementById('ownerStaffConfig').classList.remove('hidden');
            document.getElementById('expiryRowOwner').classList.remove('hidden');
            document.getElementById('btn_settlement').classList.remove('hidden');
            
            document.getElementById('staffUser').value = tenant.staffUser || "";
            document.getElementById('staffPass').value = tenant.staffPass || "";
            
            checkMonthlyAccessReset();
        }

        setTimeout(() => {
            if(currentUserRole === "owner") initChart();
            checkMorningSession();
        }, 200);
    }

    function renderBuyerCatalog() {
        let container = document.getElementById('buyerShopsContainer');
        container.innerHTML = '';
        let hasData = false;
        let query = document.getElementById('buyerSearchInput') ? document.getElementById('buyerSearchInput').value.trim().toLowerCase() : "";

        // 1. አዲስ፡ ያሉትን የንግድ ዘርፎች በሙሉ መሰብሰብ
        let categories = new Set();
        if (localDB.tenants) {
            Object.values(localDB.tenants).forEach(t => {
                if (t.status === "active") {
                    let bType = t.businessType || "አጠቃላይ ንግድ";
                    categories.add(bType);
                }
            });
        }
        
        // 2. አዲስ፡ የካቴጎሪ መምረጫ በተኖችን መሳል
        let catContainer = document.getElementById('buyerCategoryContainer');
        if (catContainer) {
            let catHTML = `<button class="category-btn ${activeCategoryFilter === 'all' ? 'active' : ''}" onclick="setCategoryFilter('all')">🌐 ሁሉም</button>`;
            categories.forEach(cat => {
                catHTML += `<button class="category-btn ${activeCategoryFilter === cat ? 'active' : ''}" onclick="setCategoryFilter('${cat}')">🛍️ ${cat}</button>`;
            });
            catContainer.innerHTML = catHTML;
        }

        if (localDB.tenants) {
            Object.keys(localDB.tenants).forEach(tKey => {
                let t = localDB.tenants[tKey];
                if (t.status === "active") {
                    
                    // 3. አዲስ፡ ገዢው የተለየ ካቴጎሪ ከመረጠ ሌሎች ሱቆችን ማለፍ (Filter)
                    let tBType = t.businessType || "አጠቃላይ ንግድ";
                    if (activeCategoryFilter !== "all" && tBType !== activeCategoryFilter) return;
                    
                    let matchingItems = [];
                    if (t.data && t.data.inventory) {
                        matchingItems = t.data.inventory.filter(item => {
                            if (query === "") return true;
                            return item.name.toLowerCase().includes(query) || (item.model && item.model.toLowerCase().includes(query));
                        });
                    }

                    if (query !== "" && matchingItems.length === 0) return;
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
                            let modelDisplay = item.model ? `<br><small style="color:var(--accent-color)">ሞዴል: ${item.model}</small>` : '';
                            shopCardHTML += `
                            <div class="catalog-item-card">
                                <img src="${itemImg}" class="catalog-item-img" onerror="this.src='https://cdn-icons-png.flaticon.com/512/3342/3342137.png'">
                                <div class="catalog-item-info">
                                    <span style="font-weight:bold; font-size:0.9rem;">${item.name}</span>${modelDisplay}
                                    <div style="color:var(--warning-color); font-weight:bold; margin-top:2px;">${item.price} ETB</div>
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
                }
            });
        }

        if(!hasData) {
            container.innerHTML = '<p style="text-align:center; color:#94a3b8; grid-column: 1/-1; padding:20px;">በተፈለገው ስም የተገኘ ምንም ሱቅ ወይም ዕቃ የለም።</p>';
        }
    }

    function generateRandomCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    function registerTenant() {
        let shop = document.getElementById('newShopName').value.trim();
        let fullName = document.getElementById('newFullName').value.trim();
        let user = document.getElementById('newUsername').value.trim().toLowerCase(); 
        let phone = document.getElementById('newPhone').value.trim();
        let telegram = document.getElementById('newTelegram').value.trim();
        let mapsLink = document.getElementById('newMapsLink').value.trim();
        let address = document.getElementById('newAddress').value.trim();
        let businessType = document.getElementById('newBusinessType').value.trim() || 'አጠቃላይ ንግድ'; // አዲስ የተጨመረ
        let registrationFee = parseFloat(document.getElementById('newRegistrationFee').value) || 0;
        let contractType = document.getElementById('newContractType').value;
        let expiryDate = document.getElementById('newExpiryDate').value;
        let shopLogo = document.getElementById('newShopLogo').value.trim();

        if(!shop || !user || !expiryDate || !fullName || !phone) { 
            showCustomAlert("ስህተት", "እባክዎ መሠረታዊ መፈላጊ መረጃዎችን ያሟሉ!"); 
            return; 
        }

        if (localDB.tenants && localDB.tenants[user]) {
            showCustomAlert("⚠️ ምዝገባው አልተሳካም", `"${user}" የሚለው የተጠቃሚ ስም (Username) አስቀድሞ በሌላ ተከራይ ተወስዷል! እባክዎ የተለየ ስም ይጠቀሙ።`);
            return;
        }

        let genCode = generateRandomCode();
        let timestampNow = new Date().getTime();
        
        localDB.tenants[user] = { 
            shopName: shop, fullName: fullName, phone: phone, telegram: telegram || "-", address: address || "-",
            businessType: businessType, // አዲስ የተጨመረ
            googleMapsLink: mapsLink || "",
            shopLogo: shopLogo || "",
            username: user, 
            password: genCode, 
            activationCode: genCode,
            codeCreatedAt: timestampNow,
            isActivated: false,
            contractType: contractType, expiryDate: expiryDate,
            registrationFee: registrationFee,
            status: "active", theme: "theme-deepblue",
            staffUser: "", staffPass: "",
            data: { sessionActive: false, shiftClosed: false, inventory: [], expenses: [], debts: [], drawerLog: [], history: [], receipts: [], lastMonthlyResetDate: timestampNow } 
        };
        pushToFirebase(); renderAdminPanel();
        
        document.getElementById('newShopName').value = ''; document.getElementById('newFullName').value = '';
        document.getElementById('newUsername').value = ''; document.getElementById('newPhone').value = ''; 
        document.getElementById('newTelegram').value = ''; document.getElementById('newMapsLink').value = '';
        document.getElementById('newAddress').value = ''; document.getElementById('newBusinessType').value = ''; // አዲስ
        document.getElementById('newExpiryDate').value = '';
        document.getElementById('newRegistrationFee').value = ''; document.getElementById('newShopLogo').value = '';
    }

    function openAdminTenantEditor(user) {
        let t = localDB.tenants[user];
        showFormModal(`✍️ የተከራይ መረጃ ማሻሻያ (${t.shopName})`, [
            { id: "shopName", label: "የሱቅ ስም", type: "text", defaultValue: t.shopName },
            { id: "fullName", label: "የተከራይ ሙሉ ስም", type: "text", defaultValue: t.fullName },
            { id: "phone", label: "ስልክ ቁጥር", type: "text", defaultValue: t.phone },
            { id: "telegram", label: "ቴሌግራም", type: "text", defaultValue: t.telegram },
            { id: "mapsLink", label: "ጎግል ማፕ ሊንክ", type: "text", defaultValue: t.googleMapsLink || "" },
            { id: "address", label: "አድራሻ (ሀገር/ከተማ)", type: "text", defaultValue: t.address },
            { id: "businessType", label: "የንግድ ዘርፍ", type: "text", defaultValue: t.businessType || "አጠቃላይ ንግድ" }, // አዲስ
            { id: "shopLogo", label: "የሱቅ ፕሮፋይል ፎቶ ሊንክ (URL)", type: "text", defaultValue: t.shopLogo || "" },
            { id: "registrationFee", label: "የመመዝገቢያ/ኪራይ ክፍያ (ETB)", type: "number", defaultValue: t.registrationFee || 0 },
            { id: "expiryDate", label: "የውል ማቂያ ቀን", type: "date", defaultValue: t.expiryDate }
        ], (res) => {
            t.shopName = res.shopName.trim();
            t.fullName = res.fullName.trim();
            t.phone = res.phone.trim();
            t.telegram = res.telegram.trim();
            t.googleMapsLink = res.mapsLink.trim();
            t.address = res.address.trim();
            t.businessType = res.businessType.trim(); // አዲስ
            t.shopLogo = res.shopLogo.trim();
            t.registrationFee = parseFloat(res.registrationFee) || 0;
            t.expiryDate = res.expiryDate;
            
            localDB.tenants[user] = t;
            pushToFirebase();
            renderAdminPanel();
            showCustomAlert("ተሳክቷል", "የተከራዩ መረጃ በተሳካ ሁኔታ ተሻሽሏል!");
        });
    }

    function openTenantProfileEditor() {
        showFormModal("⚙️ የሱቅ መረጃ እና ምስጢራዊ ኮድ ማስተካከያ", [
            { id: "shopName", label: "የሱቅ ስም", type: "text", defaultValue: currentTenant.shopName },
            { id: "phone", label: "የሱቅ ስልክ ቁጥር", type: "text", defaultValue: currentTenant.phone },
            { id: "mapsLink", label: "የጎግል ማፕ ሊንክ (Google Maps URL)", type: "text", defaultValue: currentTenant.googleMapsLink || "" },
            { id: "shopLogo", label: "የሱቅ ፕሮፋይል ፎቶ ሊንክ (Image URL)", type: "text", defaultValue: currentTenant.shopLogo || "" },
            { id: "newPassword", label: "አዲስ ምስጢራዊ ኮድ / ፓስዎርድ ለመቀየር (ባዶ ከሆነ አይቀየርም)", type: "password", placeholder: "አዲስ ነባር ኮድ" }
        ], (res) => {
            currentTenant.shopName = res.shopName.trim();
            currentTenant.phone = res.phone.trim();
            currentTenant.googleMapsLink = res.mapsLink.trim();
            currentTenant.shopLogo = res.shopLogo.trim();
            
            if (res.newPassword && res.newPassword.trim() !== "") {
                currentTenant.password = res.newPassword.trim();
            }

            saveAndRefresh();
            showCustomAlert("ተሳክቷል", "የሱቅዎ መረጃ እና ምስጢራዊ ኮድ በተሳካ ሁኔታ ተስተካክሏል!");
        });
    }

    function renderAdminPanel() {
        let tbody = document.getElementById('tenantTableBody'); tbody.innerHTML = '';
        let query = document.getElementById('adminSearchInput') ? document.getElementById('adminSearchInput').value.trim().toLowerCase() : "";

        let totalTenants = 0;
        let activeTenants = 0;
        let totalFeesCollected = 0;

        Object.keys(localDB.tenants).forEach(key => {
            let t = localDB.tenants[key];
            totalTenants++;
            if (t.status === "active") activeTenants++;
            totalFeesCollected += (parseFloat(t.registrationFee) || 0);

            if (query !== "" && !t.username.toLowerCase().includes(query)) return;

            let statusBadge = t.status === "active" ? `<span class="badge-success">Active</span>` : `<span class="badge-danger">Blocked</span>`;
            let profileInfo = `👤 <b>${t.fullName || '-'}</b><br>📞 ${t.phone || '-'}<br>📍 ${t.address || '-'}<br>✈️ ${t.telegram || '-'}`;
            
            let codeDisplay = "";
            if (!t.isActivated) {
                codeDisplay = `⏱️ ጊዜያዊ ኮድ: <b class="text-warning" style="font-size:1.1rem; background:rgba(0,0,0,0.4); padding:2px 6px; border-radius:4px;">${t.activationCode}</b>`;
            } else {
                codeDisplay = `<span class="text-success">🔒 ተከራዩ የራሱን ምስጢር ቆልፏል</span>`;
            }
            
            let loginInfo = `👤 አባል ስም: <code>${t.username}</code><br>${codeDisplay}<br>🛠️ ሰራተኛ: <code>${t.staffUser || '-'}</code>`;
            let contractDisplay = `<span>${t.contractType || 'በወር'}</span><br><b class="text-warning">${t.registrationFee || 0} ETB</b>`;
            
            // አዲስ የተጨመረ
            let bType = t.businessType || 'አጠቃላይ ንግድ';

            tbody.innerHTML += `<tr>
                <td><b>${t.shopName}</b><br><span style="color:var(--accent-color); font-size:0.8rem;">[${bType}]</span></td>
                <td>${profileInfo}</td>
                <td>${loginInfo}</td>
                <td>${contractDisplay}</td>
                <td style="color:var(--danger-color)"><b>${t.expiryDate || '-'}</b></td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn-add btn-sm" onclick="openAdminTenantEditor('${t.username}')">✍️ አሻሽል (Edit)</button>
                    <button class="btn-config btn-sm" onclick="toggleTenantStatus('${t.username}')">ሁኔታ ቀይር</button>
                    <button class="btn-expense btn-sm" onclick="deleteTenant('${t.username}')">Delete</button>
                    <button class="btn-add btn-sm" style="margin-top:4px;" onclick="regenerateTenantCode('${t.username}')">🔄 አዲስ ኮድ</button>
                </td>
            </tr>`;
        });

        document.getElementById('adminTotalTenants').innerText = totalTenants;
        document.getElementById('adminActiveTenants').innerText = activeTenants;
        document.getElementById('adminTotalFees').innerText = totalFeesCollected.toFixed(1) + " ETB";
    }

    function regenerateTenantCode(user) {
        let t = localDB.tenants[user];
        let newCode = generateRandomCode();
        t.activationCode = newCode;
        t.password = newCode;
        t.codeCreatedAt = new Date().getTime();
        t.isActivated = false; 
        localDB.tenants[user] = t;
        pushToFirebase();
        renderAdminPanel();
        showCustomAlert("ኮድ ተለውጧል", `ለተከራዩ አዲስ ኮድ ተፈጥሯል፦ ${newCode}`);
    }

    function toggleTenantStatus(user) {
        let t = localDB.tenants[user];
        t.status = t.status === "active" ? "blocked" : "active";
        pushToFirebase(); renderAdminPanel();
    }

    function deleteTenant(user) { 
        showCustomConfirm("ተከራይ ማጥፊያ", "ይህንን ተከራይ ሙሉ በሙሉ ለማጥፋት እርግጠኛ ኖት?", () => {
            delete localDB.tenants[user]; pushToFirebase(); renderAdminPanel(); 
        });
    }

    function logout() { 
        currentTenant = null; 
        localStorage.removeItem('tirfe_active_session');
        switchView('welcomeGateway');
    }

    function saveAndRefresh() { 
        localDB.tenants[currentTenant.username] = currentTenant; 
        saveToLocalStorage();
        pushToFirebase(); 
        renderApp(); 
    }

    function focusInventoryInput() { if(currentUserRole === "owner") document.getElementById('itemName').focus(); }

    function addItemDirectly() {
        if(currentUserRole === "staff") return;
        let name = document.getElementById('itemName').value.trim();
        let model = document.getElementById('itemModel').value.trim();
        let cost = parseFloat(document.getElementById('itemCost').value) || 0;
        let price = parseFloat(document.getElementById('itemPrice').value) || 0;
        let qty = parseInt(document.getElementById('itemQty').value) || 0;
        let imgUrl = document.getElementById('itemImgUrl').value.trim();
        
        if(!name || cost <= 0 || price <= 0 || qty <= 0) { showCustomAlert("ስህተት", "እባክዎ ትክክለኛ የዕቃ መረጃ ያስገቡ!"); return; }
        
        let inv = currentTenant.data.inventory || [];
        let existingItem = inv.find(item => item.name.toLowerCase() === name.toLowerCase() && (!item.model || item.model.toLowerCase() === model.toLowerCase()));
        
        if (existingItem) {
            existingItem.qty += qty;
            existingItem.cost = cost;
            existingItem.price = price;
            if(imgUrl) existingItem.imgUrl = imgUrl;
            showCustomAlert("🔄 ዕቃው ተሞልቷል", `"${name}" አስቀድሞ ስለነበረ አዲሱ ብዛት ተደምሮበታል። አጠቃላይ የነበረው ብዛት፦ ${existingItem.qty}`);
        } else {
            inv.push({ name, model: model || "-", cost, price, qty, sold: 0, profit: 0, imgUrl: imgUrl || "" });
        }
        
        currentTenant.data.inventory = inv; 
        saveAndRefresh();
        
        document.getElementById('itemName').value = ''; document.getElementById('itemModel').value = '';
        document.getElementById('itemCost').value = ''; document.getElementById('itemPrice').value = ''; 
        document.getElementById('itemQty').value = ''; document.getElementById('itemImgUrl').value = '';
    }

    function generateDigitalReceipt(itemName, count, totalVal, recId = null, sellerRole = null, saveToHistory = true) {
        if (!recId) recId = Math.floor(10000 + Math.random() * 90000);
        let dateStr = new Date().toLocaleDateString('am-ET');
        let currentSeller = sellerRole || (currentUserRole === 'staff' ? 'ሰራተኛ (Employee)' : 'ባለቤት (Employer)');
        
        // አዲስ የተጨመረ የንግድ ዘርፍ ማውጫ
        let bType = currentTenant.businessType || 'አጠቃላይ ንግድ'; 

        let rawTextForShare = `======= ${currentTenant.shopName.toUpperCase()} =======\nየንግድ ዘርፍ: ${bType}\nደረሰኝ ቁጥር: #${recId}\nየሸጠው ሰው: ${currentSeller}\nቀን: ${dateStr}\n---------------------------\nዕቃ: ${itemName}\nብዛት: ${count}\nጠቅላላ ዋጋ: ${totalVal} ETB\n---------------------------\nእናመሰግናለን!`;

        if (saveToHistory && !currentTenant.data.receipts) {
            currentTenant.data.receipts = [];
        }
        if (saveToHistory) {
            currentTenant.data.receipts.push({
                recId: recId,
                date: dateStr,
                itemName: itemName,
                count: count,
                totalVal: totalVal,
                seller: currentSeller
            });
            saveAndRefresh();
        }

        let receiptHTML = `
        <div class="receipt-container" id="printableReceiptArea">
            <div class="receipt-header">
                <h4>${currentTenant.shopName}</h4>
                <p style="color:#565656; font-weight:bold; margin-bottom:5px;">[ ${bType} ]</p>
                <p>ዲጂታል የሽያጭ ደረሰኝ</p>
                <p><b>ቁጥር (No):</b> #${recId} | <b>ቀን:</b> ${dateStr}</p>
                <p><b>የሻጭ ማንነት:</b> ${currentSeller}</p>
            </div>
            <table class="receipt-table">
                <thead>
                    <tr>
                        <th>የዕቃ ስም</th>
                        <th>ብዛት</th>
                        <th>ነጠላ ዋጋ</th>
                        <th>ጠቅላላ</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><b>${itemName}</b></td>
                        <td>${count}</td>
                        <td>${(totalVal/count).toFixed(1)}</td>
                        <td><b>${totalVal} ETB</b></td>
                    </tr>
                </tbody>
            </table>
            <div class="receipt-summary">
                የተከፈለ ጠቅላላ ሂሳብ: ${totalVal}.00 ETB
            </div>
            <div class="receipt-footer">
                ~ ስለመጡ እናመሰግናለን! እንደገና ይጎብኙን ~
            </div>
        </div>
        <div class="receipt-actions-grid">
            <button class="btn-sell" onclick="window.print()">𖖨️ ደረሰኝ አትም (Print)</button>
            <button class="btn-add" onclick="downloadReceiptPDF('${itemName}_${recId}')">📥 ፒዲኤፍ (PDF)</button>
            <button class="btn-config" style="background:#0088cc; color:white; grid-column: span 2;" onclick="shareToSocial('tg', \`${rawTextForShare}\`)">✈️ በቴሌግራም አጋራ</button>
            <button class="btn-expense" style="grid-column: span 2;" onclick="closeActiveModal()">❌ ዝጋ</button>
        </div>
        `;
        
        document.getElementById('formModalTitle').innerText = "🧾 የሽያጭ ደረሰኝ";
        let body = document.getElementById('formModalBody');
        body.innerHTML = receiptHTML;
        
        document.getElementById('formModalFooter').innerHTML = '';
        openModalContainer();
        document.getElementById('formModal').classList.remove('hidden');
    }

    function downloadReceiptPDF(filename) {
        const element = document.getElementById('printableReceiptArea');
        const opt = {
            margin:       10,
            filename:     'Receipt_' + filename + '.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a6', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    }

    function shareToSocial(platform, text) {
        let url = "";
        if(platform === 'tg') {
            url = `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`;
        } else if(platform === 'wa') {
            url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        }
        window.open(url, '_blank');
    }

    function viewPastReceipt(idx) {
        let rec = currentTenant.data.receipts[idx];
        generateDigitalReceipt(rec.itemName, rec.count, rec.totalVal, rec.recId, rec.seller, false);
    }

    function sellItem(idx) {
        if(currentTenant.data.shiftClosed) {
            showCustomAlert("🔒 የሂሳብ መዝጊያ ቀርቧል", "የዕለቱ ፈረቃ ተዘግቷል! አዲስ ሽያጭ መመዝገብ አይቻልም።");
            return;
        }
        let item = currentTenant.data.inventory[idx];
        let remaining = item.qty - item.sold;
        
        showFormModal(`${item.name} ለመሸጥ`, [
            { id: "count", label: `ስንት ፍሬ ተሸጠ? (ቀሪ፡ ${remaining})`, type: "number", placeholder: "1", defaultValue: "1" }
        ], (res) => {
            let count = parseInt(res.count) || 0;
            if (count <= 0) return;
            if (count > remaining) { showCustomAlert("ስህተት", "በክምችት ውስጥ ካለው ቀሪ እቃ ይበልጣል!"); return; }
            item.sold += count;
            
            let currentSeller = currentUserRole === 'staff' ? 'ሰራተኛ (Employee)' : 'ባለቤት (Employer)';
            let totalVal = item.price * count;
            
            sendTelegramAlert(`🛍️ የሽያጭ ማስታወቂያ (${currentSeller})፦\nየሱቅ ስም: ${currentTenant.shopName}\nዕቃ፡ ${item.name}\nብዛት፡ ${count} ፍሬ\nዋጋ፡ ${totalVal} ETB`);
            
            generateDigitalReceipt(item.name, count, totalVal);
        });
    }

    function openExpenseModal() {
        showFormModal("አዲስ ወጪ መዝግብ", [
            { id: "reason", label: "የወጪ ምክንያት", type: "text", placeholder: "ምሳሌ፡ ለመብራት ክፍያ" },
            { id: "amount", label: "የገንዘብ መጠን (ETB)", type: "number", placeholder: "0.00" }
        ], (res) => {
            let amount = parseFloat(res.amount) || 0; let reason = res.reason.trim();
            if(!reason || amount <= 0) return;
            let d = currentTenant.data || {}; if(!d.expenses) d.expenses = [];
            
            let todayObj = new Date();
            let yyyy = todayObj.getFullYear();
            let mm = String(todayObj.getMonth() + 1).padStart(2, '0');
            let dd = String(todayObj.getDate()).padStart(2, '0');
            let formattedDate = `${yyyy}-${mm}-${dd}`;

            d.expenses.push({ 
                reason, 
                amount, 
                date: formattedDate,
                time: new Date().toLocaleTimeString('am-ET') 
            });
            currentTenant.data = d; 
            saveAndRefresh();
        });
    }

    function openDebtModal() {
        let inv = currentTenant.data.inventory || [];
        if (inv.length === 0) {
            showCustomAlert("⚠️ ዕቃ አልተገኘም", "ዕዳ ለመመዝገብ አስቀድሞ በዕቃዎች ዝርዝር ውስጥ ቢያንስ አንድ ዕቃ መኖር አለበት!");
            return;
        }

        let itemOptions = inv.map((item, index) => {
            return { value: index, label: `${item.name} (${item.price} ETB)` };
        });

        showFormModal("አዲስ የዕዳ መዝገብ", [
            { id: "customer", label: "የባለዕዳ ሙሉ ስም", type: "text", placeholder: "የሰውየው ስም..." },
            { id: "phone", label: "ስልክ ቁጥር", type: "text", placeholder: "09..." },
            { id: "itemIdx", label: "የወሰደው የዕቃ አይነት", type: "select", options: itemOptions },
            { id: "qty", label: "የዕቃው ብዛት", type: "number", placeholder: "1", defaultValue: "1" },
            { id: "date", label: "ቀን", type: "date", defaultValue: new Date().toISOString().split('T')[0] }
        ], (res) => {
            let customer = res.customer.trim();
            let phone = res.phone.trim();
            let itemIdx = parseInt(res.itemIdx);
            let qty = parseInt(res.qty) || 0;
            let selectedDate = res.date ? new Date(res.date).toLocaleDateString('am-ET') : new Date().toLocaleDateString('am-ET');

            if (!customer || qty <= 0 || isNaN(itemIdx)) {
                showCustomAlert("ስህተት", "እባክዎ የተሟላና ትክክለኛ መረጃ ያስገቡ!");
                return;
            }

            let selectedItem = inv[itemIdx];
            let calculatedAmount = selectedItem.price * qty; 

            let d = currentTenant.data || {}; 
            if (!d.debts) d.debts = [];
            
            d.debts.push({ 
                customer: customer, 
                phone: phone || "-", 
                itemName: selectedItem.name,
                qty: qty,
                amount: calculatedAmount, 
                paid: 0, 
                date: selectedDate 
            });

            selectedItem.sold += qty; 

            currentTenant.data = d; 
            saveAndRefresh();

            sendTelegramAlert(`💳 አዲስ እዳ ተመዘገበ (${currentUserRole === 'staff' ? 'በሰራተኛ' : 'በአሰሪ'})፦\nባለእዳ፦ ${customer}\nእቃ፦ ${selectedItem.name} (${qty} ፍሬ)\nየታሰበ ሂሳብ፦ ${calculatedAmount} ETB\nቀን፦ ${selectedDate}`);
            showCustomAlert("ተሳክቷል", `${customer} በዕዳ የወሰደው ሂሳብ በራሱ ተባዝቶ ገብቷል፦ ${calculatedAmount} ETB`);
        });
    }

    function collectDebt(idx) {
        let debt = currentTenant.data.debts[idx];
        let remaining = debt.amount - debt.paid;
        
        showFormModal(`${debt.customer} እዳ ክፍያ መቀበያ`, [
            { id: "amount", label: `የተከፈለው ገንዘብ (ቀሪ ዕዳ፡ ${remaining} ETB)`, type: "number", placeholder: "0.00", defaultValue: remaining }
        ], (res) => {
            let amt = parseFloat(res.amount) || 0;
            if(amt <= 0 || amt > remaining) { showCustomAlert("ስህተት", "የክፍያ መጠን ልክ አይደለም!"); return; }
            debt.paid += amt;
            currentTenant.data.collectedCreditToday = (parseFloat(currentTenant.data.collectedCreditToday) || 0) + amt;
            saveAndRefresh();
            showCustomAlert("ክፍያ ተፈጽሟል", `${debt.customer} እዳ ከфሏል!`);
        });
    }

    function openDrawerModal() {
        showFormModal("ከሳጥን ብር ማንሻ / የተነሳ መመለሻ", [
            { id: "actionType", label: "የድርጊት ዓይነት ይምረጡ፦", type: "select", options: [
                { value: "withdraw", label: "💸 ከሳጥን ብር ማንሻ (Withdrawal)" },
                { value: "return", label: "📥 የተነሳ ብር መመለሻ (Repayment/Return)" }
            ]},
            { id: "reason", label: "ምክንያት / ማስታወሻ", type: "text", placeholder: "ምሳሌ፡ ለመልስ መለወጫ / የወሰድኩትን መለስኩ" },
            { id: "amount", label: "የገንዘብ መጠን (ETB)", type: "number", placeholder: "0.00" }
        ], (res) => {
            let amount = parseFloat(res.amount) || 0; 
            let reason = res.reason.trim();
            let action = res.actionType;
            if(!reason || amount <= 0) return;
            
            let d = currentTenant.data || {}; 
            if(!d.drawerLog) d.drawerLog = [];
            
            let finalAmount = action === "withdraw" ? amount : -amount;
            let displayType = action === "withdraw" ? "ገንዘብ ተነሳ" : "ገንዘብ ተመለሰ";
            
            d.drawerLog.push({ 
                reason: `${action === "withdraw" ? "⚠️ [የተነሳ] " : "✅ [የተመለሰ] "} ${reason}`, 
                amount: finalAmount, 
                time: new Date().toLocaleTimeString('am-ET') 
            });
            
            currentTenant.data = d; 
            saveAndRefresh();
            sendTelegramAlert(`💸 ከሳጥን ${displayType} (${currentUserRole === 'staff' ? 'በሰራተኛ' : 'በአሰሪ'})፦\nምክንያት፡ ${reason}\nመጠን፡ ${amount} ETB`);
        });
    }

    function openSettlementModal() {
        if(currentUserRole === "staff") return;
        
        showFormModal("📊 የሂሳብ ማወራረጃ ማዕከል", [
            { id: "period", label: "የማወራረጃ ጊዜ ይምረጡ፦", type: "select", options: [
                { value: "monthly", label: "📅 የዚህ ወር ሂሳብ ማወራረጃ" },
                { value: "yearly", label: "📆 የአመታዊ ሂሳብ ማወራረጃ" }
            ]},
            { id: "bankBalance", label: "በአሁኑ ሰዓት በባንክ አካውንትዎ / ቴሌብር ላይ ያለ ጠቅላላ የገንዘብ መጠን (ETB)፦", type: "number", placeholder: "0.00" }
        ], (res) => {
            let period = res.period;
            let bankAmt = parseFloat(res.bankBalance) || 0;
            let d = currentTenant.data || {};
            
            let totalSales = 0;
            let totalCost = 0;
            let totalExpenses = 0;
            let totalDraws = 0;
            let totalDebtRemaining = 0;
            let currentStockValue = 0;

            let inv = d.inventory || [];
            inv.forEach(item => {
                let remaining = Math.max(0, item.qty - item.sold);
                currentStockValue += (item.cost * remaining); 
                totalSales += (item.price * item.sold);
                totalCost += (item.cost * item.sold);
            });

            let debts = d.debts || [];
            debts.forEach(debt => {
                totalDebtRemaining += (debt.amount - debt.paid);
            });

            if (period === "monthly") {
                (d.expenses || []).forEach(e => totalExpenses += parseFloat(e.amount) || 0);
                (d.drawerLog || []).forEach(dr => totalDraws += parseFloat(dr.amount) || 0);
                
                let grossProfit = totalSales - totalCost;
                let netProfit = grossProfit - totalExpenses;
                
                let expectedBankBalance = totalSales - totalExpenses - totalDraws - totalDebtRemaining;
                if(expectedBankBalance < 0) expectedBankBalance = 0;

                let variance = bankAmt - expectedBankBalance;
                let resultMessage = "";
                
                if (variance === 0) {
                    resultMessage = "✅ የባንክ ሂሳብዎ ከሲስተሙ ጋር በትክክል ይገጥማል! ካፒታልዎ ጤናማ ነው።";
                } else if (variance > 0) {
                    resultMessage = `📈 ጥሩ ነው! ካፒታልዎ በ ${variance.toFixed(2)} ETB ጨምሯል (ትርፍ/ትርፍ አሳይቷል)።`;
                } else {
                    resultMessage = `⚠️ ትኩረት፦ ካፒታልዎ በ ${Math.abs(variance).toFixed(2)} ETB ቀንሷል! እባክዎ ወጪዎችን ወይም ያልተመዘገቡ ሽያጮችን ይፈትሹ።`;
                }

                let AmharicSummary = `
                ======= 📅 የወር ሂሳብ ማወራረጃ ሪፖርት =======
                • በሱቅ ውስጥ ያለ ዕቃ ካፒታል ዋጋ፡ ${currentStockValue.toFixed(2)} ETB
                • ጠቅላላ የተመዘገበ ሽያጭ፡ ${totalSales.toFixed(2)} ETB
                • የዚህ ወር ጠቅላላ ወጪዎች፡ ${totalExpenses.toFixed(2)} ETB
                • ከሳጥን የተነሳ ጠቅላላ ብር፡ ${totalDraws.toFixed(2)} ETB
                • በሰዎች ላይ ያለ ቀሪ ዕዳ፡ ${totalDebtRemaining.toFixed(2)} ETB
                ----------------------------------------
                • በባንክ ሊኖር የሚገባው (Expected)፦ ${expectedBankBalance.toFixed(2)} ETB
                • እርስዎ ያስገቡት የባንክ መረጃ፦ ${bankAmt.toFixed(2)} ETB
                • የካፒታል ልዩነት ውጤት፦ ${variance.toFixed(2)} ETB
                ----------------------------------------
                የሲስተም ማጠቃለያ ማስታወሻ፦
                ${resultMessage}
                `;
                
                showCustomAlert("📊 ወርሃዊ ማወራረጃ ማጠቃለያ", AmharicSummary);
                sendTelegramAlert(`📊 የሂሳብ ማወራረጃ ሪፖርት ማጠቃለያ (የወር)፦\n${AmharicSummary}`);

            } else if (period === "yearly") {
                let archiveSales = 0;
                let archiveProfit = 0;
                let archiveExpenses = 0;
                let historyList = d.history || [];

                historyList.forEach(h => {
                    if (h.isMonthlyArchive) {
                        archiveSales += parseFloat(h.sales) || 0;
                        archiveProfit += parseFloat(h.profit) || 0;
                        archiveExpenses += parseFloat(h.expenses) || 0;
                    }
                });

                let currentGrossProfit = totalSales - totalCost;
                let currentExpenses = 0;
                (d.expenses || []).forEach(e => currentExpenses += parseFloat(e.amount) || 0);
                let currentNetProfit = currentGrossProfit - currentExpenses;

                let overallYearlySales = archiveSales + totalSales;
                let overallYearlyProfit = archiveProfit + currentNetProfit;
                let overallYearlyExpenses = archiveExpenses + currentExpenses;

                let yearlySummary = `
                ======= 📆 አመታዊ የካፒታልና ሂሳብ ማወራረጃ =======
                • ጠቅላላ የአመቱ የሱቅ ሽያጭ፡ ${overallYearlySales.toFixed(2)} ETB
                • ጠቅላላ የተመዘገቡ አመታዊ ወጪዎች፡ ${overallYearlyExpenses.toFixed(2)} ETB
                • አጠቃላይ የተጣራ አመታዊ ትርፍ (Net Profit)፦ ${overallYearlyProfit.toFixed(2)} ETB
                • በአሁኑ ሰዓት በእጅ ያለ እቃ ካፒታል ዋጋ፡ ${currentStockValue.toFixed(2)} ETB
                ----------------------------------------
                • እርስዎ ያስገቡት የባንክ አካውንት መጠን፡ ${bankAmt.toFixed(2)} ETB
                • በሰዎች ላይ ያለ ያልተሰበሰበ ጠቅላላ ዕዳ፡ ${totalDebtRemaining.toFixed(2)} ETB
                ----------------------------------------
                💡 ማሳሰቢያ፦ አመታዊ ካፒታልዎ በትክክል እንዲያድግ ያለፉትን ወራት የካፒታል ታሪክ ማህደር መመልከትዎን ያረጋግጡ።
                `;
                
                showCustomAlert("📆 አመታዊ ማወራረጃ ማጠቃለያ", yearlySummary);
                sendTelegramAlert(`📆 አመታዊ የሂሳብ ማወራረጃ ሪፖርት፦\n${yearlySummary}`);
            }
        });
    }

    function configureBank() {
        if(currentUserRole === "staff") {
            showCustomAlert("🏦 የባንክ ሂሳብ መረጃ ማያያዣ", `የአሰሪው የባንክ ሂሳብ ቁጥር (CBE/Telebirr)፦ ${currentTenant.bankAccount || "ያልተገናኘ"}`);
            return;
        }

        showFormModal("የባንክ እና የቴሌግራም አገናኝ መቼት", [
            { id: "telegramToken", label: "የቴሌግራም ቦት ቶከን (Telegram Bot Token)", type: "text", placeholder: "Token...", defaultValue: currentTenant.telegramToken || "" },
            { id: "telegramChatId", label: "የቴሌግራም ቻት ID (Telegram Chat ID)", type: "text", placeholder: "Chat ID...", defaultValue: currentTenant.telegramChatId || "" },
            { id: "bankAccountNumber", label: "የባንክ ሂሳብ ቁጥር (CBE/Telebirr)", type: "text", placeholder: "የባንክ ቁጥር...", defaultValue: currentTenant.bankAccount || "" }
        ], (res) => {
            currentTenant.telegramToken = res.telegramToken.trim();
            currentTenant.telegramChatId = res.telegramChatId.trim();
            currentTenant.bankAccount = res.bankAccountNumber.trim();
            saveAndRefresh();
            showCustomAlert("ተሳክቷል", "የማያያዣ መቼቶች በተሳካ ሁኔታ ተቀምጠዋል!");
        });
    }

    function saveStaffAccount() {
        if(currentUserRole === "staff") return;
        let u = document.getElementById('staffUser').value.trim().toLowerCase();
        let p = document.getElementById('staffPass').value.trim();
        if(!u || !p) { showCustomAlert("ስህተት", "እባክዎ የተሟላ የሰራተኛ መግቢያ ይሙሉ!"); return; }
        
        if (u === currentTenant.username) {
            showCustomAlert("⚠️ ስህተት", "የሰራተኛው Username ከሱቅ ባለቤቱ Username ጋር አንድ አይነት መሆን አይችልም!");
            return;
        }
        if (localDB.tenants) {
            for (let key in localDB.tenants) {
                let otherTenant = localDB.tenants[key];
                if (otherTenant.username === u) {
                    showCustomAlert("⚠️ ስህተት", "ይህ ዩዘርኔም አስቀድሞ በሲስተሙ ውስጥ በሌላ የሱቅ ባለቤት ተይዟል!");
                    return;
                }
                if (otherTenant.username !== currentTenant.username && otherTenant.staffUser && otherTenant.staffUser === u) {
                    showCustomAlert("⚠️ ስህተት", "ይህ ዩዘርኔም አስቀድሞ በሌላ ሱቅ ሰራተኛ ተይዟል!");
                    return;
                }
            }
        }

        currentTenant.staffUser = u;
        currentTenant.staffPass = p;
        saveAndRefresh();
        showCustomAlert("ተገኝቷል", "የሰራተኛ አካውንት በተሳካ ሁኔታ ተቀይሯል!");
    }

    function triggerShiftReport() {
        let d = currentTenant.data || {};
        let session = d.sessionData || {};
        
        let sysSales = parseFloat(d.collectedCreditToday || 0);
        let todayProfit = 0;
        let inv = d.inventory || [];
        inv.forEach(item => {
            sysSales += (item.price * item.sold);
            todayProfit += (item.price - item.cost) * item.sold;
        });

        showFormModal("🔒 የዕለት ሂሳብ ሪፖርት መዝጊያ ማቅረቢያ", [
            { id: "reportedCash", label: "በእጅዎ የሚገኘውን ትክክለኛ የጥሬ ገንዘብ (Cash) መጠን ያስገቡ፦", type: "number", placeholder: "0.00" }
        ], (res) => {
            let reported = parseFloat(res.reportedCash) || 0;
            let tExp = 0; let tDraw = 0;
            
            let todayObj = new Date();
            let yyyy = todayObj.getFullYear();
            let mm = String(todayObj.getMonth() + 1).padStart(2, '0');
            let dd = String(todayObj.getDate()).padStart(2, '0');
            let formattedDateToday = `${yyyy}-${mm}-${dd}`;
            
            (d.expenses || []).forEach(e => {
                if (e.date === formattedDateToday) tExp += parseFloat(e.amount) || 0;
            });
            (d.drawerLog || []).forEach(dr => tDraw += parseFloat(dr.amount) || 0);

            let expectedCash = ((parseFloat(session.initialFloat) || 0) + sysSales) - tExp - tDraw;
            let variance = reported - expectedCash;
            let statusText = variance === 0 ? "ትክክል (Balanced)" : `ልዩነት አለ (${variance} ETB)`;

            d.shiftClosed = true;
            d.reportedCash = reported;
            d.variance = variance;
            d.expectedCash = expectedCash;

            document.getElementById('shiftStatusAlert').classList.add('hidden');
            showCustomAlert("ሪፖርት ቀርቧል", `የዕለቱ ሂሳብ በተሳካ ሁኔታ ተዘጋጅቷል!\nሁኔታ፡ ${statusText}\nበሲስተሙ የሚጠበቅ ካሽ፡ ${expectedCash} ETB\nየቀረበው ካሽ፡ ${reported} ETB`);
            
            if(!d.history) d.history = [];

            d.history.push({
                date: formattedDateToday, 
                employee: session.employee || "ሰራተኛ",
                sales: sysSales, 
                profit: todayProfit - tExp, 
                expenses: tExp, 
                draws: tDraw,
                reportedCash: reported,
                expectedCash: expectedCash,
                variance: variance,
                isMonthlyArchive: false
            });
            currentTenant.data = d;
            saveAndRefresh();
        });
    }

    function startNewDaySession() {
        if(currentUserRole === "staff") return;
        showCustomConfirm("አዲስ ቀን መጀመር", "የዛሬውን ቀን ሂሳብ ሙሉ በሙሉ አጽድተው ለአዲስ ቀን ማዘጋጀት ይፈልጋሉ?", () => {
            let d = currentTenant.data || {};
            let inv = d.inventory || [];
            
            inv.forEach(item => {
                item.qty = Math.max(0, item.qty - item.sold); 
                item.sold = 0;
            });

            d.sessionActive = false; 
            d.shiftClosed = false;
            d.drawerLog = []; 
            d.collectedCreditToday = 0;
            currentTenant.data = d; 
            saveAndRefresh(); 
            checkMorningSession();
        });
    }

    function clearAllTenantData() {
        if(currentUserRole === "staff") return;
        showCustomConfirm("ሁሉንም ዳታ ማጽዳት", "ሁሉንም ዳታ ለማጥፋት እርግጠኛ ኖት?", () => {
            currentTenant.data = { sessionActive: false, shiftClosed: false, inventory: [], expenses: [], debts: [], drawerLog: [], history: [], receipts: [], lastMonthlyResetDate: new Date().getTime() };
            saveAndRefresh(); checkMorningSession();
        });
    }

    function renderHistoryTable() {
        let d = currentTenant.data || {};
        let historyBody = document.getElementById('historyBody');
        historyBody.innerHTML = '<tr><th>ቀን/ዓይነት</th><th>ሰራተኛ/ወቅት</th><th>ሽያጭ</th><th>ትርፍ</th><th>ሪፖርት ካሽ</th><th>ልዩነት</th></tr>';
        
        let historyList = d.history || [];
        let filterValue = document.getElementById('historyDateFilter').value; 

        let filtered = historyList.filter(h => {
            if(!filterValue) return true;
            return h.date === filterValue;
        });

        if(filtered.length === 0) {
            historyBody.innerHTML += '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">በተፈለገው ቀን ምንም ታሪክ የለም</td></tr>';
        } else {
            filtered.forEach(h => {
                let vColor = h.variance === 0 ? 'var(--success-color)' : 'var(--danger-color)';
                let rowStyle = h.isMonthlyArchive ? `style="background: rgba(192, 132, 252, 0.15); border-left: 4px solid var(--purple-color);"` : '';
                historyBody.innerHTML += `<tr ${rowStyle}>
                    <td><b>${h.date}</b></td>
                    <td>${h.employee}</td>
                    <td style="color:var(--success-color)">${h.sales}</td>
                    <td style="color:var(--accent-color)"><b>${h.profit}</b></td>
                    <td>${h.reportedCash || 0}</td>
                    <td style="color:${vColor}"><b>${h.variance || 0}</b></td>
                </tr>`;
            });
        }
    }

    function renderApp() {
        let d = currentTenant.data || {}; let session = d.sessionData || {};
        if(d.sessionActive) { 
            document.getElementById('sessionDisplay').innerText = `📅 ${session.date} | 👤 አስገቢ፡ ${session.employee} | 💰 መነሻ ካዝና፡ ${session.initialFloat} ETB`; 
        }
        
        let headerRow = document.getElementById('inventoryTableHeader');
        if (currentUserRole === "staff") {
            headerRow.innerHTML = `<th>የዕቃ ስም</th><th>ሞዴል</th><th>መሸጫ ዋጋ</th><th>የዛሬ ሽያጭ</th><th>ቀሪ ክምችት</th>`;
        } else {
            headerRow.innerHTML = `<th>የዕቃ ስም</th><th>ሞዴል</th><th>መግዣ</th><th>መሸጫ</th><th>የነበረው</th><th>የዛሬ ሽያጭ</th><th>ቀሪ</th><th>ትርፍ</th><th>እርምጃ</th>`;
        }

        let tbody = document.getElementById('inventoryBody'); tbody.innerHTML = '';
        let collectedCredit = parseFloat(d.collectedCreditToday) || 0;
        let tSales = collectedCredit; let todayProfit = 0; let tExp = 0; let tDraw = 0; let currentTotalCapital = 0;
        
        let expensesList = d.expenses || []; expensesList.forEach(e => tExp += parseFloat(e.amount) || 0);
        let drawsList = d.drawerLog || []; drawsList.forEach(dr => tDraw += parseFloat(dr.amount) || 0);

        let query = document.getElementById('inventorySearchInput') ? document.getElementById('inventorySearchInput').value.trim().toLowerCase() : "";

        let inv = d.inventory || [];
        inv.forEach((item, idx) => {
            let remaining = Math.max(0, item.qty - item.sold); 
            let profit = (item.price - item.cost) * item.sold;
            tSales += (item.price * item.sold); todayProfit += profit; currentTotalCapital += (item.cost * remaining);
            
            if (query !== "" && !item.name.toLowerCase().includes(query)) return;

            let rowClass = remaining <= 3 ? 'low-stock-row' : '';
            let stockBadge = remaining <= 3 ? '<span class="low-stock-badge">⚠️</span>' : '';
            let itemModelText = item.model || "-";

            if (currentUserRole === "staff") {
                tbody.innerHTML += `<tr class="${rowClass}">
                    <td><strong>${item.name}</strong> ${stockBadge}</td>
                    <td>${itemModelText}</td>
                    <td>${item.price} ETB</td>
                    <td><button class="btn-sell btn-sm" onclick="sellItem(${idx})">➕ ሸጥ</button> <b>${item.sold}</b></td>
                    <td style="${remaining <= 3 ? 'color:#f87171;font-weight:bold;' : ''}">${remaining}</td>
                </tr>`;
            } else {
                tbody.innerHTML += `<tr class="${rowClass}">
                    <td><strong>${item.name}</strong> ${stockBadge}</td>
                    <td>${itemModelText}</td>
                    <td>${item.cost}</td>
                    <td>${item.price}</td>
                    <td>${item.qty}</td>
                    <td><button class="btn-sell btn-sm" onclick="sellItem(${idx})">➕ ሸጥ</button> <b>${item.sold}</b></td>
                    <td>${remaining}</td>
                    <td>${profit}</td>
                    <td><button class="btn-expense btn-sm" onclick="deleteInventoryItem(${idx})">🗑️</button></td>
                </tr>`;
            }
        });

        let todayObj = new Date();
        let yyyy = todayObj.getFullYear();
        let mm = String(todayObj.getMonth() + 1).padStart(2, '0');
        let dd = String(todayObj.getDate()).padStart(2, '0');
        let formattedDateToday = `${yyyy}-${mm}-${dd}`;
        
        let todayExpensesTotal = 0;
        expensesList.forEach(e => {
            if (e.date === formattedDateToday) todayExpensesTotal += parseFloat(e.amount) || 0;
        });

        let finalCashInHand = ((parseFloat(session.initialFloat) || 0) + tSales) - todayExpensesTotal - tDraw;
        document.getElementById('totalInCash').innerText = finalCashInHand.toFixed(1) + " ETB";

        if (currentUserRole === "owner") {
            let monthlyProfit = todayProfit - todayExpensesTotal;
            let historyList = d.history || []; historyList.forEach(h => monthlyProfit += parseFloat(h.profit) || 0);

            document.getElementById('totalCapital').innerText = currentTotalCapital.toFixed(1) + " ETB";
            document.getElementById('todayNetProfit').innerText = (todayProfit - todayExpensesTotal).toFixed(1) + " ETB";
            document.getElementById('monthlyNetProfit').innerText = monthlyProfit.toFixed(1) + " ETB";
            document.getElementById('monthlyExpenses').innerText = tExp.toFixed(1) + " ETB"; 
            document.getElementById('totalDraws').innerText = tDraw.toFixed(1) + " ETB";
            
            if (myChart) {
                myChart.data.datasets[0].data = [currentTotalCapital, tSales, todayProfit - todayExpensesTotal];
                myChart.update();
            }
            renderHistoryTable();
        }

        let creditBody = document.getElementById('creditBody');
        creditBody.innerHTML = '<tr><th>ባለዕዳ / ስልክ</th><th>የወሰደው ዕቃ (ብዛት)</th><th>ጠቅላላ ዕዳ</th><th>ቀሪ</th><th>ድርጊት</th></tr>';
        let debts = d.debts || [];
        if(debts.length === 0) {
            creditBody.innerHTML += '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">ምንም የዕዳ መዝገብ የለም</td></tr>';
        } else {
            debts.forEach((debt, idx) => {
                let remaining = debt.amount - debt.paid;
                if (remaining > 0) {
                    let itemDisplay = debt.itemName ? `${debt.itemName} (${debt.qty || 1} ፍሬ)` : "-";
                    creditBody.innerHTML += `<tr>
                        <td><b>${debt.customer}</b><br><small style="color:#94a3b8">${debt.phone}</small><br><small style="color:var(--warning-color)">📅 ${debt.date || ''}</small></td>
                        <td>${itemDisplay}</td>
                        <td>${debt.amount} ETB</td>
                        <td style="color:var(--danger-color)"><b>${remaining} ETB</b></td>
                        <td><button class="btn-sell btn-sm" onclick="collectDebt(${idx})">ክፍያ</button></td>
                    </tr>`;
                }
            });
        }

        let drawBody = document.getElementById('drawBody');
        drawBody.innerHTML = '<tr><th>ምክንያት</th><th>የተወሰደው</th><th>ሰዓት</th></tr>';
        if(drawsList.length === 0) {
            drawBody.innerHTML += '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">ምንም የተነሳ ገንዘብ የለም</td></tr>';
        } else {
            drawsList.forEach(dr => {
                let isReturn = dr.amount < 0;
                let displayAmt = isReturn ? Math.abs(dr.amount) + " ETB (መለሰ)" : dr.amount + " ETB";
                let displayColor = isReturn ? "var(--success-color)" : "var(--purple-color)";
                let tbodyColor = `style="color:${displayColor}; font-weight:bold;"`;
                
                drawBody.innerHTML += `<tr>
                    <td>${dr.reason}</td>
                    <td ${tbodyColor}>${displayAmt}</td>
                    <td>${dr.time}</td>
                </tr>`;
            });
        }

        let receiptHistoryBody = document.getElementById('receiptHistoryTableBody');
        receiptHistoryBody.innerHTML = '';
        let pastReceipts = d.receipts || [];
        
        let receiptFilterDate = document.getElementById('receiptDateFilter').value;

        if (!receiptFilterDate) {
            receiptHistoryBody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; font-weight: bold;">📅 እባክዎ ደረሰኞችን ለማየት መጀመሪያ ቀን ይምረጡ!</td></tr>';
        } else {
            let selectedFormattedDate = new Date(receiptFilterDate).toLocaleDateString('am-ET');
            
            let filteredReceipts = pastReceipts.filter(rec => rec.date === selectedFormattedDate);

            if (filteredReceipts.length === 0) {
                receiptHistoryBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8;">የመረጡት ቀን (${selectedFormattedDate}) የተቆረጠ ምንም ደረሰኝ የለም።</td></tr>`;
            } else {
                let reversedReceipts = [...pastReceipts].reverse();
                reversedReceipts.forEach((rec, originalIdx) => {
                    let actualIdx = pastReceipts.length - 1 - originalIdx;
                    
                    if (rec.date === selectedFormattedDate) {
                        receiptHistoryBody.innerHTML += `<tr>
                            <td><b>#${rec.recId}</b></td>
                            <td>${rec.date}</td>
                            <td>${rec.itemName}</td>
                            <td>${rec.count}</td>
                            <td class="text-success"><b>${rec.totalVal} ETB</b></td>
                            <td><span class="text-warning">${rec.seller}</span></td>
                            <td><button class="btn-config btn-sm" onclick="viewPastReceipt(${actualIdx})">👁️ ድጋሚ እይ / Print</button></td>
                        </tr>`;
                    }
                });
            }
        }
    }

    function initChart() {
        let canvasElement = document.getElementById('businessChart');
        if (!canvasElement || currentUserRole === "staff") return;
        let ctx = canvasElement.getContext('2d');
        if (myChart) myChart.destroy();
        myChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['ካፒታል', 'የዛሬ ሽያጭ', 'የዛሬ ትርፍ'],
                datasets: [{
                    label: 'የገንዘብ መጠን (ETB)',
                    data: [0, 0, 0],
                    backgroundColor: ['#38bdf8', '#4ade80', '#fbbf24'],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { ticks: { color: '#94a3b8' } }
                }
            }
        });
    }

    function checkMorningSession() {
        let d = currentTenant.data || {};
        if (!d.sessionActive) {
            showFormModal("የቀኑ መጀመሪያ መመዝገቢያ (የካዝና ማስሞያ)", [
                { id: "employee", label: "የገቢ አድራጊው/ሰራተኛው ስም ያስገቡ፦", type: "text", placeholder: "ስም", defaultValue: currentUserRole === "staff" ? "ሰራተኛ" : "አሰሪ" },
                { id: "initialFloat", label: "ጠዋት በካዝና/ሳጥን ውስጥ የተገኘ መነሻ ገንዘብ (Float)፦", type: "number", placeholder: "0.00", defaultValue: "0" }
            ], (res) => {
                let today = new Date();
                d.sessionData = {
                    date: today.toLocaleDateString('am-ET'),
                    loginTime: today.toLocaleTimeString('am-ET', {hour:'2-digit', minute:'2-digit'}),
                    employee: res.employee || "ሰራተኛ",
                    initialFloat: parseFloat(res.initialFloat) || 0
                };
                d.sessionActive = true;
                d.shiftClosed = false;
                d.expenses = d.expenses || []; 
                d.drawerLog = [];
                d.debts = d.debts || [];
                d.receipts = d.receipts || [];
                d.collectedCreditToday = 0;
                currentTenant.data = d;
                saveAndRefresh();
            });
        } else {
            renderApp();
        }
    }

    function pushToFirebase() { 
        if(isOnline) {
            db.ref('tirfe_system').set(localDB); 
        }
    }
    
    function openModalContainer() { document.getElementById('modalOverlay').classList.remove('hidden'); }
    
    function closeActiveModal() {
        document.getElementById('modalOverlay').classList.add('hidden');
        document.querySelectorAll('.modal-card').forEach(m => m.classList.add('hidden'));
    }

    function showCustomAlert(title, message, callback) {
        document.getElementById('alertTitle').innerText = title;
        document.getElementById('alertMessage').innerText = message;
        openModalContainer();
        document.getElementById('alertModal').classList.remove('hidden');
        document.querySelector('#alertModal .btn-add').onclick = function() { closeActiveModal(); if(callback) callback(); };
    }

    function showFormModal(title, fields, onSubmit) {
        document.getElementById('formModalTitle').innerText = title;
        let body = document.getElementById('formModalBody');
        body.innerHTML = '';
        
        fields.forEach(f => {
            let label = document.createElement('label');
            label.innerText = f.label;
            label.style.fontSize = '0.85rem';
            label.style.color = 'var(--accent-color)';
            label.style.display = 'block';
            label.style.marginTop = '10px';
            
            let input;
            if(f.type === 'select') {
                input = document.createElement('select');
                f.options.forEach(opt => {
                    let o = document.createElement('option');
                    o.value = opt.value;
                    o.innerText = opt.label;
                    input.appendChild(o);
                });
            } else {
                input = document.createElement('input');
                input.type = f.type || 'text';
                input.placeholder = f.placeholder || '';
                if(f.defaultValue !== undefined) input.value = f.defaultValue;
            }
            input.id = 'formField_' + f.id;
            body.appendChild(label);
            body.appendChild(input);
        });
        
        let footer = document.getElementById('formModalFooter');
        footer.innerHTML = '';
        
        let cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-config';
        cancelBtn.innerText = 'ሰርዝ';
        cancelBtn.onclick = closeActiveModal;
        
        let submitBtn = document.createElement('button');
        submitBtn.className = 'btn-sell';
        submitBtn.innerText = 'አስገባ';
        submitBtn.onclick = function() {
            let data = {};
            fields.forEach(f => {
                let val = document.getElementById('formField_' + f.id).value;
                data[f.id] = val;
            });
            closeActiveModal();
            onSubmit(data);
        };
        
        footer.appendChild(cancelBtn);
        footer.appendChild(submitBtn);
        
        openModalContainer();
        document.getElementById('formModal').classList.remove('hidden');
    }

    function showCustomConfirm(title, message, onConfirm) {
        document.getElementById('confirmTitle').innerText = title;
        document.getElementById('confirmMessage').innerText = message;
        openModalContainer();
        document.getElementById('confirmModal').classList.remove('hidden');
        document.getElementById('confirmYesBtn').onclick = function() { closeActiveModal(); if(onConfirm) onConfirm(); };
    }

    function changeTheme(themeClass) {
        document.body.className = themeClass;
        if(currentTenant) {
            currentTenant.theme = themeClass;
            saveAndRefresh();
        }
    }

    function deleteInventoryItem(idx) { 
        if(currentUserRole === "staff") return;
        showCustomConfirm("እቃ መሰረዣ", "ይህንን እቃ ማጥፋት ይፈልጋሉ?", () => {
            currentTenant.data.inventory.splice(idx, 1); saveAndRefresh(); 
        });
    }
</script>
</body>
</html>
