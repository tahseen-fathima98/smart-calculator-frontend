import React, { useState } from 'react';

export default function Calculator() {
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');

  const handleClick = (value) => {
    if (value === 'C') {
      setExpression('');
      setResult('');
    } else if (value === '=') {
      calculate();
    } else {
      setExpression((prev) => prev + value);
    }
  };

  const calculate = async () => {
    try {
      const response = await fetch(`https://api.mathjs.org/v4/?expr=${encodeURIComponent(expression)}`);
      const text = await response.text();
      setResult(text);
    } catch (error) {
      setResult('Error');
    }
  };

  const buttons = [
    '7', '8', '9', '/',
    '4', '5', '6', '*',
    '1', '2', '3', '-',
    '0', '.', 'C', '+',
    '='
  ];

  return (
    <div className="calculator">
      <div className="display">
        <div>{expression || '0'}</div>
        <div>= {result}</div>
      </div>
      <div className="buttons">
        {buttons.map((btn, index) => (
          <button
            key={index}
            onClick={() => handleClick(btn)}
            className={btn === '=' ? 'equal' : isNaN(btn) ? 'operator' : ''}
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}
