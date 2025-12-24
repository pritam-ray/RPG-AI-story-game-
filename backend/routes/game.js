import express from "express";
import { generateStory } from "../services/openai.js";

const router = express.Router();

// In-memory game sessions (in production, use Redis or database)
const gameSessions = new Map();

// Session cleanup to prevent memory leak
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, gameState] of gameSessions.entries()) {
    if (now - gameState.createdAt > SESSION_TIMEOUT) {
      gameSessions.delete(sessionId);
      console.log(`Cleaned up expired session: ${sessionId}`);
    }
  }
}, 60 * 60 * 1000); // Check every hour

/**
 * Start a new game
 * POST /api/game/start
 */
router.post("/start", async (req, res) => {
  try {
    const { theme, characterName } = req.body;

    if (!theme) {
      return res.status(400).json({ error: "Theme is required" });
    }

    // Initialize game state with progression tracking
    const sessionId = generateSessionId();
    const gameState = {
      sessionId,
      previousResponseId: null, // Will be set after first response
      theme,
      characterName: characterName || "Adventurer",
      turnCount: 0, // Track total choices made
      characterStats: {
        health: 100,
        mana: 50,
        strength: 10,
        intelligence: 10,
        charisma: 10,
        level: 1, // Character level
        experience: 0, // XP for progression
      },
      achievements: [], // Track major accomplishments
      majorChoices: [], // Track pivotal story decisions
      relationships: {}, // Track NPCs and faction relationships
      storyArc: "beginning", // beginning, rising, climax, resolution, ending
      inventory: [],
      storyHistory: [],
      createdAt: Date.now(), // For session cleanup
    };

    // Generate opening story
    const storyResponse = await generateStory(gameState, null);

    // Store the response ID for future chaining
    gameState.previousResponseId = storyResponse.responseId;

    // Update game state with first story entry
    gameState.storyHistory.push({
      narration: storyResponse.narration,
      choices: storyResponse.choices,
      playerAction: null,
      timestamp: new Date(),
    });

    // Apply any stat changes from opening
    if (storyResponse.statChanges) {
      applyStatChanges(gameState.characterStats, storyResponse.statChanges);
    }

    // Track achievements and major choices
    if (storyResponse.achievements) {
      gameState.achievements.push(...storyResponse.achievements);
    }
    if (storyResponse.majorChoice) {
      gameState.majorChoices.push(storyResponse.majorChoice);
    }
    if (storyResponse.relationships) {
      Object.assign(gameState.relationships, storyResponse.relationships);
    }
    if (storyResponse.storyArc) {
      gameState.storyArc = storyResponse.storyArc;
    }

    // Add any items found
    if (storyResponse.itemsFound && storyResponse.itemsFound.length > 0) {
      gameState.inventory.push(...storyResponse.itemsFound);
    }

    // Remove any items used (in case opening story uses items)
    if (storyResponse.itemsUsed && storyResponse.itemsUsed.length > 0) {
      storyResponse.itemsUsed.forEach(usedItem => {
        const index = gameState.inventory.indexOf(usedItem);
        if (index > -1) {
          gameState.inventory.splice(index, 1);
        }
      });
    }

    // Save session
    gameSessions.set(sessionId, gameState);

    res.json({
      sessionId,
      narration: storyResponse.narration,
      choices: storyResponse.choices,
      characterStats: gameState.characterStats,
      inventory: gameState.inventory,
      turnCount: gameState.turnCount,
      achievements: gameState.achievements,
      storyArc: gameState.storyArc,
      isGameEnding: gameState.turnCount >= 450,
    });
  } catch (error) {
    console.error("Error starting game:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Make a choice and continue the story
 * POST /api/game/action
 */
router.post("/action", async (req, res) => {
  try {
    const { sessionId, action } = req.body;

    if (!sessionId || !action) {
      return res.status(400).json({ error: "Session ID and action are required" });
    }

    const gameState = gameSessions.get(sessionId);
    if (!gameState) {
      return res.status(404).json({ error: "Game session not found" });
    }

    // Increment turn counter
    gameState.turnCount++;

    // Generate next part of story
    const storyResponse = await generateStory(gameState, action);

    // Store the new response ID for future chaining
    gameState.previousResponseId = storyResponse.responseId;

    // Check for game over condition
    const isGameOver = storyResponse.isGameOver || gameState.characterStats.health <= 0;
    if (isGameOver) {
      gameState.isGameOver = true;
      gameState.gameOverReason = storyResponse.gameOverReason || "Your journey has ended";
    }

    // Update the last entry with the player's action
    if (gameState.storyHistory.length > 0) {
      gameState.storyHistory[gameState.storyHistory.length - 1].playerAction = action;
    }

    // Add new story entry
    gameState.storyHistory.push({
      narration: storyResponse.narration,
      choices: storyResponse.choices,
      playerAction: null,
      timestamp: new Date(),
    });

    // Apply stat changes
    if (storyResponse.statChanges) {
      applyStatChanges(gameState.characterStats, storyResponse.statChanges);
    }

    // Track achievements and major choices
    if (storyResponse.achievements) {
      gameState.achievements.push(...storyResponse.achievements);
    }
    if (storyResponse.majorChoice) {
      gameState.majorChoices.push(storyResponse.majorChoice);
    }
    if (storyResponse.relationships) {
      Object.assign(gameState.relationships, storyResponse.relationships);
    }
    if (storyResponse.storyArc) {
      gameState.storyArc = storyResponse.storyArc;
    }

    // Level up system
    if (gameState.characterStats.experience >= gameState.characterStats.level * 100) {
      gameState.characterStats.level++;
      gameState.characterStats.experience = 0;
      // Boost stats on level up
      gameState.characterStats.health = Math.min(gameState.characterStats.health + 20, 100 + (gameState.characterStats.level * 10));
      gameState.characterStats.mana = Math.min(gameState.characterStats.mana + 10, 100 + (gameState.characterStats.level * 5));
    }

    // Add any items found
    if (storyResponse.itemsFound && storyResponse.itemsFound.length > 0) {
      gameState.inventory.push(...storyResponse.itemsFound);
    }

    // Remove any items used
    if (storyResponse.itemsUsed && storyResponse.itemsUsed.length > 0) {
      storyResponse.itemsUsed.forEach(usedItem => {
        const index = gameState.inventory.indexOf(usedItem);
        if (index > -1) {
          gameState.inventory.splice(index, 1);
        }
      });
    }

    // Save updated session
    gameSessions.set(sessionId, gameState);

    res.json({
      narration: storyResponse.narration,
      choices: isGameOver ? [] : storyResponse.choices, // No choices if game over
      characterStats: gameState.characterStats,
      inventory: gameState.inventory,
      statChanges: storyResponse.statChanges,
      itemsFound: storyResponse.itemsFound,
      itemsUsed: storyResponse.itemsUsed,
      turnCount: gameState.turnCount,
      achievements: storyResponse.achievements || [],
      newAchievements: storyResponse.achievements || [],
      storyArc: gameState.storyArc,
      isGameEnding: gameState.turnCount >= 450,
      majorChoice: storyResponse.majorChoice,
      isGameOver: isGameOver,
      gameOverReason: gameState.gameOverReason || null,
    });
  } catch (error) {
    console.error("Error processing action:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current game state
 * GET /api/game/state/:sessionId
 */
router.get("/state/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const gameState = gameSessions.get(sessionId);

  if (!gameState) {
    return res.status(404).json({ error: "Game session not found" });
  }

  res.json({
    theme: gameState.theme,
    characterName: gameState.characterName,
    characterStats: gameState.characterStats,
    inventory: gameState.inventory,
    storyHistory: gameState.storyHistory,
    turnCount: gameState.turnCount,
    achievements: gameState.achievements,
    majorChoices: gameState.majorChoices,
    relationships: gameState.relationships,
    storyArc: gameState.storyArc,
    isGameEnding: gameState.turnCount >= 450,
  });
});

/**
 * Get available themes
 * GET /api/game/themes
 */
router.get("/themes", (req, res) => {
  const themes = [
    {
      id: "medieval-fantasy",
      name: "Medieval Fantasy",
      description: "Embark on a classic fantasy adventure with knights, dragons, magic, and ancient kingdoms.",
      icon: "⚔️",
    },
    {
      id: "sci-fi-space",
      name: "Sci-Fi Space Opera",
      description: "Explore the cosmos in a futuristic universe filled with alien civilizations and advanced technology.",
      icon: "🚀",
    },
    {
      id: "horror-gothic",
      name: "Gothic Horror",
      description: "Survive a dark gothic world of supernatural creatures, cursed lands, and terrifying encounters.",
      icon: "🦇",
    },
    {
      id: "cyberpunk",
      name: "Cyberpunk Dystopia",
      description: "Navigate a neon-lit cyberpunk world of megacorporations, hackers, and cybernetic enhancements.",
      icon: "🤖",
    },
    {
      id: "post-apocalyptic",
      name: "Post-Apocalyptic",
      description: "Survive in a wasteland filled with mutants, scavengers, and the remnants of civilization.",
      icon: "☢️",
    },
    {
      id: "steampunk",
      name: "Steampunk Victorian",
      description: "Adventure through a Victorian era powered by steam technology, airships, and brilliant inventors.",
      icon: "⚙️",
    },
  ];

  res.json(themes);
});

// Helper functions
function generateSessionId() {
  return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function applyStatChanges(currentStats, changes) {
  // Define stat caps based on character level
  const baseHealthCap = 100;
  const baseManaCap = 100;
  const levelBonus = (currentStats.level || 1) - 1;
  const healthCap = baseHealthCap + (levelBonus * 20); // +20 HP per level
  const manaCap = baseManaCap + (levelBonus * 15); // +15 MP per level
  
  Object.keys(changes).forEach((stat) => {
    if (currentStats.hasOwnProperty(stat)) {
      currentStats[stat] = Math.max(0, currentStats[stat] + changes[stat]);
      
      // Apply dynamic caps based on level
      if (stat === "health") currentStats[stat] = Math.min(currentStats[stat], healthCap);
      if (stat === "mana") currentStats[stat] = Math.min(currentStats[stat], manaCap);
      if (stat === "strength") currentStats[stat] = Math.min(currentStats[stat], 50);
      if (stat === "intelligence") currentStats[stat] = Math.min(currentStats[stat], 50);
      if (stat === "charisma") currentStats[stat] = Math.min(currentStats[stat], 50);
    }
  });
}

export default router;
