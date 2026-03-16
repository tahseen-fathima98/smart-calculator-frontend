import React, { useState, useEffect, useRef } from "react";
import { evaluate } from "mathjs";
import "./Calculator.css";

export default function Calculator() {
  const [expression, setExpression] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [userMessage, setUserMessage] = useState("");
  const [mode, setMode] = useState("chat"); // chat, calculator, analytics
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalCalculations: 0,
    correctStreak: 0,
    topicsExplored: [],
    sessionStart: new Date().toISOString()
  });
  const chatEndRef = useRef(null);

  // Load analytics and chat history from localStorage
  useEffect(() => {
    const savedAnalytics = localStorage.getItem("mathbuddy_analytics");
    const savedChat = localStorage.getItem("mathbuddy_chat");
    
    if (savedAnalytics) {
      setAnalytics(JSON.parse(savedAnalytics));
    }
    
    if (savedChat) {
      setChatMessages(JSON.parse(savedChat));
    } else {
      // Welcome message
      setChatMessages([{
        role: "assistant",
        message: "Hey there! 👋 I'm MathBuddy, your AI math companion! I'm here to help you learn, calculate, and have fun with math. Try asking me to solve something like '23 * 45' or just chat with me!",
        timestamp: new Date().toISOString()
      }]);
    }
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem("mathbuddy_analytics", JSON.stringify(analytics));
  }, [analytics]);

  useEffect(() => {
    localStorage.setItem("mathbuddy_chat", JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Fast local calculation using mathjs
  const calculateLocal = (expr) => {
    try {
      const result = evaluate(expr);
      return { success: true, result: String(result) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Detect if message contains math expression
  const detectMathExpression = (text) => {
    const mathPatterns = [
      /\d+\s*[\+\-\*\/\^]\s*\d+/,
      /sqrt\(|sin\(|cos\(|tan\(|log\(/,
      /^\s*[\d\+\-\*\/\^\(\)\.\s]+\s*$/
    ];
    return mathPatterns.some(pattern => pattern.test(text));
  };

  // Send message to AI
  const sendMessage = async (msg = userMessage, calculationResult = null) => {
    if (!msg.trim() && !calculationResult) return;

    const newUserMessage = {
      role: "user",
      message: msg,
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, newUserMessage]);
    setUserMessage("");
    setLoading(true);

    try {
      // Build context from recent messages (last 6)
      const context = chatMessages.slice(-6).map(m => ({
        role: m.role,
        message: m.message
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          context,
          mathResult: calculationResult
        })
      });

      const data = await response.json();
      
      const aiMessage = {
        role: "assistant",
        message: data.response,
        timestamp: new Date().toISOString(),
        isFallback: data.isFallback
      };

      setChatMessages(prev => [...prev, aiMessage]);

      // Update analytics
      if (calculationResult) {
        updateAnalytics(msg, calculationResult);
      }

    } catch (error) {
      console.error("Chat error:", error);
      
      const errorMessage = {
        role: "assistant",
        message: "Oops! I'm having trouble connecting. But I'm still here! Try typing a math expression like '2+2' 😊",
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Handle user input
  const handleSendMessage = async () => {
    const msg = userMessage.trim();
    if (!msg) return;

    // Check if it's a math expression
    if (detectMathExpression(msg)) {
      const calc = calculateLocal(msg);
      
      if (calc.success) {
        // Add user message
        setChatMessages(prev => [...prev, {
          role: "user",
          message: msg,
          timestamp: new Date().toISOString()
        }]);

        // Add calculation result
        setChatMessages(prev => [...prev, {
          role: "system",
          message: `= ${calc.result}`,
          timestamp: new Date().toISOString(),
          isCalculation: true
        }]);

        setUserMessage("");

        // Get AI response about the calculation
        await sendMessage(`I calculated: ${msg} = ${calc.result}`, calc.result);
      } else {
        // Calculation error
        setChatMessages(prev => [...prev, {
          role: "user",
          message: msg,
          timestamp: new Date().toISOString()
        }]);

        setChatMessages(prev => [...prev, {
          role: "system",
          message: `❌ Oops! ${calc.error}`,
          timestamp: new Date().toISOString(),
          isError: true
        }]);

        setUserMessage("");
        
        await sendMessage("I got an error with that expression", null);
      }
    } else {
      // Regular chat message
      await sendMessage(msg);
    }
  };

  // Update learning analytics
  const updateAnalytics = (expression, result) => {
    setAnalytics(prev => {
      const newAnalytics = { ...prev };
      newAnalytics.totalCalculations += 1;
      newAnalytics.correctStreak += 1;

      // Detect topic
      const topic = detectTopic(expression);
      if (topic && !newAnalytics.topicsExplored.includes(topic)) {
        newAnalytics.topicsExplored = [...newAnalytics.topicsExplored, topic];
      }

      return newAnalytics;
    });
  };

  // Detect math topic
  const detectTopic = (expr) => {
    if (expr.includes('sin') || expr.includes('cos') || expr.includes('tan')) return 'Trigonometry';
    if (expr.includes('sqrt')) return 'Square Roots';
    if (expr.includes('log')) return 'Logarithms';
    if (expr.includes('^') || expr.includes('**')) return 'Exponents';
    if (expr.includes('*') || expr.includes('/')) return 'Multiplication/Division';
    if (expr.includes('+') || expr.includes('-')) return 'Addition/Subtraction';
    return null;
  };

  // Calculator button handlers
  const handleClick = (value) => {
    if (value === "C") {
      setExpression("");
    } else if (value === "DEL") {
      setExpression(expression.slice(0, -1));
    } else if (value === "=") {
      calculateAndChat();
    } else {
      setExpression((prev) => prev + value);
    }
  };

  const calculateAndChat = async () => {
    if (!expression) return;
    
    const calc = calculateLocal(expression);
    
    if (calc.success) {
      // Add to chat
      setChatMessages(prev => [...prev, {
        role: "user",
        message: expression,
        timestamp: new Date().toISOString()
      }]);

      setChatMessages(prev => [...prev, {
        role: "system",
        message: `= ${calc.result}`,
        timestamp: new Date().toISOString(),
        isCalculation: true
      }]);

      setExpression("");
      
      // Get AI encouragement
      await sendMessage(`I calculated: ${expression} = ${calc.result}`, calc.result);
    } else {
      setChatMessages(prev => [...prev, {
        role: "system",
        message: `❌ Error: ${calc.error}`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    }
  };

  const standardButtons = [
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "0", ".", "C", "+",
    "=", "DEL"
  ];

  const scientificButtons = [
    "sin(", "cos(", "tan(", "log(",
    "sqrt(", "^", "(", ")",
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "0", ".", "C", "+",
    "=", "DEL"
  ];

  const clearChat = () => {
    if (window.confirm("Clear all chat history?")) {
      setChatMessages([{
        role: "assistant",
        message: "Fresh start! 🌟 What would you like to calculate?",
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const resetAnalytics = () => {
    if (window.confirm("Reset all learning progress?")) {
      setAnalytics({
        totalCalculations: 0,
        correctStreak: 0,
        topicsExplored: [],
        sessionStart: new Date().toISOString()
      });
    }
  };

  return (
    <div className="calculator-container">
      <div className="mode-switch">
        {["chat", "calculator", "analytics"].map((m) => (
          <button
            key={m}
            className={`mode-btn ${mode === m ? "active" : ""}`}
            onClick={() => setMode(m)}
          >
            {m === "chat" ? "💬 Chat" : m === "calculator" ? "🧮 Calculator" : "📊 Progress"}
          </button>
        ))}
      </div>

      {mode === "chat" && (
        <div className="chat-mode">
          <div className="chat-header">
            <h3>🤖 MathBuddy AI</h3>
            <button className="clear-btn" onClick={clearChat}>Clear</button>
          </div>

          <div className="chat-messages">
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`message ${msg.role} ${msg.isCalculation ? 'calculation' : ''} ${msg.isError ? 'error' : ''}`}
              >
                <div className="message-content">
                  {msg.role === "assistant" && <span className="avatar">🤖</span>}
                  {msg.role === "user" && <span className="avatar">👤</span>}
                  {msg.role === "system" && msg.isCalculation && <span className="avatar">🎯</span>}
                  {msg.role === "system" && msg.isError && <span className="avatar">⚠️</span>}
                  <div className="text">{msg.message}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message assistant">
                <div className="message-content">
                  <span className="avatar">🤖</span>
                  <div className="text typing">Thinking...</div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input">
            <input
              type="text"
              placeholder="Ask me anything or type a math expression..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />
            <button onClick={handleSendMessage} disabled={loading || !userMessage.trim()}>
              Send 📤
            </button>
          </div>
        </div>
      )}

      {mode === "calculator" && (
        <div className="calculator-mode">
          <div className="display">
            <div className="expression">{expression || "0"}</div>
          </div>

          <div className="mode-selector">
            <button onClick={() => setMode("standard")}>Standard</button>
            <button onClick={() => setMode("scientific")}>Scientific</button>
          </div>

          <div className="buttons-grid">
            {(mode === "scientific" ? scientificButtons : standardButtons).map((btn, index) => (
              <button
                key={index}
                onClick={() => handleClick(btn)}
                className={`btn ${btn === "=" ? "equal" : ""}`}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "analytics" && (
        <div className="analytics-panel">
          <div className="analytics-header">
            <h3>📊 Your Learning Progress</h3>
            <button className="clear-btn" onClick={resetAnalytics}>Reset</button>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{analytics.totalCalculations}</div>
              <div className="stat-label">Calculations</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{analytics.correctStreak}</div>
              <div className="stat-label">Success Streak 🔥</div>
            </div>

            <div className="stat-card">
              <div className="stat-value">{analytics.topicsExplored.length}</div>
              <div className="stat-label">Topics Explored</div>
            </div>
          </div>

          {analytics.topicsExplored.length > 0 && (
            <div className="topics-section">
              <h4>Topics You've Mastered 🎓</h4>
              <div className="topics-list">
                {analytics.topicsExplored.map((topic, idx) => (
                  <span key={idx} className="topic-badge">{topic}</span>
                ))}
              </div>
            </div>
          )}

          <div className="encouragement">
            <p>🌟 Keep going! Every calculation makes you stronger at math!</p>
          </div>
        </div>
      )}
    </div>
  );
}
