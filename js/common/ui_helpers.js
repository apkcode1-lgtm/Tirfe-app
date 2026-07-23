function openUnifiedLogin() {
    switchView('unifiedLoginBox');
    document.getElementById('loginUnifiedError').innerText = "";
    document.getElementById('loginUnifiedUser').value = "";
    document.getElementById('loginUnifiedEmail').value = "";
    document.getElementById('loginUnifiedPass').value = "";
}

function openUnifiedRegister() {
    switchView('unifiedRegisterBox');
    document.getElementById('unifiedRegRole').value = 'buyer';
    toggleUnifiedRegForm();
}

function toggleUnifiedRegForm() {
    let role = document.getElementById('unifiedRegRole').value;
    document.getElementById('unifiedBuyerForm').classList.add('hidden');
    document.getElementById('unifiedTenantForm').classList.add('hidden');
    let motorForm = document.getElementById('unifiedMotorForm');
    if(motorForm) motorForm.classList.add('hidden');
    
    if(role === 'buyer') {
        document.getElementById('unifiedBuyerForm').classList.remove('hidden');
    } else if(role === 'tenant') {
        document.getElementById('unifiedTenantForm').classList.remove('hidden');
        if (typeof populateAllBizTypeDropdowns === 'function') populateAllBizTypeDropdowns();
    } else if(role === 'motor') {
        if(motorForm) motorForm.classList.remove('hidden');
        if (typeof updateAllLocationDropdowns === 'function') updateAllLocationDropdowns(); 
    }
}

function autoFillPubCapitalFee() {
    let capital = document.getElementById('pub_newCapitalTier').value;
    let contractType = document.getElementById('pub_newContractType').value;
    let feeInput = document.getElementById('pub_newRegistrationFee');
    let tariffs = localDB.tariffs || { low: 500, medium: 1000, high: 2000 };
    let baseFee = 0;
    
    if (capital === 'low') baseFee = tariffs.low;
    else if (capital === 'medium') baseFee = tariffs.medium;
    else if (capital === 'high') baseFee = tariffs.high;

    if (contractType === 'በዓመት' && baseFee > 0) {
        baseFee = baseFee * 12;
    }
    
    if (baseFee > 0) {
        feeInput.value = baseFee;
    } else {
        feeInput.value = '';
    }
}

