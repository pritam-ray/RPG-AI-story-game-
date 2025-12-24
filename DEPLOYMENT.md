# Deployment Guide

## Architecture
- **Frontend:** Netlify (Static React App)
- **Backend:** Render.com / Railway.app (Node.js Express Server)

---

## Part 1: Deploy Backend to Render.com (Free Tier)

### Step 1: Prepare Backend
The backend is already configured and ready to deploy.

### Step 2: Deploy to Render
1. Go to [Render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `dungion-master-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

### Step 3: Add Environment Variables
In Render dashboard, add these environment variables:
```
AZURE_OPENAI_ENDPOINT=https://open-ai-blusense.openai.azure.com
AZURE_OPENAI_API_KEY=290bb1ae36cd437195b15f1a2938b52b
AZURE_OPENAI_DEPLOYMENT_NAME=GPT-41
AZURE_OPENAI_API_VERSION=2025-03-01-preview
PORT=3001
```

### Step 4: Copy Backend URL
After deployment, copy your backend URL (e.g., `https://dungion-master-backend.onrender.com`)

---

## Part 2: Deploy Frontend to Netlify

### Step 1: Update Frontend API URL
1. Open `frontend/.env.production`
2. Replace `https://your-backend-url.onrender.com` with your actual Render backend URL

### Step 2: Deploy to Netlify
1. Go to [Netlify](https://www.netlify.com) and sign up/login
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Netlify will auto-detect the `netlify.toml` configuration
5. Click "Deploy site"

### Step 3: Configure Environment Variables (Optional)
If you want to override the API URL:
1. Go to Site settings → Environment variables
2. Add: `VITE_API_URL` = `https://your-backend-url.onrender.com`

### Step 4: Custom Domain (Optional)
1. Go to Domain settings
2. Add your custom domain
3. Netlify will provide DNS instructions

---

## Alternative: Deploy Backend to Railway.app

### Railway Deployment (Faster, Better Free Tier)
1. Go to [Railway.app](https://railway.app)
2. "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add the same environment variables as above
6. Railway will provide a public URL

---

## Testing Your Deployment

1. **Backend Health Check:**
   - Visit: `https://your-backend-url.onrender.com/health`
   - Should return: `{"status":"ok","message":"Dungeon Master backend is running"}`

2. **Frontend:**
   - Visit your Netlify URL
   - Try starting a game
   - Check browser console for any API errors

---

## Troubleshooting

### CORS Errors
If you see CORS errors, the backend `server.js` already has `cors()` enabled for all origins.

### 502 Bad Gateway (Render)
Render's free tier can spin down after inactivity. First request may take 30-60 seconds to wake up.

### Environment Variables Not Loading
- Render: Restart the service after adding env vars
- Netlify: Trigger a new deployment after adding env vars

---

## Costs

### Render.com (Backend)
- **Free Tier:** 750 hours/month (enough for 24/7 operation)
- **Caveat:** Spins down after 15 min of inactivity
- **Paid ($7/mo):** No spin-down, always-on

### Netlify (Frontend)
- **Free Tier:** 100GB bandwidth/month, 300 build minutes
- **More than enough** for this project

### Azure OpenAI
- Pay-per-token usage
- Estimated: **$15-25 for 450 complete games**
- With Responses API optimization: ~150-200 tokens per turn

---

## Quick Deploy Commands

```bash
# Commit latest changes
git add -A
git commit -m "Ready for production deployment"
git push origin main

# Netlify will auto-deploy on push (after initial setup)
# Render will auto-deploy on push (after initial setup)
```

---

## Post-Deployment Checklist

- [ ] Backend deployed and health check returns 200 OK
- [ ] Frontend deployed and accessible
- [ ] Frontend `.env.production` updated with backend URL
- [ ] Test: Start a new game
- [ ] Test: Make 3-5 choices to verify Responses API working
- [ ] Test: Check browser localStorage for responseId persistence
- [ ] Test: Refresh page and continue game
- [ ] Monitor: Check token usage in backend logs

---

## Monitoring

### Backend Logs (Render)
1. Go to Render dashboard
2. Click your service
3. View "Logs" tab
4. Look for "Story generated successfully via Responses API"
5. Check token usage per request

### Frontend Errors
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed API calls

---

## Updates & Redeployment

Both services auto-deploy when you push to GitHub:
```bash
git add -A
git commit -m "Your update message"
git push origin main
```

Netlify and Render will automatically rebuild and redeploy within 2-3 minutes.
