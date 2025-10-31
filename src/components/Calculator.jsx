import React, { useState } from "react";
import "./Calculator.css";

export default function Calculator() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");
  const [history, setHistory] = useState([]);
  const [mode, setMode] = useState("standard"); // standard | scientific | history

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
      const response = await fetch(
        `https://smart-calculator-backend-nlwc.onrender.com/v4?expr=${encodeURIComponent(expression)}`
      );
      const data = await response.text();
      setResult(data);
      setHistory((prev) => [{ expr: expression, res: data }, ...prev.slice(0, 9)]);
    } catch {
      setResult("Error");
    }
  };

  const buttonsStandard = [
    "7", "8", "9", "/",
    "4", "5", "6", "*",
    "1", "2", "3", "-",
    "0", ".", "C", "+",
    "=", "DEL"
  ];

  const buttonsScientific = [
    "sin(", "cos(", "tan(", "log(", "sqrt(",
    ...buttonsStandard
  ];

  const getButtons = () => (mode === "scientific" ? buttonsScientific : buttonsStandard);

  return (
    <div className="calculator-wrapper">
      <div className="mode-tabs">
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
        <div className="calculator">
          <div className="display">
            <div className="expression">{expression || "0"}</div>
            <div className="result">{result ? `= ${result}` : ""}</div>
          </div>

          <div className="buttons">
            {getButtons().map((btn, index) => (
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
      ) : (
        <div className="history-panel">
          <div className="history-header">
            <h3>🧾 History</h3>
            {history.length > 0 && (
              <button className="clear-btn" onClick={() => setHistory([])}>
                Clear
              </button>
            )}
          </div>
          <div className="history-list">
            {history.length === 0 ? (
              <p>No calculations yet</p>
            ) : (
              history.map((item, idx) => (
                <div key={idx} className="history-item">
                  <span>{item.expr}</span>
                  <span>= {item.res}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
