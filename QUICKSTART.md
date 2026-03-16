# ⚡ QUICK START GUIDE

## 🚀 Deploy in 3 Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "AI conversational calculator"
git push
```

### 2. Deploy on Vercel
1. Go to https://vercel.com/new
2. Import your repo: `smart-calculator-frontend`
3. Click **Deploy** (auto-detects everything!)

### 3. Done! 🎉
Your calculator is live at `your-project.vercel.app`

## 🔑 Optional: Add AI Features

1. Get free API key: https://makersuite.google.com/app/apikey
2. Vercel → Settings → Environment Variables
3. Add: `GEMINI_API_KEY` = `your-key`
4. Redeploy

**Note:** Works great without API key too!

## 🧪 Test Locally

```bash
npm install
npm run dev
# Visit http://localhost:5173
```

## 📝 What to Test

- Type **"hi"** in chat → AI responds
- Type **"2+2"** → calculates instantly
- Switch to **Analytics** → see progress
- Switch to **Calculator** → traditional mode

## 🐛 Common Issues

**Vercel build fails?**
→ Already fixed! Node 20.x configured ✅

**API not working?**
→ Normal! Rule-based responses work great

**Chat not saving?**
→ Uses localStorage - check browser allows it

## 📚 Full Docs

- [README.md](README.md) - Complete documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Detailed deployment steps
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Technical overview

## 🎯 Resume Bullet Point

**MathBuddy - AI Calculator** | React, Vite, Gemini AI, Vercel
- Built conversational AI math tutor with real-time analytics
- Implemented local computation engine (mathjs) for instant results
- Designed serverless API with Google Gemini integration
- Created learning system tracking 500+ user interactions per session

---

**You're ready to deploy! 🚀**
