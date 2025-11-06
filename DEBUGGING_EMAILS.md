# 🔍 Emergency Contact Email Debugging Guide

## Current Status
✅ SendGrid test email works  
❓ Real-time alerts not triggering emails

## Added Debug Logging

### Frontend Console (Browser F12)
You'll now see:
```
🚗 Creating trip... {start_location: "...", end_location: "..."}
✅ Trip created: {trip_id: 123, ...}
📝 Trip ID stored: 123

😴 Drowsiness detected! Tracking alert...
🔔 Sending alert to backend: trip_id=123, type=drowsy
✅ Alert sent successfully: {current_alert_count: 1, ...}

🥱 Yawn detected! Tracking alert...
🔔 Sending alert to backend: trip_id=123, type=yawn
✅ Alert sent successfully: {current_alert_count: 2, ...}

... (repeat until alert 6) ...

✅ Alert sent successfully: {current_alert_count: 6, emergency_notification_sent: true}
🚨 EMERGENCY NOTIFICATION WAS SENT!
```

### Backend Console (Flask Terminal)
You'll see:
```
🔔 Alert received: trip_id=123, alert_type=drowsy
📊 Current alert count for trip 123: 1

🔔 Alert received: trip_id=123, alert_type=drowsy
📊 Current alert count for trip 123: 2

... (repeat) ...

🔔 Alert received: trip_id=123, alert_type=drowsy
📊 Current alert count for trip 123: 6
⚠️ Alert threshold exceeded (6 alerts)! Sending emergency notification...
👥 Found 1 emergency contacts
📧 Sending emergency email to: your-email@example.com
✅ Emergency notification sent! Trip ID: 123, Alerts: 6
```

---

## 🔧 Testing Steps

### 1. Start Backend (Terminal)
```powershell
cd D:\comp\detectguard\backend
.\venv\Scripts\Activate.ps1
python app.py
```

**Watch for:**
- Server starts on port 10000 or 5000
- No errors

### 2. Start Frontend (New Terminal)
```powershell
cd D:\comp\detectguard\frontend
npm start
```

**Watch for:**
- Opens browser at localhost:3000
- No compilation errors

### 3. Open Browser Console
- Press **F12**
- Go to **Console** tab
- Keep it open during testing

### 4. Test Flow
1. **Login** to DriveGuard
2. Go to **Emergency Contacts**
3. **Add at least 1 contact** (use your real email)
4. Go back to **Dashboard**
5. **Fill in** start/end locations
6. Click **Show Route**
7. Click **Start Navigation**
   - ✅ Check console: "Trip created" with trip_id
8. **Trigger alerts:**
   - Close your eyes for 3+ seconds
   - OR yawn widely
   - Repeat 6 times
9. **Watch both consoles:**
   - Frontend: Should show alert count increasing
   - Backend: Should show alert received messages
10. **On 6th alert:**
    - Frontend: "🚨 EMERGENCY NOTIFICATION WAS SENT!"
    - Backend: "✅ Emergency notification sent!"
    - Email: Check inbox (and spam folder)

---

## 🐛 Common Issues & Solutions

### Issue 1: "⚠️ No trip ID yet, cannot send alert"
**Cause:** Trip wasn't created successfully  
**Fix:** 
- Check backend console for trip creation errors
- Verify start/end locations are filled
- Make sure you clicked "Start Navigation" (not just "Show Route")

### Issue 2: Backend not showing any "Alert received" messages
**Cause:** Frontend not sending requests  
**Fix:**
- Check browser console for network errors (red text)
- Verify REACT_APP_API_BASE_URL in frontend/.env
- Check if backend is running (terminal should show Flask logs)

### Issue 3: "❌ No emergency contacts found"
**Cause:** No contacts in database  
**Fix:**
```powershell
cd backend
python -c "from app import app, db, EmergencyContact; app.app_context().push(); print(f'Contacts: {EmergencyContact.query.count()}')"
```
If 0, add contacts via UI first

### Issue 4: Alert count increases but stops before 6
**Cause:** Detection is inconsistent  
**Fix:**
- Keep eyes closed longer (5-10 seconds)
- Yawn more dramatically
- Make sure face is well-lit
- Camera permission granted

### Issue 5: SendGrid error in backend
**Possible errors:**
- `401 Unauthorized` → Check SENDGRID_API_KEY
- `403 Forbidden` → Verify sender email in SendGrid
- `400 Bad Request` → Check email format

**Verify SendGrid:**
```powershell
cd backend
python test_sendgrid.py
```

---

## 📊 Expected Timeline

```
00:00 - Start navigation (trip created)
00:05 - First alert detected
00:10 - Second alert
00:15 - Third alert
00:20 - Fourth alert
00:25 - Fifth alert
00:30 - SIXTH ALERT → EMAIL SENT! 📧
00:35 - Seventh alert (no email)
00:40 - Eighth alert (no email)
```

---

## ✅ Success Checklist

Before reporting issue, verify:
- [ ] Flask backend is running
- [ ] Frontend compiled successfully
- [ ] Browser console is open
- [ ] Logged in to DriveGuard
- [ ] At least 1 emergency contact added
- [ ] Trip started successfully (trip_id in console)
- [ ] 6 alerts detected (console shows count)
- [ ] Backend logs show "Alert received" 6 times
- [ ] Backend logs show "Emergency notification sent"
- [ ] Checked email inbox AND spam folder

---

## 🆘 Still Not Working?

Share these logs:
1. **Last 20 lines of backend console**
2. **Last 20 lines of browser console**
3. **Screenshot of browser Network tab** (F12 → Network, filter by "alert")

This will show exactly where the problem is!
