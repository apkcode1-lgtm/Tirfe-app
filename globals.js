let currentTenant = null;
let currentUserRole = "owner";
let currentRevenueOfficer = null;
let myChart = null;
let currentLoginMode = "unified";
let activeCategoryFilter = "all";
let currentBuyer = null;
window.mainCart = [];
window.buyerCartData = [];

let emailVerificationCode = "";
let pendingRegistrationData = null;
let pendingRegType = null;
let onVerifySuccess = null;
let tempStaffForms = [];

function setCategoryFilter(cat) {
    activeCategoryFilter = cat;
    if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog();
}

// =====================================================================
// ዳይናሚክ የክልል፣ ዞን እና ወረዳ ሎጂክ (Cascading Dropdowns from Revenue Data)
// =====================================================================

function getAvailableLocations() {
    let locations = { regions: [], zonesByRegion: {}, woredasByZone: {} };
    if (!localDB || !localDB.revenueAuthorities) return locations;

    // የገቢዎች ባለስልጣን ከተመዘገበበት ዳታ ላይ ክልል፣ ዞን እና ወረዳዎችን ማውጣት
    for (let key in localDB.revenueAuthorities) {
        let rev = localDB.revenueAuthorities[key];
        // የገቢዎች ዳታ ላይ ያሉት የክልል ስሞች authRegion, authZone, authWoreda ስለሆኑ ይህንን አስተካክለናል
        let rRegion = rev.authRegion || rev.region; 
        let rZone = rev.authZone || rev.zone;
        let rWoreda = rev.authWoreda || rev.woreda;

        if (rRegion && rZone && rWoreda) {
            
            // ክልል መጨመር
            if (!locations.regions.includes(rRegion)) {
                locations.regions.push(rRegion);
            }
            
            // ዞን በክልል ስር መጨመር
            if (!locations.zonesByRegion[rRegion]) {
                locations.zonesByRegion[rRegion] = [];
            }
            if (!locations.zonesByRegion[rRegion].includes(rZone)) {
                locations.zonesByRegion[rRegion].push(rZone);
            }

            // ወረዳ በዞን ስር መጨመር (Region_Zone እንደ ቁልፍ በመጠቀም)
            let zoneKey = rRegion + "_" + rZone;
            if (!locations.woredasByZone[zoneKey]) {
                locations.woredasByZone[zoneKey] = [];
            }
            if (!locations.woredasByZone[zoneKey].includes(rWoreda)) {
                locations.woredasByZone[zoneKey].push(rWoreda);
            }
        }
    }
    return locations;
}

function initLocationDropdowns(regionId, zoneId, woredaId) {
    let regSelect = document.getElementById(regionId);
    let zoneSelect = document.getElementById(zoneId);
    let worSelect = document.getElementById(woredaId);
    if (!regSelect || !zoneSelect || !worSelect) return;

    let locs = getAvailableLocations();
    // ክልሎችን መዘርዘር
    regSelect.innerHTML = '<option value="">-- ክልል ይምረጡ --</option>';
    locs.regions.forEach(r => {
        let opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        regSelect.appendChild(opt);
    });
    zoneSelect.innerHTML = '<option value="">-- መጀመሪያ ክልል ይምረጡ --</option>';
    worSelect.innerHTML = '<option value="">-- መጀመሪያ ዞን ይምረጡ --</option>';
}

function handleRegionChange(regionId, zoneId, woredaId) {
    let regSelect = document.getElementById(regionId);
    let zoneSelect = document.getElementById(zoneId);
    let worSelect = document.getElementById(woredaId);
    if (!regSelect || !zoneSelect || !worSelect) return;

    let selectedRegion = regSelect.value;
    let locs = getAvailableLocations();
    zoneSelect.innerHTML = '<option value="">-- ዞን ይምረጡ --</option>';
    worSelect.innerHTML = '<option value="">-- መጀመሪያ ዞን ይምረጡ --</option>';
    if (selectedRegion && locs.zonesByRegion[selectedRegion]) {
        locs.zonesByRegion[selectedRegion].forEach(z => {
            let opt = document.createElement('option');
            opt.value = z;
            opt.textContent = z;
            zoneSelect.appendChild(opt);
        });
    }
}

function handleZoneChange(regionId, zoneId, woredaId) {
    let regSelect = document.getElementById(regionId);
    let zoneSelect = document.getElementById(zoneId);
    let worSelect = document.getElementById(woredaId);
    if (!regSelect || !zoneSelect || !worSelect) return;

    let selectedRegion = regSelect.value;
    let selectedZone = zoneSelect.value;
    let locs = getAvailableLocations();
    worSelect.innerHTML = '<option value="">-- ወረዳ ይምረጡ --</option>';

    let zoneKey = selectedRegion + "_" + selectedZone;
    if (selectedZone && locs.woredasByZone[zoneKey]) {
        locs.woredasByZone[zoneKey].forEach(w => {
            let opt = document.createElement('option');
            opt.value = w;
            opt.textContent = w;
            worSelect.appendChild(opt);
        });
    }
}

function updateAllLocationDropdowns() {
    // የተጠቃሚዎች መመዝገቢያ ፎርም (Unified Form) አፕዴት ማድረግ
    if (document.getElementById('pub_newRegion')) {
        let currentReg = document.getElementById('pub_newRegion').value;
        let currentZone = document.getElementById('pub_newZone').value;
        let currentWor = document.getElementById('pub_newWoreda').value;
        
        initLocationDropdowns('pub_newRegion', 'pub_newZone', 'pub_newWoreda');
        if (currentReg) {
            document.getElementById('pub_newRegion').value = currentReg;
            handleRegionChange('pub_newRegion', 'pub_newZone', 'pub_newWoreda');
            if (currentZone) {
                document.getElementById('pub_newZone').value = currentZone;
                handleZoneChange('pub_newRegion', 'pub_newZone', 'pub_newWoreda');
                if (currentWor) {
                    document.getElementById('pub_newWoreda').value = currentWor;
                }
            }
        }
    }

    // የአድሚን መመዝገቢያ ፎርም አፕዴት ማድረግ
    if (document.getElementById('newRegion')) {
        let currentReg = document.getElementById('newRegion').value;
        let currentZone = document.getElementById('newZone').value;
        let currentWor = document.getElementById('newWoreda').value;
        
        initLocationDropdowns('newRegion', 'newZone', 'newWoreda');
        if (currentReg) {
            document.getElementById('newRegion').value = currentReg;
            handleRegionChange('newRegion', 'newZone', 'newWoreda');
            if (currentZone) {
                document.getElementById('newZone').value = currentZone;
                handleZoneChange('newRegion', 'newZone', 'newWoreda');
                if (currentWor) {
                    document.getElementById('newWoreda').value = currentWor;
                }
            }
        }
    }
}
