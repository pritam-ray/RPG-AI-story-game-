import React, { useState } from 'react';

function ChoiceButtons({ choices, onChoice, disabled }) {
  const [customAction, setCustomAction] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleCustomAction = () => {
    if (customAction.trim()) {
      onChoice(customAction);
      setCustomAction('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="choice-buttons">
      <h3>What do you do?</h3>
      
      <div className="choices-grid">
        {choices.map((choice, index) => (
          <button
            key={index}
            className="choice-button"
            onClick={() => onChoice(choice)}
            disabled={disabled}
          >
            <span className="choice-number">{index + 1}</span>
            <span className="choice-text">{choice}</span>
          </button>
        ))}
      </div>

      <div className="custom-action">
        {!showCustomInput ? (
          <button
            className="custom-action-button"
            onClick={() => setShowCustomInput(true)}
            disabled={disabled}
          >
            ✍️ Enter Custom Action
          </button>
        ) : (
          <div className="custom-input-container">
            <input
              type="text"
              className="custom-input"
              placeholder="Describe your action..."
              value={customAction}
              onChange={(e) => setCustomAction(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomAction()}
              disabled={disabled}
              autoFocus
            />
            <button
              className="submit-custom"
              onClick={handleCustomAction}
              disabled={disabled || !customAction.trim()}
            >
              Submit
            </button>
            <button
              className="cancel-custom"
              onClick={() => {
                setShowCustomInput(false);
                setCustomAction('');
              }}
              disabled={disabled}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChoiceButtons;
