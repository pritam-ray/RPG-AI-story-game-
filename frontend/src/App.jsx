import React, { useState, useEffect } from 'react';
import ThemeSelector from './components/ThemeSelector';
import CharacterStats from './components/CharacterStats';
import StoryDisplay from './components/StoryDisplay';
import ChoiceButtons from './components/ChoiceButtons';
import GameHistory from './components/GameHistory';
import { gameAPI } from './services/api';
import './styles/App.css';

function App() {
  const [gameState, setGameState] = useState('theme-selection'); // theme-selection, playing
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [characterName, setCharacterName] = useState('Adventurer');
  const [characterStats, setCharacterStats] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [currentNarration, setCurrentNarration] = useState('');
  const [currentChoices, setCurrentChoices] = useState([]);
  const [storyHistory, setStoryHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statChanges, setStatChanges] = useState(null);
  const [itemChanges, setItemChanges] = useState(null);
  const [turnCount, setTurnCount] = useState(0);
  const [achievements, setAchievements] = useState([]);
  const [newAchievements, setNewAchievements] = useState([]);
  const [storyArc, setStoryArc] = useState('beginning');
  const [isGameEnding, setIsGameEnding] = useState(false);

  // Load themes on mount
  useEffect(() => {
    loadThemes();
  }, []);

  const loadThemes = async () => {
    try {
      setLoading(true);
      const themesData = await gameAPI.getThemes();
      setThemes(themesData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load themes. Please refresh the page.');
      setLoading(false);
    }
  };

  const handleSelectTheme = async (themeId) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedTheme(themeId);

      const response = await gameAPI.startGame(themeId, characterName);

      setSessionId(response.sessionId);
      setCurrentNarration(response.narration);
      setCurrentChoices(response.choices);
      setCharacterStats(response.characterStats);
      setInventory(response.inventory || []);
      setTurnCount(response.turnCount || 0);
      setAchievements(response.achievements || []);
      setStoryArc(response.storyArc || 'beginning');
      setIsGameEnding(response.isGameEnding || false);
      setStoryHistory([{
        narration: response.narration,
        choices: response.choices,
        playerAction: null,
      }]);

      setGameState('playing');
      setLoading(false);
    } catch (err) {
      setError('Failed to start game. Please try again.');
      setLoading(false);
      console.error(err);
    }
  };

  const handleChoice = async (choice) => {
    try {
      setLoading(true);
      setError(null);
      setStatChanges(null);
      setItemChanges(null);

      const response = await gameAPI.sendAction(sessionId, choice);

      // Update story history with player's action
      const updatedHistory = [...storyHistory];
      if (updatedHistory.length > 0) {
        updatedHistory[updatedHistory.length - 1].playerAction = choice;
      }

      // Add new story entry
      updatedHistory.push({
        narration: response.narration,
        choices: response.choices,
        playerAction: null,
      });

      setCurrentNarration(response.narration);
      setCurrentChoices(response.choices);
      setCharacterStats(response.characterStats);
      setInventory(response.inventory || []);
      setTurnCount(response.turnCount || 0);
      setStoryArc(response.storyArc || 'beginning');
      setIsGameEnding(response.isGameEnding || false);
      setStoryHistory(updatedHistory);

      // Update achievements
      if (response.achievements && response.achievements.length > 0) {
        setAchievements(prev => [...prev, ...response.achievements]);
      }

      // Show new achievements notification
      if (response.newAchievements && response.newAchievements.length > 0) {
        setNewAchievements(response.newAchievements);
        setTimeout(() => setNewAchievements([]), 5000);
      }

      // Show stat changes notification
      if (response.statChanges) {
        setStatChanges(response.statChanges);
        setTimeout(() => setStatChanges(null), 3000);
      }

      // Show item changes notification
      const hasItemChanges = 
        (response.itemsFound && response.itemsFound.length > 0) ||
        (response.itemsUsed && response.itemsUsed.length > 0);
      
      if (hasItemChanges) {
        setItemChanges({
          found: response.itemsFound || [],
          used: response.itemsUsed || []
        });
        setTimeout(() => setItemChanges(null), 4000);
      }

      setLoading(false);

      // Scroll to top to see new narration
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError('Failed to process action. Please try again.');
      setLoading(false);
      console.error(err);
    }
  };

  const handleNewGame = () => {
    setGameState('theme-selection');
    setSessionId(null);
    setSelectedTheme(null);
    setCurrentNarration('');
    setCurrentChoices([]);
    setCharacterStats(null);
    setInventory([]);
    setStoryHistory([]);
    setError(null);
    setStatChanges(null);
    setItemChanges(null);
    setTurnCount(0);
    setAchievements([]);
    setNewAchievements([]);
    setStoryArc('beginning');
    setIsGameEnding(false);
  };

  return (
    <div className="app">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {gameState === 'theme-selection' && (
        <ThemeSelector
          themes={themes}
          onSelectTheme={handleSelectTheme}
          loading={loading}
        />
      )}

      {gameState === 'playing' && (
        <div className="game-container">
          <div className="game-header">
            <h1>🎲 AI Dungeon Master</h1>
            <button className="new-game-button" onClick={handleNewGame}>
              New Game
            </button>
          </div>

          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-info">
              <span>📊 Turn {turnCount}/475 ({Math.floor((turnCount / 475) * 100)}%)</span>
              <span>📖 {storyArc.toUpperCase()}</span>
              <span>🏆 {achievements.length} Achievements</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min(100, (turnCount / 475) * 100)}%` }}
              />
            </div>
            {isGameEnding && (
              <div className="ending-warning">
                ⚠️ Story approaching conclusion...
              </div>
            )}
          </div>

          {/* New Achievement Notifications */}
          {newAchievements && newAchievements.length > 0 && (
            <div className="achievement-notification">
              🏆 Achievement Unlocked: {newAchievements.join(', ')}
            </div>
          )}

          <div className="game-layout">
            <div className="main-content">
              <StoryDisplay narration={currentNarration} loading={loading} />

              {statChanges && (
                <div className="stat-changes-notification">
                  {Object.entries(statChanges).map(([stat, change]) => {
                    if (change !== 0) {
                      return (
                        <div key={stat} className={change > 0 ? 'stat-gain' : 'stat-loss'}>
                          {stat}: {change > 0 ? '+' : ''}{change}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}

              {itemChanges && (
                <div className="item-changes-notification">
                  {itemChanges.found.length > 0 && (
                    <div className="items-found">
                      {itemChanges.found.map((item, index) => (
                        <div key={`found-${index}`} className="item-found">
                          ✨ Found: {item}
                        </div>
                      ))}
                    </div>
                  )}
                  {itemChanges.used.length > 0 && (
                    <div className="items-used">
                      {itemChanges.used.map((item, index) => (
                        <div key={`used-${index}`} className="item-used">
                          📦 Used: {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!loading && currentChoices.length > 0 && (
                <ChoiceButtons
                  choices={currentChoices}
                  onChoice={handleChoice}
                  disabled={loading}
                />
              )}
            </div>

            <div className="sidebar">
              {characterStats && (
                <CharacterStats stats={characterStats} inventory={inventory} />
              )}
            </div>
          </div>

          {storyHistory.length > 1 && (
            <GameHistory history={storyHistory} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
