import React, { useState, useEffect, useRef, useCallback } from "react";
import { evaluate } from "mathjs";
import "./CalculatorAI.css";

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE HELPERS — localStorage is source of truth; API is a background sync
// ─────────────────────────────────────────────────────────────────────────────
const LS = {
  MSGS:    "mb_messages",
  STATS:   "mb_analytics",
  FACT_N:  "mb_fact_counter",
  USER_ID: "mb_user_id",
};

function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function getUserId() {
  let id = localStorage.getItem(LS.USER_ID);
  if (!id) {
    id = "mb_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
    localStorage.setItem(LS.USER_ID, id);
  }
  return id;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const rnd    = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick   = arr  => arr[Math.floor(Math.random() * arr.length)];
const makeId = ()   => Date.now() + "_" + Math.random().toString(36).slice(2, 6);

// ─────────────────────────────────────────────────────────────────────────────
// MATH FACTS — injected every 3 calculations
// ─────────────────────────────────────────────────────────────────────────────
const MATH_FACTS = [
  "🌀 π (pi) has been calculated to over 100 TRILLION digits — and it never repeats or ends!",
  "🐚 The Fibonacci sequence (1,1,2,3,5,8,13…) appears in sunflower seeds, nautilus shells, and even galaxy spirals!",
  "♾️ Mathematician Georg Cantor proved there are different *sizes* of infinity — some infinities are bigger than others!",
  "🔢 The number zero was invented in India around 500 AD. Ancient Romans had NO concept of zero — imagine counting without it!",
  "🎲 If you shuffle a deck of cards, the exact order has almost certainly *never happened before* in history — there are 8×10⁶⁷ possible arrangements!",
  "🏦 Compound interest is called the '8th Wonder of the World'. ₹1,000 at 10% for 30 years grows to ₹17,449 — without adding a single rupee!",
  "🌍 GPS satellites need Einstein's relativity equations to work! Time runs slightly faster in space, and without corrections, GPS would drift by 10 km per day!",
  "🎵 Music is pure mathematics! A note one octave higher has exactly DOUBLE the frequency. A perfect fifth has a 3:2 frequency ratio!",
  "🔑 Prime numbers protect your internet banking! RSA encryption multiplies two huge primes together — and it's nearly impossible to reverse!",
  "📊 The number 1 is NOT a prime. A prime must have exactly 2 factors — 1 has only 1 factor (itself)!",
  "💡 The equals sign (=) was invented in 1557 by Robert Recorde. He was tired of writing 'is equal to' over and over!",
  "🧠 Your brain has ~86 billion neurons — that's 8.6 × 10¹⁰. Maths literally lives inside your head!",
  "🌡️ Absolute zero (−273.15°C) is the coldest possible temperature — all molecular motion stops completely!",
  "📐 A circle is technically a polygon with infinite sides — as the number of sides of a regular polygon increases, it approaches a circle!",
  "🚀 Light travels 299,792,458 metres per second — that's about 7.5 times around the Earth every second!",
];

// ─────────────────────────────────────────────────────────────────────────────
// STEP-BY-STEP EXPLANATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function buildExplanation(rawExpr, result) {
  const expr = String(rawExpr || "").trim();
  const res  = String(result).trim();
  const num  = parseFloat(res);

  // ── Count operators to detect multi-op (BODMAS) ──────────────────────────
  const opCount = (expr.match(/[\+\-\*\/\^]/g) || []).length;
  if (opCount > 1 && !/(sqrt|sin|cos|tan|log)\(/.test(expr)) {
    return buildBodmasExplanation(expr, res);
  }

  // ── Trigonometry ─────────────────────────────────────────────────────────
  if (/sin\(|cos\(|tan\(/.test(expr)) {
    const fn    = expr.match(/(sin|cos|tan)/)?.[1] || "trig";
    const angle = expr.match(/\(([^)]+)\)/)?.[1] || "?";
    const desc  = { sin: "opposite ÷ hypotenuse (vertical component)", cos: "adjacent ÷ hypotenuse (horizontal component)", tan: "opposite ÷ adjacent (slope ratio)" };
    return `📐 Trigonometry — ${fn}(${angle})

Step 1 — What is ${fn}?
  ${fn.toUpperCase()} relates an angle to the sides of a right triangle.
  ${fn}(angle) = ${desc[fn] || "ratio of two sides"}

Step 2 — Your angle is ${angle}.
  ${fn}(${angle}) = ${res}

Step 3 — Verify the meaning:
  In a unit circle (radius = 1), the ${fn === "sin" ? "height" : fn === "cos" ? "horizontal distance" : "slope"} at angle ${angle} is ${res}.

🌍 Real-world use: Engineers use ${fn}() to calculate the height of towers, satellite dish angles, and game character movement!
${Number.isInteger(num) ? "✨ Clean whole-number result — this is a special angle!" : ""}`;
  }

  // ── Square root ──────────────────────────────────────────────────────────
  if (/sqrt\(/.test(expr)) {
    const inner = expr.match(/sqrt\(([^)]+)\)/)?.[1] || "?";
    const innerNum = parseFloat(inner);
    const isPerfect = Number.isInteger(num);
    return `📏 Square Root — √${inner}

Step 1 — What does square root mean?
  √x asks: "What number, multiplied by itself, gives x?"

Step 2 — Solve √${inner}:
  We need: ? × ? = ${inner}
  Answer: ${res} × ${res} = ${(num * num).toFixed(2)} ✅ ${isPerfect ? "Perfect!" : "(≈ " + inner + ")"}

Step 3 — Check it:
  ${res}² = ${res} × ${res} = ${(num * num).toFixed(2)} ${Math.abs(num * num - innerNum) < 0.01 ? "✅ Confirmed!" : ""}

🌍 Real-world use: A square room of ${inner} m² has sides of ${res} m each.
${isPerfect ? "🌟 Perfect square — the result is a whole number!" : "💡 Not a perfect square, so the result is a decimal."}
💡 Perfect squares list: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144…`;
  }

  // ── Logarithm ────────────────────────────────────────────────────────────
  if (/log\(/.test(expr)) {
    const inner = expr.match(/log\(([^)]+)\)/)?.[1] || "?";
    return `📊 Logarithm — log(${inner})

Step 1 — What is a logarithm?
  log(x) answers: "10 to what power equals x?"
  In other words: 10^? = x

Step 2 — Solve log(${inner}):
  10^${res} ≈ ${inner}
  Verification: 10^${res} = ${Math.pow(10, num).toFixed(3)}

Step 3 — Understand the scale:
  log(10) = 1, log(100) = 2, log(1000) = 3
  Every step up = multiply by 10!

🌍 Real-world use:
  • Sound (decibels): a whisper = 30 dB, a concert = 110 dB
  • Earthquakes (Richter scale): each point = 10× stronger!
  • pH scale for acids and bases uses log!`;
  }

  // ── Exponent ─────────────────────────────────────────────────────────────
  if (expr.includes("^")) {
    const parts = expr.split("^").map(s => s.trim());
    const base  = parseFloat(parts[0]);
    const power = parseInt(parts[1]);
    let stepsText = "";
    if (!isNaN(base) && !isNaN(power) && power >= 2 && power <= 8) {
      let acc = 1;
      const stepLines = [];
      for (let i = 1; i <= power; i++) {
        const prev = acc;
        acc *= base;
        stepLines.push(`  Step ${i}: ${prev} × ${base} = ${acc}`);
      }
      stepsText = "\nMultiplication steps:\n" + stepLines.join("\n");
    }
    return `🚀 Exponent — ${base}^${power}

Step 1 — What is an exponent?
  ${base}^${power} means multiply ${base} by itself ${power} time${power === 1 ? "" : "s"}.
  ${base}^${power} = ${Array(power).fill(base).join(" × ")}
${stepsText}

Result: ${res} ✅

💡 Shortcut tip: ${base === 2 ? `Powers of 2 double each time: ${[...Array(Math.min(power + 2, 10))].map((_, i) => `2^${i} = ${Math.pow(2, i)}`).join(", ")}` : `${base}^${power} = ${res}`}

🌍 Real-world use:
  • Computer memory: 2^10 = 1,024 bytes (1 KB), 2^20 = 1,048,576 bytes (1 MB)
  • Compound interest uses exponents to calculate growth
  • Population growth and viral spread follow exponential curves
${num > 1000 ? "😲 Exponents make numbers HUGE very fast — this is called exponential growth!" : ""}`;
  }

  // ── Division ─────────────────────────────────────────────────────────────
  if (expr.includes("/") && !/(sqrt|sin|cos|tan|log)\(/.test(expr)) {
    const parts    = expr.split("/").map(s => s.trim());
    const dividend = parseFloat(parts[0]);
    const divisor  = parseFloat(parts[1]);
    if (!isNaN(dividend) && !isNaN(divisor) && divisor !== 0) {
      const quotient  = Math.floor(dividend / divisor);
      const remainder = Number((dividend - quotient * divisor).toFixed(8));
      const isExact   = remainder === 0;
      return `➗ Division — ${dividend} ÷ ${divisor}

Step 1 — What does division mean?
  Divide ${dividend} into ${divisor} equal groups.
  OR: How many times does ${divisor} fit into ${dividend}?

Step 2 — Solve it:
  ${divisor} × ${quotient} = ${divisor * quotient}
  ${dividend} − ${divisor * quotient} = ${remainder} (remainder)
  ${!isExact ? `Decimal part = ${remainder} ÷ ${divisor} = ${(remainder / divisor).toFixed(6)}` : "No remainder — divides perfectly! ✅"}

Step 3 — Final answer:
  ${dividend} ÷ ${divisor} = ${res} ✅

🌍 Real-world use: ${dividend} rupees shared equally among ${divisor} friends = ₹${res} each${!isExact ? ` (with ₹${remainder} left over!)` : "!"}

💡 Divisibility tricks:
  • Divisible by 2: last digit is even
  • Divisible by 3: sum of digits divisible by 3
  • Divisible by 5: ends in 0 or 5`;
    }
  }

  // ── Multiplication ───────────────────────────────────────────────────────
  if (expr.includes("*") && !/(sqrt|sin|cos|tan|log)\(/.test(expr)) {
    const parts = expr.split("*").map(s => s.trim());
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (!isNaN(a) && !isNaN(b)) {
      let groupsLine = "";
      if (Number.isInteger(a) && Number.isInteger(b) && b <= 12 && b >= 1) {
        groupsLine = `\nVisualise as groups: ${Array(b).fill(a).join(" + ")} = ${res}`;
      }
      const half   = Math.ceil(b / 2);
      const halfResult = a * half;
      return `✖️ Multiplication — ${a} × ${b}

Step 1 — What does multiplication mean?
  Add ${a} to itself ${b} time${b === 1 ? "" : "s"}.
  ${a} × ${b} = ${a} + ${a} + … (${b} times) = ${res}
${groupsLine}

Step 2 — Method (halving shortcut):
  ${a} × ${half} = ${halfResult}
  ${a} × ${b} = ${b % 2 === 0 ? `${halfResult} × 2 = ${res}` : `${halfResult} × 2 − ${a} = ${halfResult * 2} − ${a} = ${res}`}

Step 3 — Verify:
  ${res} ÷ ${b} = ${a} ✅  |  ${res} ÷ ${a} = ${b} ✅

🌍 Real-world use: ${b} boxes with ${a} items each = ${res} items total!

💡 Quick tricks:
  ${b === 9 || a === 9 ? `• 9× trick: digits of the result always sum to 9! (${res} → ${String(res).split("").map(Number).filter(n => !isNaN(n)).reduce((s, d) => s + d, 0)})` : ""}
  ${b === 11 || a === 11 ? `• 11× trick: for 2-digit × 11, add the digits and put sum in the middle!` : ""}
  ${a % 10 === 0 || b % 10 === 0 ? `• Multiplying by ${a % 10 === 0 ? a : b}: just add ${Math.log10(a % 10 === 0 ? a : b)} zero(s)!` : ""}
  • Always check: result ÷ one factor = other factor`;
    }
  }

  // ── Subtraction ──────────────────────────────────────────────────────────
  if (expr.includes("-") && !expr.startsWith("-")) {
    const parts = expr.split("-").map(s => s.trim());
    const a = parseFloat(parts[0]);
    const b = parseFloat(parts[1]);
    if (!isNaN(a) && !isNaN(b)) {
      const isNegResult = num < 0;
      const nearest10   = Math.ceil(b / 10) * 10;
      return `➖ Subtraction — ${a} − ${b}

Step 1 — What does subtraction mean?
  Start at ${a} on the number line and move ${b} steps backward.

Step 2 — Solve it:
  ${a} − ${b} = ?
  Method: ${b} → ${nearest10} (add ${nearest10 - b}) → ${a} (add ${a - nearest10})
  Total added: (${nearest10 - b}) + (${a - nearest10}) = ${a - b}
  So: ${a} − ${b} = ${res} ✅

Step 3 — Verify:
  ${res} + ${b} = ${num + b} ${num + b === a ? "✅ Confirmed!" : ""}
${isNegResult ? `\n⚠️ Negative result! ${a} < ${b}, so we went below zero.` : ""}

🌍 Real-world use: You had ₹${a}, spent ₹${b} — you now have ₹${res}${isNegResult ? " (you owe money! 💸)" : "! 🎉"}

💡 Mental math trick: Round ${b} to ${nearest10}, subtract, then adjust.`;
    }
  }

  // ── Addition ─────────────────────────────────────────────────────────────
  if (expr.includes("+")) {
    const parts = expr.split("+").map(s => s.trim()).filter(Boolean);
    const nums  = parts.map(Number).filter(n => !isNaN(n));
    if (nums.length >= 2) {
      let running = 0;
      const stepLines = nums.map((n, i) => {
        const prev = running;
        running += n;
        return i === 0 ? `  Start: ${n}` : `  + ${n} → ${running}`;
      });
      const nearest = nums.map(n => Math.round(n / 10) * 10);
      const estimate = nearest.reduce((s, n) => s + n, 0);
      return `➕ Addition — ${expr}

Step 1 — What does addition mean?
  Combine all the values together.

Step 2 — Count up step by step:
${stepLines.join("\n")}
  Total = ${res} ✅

Step 3 — Mental math estimate (round to 10s):
  ${nearest.join(" + ")} ≈ ${estimate} (estimated)
  Exact answer = ${res} ${Math.abs(estimate - num) <= 5 ? "✅ Estimate was close!" : ""}

🌍 Real-world use: Adding shopping cart totals, combining scores, summing distances.

💡 Tips:
  • Look for pairs that make 10 or 100 — add those first!
  • For long additions, split into tens and units.`;
    }
  }

  // ── Generic fallback ─────────────────────────────────────────────────────
  return `🧮 Result: ${expr} = ${res}

${!isNaN(num) ? `
About your answer (${res}):
  ${Number.isInteger(num) && num > 0  ? "• Positive whole number — clean result!" : ""}
  ${num < 0                            ? "• Negative number — the result went below zero." : ""}
  ${!Number.isInteger(num) && num > 0  ? "• Decimal — more precise than a whole number." : ""}
  ${num === 0                          ? "• Zero! The additive identity — adding 0 changes nothing." : ""}
  ${num > 1_000_000                    ? `• Over a million = ${num.toExponential(2)} in scientific notation!` : ""}
` : ""}

🎓 Keep practising! Every calculation builds your mental math speed.
Type another expression or say "quiz me" for a challenge! 🎯`;
}

function buildBodmasExplanation(expr, result) {
  const hasMul   = expr.includes("*");
  const hasDiv   = expr.includes("/");
  const hasPow   = expr.includes("^");
  const hasAdd   = expr.includes("+");
  const hasSub   = /[^e\d]\-/.test(expr);
  const hasParen = expr.includes("(");

  const order = [];
  if (hasPow)            order.push("① Exponents (^)");
  if (hasParen)          order.push("② Brackets ()");
  if (hasMul || hasDiv)  order.push("③ Multiplication / Division (left → right)");
  if (hasAdd || hasSub)  order.push("④ Addition / Subtraction (left → right)");

  // Try to show partial evaluations
  let steps = [];
  try {
    // Evaluate parentheses first
    let working = expr;
    const parenMatch = expr.match(/\(([^()]+)\)/);
    if (parenMatch) {
      const innerVal = evaluate(parenMatch[1]);
      steps.push(`  Bracket (${parenMatch[1]}) = ${innerVal}`);
      working = working.replace(parenMatch[0], String(innerVal));
      steps.push(`  Expression becomes: ${working}`);
    }
    // Evaluate powers
    const powMatch = working.match(/(\d+\.?\d*)\^(\d+)/);
    if (powMatch) {
      const powVal = Math.pow(parseFloat(powMatch[1]), parseFloat(powMatch[2]));
      steps.push(`  Exponent ${powMatch[0]} = ${powVal}`);
      working = working.replace(powMatch[0], String(powVal));
      steps.push(`  Expression becomes: ${working}`);
    }
  } catch {}

  return `🧮 Order of Operations (BODMAS) — ${expr}

BODMAS stands for:
  B — Brackets (solve first!)
  O — Orders (exponents like 2^3)
  D — Division
  M — Multiplication
  A — Addition
  S — Subtraction

Your expression contains:
  ${order.join("\n  ")}

${steps.length ? "Working step by step:\n" + steps.join("\n") + "\n" : ""}
Final answer: ${result} ✅

🌍 Why BODMAS matters: Without it, 2 + 3 × 4 could mean 20 OR 14 — BODMAS keeps maths consistent worldwide!

💡 Memory trick: "Big Old Dogs Meow At Sunrise" = Brackets, Orders, Divide, Multiply, Add, Subtract!`;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ GENERATORS
// ─────────────────────────────────────────────────────────────────────────────
function quizFromCalc(expr, result) {
  const op = expr.includes("*") ? "*"
           : expr.includes("/") ? "/"
           : expr.includes("+") ? "+"
           : "-";

  const generators = {
    "*": () => {
      const parts = expr.split("*").map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
      if (parts.length === 2) {
        const a = parts[0], b = rnd(2, 12);
        return { q: `🎯 Similar question! What is **${a} × ${b}**?`, a: String(a * b), hint: `Think: ${a} groups of ${b}`, op: "*" };
      }
      const [a, b] = [rnd(2, 12), rnd(2, 12)];
      return { q: `⚡ Quick! What is **${a} × ${b}**?`, a: String(a * b), hint: `${a} groups of ${b}`, op: "*" };
    },
    "/": () => {
      const d = rnd(2, 10), n = d * rnd(2, 10);
      return { q: `🧠 Division! What is **${n} ÷ ${d}**?`, a: String(n / d), hint: `How many ${d}s fit in ${n}?`, op: "/" };
    },
    "+": () => {
      const [a, b] = [rnd(10, 99), rnd(10, 99)];
      return { q: `➕ Add it up! What is **${a} + ${b}**?`, a: String(a + b), hint: `Round both to nearest 10 first`, op: "+" };
    },
    "-": () => {
      const a = rnd(20, 100), b = rnd(1, 20);
      return { q: `➖ Subtract! What is **${a} − ${b}**?`, a: String(a - b), hint: `Count up from ${b} to ${a}`, op: "-" };
    },
  };

  const gen = (generators[op] || generators["*"])();
  return { question: gen.q, answer: gen.a, hint: gen.hint, relatedExpr: gen.op };
}

function randomQuiz() {
  const generators = [
    () => { const [a,b]=[rnd(2,12),rnd(2,12)]; return { q:`🎯 Times table! **${a} × ${b}** = ?`, a:String(a*b), hint:`${a} added ${b} times` }; },
    () => { const d=rnd(2,10),n=d*rnd(2,10); return { q:`🧠 Division! **${n} ÷ ${d}** = ?`, a:String(n/d), hint:`How many ${d}s fit into ${n}?` }; },
    () => { const [a,b]=[rnd(10,99),rnd(10,99)]; return { q:`➕ Quick addition! **${a} + ${b}** = ?`, a:String(a+b), hint:`Round to 10s: ${Math.round(a/10)*10} + ${Math.round(b/10)*10} ≈ ${Math.round(a/10)*10+Math.round(b/10)*10}` }; },
    () => { const a=rnd(20,100),b=rnd(1,20); return { q:`➖ Subtract! **${a} − ${b}** = ?`, a:String(a-b), hint:`Count up from ${b}: how far to ${a}?` }; },
    () => { const a=rnd(2,15); return { q:`🚀 Square it! **${a}²** = ?`, a:String(a*a), hint:`${a} × ${a}` }; },
    () => { const perfs=[4,9,16,25,36,49,64,81,100,121,144]; const n=pick(perfs); return { q:`📐 Square root! **√${n}** = ?`, a:String(Math.sqrt(n)), hint:`What number × itself = ${n}?` }; },
    () => { const pct=pick([10,20,25,50]); const val=rnd(2,20)*10; return { q:`💯 Percentage! **${pct}% of ${val}** = ?`, a:String((pct/100)*val), hint:`${val} × ${pct/100} = ?` }; },
    () => { const [a,b,c]=[rnd(2,9),rnd(2,9),rnd(2,9)]; return { q:`🧮 BODMAS! **${a} + ${b} × ${c}** = ?`, a:String(a+b*c), hint:`Multiply first: ${b}×${c}=${b*c}, then add ${a}` }; },
    () => { const a=pick([2,3,4,5]); return { q:`🎲 Cube! **${a}³** = ?`, a:String(a**3), hint:`${a} × ${a} × ${a}` }; },
    () => { const [a,b]=[rnd(2,9),rnd(2,9)]; return { q:`🔤 Find the missing number! **${a} × __ = ${a*b}**`, a:String(b), hint:`${a*b} ÷ ${a} = ?` }; },
    () => { const a=rnd(100,999),b=rnd(100,999); return { q:`🏆 Challenge! **${a} + ${b}** = ?`, a:String(a+b), hint:`Add hundreds, tens, units separately` }; },
  ];
  return pick(generators)();
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL CONVERSATION ENGINE — full responses for any user input
// ─────────────────────────────────────────────────────────────────────────────
function localReply(msg) {
  const m = (msg || "").toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|sup|yo|hola|howdy|what'?s up|wassup|good morning|good evening|good afternoon|namaste|hii+|heyy+)/.test(m)) {
    return pick([
      "Hey there! 👋 Great to see you! I'm **MathBuddy** — your personal AI math tutor! Try typing `23 * 45`, ask `what are fractions?`, or say `quiz me`!",
      "Hello! 😊 Welcome! I can solve any maths problem with step-by-step explanations, quiz you, share fun facts, and track your progress. What shall we start with?",
      "Hi! 🌟 Awesome to meet you! I love making maths fun and easy. Type a calculation like `8 + 7` and watch me explain every step!",
      "Hey! 🎉 I'm so glad you're here! MathBuddy is ready to help — type any maths expression, ask a concept question, or challenge me with `quiz me`!",
    ]);
  }

  // How are you
  if (/how are you|how r u|you ok|you good|hows it going|how's it/.test(m)) {
    return "I'm fantastic — always energised by maths! 😄 How are YOU? Ready to tackle some calculations? Type something like `99 * 99` and I'll explain it step-by-step!";
  }

  // Who/what are you
  if (/who are you|what are you|what can you do|about you|tell me about yourself/.test(m)) {
    return `I'm **MathBuddy** — your AI-powered smart calculator and math tutor! 🤖✨

Here's what I can do:
🧮 **Solve** any maths expression with full step-by-step explanations
📚 **Explain** concepts (algebra, fractions, trig, BODMAS…)
🎯 **Quiz you** after every calculation to reinforce learning
💡 **Share fun facts** about maths every few questions
📊 **Track your progress** — check the Progress tab!

Just type a maths problem like \`82*6/9-10+47\` or ask me \`what is Pythagoras?\`!`;
  }

  // Help
  if (/^help$|how to use|how do i use|how does this work/.test(m)) {
    return `**How to use MathBuddy:** 💡

1️⃣ **Chat tab:** Type any expression like \`23 * 45\` — I'll solve it with a full explanation!
2️⃣ **Calculator tab:** Use the buttons — results appear in Chat with explanations!
3️⃣ **Progress tab:** See your full history, topics, quiz scores!

💬 You can also just talk to me:
  • Ask \`what is algebra?\` or \`explain fractions\`
  • Say \`quiz me\` for a random challenge
  • Say \`fun fact\` for cool maths trivia
  • Type any maths: \`sqrt(144)\`, \`2^10\`, \`sin(90)\``;
  }

  // Quiz / challenge
  if (/quiz me|test me|give me a quiz|challenge me|ask me something|ask me a question/.test(m)) {
    return "🎯 A quiz question is coming right up! Watch the next message…";
  }

  // Fun fact request
  if (/fun fact|math fact|did you know|tell me something|interesting fact/.test(m)) {
    return `💡 **Fun Math Fact!**\n\n${pick(MATH_FACTS)}`;
  }

  // Thanks
  if (/thank|thanks|thx|ty |tysm|thank you/.test(m)) {
    return pick([
      "You're so welcome! 😊 That's exactly what I'm here for! Keep going — every calculation makes you sharper!",
      "Happy to help! 🌟 You're doing brilliantly! Shall we try a harder one?",
      "Anytime! ✨ I love seeing you learn! Type another problem or say `quiz me` for a challenge!",
    ]);
  }

  // Bye
  if (/bye|goodbye|see you|cya|see ya|good night|goodnight/.test(m)) {
    return "Goodbye! 👋 It was amazing practising maths with you! Your progress is saved — come back anytime. Keep up the fantastic work! 🌟";
  }

  // Sorry / mistakes
  if (/sorry|my bad|i was wrong|i made a mistake/.test(m)) {
    return "No need to apologise! 💪 Mistakes are how we learn — every wrong answer brings you closer to understanding. Let's try again together!";
  }

  // Difficulty / struggle
  if (/hard|difficult|i don't get it|don't understand|confused|stuck|can't do it|i give up/.test(m)) {
    return "You've totally got this! 💪 Every single expert was a beginner once. Let me help — tell me exactly which part is confusing and I'll break it down in the simplest way possible. What's the problem you're working on?";
  }

  // Bored
  if (/bored|boring|this is boring|not fun/.test(m)) {
    return "Maths boring?! Let me change your mind! 😱\n\nDid you know: the number of ways to arrange a deck of 52 cards is greater than the number of atoms in the observable universe (8×10⁶⁷ ways!)?\n\nType `52` and let's talk about factorials — I PROMISE it'll blow your mind! 🤯";
  }

  // Good / awesome / wow
  if (/\bgreat\b|\bawesome\b|\bwow\b|\bcool\b|\bnice\b|\bamazing\b|\bbrilliant\b/.test(m)) {
    return pick([
      "You're the awesome one here! 🌟 Keep that energy up — ready for the next challenge?",
      "Right?! Maths IS amazing once you see it everywhere! 😄 Type a problem to keep the momentum going!",
      "That enthusiasm is perfect for learning! 🚀 What shall we explore next?",
    ]);
  }

  // Emotional / personal
  if (/i love you|love this|you're great|you are great|you're helpful|you are helpful/.test(m)) {
    return "Aww, that makes my circuits happy! 💜 I love helping you learn! Shall we tackle something challenging together to celebrate?";
  }

  // Math concepts
  const concepts = [
    { k: ["fraction", "numerator", "denominator"],
      r: `🍕 **Fractions** represent parts of a whole!

• **3/4** = 3 out of 4 equal parts = 0.75
• **Numerator** = top number (how many parts you have)
• **Denominator** = bottom number (total equal parts)

**Examples in real life:**
  • Half a pizza = 1/2
  • Three quarters of an hour = 45 minutes = 3/4
  • 0.25 = 25/100 = 1/4

**Try it:** Type \`3/4\` in the chat — I'll confirm it equals 0.75!` },

    { k: ["percent", "%", "percentage"],
      r: `💯 **Percentages** are fractions out of 100!

• 25% = 25/100 = 0.25
• 50% = half  |  100% = the whole thing

**How to calculate:**
  • X% of Y = Y × (X/100)
  • 30% of 150 = 150 × 0.30 = 45
  • What % is 40 of 200? → (40/200) × 100 = 20%

**Try it:** Type \`200 * 0.25\` to find 25% of 200!
🌍 Used for: discounts, taxes, exam scores, interest rates!` },

    { k: ["prime number", "prime"],
      r: `🔢 **Prime Numbers** — only divisible by 1 and themselves!

**First primes:** 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37…
**NOT prime:** 4 (= 2×2), 6 (= 2×3), 9 (= 3×3), 15 (= 3×5)

**Key facts:**
  • 2 is the ONLY even prime number!
  • 1 is NOT a prime (only 1 factor, not 2)
  • There are infinitely many primes!

🔑 **Real use:** Prime numbers protect your internet banking through RSA encryption!` },

    { k: ["square root", "sqrt", "√"],
      r: `📏 **Square Root (√)** finds the number that multiplied by itself gives the original!

• √64 = 8 because 8 × 8 = 64
• √100 = 10 because 10 × 10 = 100
• √2 = 1.414… (irrational — never ends!)

**Perfect squares:** 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144…

**Try it:** Type \`sqrt(225)\` — answer is 15!
🌍 **Real use:** Finding the side length of a square floor from its area!` },

    { k: ["algebra", "equation", "variable"],
      r: `🔤 **Algebra** uses letters to represent unknown numbers!

• x + 5 = 10 → x = 5
• 2y = 14 → y = 7
• 3z − 4 = 11 → z = 5

**Golden rule:** Whatever you do to one side, do to the other!
  2y = 14 → divide both sides by 2 → y = 7

🌍 **Real use:** Every formula in science, economics, and engineering is algebra!
Try: If 5 × ? = 60, what is ?  → Type \`60/5\`!` },

    { k: ["pythagor", "hypotenuse", "right triangle"],
      r: `📐 **Pythagoras' Theorem:** a² + b² = c²

In a right-angled triangle:
• a, b = the two shorter sides (legs)
• c = the longest side (hypotenuse)

**Classic examples:**
  • 3-4-5: 3² + 4² = 9 + 16 = 25 = 5² ✅
  • 5-12-13: 5² + 12² = 25 + 144 = 169 = 13² ✅

**Try it:** Type \`sqrt(3^2 + 4^2)\` → you get 5!
🌍 **Real use:** Navigation, construction, video game physics, satellite positioning!` },

    { k: ["bodmas", "order of operations", "pemdas"],
      r: `🧮 **BODMAS / Order of Operations**

B — **B**rackets first: (3 + 4) × 2 = 7 × 2 = 14
O — **O**rders (exponents): 2^3 = 8
D — **D**ivision } left to right
M — **M**ultiplication }
A — **A**ddition } left to right
S — **S**ubtraction }

**Example:** 2 + 3 × 4
  Without BODMAS: (2+3) × 4 = 20 ❌
  With BODMAS: 2 + (3×4) = 2 + 12 = 14 ✅

**Try it:** Type \`2 + 3 * 4\` and see BODMAS in action!` },

    { k: ["trigonometry", "sin", "cos", "tan", "sine", "cosine"],
      r: `📐 **Trigonometry** studies the relationship between angles and sides in triangles!

**The three main ratios (SOH-CAH-TOA):**
• **sin** = Opposite ÷ Hypotenuse
• **cos** = Adjacent ÷ Hypotenuse
• **tan** = Opposite ÷ Adjacent

**Special angles:**
  sin(30°) = 0.5  |  sin(90°) = 1
  cos(0°)  = 1    |  cos(60°) = 0.5
  tan(45°) = 1

**Try it:** Type \`sin(30 * pi / 180)\` → 0.5
🌍 **Real use:** GPS, architecture, game engines, astronomy!` },

    { k: ["mean", "average", "median", "mode"],
      r: `📊 **Statistics — Mean, Median, Mode**

For the data: 4, 6, 8, 10, 6

• **Mean (average)** = sum ÷ count = 34 ÷ 5 = **6.8**
• **Median (middle)** = sort → 4,6,6,8,10 → middle = **6**
• **Mode (most frequent)** = **6** (appears twice)

**Try it:** Type \`(4+6+8+10+6)/5\` = 6.8

🌍 **Real use:** Exam scores, weather averages, sports stats, scientific data!` },

    { k: ["factorial", "!"],
      r: `🎲 **Factorials** — multiply every whole number down to 1!

• 5! = 5 × 4 × 3 × 2 × 1 = **120**
• 10! = 3,628,800
• 52! = the number of ways to shuffle a deck = 8 × 10⁶⁷

**Pattern:** n! = n × (n-1)!

🌍 **Real use:** Counting arrangements (permutations) and combinations in probability!` },

    { k: ["exponent", "power", "index", "squared", "cubed"],
      r: `🚀 **Exponents** = repeated multiplication!

• 2^8 = 2×2×2×2×2×2×2×2 = **256**
• x² = x squared (x × x)
• x³ = x cubed (x × x × x)

**Laws of exponents:**
  xᵃ × xᵇ = x^(a+b)
  xᵃ ÷ xᵇ = x^(a-b)
  (xᵃ)ᵇ   = x^(a×b)

**Try it:** Type \`2^10\` → 1024 (that's 1 KB in computers!)
🌍 **Real use:** Computer memory, compound interest, population growth!` },
  ];

  for (const { k, r } of concepts) {
    if (k.some(kw => m.includes(kw))) return r;
  }

  // Try to solve loose math in message
  try {
    const cleaned = m.replace(/[^0-9+\-*/^().sqrtlogsincotan ]/g, "").trim();
    if (/\d/.test(cleaned) && cleaned.length > 1) {
      const res = evaluate(cleaned);
      return `Looks like a maths expression! 🧮\n\n**${cleaned} = ${res}**\n\nType it in the input box and I'll give you a full step-by-step explanation + quiz!`;
    }
  } catch {}

  // Catch-all
  return pick([
    "That's interesting! 😊 I'm best with maths, but I love a chat too! Try typing `15 * 23`, asking `what are prime numbers?`, or say `quiz me`!",
    "Good question! 🤔 I might need more context. Type a maths expression, ask about a concept, or say `fun fact` for cool trivia!",
    "I'm all ears! 👂 Type any maths expression for a step-by-step explanation. Or ask me something like `what is BODMAS?` or `explain fractions`!",
    "Hmm, let me think! 🌟 While I specialise in maths, I'm here for you. Try `99^2` or `sqrt(256)` — or ask me `what is the Fibonacci sequence?`",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT DATA
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_ANALYTICS = {
  totalCalculations: 0,
  correctStreak:     0,
  topicsExplored:    [],
  sessionStart:      new Date().toISOString(),
  quizScore:         0,
  quizAttempts:      0,
  calcHistory:       [],
};

const WELCOME = {
  id:        "welcome",
  role:      "assistant",
  type:      "welcome",
  message:   `Hey there! 👋 I'm **MathBuddy**, your AI math companion!

I'm not just a calculator — here's what I do:
🧮 Solve any expression with **full step-by-step explanations**
🎯 **Quiz you** after every calculation to lock in learning
💡 Share **fun math facts** every few questions
📊 Track all your **history & progress** (check the Progress tab!)

Try typing \`23 * 45\`, ask \`what is BODMAS?\`, or say \`quiz me\` — let's make maths fun! 😊`,
  timestamp: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function MathBuddy() {
  const userId = useRef(getUserId());

  // ── State — lazy-init from localStorage (no flicker, no race condition) ──
  const [messages, setMessages] = useState(() => {
    const saved = lsGet(LS.MSGS, null);
    return (saved && saved.length > 0) ? saved : [WELCOME];
  });
  const [analytics, setAnalytics] = useState(() =>
    lsGet(LS.STATS, DEFAULT_ANALYTICS)
  );
  const [expression,  setExpression]  = useState("");
  const [displayRes,  setDisplayRes]  = useState("");
  const [userInput,   setUserInput]   = useState("");
  const [tab,         setTab]         = useState("chat");
  const [loading,     setLoading]     = useState(false);
  const [calcMode,    setCalcMode]    = useState("standard");
  const [histFilter,  setHistFilter]  = useState("all");
  const [pendingQuiz, setPendingQuiz] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const factIdx     = useRef(lsGet(LS.FACT_N, 0));
  const handleEqRef = useRef(null);

  // ── Persist to localStorage on every change ───────────────────────────────
  useEffect(() => { lsSet(LS.MSGS,  messages.slice(-150)); }, [messages]);
  useEffect(() => { lsSet(LS.STATS, analytics); },           [analytics]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Background API sync (best-effort — never blocks UI) ─────────────────
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        await fetch("/api/user-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: userId.current,
            analytics,
            chatHistory: messages.slice(-50),
          }),
        });
      } catch { /* silent — localStorage is the real store */ }
    }, 6000);
    return () => clearTimeout(t);
  }, [messages, analytics]);

  // ── Keep handleEquals ref always fresh so keyboard handler can call it ──
  useEffect(() => { handleEqRef.current = handleEquals; });

  // ── Keyboard input for calculator tab ────────────────────────────────────
  useEffect(() => {
    if (tab !== "calculator") return;
    const onKey = (e) => {
      // Don't steal from text inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const k = e.key;
      if      (/^[0-9]$/.test(k))                                        { setExpression(x => x + k);          e.preventDefault(); }
      else if (["+", "-", "*", "/", "^", "(", ")", "."].includes(k))  { setExpression(x => x + k);          e.preventDefault(); }
      else if (k === "Enter" || k === "=")                               { handleEqRef.current?.();            e.preventDefault(); }
      else if (k === "Backspace")                                         { setExpression(x => x.slice(0, -1)); setDisplayRes(""); e.preventDefault(); }
      else if (k === "Escape" || k === "Delete")                          { setExpression("");                  setDisplayRes(""); e.preventDefault(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab]);

  // ── Add message ───────────────────────────────────────────────────────────
  const push = useCallback((msg) => {
    const full = {
      id:        makeId(),
      timestamp: new Date().toISOString(),
      ...msg,
    };
    setMessages(prev => [...prev, full]);
    return full;
  }, []);

  // ── Topic detector ────────────────────────────────────────────────────────
  const detectTopic = (expr) => {
    if (/sin|cos|tan/.test(expr))  return "Trigonometry";
    if (/sqrt/.test(expr))         return "Square Roots";
    if (/log/.test(expr))          return "Logarithms";
    if (/\^/.test(expr))           return "Exponents";
    if (/\*|\//.test(expr))        return "Multiplication & Division";
    if (/\+|\-/.test(expr))        return "Addition & Subtraction";
    return "General";
  };

  // ── Update analytics + history ───────────────────────────────────────────
  const trackCalc = useCallback((expr, res) => {
    setAnalytics(prev => {
      const topic = detectTopic(expr);
      const entry = { id: makeId(), expression: expr, result: res, topic, timestamp: new Date().toISOString() };
      return {
        ...prev,
        totalCalculations: prev.totalCalculations + 1,
        correctStreak:     prev.correctStreak + 1,
        topicsExplored:    topic && !prev.topicsExplored.includes(topic)
                           ? [...prev.topicsExplored, topic] : prev.topicsExplored,
        calcHistory:       [entry, ...(prev.calcHistory || [])].slice(0, 300),
      };
    });
  }, []);

  // ── Local calculation ─────────────────────────────────────────────────────
  const calcLocal = (expr) => {
    try   { return { ok: true,  val: String(evaluate(expr)) }; }
    catch (e) { return { ok: false, err: e.message }; }
  };

  const isMath = (text) =>
    /\d+\s*[\+\-\*\/\^]\s*\d+/.test(text) ||
    /(sqrt|sin|cos|tan|log)\(/.test(text)  ||
    /^\s*[\d\+\-\*\/\^\(\)\.\s]+\s*$/.test(text);

  // ── Quiz answer check with detailed feedback ──────────────────────────────
  const checkQuiz = useCallback((userAns, quiz) => {
    const ua = String(userAns).trim().replace(/,/g, "");
    const ca = String(quiz.answer).trim();
    const numOk = !isNaN(ua) && !isNaN(ca) && Math.abs(parseFloat(ua) - parseFloat(ca)) < 0.001;
    const isCorrect = numOk || ua.toLowerCase() === ca.toLowerCase();

    setAnalytics(prev => ({
      ...prev,
      quizAttempts:  prev.quizAttempts + 1,
      quizScore:     prev.quizScore + (isCorrect ? 1 : 0),
      correctStreak: isCorrect ? prev.correctStreak + 1 : 0,
    }));

    if (isCorrect) {
      setAnalytics(cur => {
        const pct = Math.round((cur.quizScore / cur.quizAttempts) * 100);
        push({
          role: "assistant", type: "quiz-result",
          message: pick([
            `🎉 **Correct! Absolutely brilliant!** The answer is **${ca}** — you nailed it!\n\nQuiz score: **${cur.quizScore}/${cur.quizAttempts}** (${pct}%) ${cur.correctStreak >= 3 ? `🔥 ${cur.correctStreak}-answer streak!` : "⭐ Keep it up!"}`,
            `✅ **Spot on!** That's exactly right — **${ca}**!\n\nYou're on fire! Score: **${cur.quizScore}/${cur.quizAttempts}** (${pct}%) 🚀`,
            `💯 **Perfect!** **${ca}** is correct — well done, maths superstar!\n\nScore: **${cur.quizScore}/${cur.quizAttempts}** (${pct}%) 🌟`,
          ]),
        });
        return cur;
      });
    } else {
      // Detailed wrong-answer help
      const diff    = Math.abs(parseFloat(ca) - parseFloat(ua));
      const isClose = !isNaN(diff) && diff <= 5;
      const explanation = quiz.relatedExpr
        ? buildExplanation(quiz.relatedExpr, ca)
        : `The answer **${ca}** comes from applying the operation step by step.`;

      setAnalytics(cur => {
        const pct = Math.round((cur.quizScore / cur.quizAttempts) * 100);
        push({
          role: "assistant", type: "quiz-result",
          message: `Not quite — but that's totally okay! 💪\n\n**The correct answer is ${ca}.**${userAns ? ` You answered ${userAns}.` : ""}
${isClose ? `\n🎯 You were SO close — only ${diff.toFixed(1)} off! Great estimation!` : "\n📚 Let's understand why:"}

${explanation}

📈 **Your score:** ${cur.quizScore}/${cur.quizAttempts} (${pct}%)
🌟 **Remember:** Every mistake teaches you something. You're getting better with every attempt! Try again — say **quiz me**! 💪`,
        });
        return cur;
      });
    }
  }, [push]);

  // ── Full post-calculation flow ────────────────────────────────────────────
  const postCalcFlow = useCallback(async (expr, res) => {
    trackCalc(expr, res);

    // 1. Step-by-step explanation
    push({ role: "assistant", type: "explanation", message: buildExplanation(expr, res) });

    // 2. Fun fact every 3 calculations
    factIdx.current += 1;
    lsSet(LS.FACT_N, factIdx.current);
    if (factIdx.current % 3 === 0) {
      setTimeout(() => {
        push({
          role: "assistant", type: "fact",
          message: `💡 **Fun Maths Fact #${factIdx.current}:**\n\n${MATH_FACTS[factIdx.current % MATH_FACTS.length]}`,
        });
      }, 700);
    }

    // 3. Contextual quiz after every calculation
    const delay = factIdx.current % 3 === 0 ? 1600 : 900;
    setTimeout(() => {
      const quiz = quizFromCalc(expr, res);
      const qMsg = push({
        role: "assistant", type: "quiz",
        message: `🎯 **Quick Quiz!**\n\n${quiz.question}\n\n💡 *Hint: ${quiz.hint}*\n\n*(Type your answer below!)*`,
        quizAnswer: quiz.answer,
        relatedExpr: quiz.relatedExpr || expr,
      });
      setPendingQuiz({ answer: quiz.answer, relatedExpr: quiz.relatedExpr || expr, msgId: qMsg.id });
    }, delay);

    // 4. Optional: background AI for bonus insight
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `The user just calculated: ${expr} = ${res}. Give a short 2-sentence real-world connection or interesting fact about this specific calculation. Be warm and friendly.`,
          context: [],
          mathResult: res,
          userStats: { totalCalcs: analytics.totalCalculations, streak: analytics.correctStreak, topics: analytics.topicsExplored },
        }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.response && !d.isFallback) {
          setTimeout(() => push({ role: "assistant", type: "ai-tip", message: `🤖 **AI Insight:** ${d.response}` }), 2500);
        }
      }
    } catch { /* no AI key — local engine is enough */ }
  }, [push, trackCalc, analytics]);

  // ── Send a message ────────────────────────────────────────────────────────
  const send = useCallback(async (text) => {
    const msg = (text || userInput).trim();
    if (!msg) return;
    setUserInput("");

    // Show user bubble
    push({ role: "user", message: msg });

    // ── Is the user answering a quiz? ────────────────────────────────────
    if (pendingQuiz) {
      const q = pendingQuiz;
      setPendingQuiz(null);
      checkQuiz(msg, q);
      return;
    }
    // Also check last assistant message in case state is stale
    setMessages(prev => {
      const last = [...prev].reverse().find(m => m.type === "quiz");
      if (last && !pendingQuiz) {
        checkQuiz(msg, { answer: last.quizAnswer, relatedExpr: last.relatedExpr });
      }
      return prev;
    });

    // ── Special commands ─────────────────────────────────────────────────
    if (/\b(quiz me|give me a quiz|test me|challenge me|random quiz)\b/i.test(msg)) {
      const quiz = randomQuiz();
      push({
        role: "assistant", type: "quiz",
        message: `🎯 **Quiz Challenge!**\n\n${quiz.q}\n\n💡 *Hint: ${quiz.hint}*\n\n*(Type your answer!)*`,
        quizAnswer: quiz.a,
        relatedExpr: null,
      });
      setPendingQuiz({ answer: quiz.a, relatedExpr: null });
      return;
    }

    if (/\b(fun fact|math fact|did you know|tell me something cool|interesting)\b/i.test(msg)) {
      push({ role: "assistant", type: "fact", message: `💡 **Fun Maths Fact!**\n\n${pick(MATH_FACTS)}` });
      return;
    }

    // ── Is it a maths expression? ────────────────────────────────────────
    if (isMath(msg)) {
      const c = calcLocal(msg);
      if (c.ok) {
        push({ role: "system", type: "result", message: `✅  **${msg} = ${c.val}**` });
        setLoading(true);
        await postCalcFlow(msg, c.val);
        setLoading(false);
      } else {
        push({
          role: "assistant",
          message: `Hmm, I couldn't calculate that! 😅\n\n**Error:** ${c.err}\n\n**Quick fixes:**\n• Use \`*\` for multiplication: \`5 * 3\`\n• Use \`/\` for division: \`10 / 2\`\n• Use \`^\` for powers: \`2^8\`\n• Use \`sqrt(...)\`: \`sqrt(144)\`\n• Check brackets match: \`(3+4) * 2\`\n\nTry again — I believe in you! 💪`,
        });
      }
      return;
    }

    // ── Regular conversation — try API, fallback to local engine ────────
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          context: messages.slice(-6).map(m => ({ role: m.role, message: m.message })),
          mathResult: null,
          userStats: { totalCalcs: analytics.totalCalculations, streak: analytics.correctStreak, topics: analytics.topicsExplored },
        }),
      });
      if (r.ok) {
        const d = await r.json();
        push({ role: "assistant", message: d.response });
      } else throw new Error("api-err");
    } catch {
      push({ role: "assistant", message: localReply(msg) });
    } finally {
      setLoading(false);
    }
  }, [userInput, pendingQuiz, messages, push, checkQuiz, postCalcFlow, analytics]);

  // ── Calculator pad ────────────────────────────────────────────────────────
  const handlePad = (v) => {
    if (v === "C")   { setExpression(""); setDisplayRes(""); }
    else if (v === "DEL") setExpression(e => e.slice(0, -1));
    else if (v === "=")   handleEquals();
    else setExpression(e => e + v);
  };

  const handleEquals = async () => {
    if (!expression) return;
    const c = calcLocal(expression);
    if (c.ok) {
      setDisplayRes(c.val);
      push({ role: "system", type: "result", message: `🧮 **Calculator: ${expression} = ${c.val}**` });
      setLoading(true);
      await postCalcFlow(expression, c.val);
      setLoading(false);
      setExpression("");
    } else {
      setDisplayRes("Error");
      push({ role: "system", type: "error", message: `❌ Error: ${c.err}` });
    }
  };

  // ── Clear chat (keeps history+stats) ─────────────────────────────────────
  const clearChat = () => {
    if (window.confirm("Clear chat messages? (Your progress stats and calculation history are kept!)")) {
      const fresh = [{ ...WELCOME, id: makeId(), timestamp: new Date().toISOString() }];
      setMessages(fresh);
      lsSet(LS.MSGS, fresh);
      setPendingQuiz(null);
    }
  };

  // ── Reset everything ──────────────────────────────────────────────────────
  const resetAll = () => {
    if (window.confirm("⚠️ Reset ALL data including progress and history? This cannot be undone!")) {
      const freshStats = { ...DEFAULT_ANALYTICS, sessionStart: new Date().toISOString() };
      const freshMsgs  = [{ ...WELCOME, id: makeId(), timestamp: new Date().toISOString() }];
      setAnalytics(freshStats);
      setMessages(freshMsgs);
      lsSet(LS.STATS, freshStats);
      lsSet(LS.MSGS, freshMsgs);
      factIdx.current = 0;
      lsSet(LS.FACT_N, 0);
      setPendingQuiz(null);
    }
  };

  // ── Render message text with basic markdown ───────────────────────────────
  const renderText = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i, arr) => {
      const boldSplit = line.split(/\*\*(.+?)\*\*/g);
      const withBold  = boldSplit.map((p, j) =>
        j % 2 === 1 ? <strong key={j}>{p}</strong> : p
      );
      const withCode  = withBold.map((part, j) => {
        if (typeof part !== "string") return part;
        return part.split(/`(.+?)`/g).map((cp, k) =>
          k % 2 === 1 ? <code key={k} className="inline-code">{cp}</code> : cp
        );
      });
      return (
        <React.Fragment key={i}>
          {withCode}
          {i < arr.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  // ── Avatar & class per message type ──────────────────────────────────────
  const msgClass = (m) => [
    "message",
    m.role,
    m.type || "",
    m.type === "result" ? "result-msg"  : "",
    m.type === "error"  ? "error-msg"   : "",
    m.type === "quiz"   ? "quiz-msg"    : "",
    m.type === "fact"   ? "fact-msg"    : "",
    m.type === "explanation" ? "explain-msg" : "",
  ].filter(Boolean).join(" ");

  const msgAvatar = (m) => {
    if (m.role === "user") return "👤";
    if (m.type === "quiz") return "🎯";
    if (m.type === "fact") return "💡";
    if (m.type === "explanation") return "📚";
    if (m.type === "result") return m.role === "system" ? "✅" : "🧮";
    if (m.type === "error") return "⚠️";
    return "🤖";
  };

  // ── Button layouts ────────────────────────────────────────────────────────
  const stdBtns = ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","C","+","(",")", "DEL","="];
  const sciBtns = ["sin(","cos(","tan(","log(","sqrt(","^","(",")", "7","8","9","/","4","5","6","*","1","2","3","-","0",".","C","+","=","DEL"];

  // ── Progress data ─────────────────────────────────────────────────────────
  const history   = analytics.calcHistory || [];
  const allTopics = [...new Set(history.map(h => h.topic))];
  const filtered  = histFilter === "all" ? history : history.filter(h => h.topic === histFilter);
  const quizPct   = analytics.quizAttempts > 0
    ? Math.round((analytics.quizScore / analytics.quizAttempts) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="calculator-container">

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="mode-switch">
        {[{ id:"chat", label:"💬 Chat" }, { id:"calculator", label:"🧮 Calculator" }, { id:"progress", label:"📊 Progress" }].map(t => (
          <button key={t.id} className={`mode-btn ${tab === t.id ? "active" : ""}`} onClick={() => { setTab(t.id); setShowHistory(false); }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CHAT TAB ─────────────────────────────────────────────────────── */}
      {tab === "chat" && (
        <div className="chat-mode">
          <div className="chat-header">
            <div className="chat-header-left">
              <span className="bot-status-avatar">🤖</span>
              <div>
                <h3>MathBuddy AI</h3>
                <span className="online-badge">● Online</span>
              </div>
            </div>
            <button className="clear-btn" onClick={clearChat}>Clear</button>
          </div>

          <div className="chat-messages">
            {messages.map(m => (
              <div key={m.id || m.timestamp} className={msgClass(m)}>
                <div className="message-content">
                  {m.role !== "user" && <span className="avatar">{msgAvatar(m)}</span>}
                  {m.role === "user" && <span className="avatar user-avatar">👤</span>}
                  <div className={`text ${m.type === "quiz" ? "quiz-text" : ""} ${m.type === "fact" ? "fact-text" : ""} ${m.type === "explanation" ? "explain-text" : ""}`}>
                    {renderText(m.message)}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="message assistant">
                <div className="message-content">
                  <span className="avatar">🤖</span>
                  <div className="text typing">
                    <span className="dot"/><span className="dot"/><span className="dot"/>
                    <span className="typing-label"> thinking…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Quick chips */}
          <div className="quick-chips">
            {["Quiz me 🎯","Fun fact 💡","What is BODMAS? 📚","What can you do? 🤖"].map(chip => (
              <button key={chip} className="chip" onClick={() => send(chip)} disabled={loading}>{chip}</button>
            ))}
          </div>

          <div className="chat-input">
            <input
              ref={inputRef}
              type="text"
              placeholder={pendingQuiz ? "Type your quiz answer…" : "Type a maths expression or ask anything…"}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && send()}
              disabled={loading}
            />
            <button className="send-btn" onClick={() => send()} disabled={loading || !userInput.trim()}>
              {loading ? "⏳" : "➤"}
            </button>
          </div>
        </div>
      )}

      {/* ── CALCULATOR TAB ───────────────────────────────────────────────── */}
      {tab === "calculator" && (
        <div className="calculator-mode">
          <div className="calc-notice">🧮 Press <strong>=</strong> for full step-by-step explanation in Chat!</div>

          <div className="display">
            <div className="expression">{expression || "0"}</div>
            {displayRes && (
              <div className={`result ${displayRes === "Error" ? "error-result" : ""}`}>= {displayRes}</div>
            )}
          </div>

          <div className="calc-scroll-body">
            <div className="mode-selector">
              {["standard","scientific"].map(m => (
                <button key={m} className={calcMode === m ? "active" : ""} onClick={() => setCalcMode(m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>

            <div className="buttons-grid">
              {(calcMode === "scientific" ? sciBtns : stdBtns).map((btn, i) => (
                <button
                  key={i}
                  onClick={() => handlePad(btn)}
                  className={[
                    "btn",
                    btn === "="  ? "equal"   : "",
                    btn === "C"  ? "btn-clear" : "",
                    btn === "DEL"? "btn-del"  : "",
                    /^[+\-*/^]$/.test(btn) ? "btn-op" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {btn}
                </button>
              ))}
            </div>

            <button className="goto-chat-btn" onClick={() => setTab("chat")}>
              💬 View explanations in Chat
            </button>
          </div>
        </div>
      )}

      {/* ── PROGRESS TAB ─────────────────────────────────────────────────── */}
      {tab === "progress" && (
        <div className="analytics-panel">
          <div className="analytics-header">
            <h3>{showHistory ? "📜 Calculation History" : "📊 Your Learning Journey"}</h3>
            <button className="clear-btn danger-btn" onClick={resetAll}>Reset All</button>
          </div>

          {showHistory ? (
            /* ── HISTORY SUB-VIEW ──────────────────────────────────────────── */
            <div className="progress-scroll-body">
              <button className="history-back-btn" onClick={() => setShowHistory(false)}>
                ← Back to Progress
              </button>
              <div className="history-view-header">
                <span className="history-count">{history.length} saved</span>
              </div>
              {allTopics.length > 1 && (
                <div className="history-filters">
                  <button className={`filter-btn ${histFilter === "all" ? "active" : ""}`} onClick={() => setHistFilter("all")}>All</button>
                  {allTopics.map(t => (
                    <button key={t} className={`filter-btn ${histFilter === t ? "active" : ""}`} onClick={() => setHistFilter(t)}>{t}</button>
                  ))}
                </div>
              )}
              {filtered.length === 0 ? (
                <div className="empty-history">
                  <p>🧮 No calculations yet!</p>
                  <p>Go to <strong>Chat</strong> or <strong>Calculator</strong> and start solving — they'll all appear here!</p>
                </div>
              ) : (
                <div className="history-list">
                  {filtered.slice(0, 50).map(h => (
                    <div key={h.id} className="history-item" onClick={() => { setShowHistory(false); setTab("chat"); send(h.expression); }}>
                      <div className="history-expr">{h.expression}</div>
                      <div className="history-result">= {h.result}</div>
                      <div className="history-meta">
                        <span className="history-topic">{h.topic}</span>
                        <span className="history-time">{new Date(h.timestamp).toLocaleDateString()}</span>
                      </div>
                      <div className="history-replay">🔄 Tap to re-explain</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ── MAIN PROGRESS VIEW ────────────────────────────────────────── */
            <div className="progress-scroll-body">
              {/* Stats cards — 5th card opens history */}
              <div className="stats-grid">
                {[
                  { icon:"🧮", val: analytics.totalCalculations, label: "Calculations" },
                  { icon:"🔥", val: analytics.correctStreak,     label: "Current Streak" },
                  { icon:"🎓", val: analytics.topicsExplored.length, label: "Topics Explored" },
                  { icon:"🎯", val: `${quizPct}%`,               label: "Quiz Accuracy" },
                  { icon:"📜", val: history.length,              label: "History", isBtn: true },
                ].map(s => (
                  <div
                    key={s.label}
                    className={`stat-card${s.isBtn ? " stat-card-btn" : ""}`}
                    onClick={s.isBtn ? () => setShowHistory(true) : undefined}
                  >
                    <div className="stat-icon">{s.icon}</div>
                    <div className="stat-value">{s.val}</div>
                    <div className="stat-label">{s.label}</div>
                    {s.isBtn && <div className="stat-cta">View →</div>}
                  </div>
                ))}
              </div>

              {/* Quiz accuracy bar */}
              {analytics.quizAttempts > 0 && (
                <div className="quiz-bar-section">
                  <div className="quiz-bar-header">
                    <span>🎯 Quiz: {analytics.quizScore}/{analytics.quizAttempts} correct</span>
                    <span className="quiz-pct-badge">{quizPct}%</span>
                  </div>
                  <div className="quiz-progress-bar">
                    <div className="quiz-progress-fill" style={{ width: `${quizPct}%` }}/>
                  </div>
                  <p className="quiz-encourage">
                    {quizPct >= 80 ? "🌟 Outstanding! You're a maths master!"
                                   : quizPct >= 60 ? "👏 Great work! Keep practising!"
                                   : quizPct >= 40 ? "💪 Good effort! You're improving every day!"
                                   : "🎓 Every attempt teaches you — keep going!"}
                  </p>
                </div>
              )}

              {/* Topics explored */}
              {analytics.topicsExplored.length > 0 && (
                <div className="topics-section">
                  <h4>🎓 Topics Explored</h4>
                  <div className="topics-list">
                    {analytics.topicsExplored.map((t, i) => (
                      <span key={i} className="topic-badge">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="encouragement">
                <p>
                  {analytics.totalCalculations > 50 ? "🚀 You're a maths powerhouse! Incredible dedication!" :
                   analytics.totalCalculations > 20 ? "🌟 Fantastic progress! You're building real maths skills!" :
                   analytics.totalCalculations > 5  ? "👏 Great start! Every calculation makes you sharper!" :
                   "🌱 Welcome! Every expert started at zero. Let's go! 🚀"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
