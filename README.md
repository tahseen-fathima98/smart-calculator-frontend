# 🤖 MathBuddy - AI-Powered Conversational Calculator

An intelligent, conversational calculator that learns with you! Built with React, powered by AI, and designed to make math fun and educational.

## ✨ Features

- **💬 Conversational AI**: Chat naturally with an AI math tutor that encourages and teaches
- **⚡ Instant Calculations**: Fast local math evaluation using mathjs (no network delay)
- **📊 Learning Analytics**: Track your progress, streaks, and topics mastered
- **🧠 Self-Learning**: Remembers conversations and adapts responses
- **🎓 Teaching Mode**: Explains concepts, celebrates wins, guides through mistakes
- **🔥 Gamified Learning**: Success streaks and achievements
- **💾 Persistent Memory**: Stores chat history and analytics locally

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite
- **Math Engine**: mathjs (local evaluation)
- **AI**: Google Gemini API (free tier) with rule-based fallback
- **Storage**: localStorage for analytics and chat history
- **Deployment**: Vercel (frontend + serverless functions)

## 🚀 Quick Start

### Local Development

```bash
# Clone & Install
git clone <your-repo-url>
cd smart-calculator-frontend
npm install

# Run dev server
npm run dev
# Visit http://localhost:5173

# Build for production
npm run build
npm run preview
```

## 🌐 Deploy to Vercel

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add AI conversational calculator"
git push
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **New Project** → Import your GitHub repo
3. Vercel auto-detects Vite (no config needed)
4. **(Optional)** Add environment variable for AI:
   - Settings → Environment Variables
   - `GEMINI_API_KEY` = Get free key at https://makersuite.google.com/app/apikey
5. Click **Deploy** 🚀

**Note**: Works great without API key using smart rule-based responses!

## 📖 How It Works

```
React App (Chat UI) → mathjs (instant calculations)
                   ↓
              localStorage (memory)
                   ↓
          /api/chat (Vercel Function) → Gemini AI
                                      ↓
                                Rule-based fallback
```

- **Local-first**: All calculations happen instantly in browser
- **Privacy-focused**: Data stays in your browser (localStorage)
- **AI-enhanced**: Optional Gemini API adds conversational teaching
- **Always available**: Fallback responses work without internet

## 🎯 Modes

1. **💬 Chat Mode**: Talk to AI, ask questions, get explanations
2. **🧮 Calculator Mode**: Traditional calculator interface
3. **📊 Analytics**: View your learning progress and achievements

## 🔧 Environment Variables (Optional)

```env
GEMINI_API_KEY=your_key  # Enables AI - get free at makersuite.google.com
```

## 🌟 Resume Highlight

**MathBuddy - AI Conversational Calculator**
- Full-stack React app with AI integration (Google Gemini API)
- Real-time local computation engine using mathjs
- Persistent learning analytics with localStorage
- Responsive chat UI with serverless backend (Vercel Functions)
- **Tech**: React 18, Vite, Gemini AI, mathjs, Vercel

---

Made with 💜

Enjoy! 💫
