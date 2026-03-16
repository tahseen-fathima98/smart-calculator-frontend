// Vercel Serverless Function - AI Chat Endpoint
// Priority: Groq (free) → Anthropic Claude → Google Gemini → OpenAI → Smart Local Fallback
// Set env vars: GROQ_API_KEY (free at console.groq.com) or ANTHROPIC_API_KEY or GEMINI_API_KEY or OPENAI_API_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, context = [], mathResult, userStats } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const groqKey      = process.env.GROQ_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey    = process.env.GEMINI_API_KEY;
    const openaiKey    = process.env.OPENAI_API_KEY;

    const systemPrompt = buildSystemPrompt(mathResult, userStats);
    const recentCtx    = (context || []).slice(-6);
    let aiResponse     = null;

    // ── 1. Groq (FREE tier – llama-3.3-70b-versatile) ──────────────────────
    if (groqKey && !aiResponse) {
      try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              ...recentCtx.map(c => ({ role: c.role === 'assistant' ? 'assistant' : 'user', content: c.message })),
              { role: 'user', content: message }
            ],
            temperature: 0.8,
            max_tokens: 320
          })
        });
        if (r.ok) {
          const d = await r.json();
          aiResponse = d?.choices?.[0]?.message?.content?.trim() || null;
        } else {
          console.warn('Groq error:', r.status, await r.text().catch(() => ''));
        }
      } catch (e) { console.warn('Groq failed:', e.message); }
    }

    // ── 2. Anthropic Claude Haiku ───────────────────────────────────────────
    if (anthropicKey && !aiResponse) {
      try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 320,
            system: systemPrompt,
            messages: [
              ...recentCtx.map(c => ({ role: c.role === 'assistant' ? 'assistant' : 'user', content: c.message })),
              { role: 'user', content: message }
            ]
          })
        });
        if (r.ok) {
          const d = await r.json();
          aiResponse = d?.content?.[0]?.text?.trim() || null;
        } else {
          console.warn('Anthropic error:', r.status, await r.text().catch(() => ''));
        }
      } catch (e) { console.warn('Anthropic failed:', e.message); }
    }

    // ── 3. Google Gemini 1.5 Flash (free tier) ─────────────────────────────
    if (geminiKey && !aiResponse) {
      try {
        const history = recentCtx.map(c => `${c.role}: ${c.message}`).join('\n');
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${history}\nUser: ${message}` }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 320 }
            })
          }
        );
        if (r.ok) {
          const d = await r.json();
          aiResponse = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
        } else {
          console.warn('Gemini error:', r.status, await r.text().catch(() => ''));
        }
      } catch (e) { console.warn('Gemini failed:', e.message); }
    }

    // ── 4. OpenAI GPT-3.5-Turbo ────────────────────────────────────────────
    if (openaiKey && !aiResponse) {
      try {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              ...recentCtx.map(c => ({ role: c.role === 'assistant' ? 'assistant' : 'user', content: c.message })),
              { role: 'user', content: message }
            ],
            temperature: 0.8,
            max_tokens: 320
          })
        });
        if (r.ok) {
          const d = await r.json();
          aiResponse = d?.choices?.[0]?.message?.content?.trim() || null;
        } else {
          console.warn('OpenAI error:', r.status, await r.text().catch(() => ''));
        }
      } catch (e) { console.warn('OpenAI failed:', e.message); }
    }

    // ── 5. Smart local fallback (always works, no key needed) ───────────────
    if (!aiResponse) {
      aiResponse = getSmartFallback(message, mathResult, userStats);
      return res.status(200).json({ response: aiResponse, isFallback: true });
    }

    return res.status(200).json({ response: aiResponse, isFallback: false });

  } catch (error) {
    console.error('Chat API error:', error);
    const { message: msg, mathResult, userStats } = req.body || {};
    return res.status(200).json({
      response: getSmartFallback(msg || '', mathResult, userStats),
      isFallback: true
    });
  }
}

// ── System prompt builder ──────────────────────────────────────────────────
function buildSystemPrompt(mathResult, userStats) {
  const stats = userStats
    ? `${userStats.totalCalcs} calculations, ${userStats.streak} streak, topics: ${(userStats.topics || []).join(', ') || 'none yet'}`
    : 'New user';
  return `You are MathBuddy, an enthusiastic AI math tutor and friendly companion.

Personality:
- Warm, encouraging, and fun — like a knowledgeable friend
- Explain math STEP-BY-STEP in plain language (use numbered steps for calculations)
- Give real-world examples when possible
- Use 1-2 emojis per message for warmth
- Keep answers concise — 3-5 sentences or numbered steps max
- Can chat about any topic, not just math

User profile: ${stats}
${mathResult
  ? `\nThe user just calculated and got: ${mathResult}. Explain this result clearly with step-by-step reasoning and a real-world connection.`
  : '\nEngage naturally. If someone asks a math question, solve it step-by-step. If they want to chat, chat!'}

Rules:
- NEVER be verbose — max 5 sentences or 5 steps
- Celebrate effort, encourage after mistakes
- If asked to "quiz me", generate a random arithmetic or algebra problem`;
}

// ── Smart local fallback — comprehensive rule-based engine ─────────────────
function getSmartFallback(message, mathResult, userStats) {
  const msg = (message || '').toLowerCase().trim();

  // Math result explanation
  if (mathResult) return generateMathExplanation(message || '', mathResult, userStats);

  // Greetings
  if (/^(hi|hello|hey|sup|yo|hola|howdy|greetings)/.test(msg)) {
    return [
      "Hey there! 👋 I'm MathBuddy — your AI math companion! Ask me to solve '23 × 45', explain a concept, or just chat!",
      "Hello! 😊 Ready to explore some math? Type an expression, ask me anything, or say 'quiz me'!",
      "Hi! 🌟 What math adventure shall we have today? I can solve, explain, or quiz you!"
    ][Math.floor(Math.random() * 3)];
  }

  // Who/what are you
  if (msg.includes('who are you') || msg.includes('what are you') || msg.includes('what can you do')) {
    return "I'm MathBuddy! 🤖 I can solve math expressions step-by-step, explain concepts like fractions or algebra, quiz you, and track your progress. Try typing '15 * 8' or ask 'explain percentages'!";
  }

  // Help
  if (msg.includes('help') || msg.includes('how to use') || msg.includes('how do i use')) {
    return "Here's how I work 💡: Type a math expression like '25 * 4' and I'll solve + explain it! Ask me 'what is algebra?' for concept lessons, or say 'quiz me' for a challenge. Switch to the Calculator tab for scientific functions!";
  }

  // Quiz requests
  if (msg.includes('quiz') || msg.includes('test me') || msg.includes('challenge me') || msg.includes('ask me')) {
    return "A quiz question is coming right up! 🎯 Watch the chat for your challenge...";
  }

  // Thanks
  if (msg.includes('thank') || msg.includes('thanks') || msg.includes('thx')) {
    return ["You're welcome! Keep up the great work! 😊", "Happy to help! That's what I'm here for! ✨", "Anytime! You're doing brilliantly! 🌟"][Math.floor(Math.random() * 3)];
  }

  // Bye
  if (msg.includes('bye') || msg.includes('goodbye') || msg.includes('see you') || msg.includes('cya')) {
    return "See you next time! 👋 Keep practicing — you're doing amazing! Come back anytime!";
  }

  // Math concepts
  if (msg.includes('fraction') || msg.includes('numerator') || msg.includes('denominator')) {
    return "Fractions represent parts of a whole! 🍕 E.g. 3/4 means 3 out of 4 equal parts = 0.75. Try typing '3/4' in the chat to verify!";
  }
  if (msg.includes('percent') || msg.includes('%')) {
    return "Percentages are fractions out of 100! 💯 So 25% = 25/100 = 0.25. To find 25% of 200, type '200 * 0.25' — you'll get 50!";
  }
  if (msg.includes('prime')) {
    return "Prime numbers are only divisible by 1 and themselves! 🔢 Examples: 2, 3, 5, 7, 11, 13, 17, 19... Fun fact: 2 is the only even prime number!";
  }
  if (msg.includes('square root') || msg.includes('sqrt')) {
    return "A square root finds what number × itself gives the original! 📐 √64 = 8 because 8 × 8 = 64. Try 'sqrt(144)' in the calculator — answer is 12!";
  }
  if (msg.includes('algebra')) {
    return "Algebra uses letters for unknown numbers! 🔤 Like x + 5 = 10 means 'what number + 5 = 10?' (x = 5). It's like solving a puzzle — the letter is the mystery!";
  }
  if (msg.includes('pythagor')) {
    return "Pythagoras theorem: a² + b² = c²! 📐 In a right triangle, c (hypotenuse) is longest. Try 'sqrt(3^2 + 4^2)' — you get 5, a classic 3-4-5 triangle!";
  }
  if (msg.includes('geometry') || msg.includes('area') || msg.includes('perimeter')) {
    return "Geometry is the math of shapes! 📐 Rectangle area = length × width. Circle area = π × r². Try '3.14159 * 5^2' for a circle with radius 5!";
  }
  if (msg.includes('multipl') || msg.includes('times table')) {
    return "Multiplication is repeated addition! ✖️ 6 × 4 = 6+6+6+6 = 24. A trick: 9 × any digit — the digits of the result always add to 9! Try '9 * 7 = 63 → 6+3 = 9'!";
  }
  if (msg.includes('divis')) {
    return "Division splits a number into equal groups! ➗ 24 ÷ 6 = 4 means 24 into 6 equal groups = 4 each. Divisibility trick: a number is divisible by 3 if its digits sum to 3!";
  }
  if (msg.includes('power') || msg.includes('exponent') || msg.includes('squared') || msg.includes('cubed')) {
    return "Exponents are repeated multiplication! 🚀 2^10 = 1024 (double 10 times). The number grows incredibly fast — try '2^20' in the calculator and see!";
  }
  if (msg.includes('negative')) {
    return "Negative numbers are below zero! ❄️ Like -10°C is 10 degrees below freezing. Multiplying two negatives gives a positive: (-3) × (-4) = +12. Try it!";
  }
  if (msg.includes('logarithm') || msg.includes('log(')) {
    return "Logarithms are the inverse of exponents! 📊 log(100) = 2 means 10² = 100. They're used in sound (decibels), earthquakes (Richter scale), and music!";
  }
  if (msg.includes('trigonometry') || msg.includes('sin') || msg.includes('cos') || msg.includes('tan')) {
    return "Trigonometry studies triangle ratios! 📐 sin, cos, tan relate angles to side lengths. Try 'sin(90 deg)' = 1 or 'cos(0)' = 1 in the calculator!";
  }
  if (msg.includes('mean') || msg.includes('average')) {
    return "The mean (average) = sum of values ÷ count! 📊 For [4, 6, 8, 10]: sum = 28, count = 4, mean = 28/4 = 7. Try '(4+6+8+10)/4' in the chat!";
  }
  if (msg.includes('calculus') || msg.includes('derivative') || msg.includes('integral')) {
    return "Calculus studies change and accumulation! 📈 Derivatives measure rate of change (slope), integrals measure accumulated area. It powers physics, economics, and engineering!";
  }

  // Default encouraging responses
  const defaults = [
    "Interesting! 🤔 Try asking me to solve a math problem like '45 * 23', explain a concept like 'what are fractions?', or just say 'quiz me'!",
    "I'm ready to help! 💡 Type a math expression to solve it, ask 'explain algebra', or try 'what is the Pythagorean theorem?'",
    "Let's learn together! 📚 Ask me anything math-related, type an expression to solve, or say 'quiz me' for a fun challenge!",
    "Great! 🌟 I can solve expressions, explain concepts, quiz you, and track your progress. What shall we explore today?"
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

// ── Math explanation generator ─────────────────────────────────────────────
function generateMathExplanation(message, mathResult, userStats) {
  const num     = parseFloat(mathResult);
  const streak  = userStats?.streak || 0;
  const total   = userStats?.totalCalcs || 0;
  const cheer   = streak > 5 ? `You're on a ${streak}-problem streak! 🔥` : total > 10 ? "You're getting really good at this! 🌟" : "Nice work! 👏";

  // Extract expression from message
  const exprMatch = message.match(/(?:solved?|calculated?|solve)[:\s]+(.+?)\s*=/i) ||
                    message.match(/how.*(?:solve|calculate)\s+(.+?)\s*=/i) ||
                    message.match(/explain.*(?:how|step).*\s+(.+?)\s*=/i);
  const expr = (exprMatch?.[1] || '').trim();

  if (expr.includes('*') || expr.includes('×')) {
    const parts = expr.replace(/×/g, '*').split('*').map(s => s.trim());
    if (parts.length === 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
      const [a, b] = [parseFloat(parts[0]), parseFloat(parts[1])];
      return `${a} × ${b} = ${mathResult} ✨\nStep-by-step: multiply ${a} by each digit of ${b}. Think of it as ${a} added ${b} times.\nReal world: ${b} bags with ${a} items each = ${mathResult} items total! ${cheer}`;
    }
    return `Multiplication result: ${mathResult} ✨ Multiply the numbers together — it's repeated addition compressed into one fast operation! ${cheer}`;
  }
  if (expr.includes('+')) {
    return `${expr} = ${mathResult} ➕\nAddition combines values: start with the first number and count up by the second. ${!isNaN(num) && num > 100 ? `${mathResult} — a nice big result!` : 'Clean result!'} ${cheer}`;
  }
  if (expr.includes('-') && !expr.startsWith('-')) {
    return `${expr} = ${mathResult} ➖\nSubtraction finds the difference: take the first number and remove the second. ${!isNaN(num) && num < 0 ? 'Negative result — the second number was larger!' : 'Positive result!'} ${cheer}`;
  }
  if (expr.includes('/') || expr.includes('÷')) {
    return `${expr} = ${mathResult} ➗\nDivision splits into equal groups: how many times does the divisor fit into the dividend? ${!isNaN(num) && !Number.isInteger(num) ? 'The decimal shows it doesn\'t divide evenly.' : 'Divides perfectly — a whole number result!'} ${cheer}`;
  }
  if (expr.includes('^') || expr.includes('**')) {
    return `${expr} = ${mathResult} 🚀\nExponents mean repeated multiplication: the base multiplied by itself that many times. ${!isNaN(num) && num > 1000 ? 'Numbers grow FAST with exponents!' : ''} ${cheer}`;
  }
  if (expr.toLowerCase().includes('sqrt')) {
    return `√ result = ${mathResult} 📐\nSquare root finds the number that, multiplied by itself, gives the original. ${!isNaN(num) && Number.isInteger(num) ? `${mathResult} is a perfect square root! ✨` : 'Decimal result — not a perfect square.'} ${cheer}`;
  }

  // Generic
  if (!isNaN(num)) {
    if (num === 0) return `The answer is zero! ⭐ Zero is the additive identity — adding it to anything leaves it unchanged. ${cheer}`;
    if (num < 0)   return `${mathResult} — a negative number! ❄️ Negative results mean the subtracted value was larger, or you went below zero. ${cheer}`;
    if (num > 1e6) return `${mathResult} — over a million! 🌌 Impressive large-number calculation! ${cheer}`;
    return `Result: ${mathResult} ✨ ${Number.isInteger(num) ? 'A whole number — clean answer!' : 'A decimal — precise measurement!'} ${cheer}`;
  }
  return `Got it: ${mathResult} 🎯 ${cheer}`;
}
