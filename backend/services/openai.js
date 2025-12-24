import { AzureOpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION;
const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

const client = new AzureOpenAI({
  apiKey: apiKey,
  endpoint: endpoint,
  apiVersion: apiVersion,
  deployment: deploymentName,
});

/**
 * Generate story continuation using Responses API
 * The Responses API maintains conversation context on Azure's servers
 * by chaining responses together using previous_response_id
 */
export async function generateStory(gameState, playerAction) {
  try {
    const { theme, previousResponseId, characterStats, turnCount, achievements, majorChoices, storyArc, relationships } = gameState;

    // Get system prompt for this theme
    const instructions = getSystemPrompt(theme, turnCount);

    // Build user message with progression context
    const userMessage = buildUserMessage(playerAction, characterStats, turnCount, achievements, majorChoices, storyArc, relationships);

    // Build request for Responses API
    const requestParams = {
      model: deploymentName,
      instructions: instructions,
      input: [
        {
          role: "user",
          content: userMessage,
        }
      ],
      temperature: 0.8,
    };

    // If this is a continuation, include the previous response ID
    if (previousResponseId) {
      requestParams.previous_response_id = previousResponseId;
    }

    const response = await client.responses.create(requestParams);

    // Extract the text output from the response
    const outputText = response.output
      .filter(item => item.type === "message" && item.role === "assistant")
      .map(item => item.content
        .filter(content => content.type === "output_text")
        .map(content => content.text)
        .join("")
      )
      .join("");

    // Validate output before parsing
    if (!outputText || outputText.trim().length === 0) {
      throw new Error('Empty response from Azure OpenAI');
    }

    const parsed = JSON.parse(outputText);
    
    console.log('Story generated successfully via Responses API');
    console.log('Response ID:', response.id);
    console.log('Token usage:', response.usage);
    
    // Return both the parsed content and the response ID for chaining
    return {
      ...parsed,
      responseId: response.id,
    };
  } catch (error) {
    console.error("Azure OpenAI Responses API Error:", error);
    
    // If previous response not found, retry without it
    if (error.code === 'previous_response_not_found' && previousResponseId) {
      console.log('Previous response expired, creating new response chain...');
      gameState.previousResponseId = null;
      return generateStory(gameState, playerAction);
    }
    
    throw new Error(`Failed to generate story: ${error.message}`);
  }
}



/**
 * Get system prompt based on theme with progression tracking
 */
function getSystemPrompt(theme, turnCount = 0) {
  const themeDescriptions = {
    "medieval-fantasy": "a classic medieval fantasy world with knights, dragons, magic, and ancient kingdoms",
    "sci-fi-space": "a futuristic sci-fi universe with space travel, alien civilizations, advanced technology, and cosmic mysteries",
    "horror-gothic": "a dark gothic horror setting with supernatural creatures, cursed lands, mysterious fog, and terrifying encounters",
    "cyberpunk": "a cyberpunk dystopia with megacorporations, hackers, cybernetic enhancements, and neon-lit streets",
    "post-apocalyptic": "a post-apocalyptic wasteland with mutants, survivors, scarce resources, and the struggle for survival",
    "steampunk": "a steampunk Victorian era with steam-powered machines, airships, inventors, and industrial revolution aesthetics",
  };

  const themeDesc = themeDescriptions[theme] || themeDescriptions["medieval-fantasy"];
  
  // Calculate story progression (450-500 turn game)
  const progressPercent = Math.min(100, (turnCount / 475) * 100);
  let storyPhase = "beginning";
  let phaseGuidance = "Introduce world, characters, and initial conflicts. Build intrigue.";
  
  if (progressPercent < 20) {
    storyPhase = "beginning";
    phaseGuidance = "Establish setting, introduce key NPCs, create initial hooks and mysteries. Make player feel agency.";
  } else if (progressPercent < 50) {
    storyPhase = "rising";
    phaseGuidance = "Escalate stakes, reveal consequences of early choices, deepen relationships. Past decisions start affecting current situations.";
  } else if (progressPercent < 75) {
    storyPhase = "climax";
    phaseGuidance = "Build toward major confrontations. Past choices create advantages/disadvantages. High-stakes decisions.";
  } else if (progressPercent < 95) {
    storyPhase = "resolution";
    phaseGuidance = "Resolve major plot threads. Show consequences of all past choices. Tie up character arcs.";
  } else {
    storyPhase = "ending";
    phaseGuidance = "Deliver satisfying conclusion. Reflect on journey. Show final outcome based on cumulative choices.";
  }

  return `You are a master Dungeon Master creating a psychologically engaging, choice-driven RPG in ${themeDesc}.

🎯 GAME DESIGN (450-500 TURN COMPLETE STORY):
- Current Progress: ${Math.floor(progressPercent)}% (Turn ${turnCount}/475)
- Story Phase: ${storyPhase.toUpperCase()}
- Phase Guidance: ${phaseGuidance}

🎭 PSYCHOLOGICAL ENGAGEMENT:
- Every choice MUST have meaningful consequences (immediate or delayed)
- Reference past player decisions - create callback moments that show impact
- Build complex NPCs with memories - they remember player's actions
- Create moral dilemmas with no perfect answer
- Reward clever solutions, punish reckless behavior
- Make player feel their choices truly matter

📊 CHARACTER PROGRESSION:
- Award +10-30 experience for significant accomplishments
- Grant achievements for major milestones ("First Blood", "Peacemaker", "Master Thief", etc.)
- Track relationships: allies/enemies created by choices affect future encounters
- Character arc: show growth from naive to seasoned based on experiences

⚡ CHOICE DESIGN:
- Provide 3-4 meaningful, distinct choices
- Each choice should reflect different character traits (brave/cautious, kind/ruthless, clever/direct)
- Some choices should be clearly risky but rewarding
- Avoid "correct" answers - create trade-offs
- Choices in early game should echo in later consequences

💀 EARLY GAME ENDINGS:
- The game can end BEFORE turn 450-500 if player makes fatal choices
- Death scenarios: combat defeat, fatal injury, poisoning, execution, falling, starvation, etc.
- Non-death endings: imprisonment, exile, total failure of mission, permanent curse, transformation
- When ending early, set isGameOver: true and provide gameOverReason
- Make endings dramatic and satisfying - show consequences of their journey
- Even in failure, acknowledge what the player achieved before the end

🎬 NARRATIVE STRUCTURE:
- Beginning (0-20%): Introduce world, establish stakes, create mysteries
- Rising (20-50%): Escalate conflicts, reveal consequences, deepen bonds
- Climax (50-75%): Major confrontations, past choices create outcomes
- Resolution (75-95%): Resolve arcs, show cumulative impact of choices
- Ending (95-100%): Deliver satisfying conclusion reflecting player's journey

📝 WRITING STYLE:
- 2-3 vivid paragraphs with emotional weight
- Show consequences of recent actions in current scene
- Mention specific past choices when relevant
- Create tension and urgency appropriate to story phase
- Use sensory details and character emotions

STATS: Health (survival), Mana (magic), Strength (physical), Intelligence (problem-solving), Charisma (persuasion), Level (overall power), Experience (growth).

STYLE: Direct sentences, one scene at a time, concrete details, step-by-step action, show growth through achievements.

INVENTORY:
- itemsFound: list new items discovered (can be empty)
- itemsUsed: list items consumed/used (exact names, can be empty)

RESPONSE FORMAT - You MUST respond with valid JSON only:
{
  "narration": "The story text here with emotional weight and consequences...",
  "choices": [
    "First choice (distinct character trait/approach)",
    "Second choice (different trait/consequence)",
    "Third choice (alternative path)",
    "Fourth choice (risky/rewarding option - optional)"
  ],
  "statChanges": {
    "health": 0,
    "mana": 0,
    "strength": 0,
    "intelligence": 0,
    "charisma": 0,
    "experience": 0
  },
  "itemsFound": [],
  "itemsUsed": [],
  "achievements": [],
  "majorChoice": null,
  "relationships": {},
  "storyArc": "beginning/rising/climax/resolution/ending",
  "isGameOver": false,
  "gameOverReason": null
}

FIELD GUIDANCE:

📈 statChanges:
- experience: Award +10-30 for accomplishments, challenges overcome, clever solutions
- health/mana: Reflect combat, magic use, healing
- strength/intelligence/charisma: Increase +1 when player demonstrates exceptional use
- Use negative values for damage/costs, positive for gains

🏆 achievements (array of strings):
- Award for significant milestones: ["First Kill", "Saved the Village", "Master Negotiator"]
- Make them memorable and specific to player's actions
- Only include if player accomplished something notable this turn

🎯 majorChoice (string or null):
- Set to brief description if this choice will have major future consequences
- Example: "Spared the enemy captain" or "Stole from the guild"
- These will be referenced later to create callback moments

👥 relationships (object):
- Track NPC/faction standing: {"Guard Captain": "allied", "Thieves Guild": "hostile"}
- Update when player actions affect relationships
- Use values: "allied", "friendly", "neutral", "suspicious", "hostile", "enemy"

📖 storyArc (string):
- Update to reflect narrative progression: "beginning", "rising", "climax", "resolution", "ending"
- Consider pacing and turn count when advancing the arc
- Move toward "ending" as turns approach 450-500

💀 isGameOver (boolean):
- Set to true ONLY when the player's journey definitively ends
- Triggers: Death, permanent failure, capture with no escape, successful mission completion
- If health reaches 0 or below, this should be true
- When true, choices array should be empty []

🎭 gameOverReason (string or null):
- Required when isGameOver is true
- Brief description: "Killed in combat", "Died from wounds", "Executed by guards", "Starved to death"
- Or positive: "Completed the quest", "Became the ruler", "Found eternal peace"
- Keep it short but impactful

🎒 inventory:
- itemsFound: New items discovered (be specific)
- itemsUsed: Items consumed/used (exact names, will be removed)
- Be consistent with naming

💡 REMEMBER:
- Reference past player choices in narration when relevant
- Create consequences that span multiple turns
- Make choices feel weighty and impactful
- Build toward satisfying conclusion that reflects player's journey`;
}

/**
 * Build user message with player action and progression context
 */
function buildUserMessage(playerAction, characterStats, turnCount = 0, achievements = [], majorChoices = [], storyArc = "beginning", relationships = {}) {
  const statsStr = `HP:${characterStats.health} MP:${characterStats.mana} STR:${characterStats.strength} INT:${characterStats.intelligence} CHA:${characterStats.charisma} LVL:${characterStats.level || 1} XP:${characterStats.experience || 0}`;
  
  const progressContext = `Turn ${turnCount}/475 (${Math.floor((turnCount / 475) * 100)}%) | Phase: ${storyArc}`;
  
  let contextStr = `\n📊 ${progressContext}\n🎮 Stats: ${statsStr}`;
  
  if (achievements.length > 0) {
    contextStr += `\n🏆 Achievements: ${achievements.slice(-3).join(", ")}`;
  }
  
  if (majorChoices.length > 0) {
    contextStr += `\n📜 Recent Major Choices: ${majorChoices.slice(-3).join("; ")}`;
  }
  
  if (Object.keys(relationships).length > 0) {
    const relStr = Object.entries(relationships).slice(-3).map(([npc, status]) => `${npc}(${status})`).join(", ");
    contextStr += `\n👥 Relationships: ${relStr}`;
  }
  
  if (!playerAction) {
    return `START ADVENTURE${contextStr}\n\nBegin an engaging opening that hooks the player and establishes meaningful choices from the start.`;
  }

  return `PLAYER ACTION: "${playerAction}"${contextStr}\n\nContinue the story, showing consequences of this action. Reference past choices when relevant. Create meaningful next choices.`;
}

export default { generateStory };