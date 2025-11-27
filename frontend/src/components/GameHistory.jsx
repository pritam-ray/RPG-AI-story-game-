import React from 'react';

function GameHistory({ history }) {
  if (!history || history.length === 0) {
    return null;
  }

  return (
    <div className="game-history">
      <h3>📜 Story History</h3>
      <div className="history-entries">
        {history.slice(0, -1).map((entry, index) => (
          <div key={index} className="history-entry">
            <div className="history-narration">{entry.narration}</div>
            {entry.playerAction && (
              <div className="history-action">
                <strong>You chose:</strong> {entry.playerAction}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default GameHistory;
