# Emergency Contact Notification - Setup Guide

## ✅ Completed Components

### Backend (✓ Done)
- ✅ EmergencyContact model added to `backend/app.py`
- ✅ API endpoints created:
  - `POST /api/contacts` - Add new emergency contact
  - `GET /api/contacts` - List all contacts for user
  - `DELETE /api/contacts/<id>` - Remove emergency contact
  - `POST /api/alert` - Log real-time alert and trigger notifications
- ✅ `send_emergency_notification()` function for SendGrid email
- ✅ Migration scripts created:
  - `backend/migration_add_emergency_contacts.sql` (SQL version)
  - `backend/run_emergency_migration.py` (Python version)

### Frontend (✓ Done)
- ✅ EmergencyContacts component created (`frontend/src/components/EmergencyContacts.js`)
- ✅ Home.js updated with navigation button
- ✅ Full UI with add/list/delete functionality

---

## 🚀 Steps to Complete Setup

### Step 1: Install Required Dependencies

Open PowerShell in the backend directory:

```powershell
cd d:\comp\detectguard\backend
.\venv\Scripts\Activate.ps1
pip install sendgrid psycopg2-binary
```

### Step 2: Run Database Migration

Choose **one** of the following options:

**Option A: Python Migration Script (Recommended)**
```powershell
cd d:\comp\detectguard\backend
python run_emergency_migration.py
```

**Option B: SQL Migration Script**
If you prefer running SQL directly on your PostgreSQL database:
1. Connect to your Render PostgreSQL database
2. Execute the SQL file: `backend/migration_add_emergency_contacts.sql`

### Step 3: Configure SendGrid

1. **Sign up for SendGrid** (Free tier available):
   - Go to: https://sendgrid.com/
   - Create a free account
   - Verify your email address

2. **Create API Key**:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name it "DriveGuard Notifications"
   - Select "Full Access" or at minimum "Mail Send" permissions
   - Copy the API key (you'll only see it once!)

3. **Verify Sender Email**:
   - Go to Settings → Sender Authentication
   - Verify a single sender email (e.g., noreply@yourdomain.com)
   - Complete email verification
   - Use this email as your SENDGRID_SENDER_EMAIL

4. **Update .env file**:
   Open `backend/.env` and add:
   ```env
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   SENDGRID_SENDER_EMAIL=your_verified_sender_email@example.com
   ```

### Step 4: Update TripMonitor Component

Now we need to integrate real-time alert monitoring in `TripMonitor.js`:

**What needs to be added:**
1. Track alert timestamps in component state
2. When an alert is detected (yawn or closed eyes), send POST to `/api/alert`
3. Check if more than 5 alerts occurred in the last 2 minutes
4. Show user feedback when emergency contacts are notified

**Implementation location:** `frontend/src/components/TripMonitor.js`

**Key logic:**
```javascript
// Add to state
const [alertTimestamps, setAlertTimestamps] = useState([]);

// When alert is detected (in your detection logic)
const handleAlert = async (alertType) => {
    const now = Date.now();
    
    // Add to local tracking
    setAlertTimestamps(prev => [...prev, now]);
    
    // Send to backend
    try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
            `${API_BASE_URL}/api/alert`,
            {
                trip_id: currentTripId, // Make sure you have trip_id available
                alert_type: alertType,
                timestamp: new Date().toISOString()
            },
            { headers: { 'x-access-token': token } }
        );
        
        if (response.data.emergency_notification_sent) {
            // Show user notification
            alert('Emergency contacts have been notified due to excessive drowsiness alerts!');
        }
    } catch (error) {
        console.error('Error logging alert:', error);
    }
};
```

### Step 5: Test the Complete Flow

1. **Start the backend:**
   ```powershell
   cd d:\comp\detectguard\backend
   .\venv\Scripts\Activate.ps1
   python app.py
   ```

2. **Start the frontend:**
   ```powershell
   cd d:\comp\detectguard\frontend
   npm start
   ```

3. **Test Emergency Contacts:**
   - Login to DriveGuard
   - Click "Emergency Contacts" button on dashboard
   - Add 1-3 emergency contacts with valid email addresses
   - Verify they appear in the list

4. **Test Alert Notification:**
   - Start a new trip
   - Trigger drowsiness detection alerts rapidly
   - After 5 alerts within 2 minutes, check:
     - Backend console for "Emergency notification sent"
     - Emergency contact's email inbox for notification

---

## 📧 Email Notification Format

The email sent to emergency contacts includes:

- **Subject:** "🚨 DriveGuard Alert - Excessive Drowsiness Detected"
- **Content:**
  - User's name
  - Trip start/end locations
  - Alert count
  - Timestamp
  - Link back to DriveGuard app

---

## 🔍 Troubleshooting

### Migration Errors
- **Error:** `psycopg2 not installed`
  - **Fix:** Run `pip install psycopg2-binary`

- **Error:** `relation "emergency_contact" already exists`
  - **Solution:** Migration already completed, skip this step

### SendGrid Errors
- **Error:** `401 Unauthorized`
  - **Fix:** Check SENDGRID_API_KEY is correctly copied to .env

- **Error:** `403 Forbidden`
  - **Fix:** Verify your sender email in SendGrid dashboard

- **Emails not arriving:**
  - Check spam/junk folder
  - Verify sender email is authenticated in SendGrid
  - Check SendGrid dashboard activity log

### API Errors
- **Error:** `500 Internal Server Error` on `/api/contacts`
  - **Fix:** Run the database migration first
  - Check backend console for detailed error

---

## 🎯 Success Criteria

✅ Migration completes without errors  
✅ Emergency contacts can be added/deleted via UI  
✅ Maximum 3 contacts enforced  
✅ Emails send successfully via SendGrid  
✅ Real-time alerts trigger notification at threshold  
✅ User receives feedback when contacts are notified  

---

## 🚀 Future Enhancements

- [ ] Add SMS notifications via Twilio
- [ ] Add push notifications via Firebase
- [ ] Geolocation in emergency emails
- [ ] Emergency contact test notification feature
- [ ] Alert history dashboard
- [ ] Configurable alert threshold (currently hardcoded to 5 alerts in 2 minutes)

---

## 📞 Support

If you encounter issues:
1. Check backend console logs for errors
2. Verify .env variables are set correctly
3. Test SendGrid API key with their testing tools
4. Ensure PostgreSQL migration completed successfully

Good luck with your hackathon! 🏆
