// --------------------------------------------------------
// 🚀 3. ሚናን መሰረት ያደረጉ የማመሳሰያ ፋንክሽኖች
// --------------------------------------------------------

function pushAdminFirebase() {
    let adminUpdates = {};
    if(localDB.motorQuotas) adminUpdates['motorQuotas'] = cleanData(localDB.motorQuotas);
    if(localDB.tariffs) adminUpdates['tariffs'] = cleanData(localDB.tariffs);
    if(localDB.businessTypes) adminUpdates['businessTypes'] = cleanData(localDB.businessTypes);
    if(localDB.adminSettings) adminUpdates['adminSettings'] = cleanData(localDB.adminSettings);

    if(Object.keys(adminUpdates).length > 0) {
        queueAction('UPDATE', '', null, adminUpdates); 
    }
}

function pushTenantFirebase() {
    if(typeof currentTenant !== 'undefined' && currentTenant) {
        let tenantData = cleanData(localDB.tenants[currentTenant.username]);
        if(tenantData) {
            tenantData.lastUpdated = Date.now(); 
            
            queueAction('UPDATE', 'tenants', currentTenant.username, tenantData);
            
            let publicT = getPublicTenantsData({ [currentTenant.username]: tenantData });
            queueAction('UPDATE', 'public_tenants', currentTenant.username, publicT[currentTenant.username]);

            let adminSummary = Object.assign({}, tenantData);
            delete adminSummary.items; 
            delete adminSummary.products;
            delete adminSummary.catalog;
            delete adminSummary.taxReceipts;
            queueAction('UPDATE', 'admin_tenant_summary', currentTenant.username, adminSummary);
        }
    }
}

function pushBuyerFirebase() {
    if(typeof currentBuyer !== 'undefined' && currentBuyer) {
        let buyerData = cleanData(localDB.buyers[currentBuyer.username]);
        if(buyerData) {
            buyerData.lastUpdated = Date.now();
            queueAction('UPDATE', 'buyers', currentBuyer.username, buyerData);
        }
    }
}

function pushRevenueFirebase() {
    if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer) {
        let revData = cleanData(localDB.revenueAuthorities[currentRevenueOfficer.username]);
        if(revData) {
            revData.lastUpdated = Date.now();
            queueAction('UPDATE', 'revenueAuthorities', currentRevenueOfficer.username, revData);
        }
        // የገቢዎች ሰራተኛ የሞተረኛ ኮታውን በ UPDATE እንዲያዘምን ተደርጓል (ዳታ እንዳያጠፋ)
        if(localDB.motorQuotas) {
            queueAction('UPDATE', 'motorQuotas', null, cleanData(localDB.motorQuotas));
        }
    }
}

function pushMotorFirebase() {
    if(typeof currentMotor !== 'undefined' && currentMotor) {
        let motorData = cleanData(localDB.motors[currentMotor.username]);
        if(motorData) {
            motorData.lastUpdated = Date.now();
            queueAction('UPDATE', 'motors', currentMotor.username, motorData);
        }
    }
}

// ዋናው መቆጣጠሪያ - ሌሎች ፋይሎች እንዳይበላሹ 
function pushToFirebase() { 
    saveToLocalStorage();
    
    if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin') {
        pushAdminFirebase();
    } else {
        pushTenantFirebase();
        pushBuyerFirebase();
        pushRevenueFirebase();
        pushMotorFirebase();
    }
    
    processActionQueue();
}

