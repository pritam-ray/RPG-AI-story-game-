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
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error("Azure OpenAI Error:", error);
    throw new Error(`Failed to generate story: ${error.message}`);
  }
}

/**
 * Build message array for Azure OpenAI
 */
function buildMessages(gameState, playerAction) {
  const { theme, characterStats, storyHistory } = gameState;

  const systemPrompt = getSystemPrompt(theme);
  const messages = [{ role: "system", content: systemPrompt }];

  // Add story history
  if (storyHistory && storyHistory.length > 0) {
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

  return `You are an expert Dungeon Master running an immersive RPG adventure set in ${themeDesc}.

CRITICAL RULES:
- Write clear, easy-to-visualize narratives (2-3 short paragraphs)
- Use simple, concrete descriptions - avoid overly complex or abstract imagery
- Focus on what the player sees, hears, and feels in the moment
- Show character growth through actions and small victories
- Always provide exactly 3-4 meaningful choices at the end
- Each choice should lead to different story branches and consequences
- Track and reference the player's stats (health, mana, strength, intelligence, charisma) naturally
- Consider character stats when determining outcomes (e.g., high strength allows physical feats, high intelligence solves puzzles)
- Use straightforward language and familiar concepts
- Build tension gradually through clear cause-and-effect
- Remember previous story events and show how the character has grown
- Let the player feel their character becoming stronger, wiser, or more confident
- Include opportunities to find items, gain experience, or improve stats
- Show character development through small moments of courage, wisdom, or compassion

CHARACTER STATS IMPACT:
- Health: Determines survival in combat and dangerous situations
- Mana: Required for magical abilities and spells
- Strength: Physical prowess, combat effectiveness, carrying capacity
- Intelligence: Problem-solving, magic power, understanding ancient texts
- Charisma: Persuasion, negotiation, leadership, making allies

WRITING STYLE:
- Use simple, direct sentences
- Describe one clear scene at a time
- Focus on concrete details: colors, sounds, simple emotions
- Avoid metaphors, symbolism, or abstract concepts
- Make action sequences easy to follow step-by-step
- Show character growth through simple achievements (e.g., "You feel braver than before")
- Use familiar, everyday comparisons when describing new things
- Keep dialogue natural and easy to understand
- Let the character reflect briefly on their journey to show development

CHARACTER DEVELOPMENT FOCUS:
- Show the character learning from mistakes
- Demonstrate growing confidence through actions
- Build relationships with NPCs that feel meaningful
- Reward moral choices with character growth moments
- Reference how the character has changed since the beginning

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
  if (!playerAction) {
    return `Begin the adventure! 

Current Character Stats:
- Health: ${characterStats.health}
- Mana: ${characterStats.mana}
- Strength: ${characterStats.strength}
- Intelligence: ${characterStats.intelligence}
- Charisma: ${characterStats.charisma}

Create a simple, easy-to-visualize opening scene. Use clear descriptions and introduce the character's starting point in a relatable way. Show a small moment that hints at their potential for growth.`;
  }

  return `Player Action: ${playerAction}

Current Character Stats:
- Health: ${characterStats.health}
- Mana: ${characterStats.mana}
- Strength: ${characterStats.strength}
- Intelligence: ${characterStats.intelligence}
- Charisma: ${characterStats.charisma}

Continue the story based on this action. Write in simple, clear language. Show one scene at a time. If the character succeeds, show a small moment of growth or confidence. Keep descriptions concrete and easy to picture.`;
}

export default { generateStory };
