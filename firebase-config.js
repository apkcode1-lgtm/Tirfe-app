// Firebaseን እናስገባለን
import { initializeApp } from "firebase/app";

// የፕሮጀክትህ ማዋቀሪያ
const firebaseConfig = {
  apiKey: "AIzaSyBgXU6N4cMV2q-d3XeFzvgFT98gJ1GM7Ws",
  authDomain: "tirfe-app.firebaseapp.com",
  databaseURL: "https://tirfe-app-default-rtdb.firebaseio.com",
  projectId: "tirfe-app",
  storageBucket: "tirfe-app.firebasestorage.app",
  messagingSenderId: "228622358915",
  appId: "1:228622358915:web:c9ff3039a6d6cf66613eb6"
};

// Firebaseን እናስጀምራለን
const app = initializeApp(firebaseConfig);

// ለአድሚን የሚልክ ፈንክሽን (HTML ላይ መጥራት እንድትችል 'window' ላይ እናስረዋለን)
window.notifyAdmin = async function(messageText) {
    const functionUrl = "https://us-central1-tirfe-app.cloudfunctions.net/sendAdminTelegram";
    
    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: messageText })
        });
        const result = await response.json();
        console.log("Admin Alert Sent:", result);
        alert("መልእክቱ ለአድሚን ተልኳል!");
    } catch (error) {
        console.error("Error:", error);
        alert("ስህተት ተፈጥሯል፣ እባክዎ እንደገና ይሞክሩ።");
    }
}

// ለነጋዴ የሚልክ ፈንክሽን (HTML ላይ መጥራት እንድትችል 'window' ላይ እናስረዋለን)
window.notifyTenant = async function(tenantUsername, messageText) {
    const functionUrl = "https://us-central1-tirfe-app.cloudfunctions.net/sendTenantTelegram";
    
    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                username: tenantUsername, 
                text: messageText 
            })
        });
        const result = await response.json();
        console.log("Tenant Alert Sent:", result);
        alert("መልእክቱ ለነጋዴው ተልኳል!");
    } catch (error) {
        console.error("Error:", error);
    }
}
