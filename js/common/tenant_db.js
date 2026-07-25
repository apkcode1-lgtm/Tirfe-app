// ፋይል: js/shop/tenant_db.js
// ይህ ፋይል ለሻጭ (Tenant) ብቻ የሚያገለግል የዳታቤዝ ሎጂክ ይዟል

let tenantState = {
    profile: null,
    orders: [],
    taxReceipts: []
};

let isTenantListenerAttached = false;

// 1. የሻጩን መረጃ ከፋየርቤዝ ማምጣት (Read/Listen)
function initTenantDB(username) {
    if (!username || typeof db === 'undefined' || isTenantListenerAttached) return;
    
    isTenantListenerAttached = true;
    console.log(`Initializing Database for Tenant: ${username}`);

    // ሀ. የሻጩን ዋና ፕሮፋይል እና ዕቃዎች (Inventory) ማዳመጥ
    db.ref(`tirfe_system/tenants/${username}`).on('value', (snapshot) => {
        if (snapshot.exists()) {
            tenantState.profile = snapshot.val();
            // መረጃውን ወደ LocalStorage ማስቀመጥ (ለ Offline አገልግሎት)
            localStorage.setItem('tirfe_tenant_profile', JSON.stringify(tenantState.profile));
            
            // የ UI ማደሻ ፈንክሽን ካለ መጥራት
            if (typeof renderApp === 'function') renderApp();
        }
    });

    // ለ. ወደዚህ ሻጭ የመጡ አዳዲስ ትዕዛዞችን ማዳመጥ (ከማዕከላዊው Order Manager)
    db.ref('tirfe_system/orders')
      .orderByChild('tenantUsername')
      .equalTo(username)
      .on('value', (snapshot) => {
          if (snapshot.exists()) {
              let ordersData = snapshot.val();
              // ፋየርቤዝ ኦብጀክት ስለሚመልስ ወደ አሬይ (Array) እንቀይረዋለን
              tenantState.orders = Object.keys(ordersData).map(key => ({
                  id: key,
                  ...ordersData[key]
              }));
              // የትዕዛዝ ማሳያ UI ማደስ 
              if (typeof renderOrderTable === 'function') renderOrderTable();
          } else {
              tenantState.orders = [];
          }
      });

    // ሐ. የሻጩን የግብር ደረሰኞች ማዳመጥ
    db.ref('tirfe_system/taxReceipts')
      .orderByChild('tenantUsername')
      .equalTo(username)
      .on('value', (snapshot) => {
          if (snapshot.exists()) {
              tenantState.taxReceipts = Object.values(snapshot.val());
              if (typeof renderTenantTaxReceipts === 'function') renderTenantTaxReceipts();
          }
      });
}

// 2. የሻጭ መረጃን ወደ ፋየርቤዝ መላክ (Write/Update)
function saveTenantProfileToFirebase() {
    if (!tenantState.profile || !tenantState.profile.username) return;

    let username = tenantState.profile.username;
    
    // undefined የሆኑ ዳታዎችን ለማፅዳት
    let cleanData = JSON.parse(JSON.stringify(tenantState.profile));

    // አዲሱን መረጃ ለማስቀመጥ Object እናዘጋጃለን
    let updates = {};

    // ሀ. የሻጩ ዋና ዳታ (Private Data)
    updates[`tirfe_system/tenants/${username}`] = cleanData;

    // ለ. የህዝብ (Public) መረጃ ለገዢዎች እንዲታይ
    let publicProfile = { ...cleanData };
    delete publicProfile.password;
    delete publicProfile.activationCode;
    delete publicProfile.staffAccounts;
    delete publicProfile.telegramToken;
    delete publicProfile.bankAccount;
    updates[`tirfe_system/public_tenants/${username}`] = publicProfile;

    // ሐ. ለአድሚን ማጠቃለያ የሚሆን (ከባድ የሆኑ የዕቃ ዝርዝሮችን በመቀነስ)
    let adminSummary = { ...cleanData };
    delete adminSummary.items;
    delete adminSummary.products;
    delete adminSummary.catalog;
    delete adminSummary.taxReceipts;
    updates[`tirfe_system/admin_tenant_summary/${username}`] = adminSummary;

    // .update() በመጠቀም ፋየርቤዝ ላይ መፃፍ (Overwrite አያደርግም)
    db.ref().update(updates)
      .then(() => console.log("Tenant data successfully synced to Firebase!"))
      .catch(err => console.error("Firebase Tenant Sync Error:", err));
}

// 3. አዲስ እቃ ሲጨመር ወይም ሲቀየር የምንጠቀመው ፈንክሽን
function updateTenantInventory(newItems) {
    if(tenantState.profile) {
        tenantState.profile.items = newItems;
        saveTenantProfileToFirebase();
    }
}
