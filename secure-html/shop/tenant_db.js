// tenant_db.js

function getPublicTenantsData(tenantsData) {
    let publicData = {}; //[span_44](start_span)[span_44](end_span)
    for (let k in tenantsData) {
        publicData[k] = Object.assign({}, tenantsData[k]); //[span_45](start_span)[span_45](end_span)
        delete publicData[k].password; delete publicData[k].activationCode; //[span_46](start_span)[span_46](end_span)
        // ... (ሌሎችም ሚስጥራዊ ዳታዎች ይጠፋሉ) ... //[span_47](start_span)[span_47](end_span)
    }
    return publicData; //[span_48](start_span)[span_48](end_span)
}

function pushTenantDataToFirebase() {
    if(!isOnline || typeof db === 'undefined' || !currentTenant) return; //[span_49](start_span)[span_49](end_span)

    let tenantData = cleanData(localDB.tenants[currentTenant.username]); //[span_50](start_span)[span_50](end_span)
    if(tenantData) {
        let updates = {}; //[span_51](start_span)[span_51](end_span)
        updates[`tenants/${currentTenant.username}`] = tenantData; //[span_52](start_span)[span_52](end_span)
        
        let publicT = getPublicTenantsData({ [currentTenant.username]: tenantData }); //[span_53](start_span)[span_53](end_span)
        updates[`public_tenants/${currentTenant.username}`] = publicT[currentTenant.username]; //[span_54](start_span)[span_54](end_span)

        let adminSummary = Object.assign({}, tenantData); //[span_55](start_span)[span_55](end_span)
        delete adminSummary.items; delete adminSummary.products; //[span_56](start_span)[span_56](end_span)
        updates[`admin_tenant_summary/${currentTenant.username}`] = adminSummary; //[span_57](start_span)[span_57](end_span)

        db.ref('tirfe_system').update(updates); //[span_58](start_span)[span_58](end_span)
    }
}

function setupTenantListeners() {
    if(typeof currentTenant !== 'undefined' && currentTenant && !window.tenantListenerAttached) { //[span_59](start_span)[span_59](end_span)
        window.tenantListenerAttached = true; //[span_60](start_span)[span_60](end_span)
        db.ref(`tirfe_system/tenants/${currentTenant.username}`).on('value', (snapshot) => { //[span_61](start_span)[span_61](end_span)
            if(snapshot.exists()) {
                localDB.tenants[currentTenant.username] = snapshot.val(); //[span_62](start_span)[span_62](end_span)
                saveToLocalStorage(); //[span_63](start_span)[span_63](end_span)
                // trigger UI refresh[span_64](start_span)[span_64](end_span)
            }
        });
    }
}

