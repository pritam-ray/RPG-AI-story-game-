import React from 'react';

function ThemeSelector({ themes, onSelectTheme, loading }) {
  return (
    <div className="theme-selector">
      <div className="theme-header">
        <h1>🎲 AI Dungeon Master</h1>
        <p>Choose your adventure theme to begin your epic journey</p>
      </div>

      {loading ? (
        <div className="loading">Loading themes...</div>
      ) : (
        <div className="themes-grid">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="theme-card"
              onClick={() => onSelectTheme(theme.id)}
            >
              <div className="theme-icon">{theme.icon}</div>
              <h3>{theme.name}</h3>
              <p>{theme.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ThemeSelector;
