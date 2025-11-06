# 🚀 Deployment Guide - Enhanced Gamification Features

This guide will help you deploy the enhanced gamification features to your production environment on **Vercel** (frontend) and **Render** (backend).

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:
- ✅ Migration ran successfully locally (you've already done this)
- ✅ All code changes are committed to Git
- ✅ Frontend builds successfully
- ✅ Backend tests pass

---

## 🎯 Part 1: Commit Your Changes to Git

All your changes need to be pushed to your GitHub repository to trigger automatic deployments.

### Step 1: Check Status
```powershell
cd d:\comp\detectguard
git status
```

### Step 2: Stage All Changes
```powershell
git add backend/app.py
git add backend/migration_add_gamification_enhanced.py
git add frontend/src/components/Rewards.js
git add GAMIFICATION_ENHANCED.md
```

### Step 3: Commit Changes
```powershell
git commit -m "feat: Add enhanced gamification features (badges, challenges, streaks, store)

- Added 7 new database models: Badge, UserBadge, Challenge, UserChallenge, StoreItem, Redemption, UserStreak
- Created migration script with seed data (6 badges, 6 store items, 3 challenges)
- Added 6 new API endpoints for gamification features
- Implemented helper functions: update_user_streak, check_and_award_badges, update_user_challenges
- Updated trip endpoints to integrate gamification logic
- Enhanced frontend Rewards component with badges, challenges, store, and redemptions tabs
- Added streak tracking and display in user stats"
```

### Step 4: Push to GitHub
```powershell
git push origin main
```

*(Replace `main` with your branch name if different)*

---

## 🔵 Part 2: Deploy Backend to Render

### Option A: Automatic Deployment (If Connected to GitHub)

Render will automatically deploy when you push to GitHub. Check your Render dashboard:

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click on your **backend service** (e.g., "detectguard-backend")
3. You should see a new deployment starting automatically
4. Wait for the deployment to complete (Status: "Live")

### Option B: Manual Deployment

If auto-deploy isn't set up:

1. Go to Render dashboard
2. Click your backend service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Step 5: Run Migration on Render Database

**⚠️ CRITICAL STEP:** You must run the migration on your production database.

#### Method 1: Using Render Shell (Recommended)

1. In Render dashboard, click your backend service
2. Click the **"Shell"** tab at the top
3. Wait for shell to connect
4. Run the migration:
```bash
python migration_add_gamification_enhanced.py
```

5. You should see output like:
```
Starting migration...
Creating badge table...
Creating user_badge table...
...
Seeding initial data...
✅ Migration completed successfully!
```

#### Method 2: Using Render Console (Alternative)

If Shell doesn't work:

1. Click **"Console"** in the service page
2. Select **"Python"**
3. Run:
```python
import subprocess
subprocess.run(['python', 'migration_add_gamification_enhanced.py'])
```

### Step 6: Verify Environment Variables

Ensure these environment variables are set in Render:

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - Your JWT secret key
- `SENDGRID_API_KEY` - SendGrid API key (for emails)

To check:
1. Go to your backend service in Render
2. Click **"Environment"** tab
3. Verify all required variables are present

### Step 7: Test Backend Endpoints

After deployment, test the new endpoints:

```powershell
# Replace YOUR_RENDER_URL with your actual Render backend URL
# Replace YOUR_TOKEN with your JWT token (get it by logging in)

# Test badges endpoint
curl https://YOUR_RENDER_URL.onrender.com/api/gamification/badges -H "x-access-token: YOUR_TOKEN"

# Test challenges endpoint
curl https://YOUR_RENDER_URL.onrender.com/api/gamification/challenges -H "x-access-token: YOUR_TOKEN"

# Test store endpoint
curl https://YOUR_RENDER_URL.onrender.com/api/gamification/store -H "x-access-token: YOUR_TOKEN"

# Test streak endpoint
curl https://YOUR_RENDER_URL.onrender.com/api/gamification/streak -H "x-access-token: YOUR_TOKEN"
```

---

## ⚡ Part 3: Deploy Frontend to Vercel

### Option A: Automatic Deployment (If Connected to GitHub)

Vercel will automatically deploy when you push to GitHub. Check your Vercel dashboard:

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your **frontend project** (e.g., "detectguard-frontend")
3. You should see a new deployment starting automatically
4. Wait for the build to complete (Status: "Ready")

### Option B: Manual Deployment

If auto-deploy isn't set up or you want to deploy manually:

#### Using Vercel CLI

1. Install Vercel CLI (if not already installed):
```powershell
npm install -g vercel
```

2. Navigate to frontend directory:
```powershell
cd d:\comp\detectguard\frontend
```

3. Login to Vercel:
```powershell
vercel login
```

4. Deploy to production:
```powershell
vercel --prod
```

#### Using Vercel Dashboard

1. Go to Vercel dashboard
2. Click your project
3. Click **"Deployments"** tab
4. Click **"Redeploy"** on the latest deployment

### Step 8: Verify Environment Variables

Ensure this environment variable is set in Vercel:

- `REACT_APP_API_BASE_URL` - Your Render backend URL (e.g., `https://your-app.onrender.com`)

To check:
1. Go to your project in Vercel
2. Click **"Settings"** tab
3. Click **"Environment Variables"**
4. Verify `REACT_APP_API_BASE_URL` is set correctly

### Step 9: Test Frontend Build

After deployment:

1. Visit your Vercel URL (e.g., `https://your-app.vercel.app`)
2. Log in to your account
3. Navigate to **Rewards & Achievements** page
4. Verify you see:
   - ✅ User stats card with streak information
   - ✅ Tabs: Achievements, Badges, Challenges, Store, Leaderboard
   - ✅ Badges section showing earned/locked badges
   - ✅ Challenges section showing active challenges
   - ✅ Store section with redeemable items
   - ✅ Leaderboard with points and safety score views

---

## 🧪 Part 4: Test Complete Flow

After both deployments are complete, test the entire gamification flow:

### Test 1: Streak Tracking
1. Create a new trip (or complete an existing one)
2. Go to Rewards page
3. Verify current streak is incremented
4. Check backend logs for streak update

### Test 2: Badge Awarding
1. Create trips that meet badge criteria:
   - **Night Owl**: Trip between 10 PM - 5 AM with 0 alerts
   - **Zero Hero**: Complete 5 trips with 0 alerts
2. Go to Rewards → Badges tab
3. Verify badge appears in "Earned" section
4. Verify points were added to your account

### Test 3: Challenge Progress
1. Check active challenges in Challenges tab
2. Complete trips that contribute to challenge goals
3. Verify progress bar updates
4. Complete a challenge and verify points awarded

### Test 4: Store Redemption
1. Ensure you have enough points (earn more by completing trips)
2. Go to Store tab
3. Click "Redeem" on an item you can afford
4. Verify points are deducted
5. Check Redemption History section

### Test 5: Leaderboard
1. Go to Leaderboard tab
2. Toggle between "By Points" and "By Safety Score"
3. Verify you appear in the list
4. Verify your position is correct

---

## 🐛 Troubleshooting

### Issue: Frontend Build Fails on Vercel

**Symptoms:**
- Build error in Vercel dashboard
- Error about missing dependencies

**Solution:**
```powershell
cd d:\comp\detectguard\frontend
npm install
npm run build
```

If build succeeds locally, push the updated `package-lock.json`:
```powershell
git add package-lock.json
git commit -m "chore: Update dependencies"
git push origin main
```

### Issue: Migration Fails on Render

**Symptoms:**
- Error: "Table already exists"
- Error: "Column already exists"

**Solution 1:** Migration might have already run partially. Check database:
```sql
-- In Render PostgreSQL console
SELECT table_name FROM information_schema.tables WHERE table_schema='public';
```

If tables exist, skip migration.

**Solution 2:** If tables don't exist, check error logs:
```bash
# In Render Shell
python migration_add_gamification_enhanced.py 2>&1 | tee migration.log
cat migration.log
```

### Issue: API Endpoints Return 404

**Symptoms:**
- Frontend can't fetch gamification data
- Console errors: "404 Not Found"

**Solution:**
1. Verify backend deployment completed successfully
2. Check Render logs for errors:
   - Go to Render dashboard → Your service → Logs tab
3. Verify `app.py` was updated correctly
4. Try restarting the service:
   - Render dashboard → Your service → "Manual Deploy" → "Clear build cache & deploy"

### Issue: CORS Errors

**Symptoms:**
- Console error: "CORS policy blocked"

**Solution:**
Check `app.py` has correct CORS configuration:
```python
CORS(app, resources={
    r"/*": {
        "origins": ["https://your-vercel-app.vercel.app", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "x-access-token"]
    }
})
```

### Issue: Rewards Page Shows "Loading..." Forever

**Symptoms:**
- Rewards page stuck on loading screen

**Solution:**
1. Open browser console (F12)
2. Check for API errors
3. Verify `REACT_APP_API_BASE_URL` is set correctly in Vercel
4. Test API endpoints manually using curl (see Step 7 above)

---

## 📊 Post-Deployment Monitoring

### Monitor Backend Performance

1. **Render Dashboard → Logs:**
   - Watch for errors related to gamification endpoints
   - Check for migration issues

2. **Database Queries:**
   - Monitor query performance in PostgreSQL dashboard
   - Check for slow queries (gamification endpoints do multiple queries)

3. **API Response Times:**
   - Test `/api/gamification/*` endpoints
   - Ensure responses are under 1 second

### Monitor Frontend Performance

1. **Vercel Dashboard → Analytics:**
   - Check page load times for Rewards page
   - Monitor API call failures

2. **Browser Console:**
   - Watch for JavaScript errors
   - Check network tab for failed API calls

3. **User Experience:**
   - Test on different devices/browsers
   - Verify responsive design works

---

## ✅ Deployment Checklist Summary

### Backend (Render)
- [ ] Code pushed to GitHub
- [ ] Render deployment completed
- [ ] Migration ran successfully on production database
- [ ] Environment variables verified
- [ ] API endpoints tested and working
- [ ] Logs checked for errors

### Frontend (Vercel)
- [ ] Code pushed to GitHub
- [ ] Vercel deployment completed
- [ ] Environment variable verified (`REACT_APP_API_BASE_URL`)
- [ ] Frontend builds successfully
- [ ] Rewards page loads correctly
- [ ] All tabs display data

### Testing
- [ ] Streak tracking works
- [ ] Badges are awarded correctly
- [ ] Challenges show and update progress
- [ ] Store items can be redeemed
- [ ] Leaderboard displays correctly
- [ ] No console errors

---

## 🎉 You're Done!

Your enhanced gamification features are now live in production! 

Users can now:
- 🔥 Track their driving streaks
- 🏅 Earn badges for safe driving
- 🎯 Complete challenges for bonus points
- 🛒 Redeem points in the store
- 🏆 Compete on the leaderboard

---

## 📚 Additional Resources

- **Render Documentation:** https://render.com/docs
- **Vercel Documentation:** https://vercel.com/docs
- **Flask Deployment Guide:** https://flask.palletsprojects.com/en/2.3.x/deploying/
- **React Deployment Guide:** https://create-react-app.dev/docs/deployment/

---

## 🆘 Need Help?

If you encounter issues:

1. **Check Logs:**
   - Render: Dashboard → Your service → Logs
   - Vercel: Dashboard → Your project → Deployments → View Function Logs

2. **Review Error Messages:**
   - Backend errors: Check Render logs
   - Frontend errors: Check browser console (F12)

3. **Verify Database:**
   - Render Dashboard → Your database → Connect
   - Run: `\dt` to list tables
   - Verify `badge`, `user_badge`, `challenge`, etc. exist

4. **Test Locally:**
   - If issues persist, test locally first
   - Ensure local version works before debugging production

---

**Happy Deploying! 🚀**
