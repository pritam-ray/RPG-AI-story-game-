import React from 'react';

function StoryDisplay({ narration, loading }) {
  if (loading) {
    return (
      <div className="story-display loading-story">
        <div className="spinner"></div>
        <p>The Dungeon Master is crafting your story...</p>
      </div>
    );
  }

  return (
    <div className="story-display">
      <div className="narration">
        {narration.split('\n').map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  );
}

export default StoryDisplay;
