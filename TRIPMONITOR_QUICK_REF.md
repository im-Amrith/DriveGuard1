# TripMonitor Alert Integration - Quick Reference

## 🎯 Goal
Send real-time alerts to backend when drowsiness is detected, triggering emergency contact notifications at threshold.

---

## 📝 Required Changes to TripMonitor.js

### 1. Add Imports (Top of file)
```javascript
import axios from 'axios';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;
```

### 2. Add State Variables (Inside component)
```javascript
const [currentTripId, setCurrentTripId] = useState(null);
const [alertTimestamps, setAlertTimestamps] = useState([]);
const [notificationSent, setNotificationSent] = useState(false);
```

### 3. Add Alert Logging Function
```javascript
const sendAlertToBackend = async (alertType) => {
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
            `${API_BASE_URL}/api/alert`,
            {
                trip_id: currentTripId,
                alert_type: alertType,
                timestamp: new Date().toISOString()
            },
            { headers: { 'x-access-token': token } }
        );
        
        if (response.data.emergency_notification_sent && !notificationSent) {
            setNotificationSent(true);
            alert('⚠️ Emergency contacts have been notified!');
        }
    } catch (error) {
        console.error('Error sending alert:', error);
    }
};
```

### 4. Modify Alert Detection Code
**FIND THIS in your current code:**
```javascript
// When you detect a yawn or drowsiness
if (yawnDetected) {
    setAlertCount(prev => prev + 1);
    playAlert();
}
```

**CHANGE TO:**
```javascript
if (yawnDetected) {
    setAlertCount(prev => prev + 1);
    playAlert();
    sendAlertToBackend('yawn'); // ADD THIS LINE
}
```

### 5. Store Trip ID When Trip Starts
**FIND THIS in your current code:**
```javascript
const handleStartTrip = async () => {
    // Your existing trip start code
}
```

**ADD INSIDE:**
```javascript
const handleStartTrip = async () => {
    // ... your existing code ...
    
    // ADD THIS: Save trip ID when trip is created
    const response = await axios.post(
        `${API_BASE_URL}/api/trips`,
        { /* your trip data */ },
        { headers: { 'x-access-token': token } }
    );
    
    setCurrentTripId(response.data.trip_id); // ADD THIS
    setAlertTimestamps([]); // ADD THIS
    setNotificationSent(false); // ADD THIS
}
```

---

## 🎨 Optional: Add Visual Alert Counter

Add this to your render/return statement:

```javascript
return (
    <div style={{ position: 'relative' }}>
        {/* Existing TripMonitor UI */}
        
        {/* Alert Counter Overlay */}
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: alertCount >= 5 ? 'rgba(231, 76, 60, 0.9)' : 'rgba(52, 73, 94, 0.9)',
            padding: '15px 25px',
            borderRadius: '30px',
            color: 'white',
            fontWeight: 'bold'
        }}>
            Alerts: {alertCount}/5
        </div>
        
        {/* Emergency Notification Banner */}
        {notificationSent && (
            <div style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'rgba(231, 76, 60, 0.95)',
                padding: '40px',
                borderRadius: '20px',
                color: 'white',
                textAlign: 'center',
                zIndex: 9999,
                maxWidth: '500px'
            }}>
                <h2>🚨 EMERGENCY ALERT</h2>
                <p>Your emergency contacts have been notified.</p>
                <button 
                    onClick={() => setNotificationSent(false)}
                    style={{
                        marginTop: '20px',
                        padding: '12px 30px',
                        background: 'white',
                        color: '#e74c3c',
                        border: 'none',
                        borderRadius: '30px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    I Understand
                </button>
            </div>
        )}
    </div>
);
```

---

## 🔍 Where to Find Things in Your Code

### Look for these patterns:

**Alert Detection:**
- Search for: `yawnDetected`, `drowsinessDetected`, `alertCount`
- Usually in: `useEffect` with webcam/detection logic

**Trip Creation:**
- Search for: `handleStartTrip`, `startTrip`, `POST /api/trips`
- Usually in: Button click handler or form submit

**Alert Counter:**
- Search for: `setAlertCount`, `alertCount`
- Usually near: Detection logic

---

## ✅ Quick Test

After making changes:

1. Start the app
2. Login
3. Start a new trip
4. **Open browser console** (F12)
5. Trigger alerts manually or via detection
6. Check console for: "Alert sent to backend"
7. After 5 alerts, check email

---

## 🐛 Troubleshooting

### Console Error: "trip_id is null"
**Fix:** Make sure you're setting `currentTripId` when trip starts

### Console Error: "Cannot read property 'emergency_notification_sent'"
**Fix:** Check that backend is running and `/api/alert` endpoint exists

### No email received
**Fix:** 
1. Check SendGrid API key in backend/.env
2. Verify sender email is authenticated
3. Check spam folder
4. Look at backend console for errors

---

## 📞 Support Files

- Full example: `TripMonitor_Integration_Guide.js`
- Setup guide: `EMERGENCY_CONTACTS_SETUP.md`
- Complete checklist: `HACKATHON_CHECKLIST.md`

---

**That's it!** These are the ONLY changes needed to TripMonitor.js. 

Keep it simple, test frequently, and you're good to go! 🚀
