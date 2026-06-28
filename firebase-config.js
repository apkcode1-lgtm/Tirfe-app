// True 
const firebaseConfig = {
  apiKey: "AIzaSyBgXU6N4cMV2q-d3XeFzvgFT98gJ1GM7Ws",
  authDomain: "tirfe-app.firebaseapp.com",
  databaseURL: "https://tirfe-app-default-rtdb.firebaseio.com",
  projectId: "tirfe-app",
  storageBucket: "tirfe-app.firebasestorage.app",
  messagingSenderId: "228622358915",
  appId: "1:228622358915:web:c9ff3039a6d6cf66613eb6"
};

// ፋየርቤዝ ከዚህ በፊት initialize ካልተደረገ ብቻ እንዲጀምር ማድረግ
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

