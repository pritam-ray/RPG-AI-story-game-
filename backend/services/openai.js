import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

const client = new OpenAI({
  apiKey: apiKey,
  baseURL: `${endpoint}/openai/deployments/${deploymentName}`,
  defaultQuery: { "api-version": apiVersion },
  defaultHeaders: { "api-key": apiKey },
});

/**
 * Generate story continuation based on game state and player action
 */
export async function generateStory(gameState, playerAction) {
  try {
    const messages = buildMessages(gameState, playerAction);

    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: messages,
      temperature: 0.8,
      max_tokens: 350,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    // Log token usage for monitoring
    if (response.usage) {
      console.log('Token usage:', response.usage);
    }
    
    return parsed;
  } catch (error) {
    console.error("Azure OpenAI Error:", error);
    throw new Error(`Failed to generate story: ${error.message}`);
  }
}

/**
 * Build message array for Azure OpenAI
 * Only keeps last 3 turns + summary to reduce tokens
 */
function buildMessages(gameState, playerAction) {
  const { theme, characterStats, storyHistory } = gameState;

  const systemPrompt = getSystemPrompt(theme);
  const messages = [{ role: "system", content: systemPrompt }];

  // Handle story history with summarization
  if (storyHistory && storyHistory.length > 0) {
    const KEEP_LAST_N_TURNS = 3;
    
    if (storyHistory.length > KEEP_LAST_N_TURNS) {
      // Add summary of older history
      const oldHistory = storyHistory.slice(0, -KEEP_LAST_N_TURNS);
      const summary = summarizeHistory(oldHistory);
      messages.push({
        role: "system",
        content: `Previous story summary: ${summary}`,
      });
      
      // Add only recent turns
      const recentHistory = storyHistory.slice(-KEEP_LAST_N_TURNS);
      recentHistory.forEach((entry) => {
        messages.push({
          role: "assistant",
          content: JSON.stringify({
            narration: entry.narration,
            choices: entry.choices,
          }),
        });
        if (entry.playerAction) {
          messages.push({
            role: "user",
            content: `Player chose: ${entry.playerAction}`,
          });
        }
      });
    } else {
      // Less than threshold, include all history
      storyHistory.forEach((entry) => {
        messages.push({
          role: "assistant",
          content: JSON.stringify({
            narration: entry.narration,
            choices: entry.choices,
          }),
        });
        if (entry.playerAction) {
          messages.push({
            role: "user",
            content: `Player chose: ${entry.playerAction}`,
          });
        }
      });
    }
  }

  // Add current player action
  const userMessage = buildUserMessage(playerAction, characterStats);
  messages.push({ role: "user", content: userMessage });

  return messages;
}

/**
 * Get system prompt based on theme
 */
function getSystemPrompt(theme) {
  const themeDescriptions = {
    "medieval-fantasy": "a classic medieval fantasy world with knights, dragons, magic, and ancient kingdoms",
    "sci-fi-space": "a futuristic sci-fi universe with space travel, alien civilizations, advanced technology, and cosmic mysteries",
    "horror-gothic": "a dark gothic horror setting with supernatural creatures, cursed lands, mysterious fog, and terrifying encounters",
    "cyberpunk": "a cyberpunk dystopia with megacorporations, hackers, cybernetic enhancements, and neon-lit streets",
    "post-apocalyptic": "a post-apocalyptic wasteland with mutants, survivors, scarce resources, and the struggle for survival",
    "steampunk": "a steampunk Victorian era with steam-powered machines, airships, inventors, and industrial revolution aesthetics",
  };

  const themeDesc = themeDescriptions[theme] || themeDescriptions["medieval-fantasy"];

  return `You are a Dungeon Master for an RPG set in ${themeDesc}.

RULES:
- Write 2-3 short, clear paragraphs
- Simple descriptions, concrete details (colors, sounds, emotions)
- Show character growth through actions
- Provide 3-4 meaningful choices
- Consider player stats in outcomes
- Straightforward language, familiar concepts
- Track items found/used accurately

STATS: Health (survival), Mana (magic), Strength (physical), Intelligence (problem-solving), Charisma (persuasion).

STYLE: Direct sentences, one scene at a time, concrete details, step-by-step action, show growth through achievements.

INVENTORY:
- itemsFound: list new items discovered (can be empty)
- itemsUsed: list items consumed/used (exact names, can be empty)

RESPONSE FORMAT - You MUST respond with valid JSON only:
{
  "narration": "The story text here with clear, simple descriptions...",
  "choices": [
    "First choice description",
    "Second choice description",
    "Third choice description",
    "Fourth choice description (optional)"
  ],
  "statChanges": {
    "health": 0,
    "mana": 0,
    "strength": 0,
    "intelligence": 0,
    "charisma": 0
  },
  "itemsFound": [],
  "itemsUsed": []
}

INVENTORY MANAGEMENT:
- The statChanges should reflect consequences of previous actions (damage taken, mana used, stat improvements). Use negative numbers for losses, positive for gains. Leave at 0 if no change.
- The itemsFound array should list any new items the player discovered (can be empty array if none). Be specific with item names.
- The itemsUsed array should list any items the player used or consumed in this action (can be empty array if none). Items listed here will be REMOVED from inventory.
- When a player uses an item (potion, tool, weapon, etc.), always include it in itemsUsed.
- When a player finds, picks up, or receives items, include them in itemsFound.
- Be consistent with item names - if you add "Health Potion", remove "Health Potion" (exact match).`;
}

/**
 * Build user message with player action and stats
 */
function buildUserMessage(playerAction, characterStats) {
  const statsStr = `HP:${characterStats.health} MP:${characterStats.mana} STR:${characterStats.strength} INT:${characterStats.intelligence} CHA:${characterStats.charisma}`;
  
  if (!playerAction) {
    return `Start adventure. Stats: ${statsStr}. Create clear opening scene.`;
  }

  return `Action: ${playerAction}. Stats: ${statsStr}. Continue story.`;
}

/**
 * Summarize older story history to reduce token usage
 */
function summarizeHistory(historyEntries) {
  if (!historyEntries || historyEntries.length === 0) {
    return "The adventure has just begun.";
  }

  // Extract key events from old history
  const keyEvents = historyEntries
    .filter(entry => entry.playerAction)
    .map(entry => entry.playerAction)
    .slice(-5); // Last 5 actions from old history

  if (keyEvents.length === 0) {
    return "The story started with an introduction to the world.";
  }

  return `Earlier in the adventure: ${keyEvents.join('; then ')}.`;
}

export default { generateStory };
