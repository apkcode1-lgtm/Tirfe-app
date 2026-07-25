// buyer_db.js
function pushBuyerDataToFirebase() {
    if(!isOnline || typeof db === 'undefined' || !currentBuyer) return;
    
    let buyerData = cleanData(localDB.buyers[currentBuyer.username]); //[span_0](start_span)[span_0](end_span)
    if(buyerData) {
        db.ref(`tirfe_system/buyers/${currentBuyer.username}`).set(buyerData) //[span_1](start_span)[span_1](end_span)
        .catch(err => console.error("Firebase Buyer Sync Error:", err)); //[span_2](start_span)[span_2](end_span)
    }
}

function setupBuyerListeners() {
    if(typeof currentBuyer !== 'undefined' && currentBuyer && !window.buyerListenerAttached) { //[span_3](start_span)[span_3](end_span)
        window.buyerListenerAttached = true; //[span_4](start_span)[span_4](end_span)
        // የራሱን ዳታ ያዳምጣል
        db.ref(`tirfe_system/buyers/${currentBuyer.username}`).on('value', (snapshot) => { //[span_5](start_span)[span_5](end_span)
            if(snapshot.exists()) { 
                localDB.buyers[currentBuyer.username] = snapshot.val(); //[span_6](start_span)[span_6](end_span)
                saveToLocalStorage(); //[span_7](start_span)[span_7](end_span)
                triggerUIRefresh(); //[span_8](start_span)[span_8](end_span)
            }
        });
        // የሻጮችን የዕቃ ዝርዝር (Public Catalog) ያዳምጣል
        db.ref(`tirfe_system/public_tenants`).on('value', (snapshot) => { //[span_9](start_span)[span_9](end_span)
            if(snapshot.exists()) { 
                localDB.tenants = snapshot.val(); //[span_10](start_span)[span_10](end_span)
                saveToLocalStorage(); //[span_11](start_span)[span_11](end_span)
                if(typeof renderBuyerCatalog === 'function') renderBuyerCatalog(); //[span_12](start_span)[span_12](end_span)
            }
        });
    }
}

