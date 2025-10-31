import React, { useState } from "react";
import "./Calculator.css";

export default function Calculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState("standard");
  const [loading, setLoading] = useState(false);

  const handleClick = (value) => {
    if (value === "C") {
      setExpression("");
      setResult("");
    } else if (value === "DEL") {
      setExpression(expression.slice(0, -1));
    } else if (value === "=") {
      calculate();
    } else {
      setExpression((prev) => prev + value);
    }
  };

  const calculate = async () => {
    if (!expression) return;
    try {
      setLoading(true);
      setResult(""); // Clear old result before new calc
      const response = await fetch(
        `https://smart-calculator-backend-nlwc.onrender.com/v4?expr=${encodeURIComponent(
          expression
        )}`
      );
      const data = await response.json();
      setResult(data.result);
      setHistory([{ exp: expression, res: data.result }, ...history]);
    } catch (error) {
      setResult("Error");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => setHistory([]);

  const standardButtons = [
    "7",
    "8",
    "9",
    "/",
    "4",
    "5",
    "6",
    "*",
    "1",
    "2",
    "3",
    "-",
    "0",
    ".",
    "C",
    "+",
    "=",
    "DEL",
  ];

  const scientificButtons = [
    "sin(",
    "cos(",
    "tan(",
    "log(",
    "sqrt(",
    "7",
    "8",
    "9",
    "/",
    "4",
    "5",
    "6",
    "*",
    "1",
    "2",
    "3",
    "-",
    "0",
    ".",
    "+",
    "=",
    "DEL",
    "C",
  ];

  const buttons = mode === "scientific" ? scientificButtons : standardButtons;

  return (
    <div className="calculator-container">
      <div className="mode-switch">
        {["standard", "scientific", "history"].map((m) => (
          <button
            key={m}
            className={`mode-btn ${mode === m ? "active" : ""}`}
            onClick={() => setMode(m)}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {mode !== "history" ? (
        <>
          <div className="display">
            <div className="expression">{expression || "0"}</div>
            <div className="result">
              {loading ? (
                <div className="loader">Calculating...</div>
              ) : (
                result && <span className="final-result">{result}</span>
              )}
            </div>
          </div>

          <div className="buttons-grid">
            {buttons.map((btn, index) => (
              <button
                key={index}
                onClick={() => handleClick(btn)}
                className={`btn ${btn === "=" ? "equal" : ""}`}
              >
                {btn}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="history-panel">
          <div className="history-header">
            <h3>🧾 History</h3>
            <button className="clear-btn" onClick={clearHistory}>
              Clear
            </button>
          </div>
          {history.length === 0 ? (
            <p className="no-history">No calculations yet</p>
          ) : (
            <ul className="history-list">
              {history.map((h, i) => (
                <li key={i}>
                  <span>{h.exp}</span>
                  <span>= {h.res}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
