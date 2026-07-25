// revenue_db.js
function pushRevenueDataToFirebase() {
    if(!isOnline || typeof db === 'undefined' || !currentRevenueOfficer) return;
    
    let revData = cleanData(localDB.revenueAuthorities[currentRevenueOfficer.username]); //[span_22](start_span)[span_22](end_span)
    if(revData) {
        db.ref(`tirfe_system/revenueAuthorities/${currentRevenueOfficer.username}`).set(revData) //[span_23](start_span)[span_23](end_span)
        .catch(err => console.error("Firebase Revenue Sync Error:", err)); //[span_24](start_span)[span_24](end_span)
    }
    // ሞተር ኮታ (Quota) ካለ
    if(localDB.motorQuotas) { //[span_25](start_span)[span_25](end_span)
        db.ref(`tirfe_system/motorQuotas`).set(cleanData(localDB.motorQuotas)) //[span_26](start_span)[span_26](end_span)
        .catch(err => console.error("Firebase Quota Sync Error:", err)); //[span_27](start_span)[span_27](end_span)
    }
}

function setupRevenueListeners() {
    if(typeof currentRevenueOfficer !== 'undefined' && currentRevenueOfficer && !window.revenueListenerAttached) { //[span_28](start_span)[span_28](end_span)
        window.revenueListenerAttached = true; //[span_29](start_span)[span_29](end_span)
        // የራሱን ዳታ ያዳምጣል
        db.ref(`tirfe_system/revenueAuthorities/${currentRevenueOfficer.username}`).on('value', (snapshot) => { //[span_30](start_span)[span_30](end_span)
            if(snapshot.exists()) { 
                localDB.revenueAuthorities[currentRevenueOfficer.username] = snapshot.val(); //[span_31](start_span)[span_31](end_span)
                saveToLocalStorage(); //[span_32](start_span)[span_32](end_span)
                triggerUIRefresh(); //[span_33](start_span)[span_33](end_span)
            }
        });
        // የሞተር ኮታዎችን ያዳምጣል
        db.ref(`tirfe_system/motorQuotas`).on('value', (snapshot) => { //[span_34](start_span)[span_34](end_span)
            if(snapshot.exists()) { 
                localDB.motorQuotas = snapshot.val(); //[span_35](start_span)[span_35](end_span)
                saveToLocalStorage(); //[span_36](start_span)[span_36](end_span)
            }
        });
    }
}

