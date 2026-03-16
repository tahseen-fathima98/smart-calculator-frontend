# 🚀 DEPLOYMENT GUIDE - Vercel

## ✅ Pre-Deploy Checklist

- [x] Build passes locally (`npm run build`)
- [x] Node 20.x specified in package.json
- [x] Dependencies in correct section
- [x] API route created (`api/chat.js`)
- [x] Ready to deploy!

## 📤 Deploy Steps

### 1. Commit and Push to GitHub

```bash
git add .
git commit -m "Add AI conversational calculator with learning analytics"
git push origin main
```

### 2. Deploy on Vercel

**Option A: Web Interface (Recommended)**

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `smart-calculator-frontend`
4. Vercel auto-detects settings (no changes needed):
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
5. Click **Deploy**

**Option B: Vercel CLI**

```bash
npm i -g vercel
vercel login
vercel
# Follow prompts, select defaults
```

### 3. Add AI API Key (Optional)

**For Full AI Features:**

1. Get FREE Google Gemini API Key:
   - Visit: https://makersuite.google.com/app/apikey
   - Click **"Create API Key"**
   - Copy the key

2. Add to Vercel:
   - Go to your project on Vercel
   - Settings → Environment Variables
   - Add New:
     - Name: `GEMINI_API_KEY`
     - Value: `paste-your-api-key-here`
   - Click **Save**

3. Redeploy:
   - Go to Deployments tab
   - Click **"..."** on latest deployment → **"Redeploy"**

**Without API Key:**
- Calculator works perfectly with smart rule-based responses!
- Add the key later when you want full AI features

## 🎉 Post-Deployment

### Test Your Live Site

1. Visit your Vercel URL (e.g., `your-project.vercel.app`)
2. Test features:
   - **Chat Mode**: Type "hi" → should get friendly response
   - **Calculator**: Type "2+2" in chat → should calculate and respond
   - **Analytics**: Switch to Analytics tab → view progress

### Custom Domain (Optional)

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS instructions

## 🔧 Troubleshooting

### Build Fails on Vercel

**Error: "Cannot find module '@vitejs/plugin-react'"**
- ✅ Fixed! We moved it to dependencies in package.json

**Error: Node version mismatch**
- ✅ Fixed! package.json specifies Node 20.x

### API Not Working

**Chat responds but no AI (just rule-based)**
- Check: Did you add `GEMINI_API_KEY` environment variable?
- Check: Did you redeploy after adding the variable?

**Error: "Failed to fetch /api/chat"**
- Normal on first deployment (cold start)
- Refresh page and try again
- Check Vercel Functions logs: Dashboard → Your Project → Logs

### LocalStorage Not Saving

- Check browser allows localStorage
- Try incognito mode to test fresh
- Clear browser cache if issues persist

## 📊 Monitor Your App

1. **Vercel Dashboard** → Your Project
2. **Analytics**: View visitor stats (free)
3. **Logs**: Debug any serverless function errors
4. **Deployments**: See all deployment history

## 🚀 Next Steps

1. **Share your calculator**: Copy the Vercel URL
2. **Add to resume**: See README.md for resume-ready description
3. **Enhance features**:
   - Add more math topics
   - Export chat history
   - Voice input
   - Multi-language support

## 🆘 Need Help?

- Vercel Docs: https://vercel.com/docs
- Gemini API: https://ai.google.dev/docs
- mathjs Docs: https://mathjs.org/docs

---

**Your calculator is ready to go live! 🎉**

The AI will learn and adapt as users interact with it, making it smarter over time!
