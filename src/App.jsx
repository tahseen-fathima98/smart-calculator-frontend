import React from 'react';
import CalculatorAI from './components/CalculatorAI-v2';

export default function App() {
  return (
    <div className="app-container">
      <h1>🤖 MathBuddy - AI Calculator</h1>
      <p className="subtitle">Your friendly AI math companion that learns with you!</p>
      <CalculatorAI />
    </div>
  );
}
