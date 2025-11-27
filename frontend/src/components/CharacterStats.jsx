import React from 'react';

function CharacterStats({ stats, inventory }) {
  const getHealthColor = (health) => {
    if (health > 70) return '#4ade80';
    if (health > 30) return '#fbbf24';
    return '#ef4444';
  };

  const getManaColor = (mana) => {
    if (mana > 70) return '#60a5fa';
    if (mana > 30) return '#a78bfa';
    return '#818cf8';
  };

  return (
    <div className="character-stats">
      <h3>Character Stats</h3>
      
      <div className="stats-grid">
        <div className="stat-item health">
          <div className="stat-label">❤️ Health</div>
          <div className="stat-bar">
            <div 
              className="stat-fill" 
              style={{ 
                width: `${stats.health}%`,
                backgroundColor: getHealthColor(stats.health)
              }}
            ></div>
          </div>
          <div className="stat-value">{stats.health}/100</div>
        </div>

        <div className="stat-item mana">
          <div className="stat-label">✨ Mana</div>
          <div className="stat-bar">
            <div 
              className="stat-fill" 
              style={{ 
                width: `${stats.mana}%`,
                backgroundColor: getManaColor(stats.mana)
              }}
            ></div>
          </div>
          <div className="stat-value">{stats.mana}/100</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">💪 Strength</div>
          <div className="stat-value-large">{stats.strength}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">🧠 Intelligence</div>
          <div className="stat-value-large">{stats.intelligence}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">💬 Charisma</div>
          <div className="stat-value-large">{stats.charisma}</div>
        </div>
      </div>

      {inventory && inventory.length > 0 && (
        <div className="inventory">
          <h4>🎒 Inventory</h4>
          <div className="inventory-items">
            {inventory.map((item, index) => (
              <div key={index} className="inventory-item">
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default CharacterStats;
