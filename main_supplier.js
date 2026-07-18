let supplierInventory = [];
let monthlyProfit = 0; 

// በየወሩ ፈረንጆች ቀን 1 ሲሆን ትርፍን 00 የማድረጊያ አውቶማቲክ ሎጂክ
function checkMonthlyReset() {
    let today = new Date();
    if (today.getDate() === 1) { 
        monthlyProfit = 0; 
    }
    document.getElementById('distProfit').innerText = monthlyProfit.toFixed(2) + " ETB";
}

function registerDistItem() {
    let name = document.getElementById('pName').value;
    let model = document.getElementById('pModel').value;
    let cost = parseFloat(document.getElementById('pCost').value) || 0;
    let price = parseFloat(document.getElementById('pPrice').value) || 0;
    let qty = parseInt(document.getElementById('pQty').value) || 0;

    if(!name || cost <= 0 || qty <= 0) return alert("እባክዎ መረጃዎችን በትክክል ይሙሉ!");

    supplierInventory.push({ name, model, cost, price, qty });
    calculateCapital();
    alert("እቃው በተሳካ ሁኔታ ተመዝግቧል!");
}

// ካፒታልን (የተገዛበት ዋጋ * ብዛት) የመደመር ሎጂክ
function calculateCapital() {
    let totalCapital = 0;
    supplierInventory.forEach(item => {
        totalCapital += (item.cost * item.qty);
    });
    document.getElementById('distCapital').innerText = totalCapital.toFixed(2) + " ETB";
}

// ገጹ ሲከፈት የቀን ቼከሩን በራሱ እንዲጀምር ማድረግ
window.onload = checkMonthlyReset;

