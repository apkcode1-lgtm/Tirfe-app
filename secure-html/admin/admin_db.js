// admin_db.js

function pushAdminDataToFirebase() {
    if(!isOnline || typeof db === 'undefined' || currentUserRole !== 'admin') return; //[span_30](start_span)[span_30](end_span)
    
    let adminUpdates = {}; //[span_31](start_span)[span_31](end_span)
    adminUpdates['motorQuotas'] = cleanData(localDB.motorQuotas) || {}; //[span_32](start_span)[span_32](end_span)
    adminUpdates['tariffs'] = cleanData(localDB.tariffs) || {}; //[span_33](start_span)[span_33](end_span)
    adminUpdates['businessTypes'] = cleanData(localDB.businessTypes) || []; //[span_34](start_span)[span_34](end_span)
    adminUpdates['adminSettings'] = cleanData(localDB.adminSettings) || {}; //[span_35](start_span)[span_35](end_span)

    db.ref('tirfe_system').update(adminUpdates).catch(err => console.error(err)); //[span_36](start_span)[span_36](end_span)
}

function setupAdminListeners() {
    if(typeof currentUserRole !== 'undefined' && currentUserRole === 'admin' && !window.adminListenerAttached) { //[span_37](start_span)[span_37](end_span)
        window.adminListenerAttached = true; //[span_38](start_span)[span_38](end_span)
        const adminNodes = [
            { fbNode: 'admin_tenant_summary', localKey: 'tenants' },  //[span_39](start_span)[span_39](end_span)
            { fbNode: 'buyers', localKey: 'buyers' }, //[span_40](start_span)[span_40](end_span)
            { fbNode: 'motors', localKey: 'motors' } //[span_41](start_span)[span_41](end_span)
        ];

        adminNodes.forEach(nodeObj => {
            let ref = db.ref(`tirfe_system/${nodeObj.fbNode}`); //[span_42](start_span)[span_42](end_span)
            ref.on('child_added', (snapshot) => { /* Update localDB & refresh UI[span_43](start_span)[span_43](end_span) */ }); 
        });
    }
}

