// motor_db.js
function pushMotorDataToFirebase() {
    if(!isOnline || typeof db === 'undefined' || !currentMotor) return;
    
    let motorData = cleanData(localDB.motors[currentMotor.username]); //[span_13](start_span)[span_13](end_span)
    if(motorData) {
        db.ref(`tirfe_system/motors/${currentMotor.username}`).set(motorData) //[span_14](start_span)[span_14](end_span)
        .catch(err => console.error("Firebase Motor Sync Error:", err)); //[span_15](start_span)[span_15](end_span)
    }
}

function setupMotorListeners() {
    if(typeof currentMotor !== 'undefined' && currentMotor && !window.motorListenerAttached) { //[span_16](start_span)[span_16](end_span)
        window.motorListenerAttached = true; //[span_17](start_span)[span_17](end_span)
        db.ref(`tirfe_system/motors/${currentMotor.username}`).on('value', (snapshot) => { //[span_18](start_span)[span_18](end_span)
            if(snapshot.exists()) {
                localDB.motors[currentMotor.username] = snapshot.val(); //[span_19](start_span)[span_19](end_span)
                saveToLocalStorage(); //[span_20](start_span)[span_20](end_span)
                triggerUIRefresh(); //[span_21](start_span)[span_21](end_span)
            }
        });
    }
}

