import { Hono } from 'hono';

type Env = {
  GOOGLE_API_KEY: string;
};

// type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST' | 'UP' | 'DOWN';

function getOppositeDirection(direction: string): string {
  const opposites: Record<string, string> = {
    'NORTH': 'SOUTH',
    'SOUTH': 'NORTH',
    'EAST': 'WEST',
    'WEST': 'EAST',
    'UP': 'DOWN',
    'DOWN': 'UP',
    'north': 'south',
    'south': 'north',
    'east': 'west',
    'west': 'east',
    'up': 'down',
    'down': 'up'
  };
  return opposites[direction] || direction;
}

export const gameRouter = new Hono<{ Bindings: Env }>();

// For now, we'll make direct API calls to Gemini
// Full BAML client migration requires updating schemas and game engine
// TODO: Migrate to BAML client for better type safety and maintainability

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function callGemini(apiKey: string, prompt: string, schema: any) {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
  }

  const data: any = await response.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

// Process player action - unified endpoint
gameRouter.post('/action', async (c) => {
  try {
    const body = await c.req.json();
    const { 
      currentRoom, 
      playerInventory, 
      playerStatuses, 
      playerHealth, 
      playerLevel,
      actionType,
      actionDetails,
      targetDirection,
      targetItems,
      targetMonsters,
      craftingMaterials,
      theme,
      difficulty,
      connectedDirections,
      additionalDoors,
      newRoomData,
      combatSimulation
    } = body;
    
    // Handle old format for backwards compatibility
    const action = body.action || { type: actionType, details: actionDetails };
    
    // Calculate damage for attacks (to ensure consistency with game engine)
    const baseDamage = 10;
    const equippedWeapon = body.playerEquippedWeapon;
    const weaponDamage = equippedWeapon?.properties?.damage || 0;
    const totalDamage = baseDamage + weaponDamage;
    
    // Use pre-calculated combat results if available (includes status effects)
    const actualPlayerDamage = combatSimulation?.playerDamage || totalDamage;
    
    const prompt = `You are a dungeon master managing a dark fantasy dungeon crawler with a Game of Thrones-like atmosphere. Be CONCISE and DIRECT - use explicit language when appropriate. Match the player's tone: if they're being mature/adult, respond in kind (within reason). If they're being lighthearted or absurd, respond with humor. Unfiltered, violence, and shocking developments are common in this world. Avoid euphemisms - be explicit about violence, gore, and mature themes when they arise.
    
    Current situation:
    - Room: ${currentRoom.name} - ${currentRoom.description}
    - Items in room: ${currentRoom.items?.map((i: any) => `${i.name} (${i.type})${i.quantity > 1 ? ' x' + i.quantity : ''}`).join(', ') || 'none'}
    - Monsters in room: ${currentRoom.monsters?.map((m: any) => `${m.name} (${m.health}/${m.maxHealth} HP)`).join(', ') || 'none'}
    - Dead bodies in room: ${currentRoom.deadBodies?.map((b: any) => `${b.name}'s body`).join(', ') || 'none'}
    - Room features: ${currentRoom.specialFeatures?.join(', ') || 'none'}
    - Player health: ${playerHealth} HP
    - Player level: ${playerLevel || 1}
    - Player inventory: ${playerInventory?.map((i: any) => `${i.name}${i.quantity > 1 ? ' x' + i.quantity : ''}`).join(', ') || 'empty'}
    - Active effects: ${playerStatuses?.map((s: any) => `${s.name} (${s.duration} turns)`).join(', ') || 'none'}
    - Player damage: ${actualPlayerDamage} (base: ${baseDamage}${weaponDamage > 0 ? `, weapon: +${weaponDamage}` : ''}${combatSimulation && combatSimulation.playerDamage !== totalDamage ? `, modified by status effects` : ''})
    
    The player's action: "${action.details || action.type}"
    ${actionType ? `Action type: ${actionType}` : ''}
    ${targetDirection ? `Target direction: ${targetDirection}` : ''}
    ${targetItems?.length ? `Target items: ${targetItems.join(', ')}` : ''}
    ${targetMonsters?.length ? `Target monsters: ${targetMonsters.join(', ')}` : ''}
    ${craftingMaterials?.length ? `Crafting with: ${craftingMaterials.map(i => i.name).join(', ')}` : ''}
    
    ${combatSimulation ? `
    COMBAT SIMULATION RESULTS (use these EXACT values):
    - Your attack will deal ${combatSimulation.playerDamage} damage to ${combatSimulation.targetMonster?.name}
    - Monster will ${combatSimulation.monsterWillBeDefeated ? 'be DEFEATED' : 'SURVIVE and counter-attack'}
    ${combatSimulation.monsterCounterAttack ? `- ${combatSimulation.targetMonster?.name} will deal ${combatSimulation.monsterCounterAttack.actualDamageTaken} damage to you in response` : ''}
    IMPORTANT: Describe the COMPLETE combat sequence - your attack AND the monster's response (if any).
    ` : ''}
    
    ${newRoomData ? `
    MOVEMENT NOTE: The player is moving to a new room. Just describe the act of moving/transitioning. Do NOT describe the new room's contents.
    ` : ''}
    
    APPLY STATUS EFFECTS FREQUENTLY - they make the game more engaging!
    
    ENVIRONMENTAL STATUS EFFECTS:
    - Walking through water → "Wet" (vulnerable to electricity, slower movement)
    - Fighting monsters → "Tired" (reduced damage after many actions)
    - Not drinking for many turns → "Thirsty" (reduced max health)
    - Poisonous attacks/items → "Poisoned" (damage over time)
    - Dark rooms → "Blinded" (miss attacks more often)
    - Cold environments → "Frozen" (slower actions)
    - Hot environments → "Burning" (damage over time)
    - Cramped spaces → "Claustrophobic" (reduced accuracy)
    - High places → "Dizzy" (movement penalties)
    - Fungal areas → "Spore Infection" (hallucinations, damage over time)
    
    PSYCHOLOGICAL STATUS EFFECTS (apply these often for narrative depth!):
    - Facing powerful enemies → "Intimidated" (damageModifier: -0.2 for -20% damage)
    - Successful combat → "Confident" (damageModifier: 0.2 for +20% damage)
    - Witnessing death/horror → "Traumatized" (reduced accuracy)
    - Finding treasure → "Elated" (faster movement)
    - Being alone too long → "Paranoid" (see threats that aren't there)
    - Eating bad food → "Nauseous" (reduced health regen)
    - Discovering secrets → "Curious" (bonus to finding hidden items)
    - Taking risky actions → "Reckless" (damageModifier: 0.2, damageTakenModifier: 0.2 for +20% damage dealt and taken)
    - Failing repeatedly → "Demoralized" (all actions less effective)
    - Using magic items → "Mystified" (unpredictable effects)
    
    STATUS EFFECT GUIDELINES:
    - Apply 1-2 status effects per action when appropriate
    - Stack similar effects (Tired → Exhausted → Collapsed)
    - Use 2-5 turn durations for most effects
    - Environmental effects trigger automatically
    - Psychological effects based on player actions/situations
    
    IMPORTANT RULES:
    1. BE BRIEF! Players want action, not essays
    2. For compound actions like "take all and go west", describe all actions.
    3. Occasionally be HUMOROUS, but keep it SHORT - a quick quip, not a paragraph
    4. For item transformations (like breaking something), create new items in the response
    5. Set success=true for most actions unless they're impossible (like walking through walls)
    6. Even silly actions like "eat torch" should be success=true (player successfully attempts it, even if consequences are bad)
    7. Handle ALL action types intelligently:
       - MOVEMENT: Set the moveDirection field for movement actions
         * Some movement actions into new rooms might be indirect, like "enter the door" or "run through the tunnel"
         * If no direction specified, choose the most logical door based on context, or ask the player for clarification.
         * Available doors: ${currentRoom.doors?.map((d: any) => `${d.direction} (${d.description})`).join(', ') || 'none'}
         * DO NOT generate room details in the narrative - just describe the movement action
         * The room will be generated separately to ensure consistency
       - CRAFTING: Combine items creatively to make new items
       - SEARCHING BODIES: When player searches a body, use bodiesToSearch field
         * "search body", "loot corpse", "check griznak's body" → bodiesToSearch: ["griznak"]
         * Bodies contain items appropriate to who they were in life
         * The game will generate realistic loot based on NPC occupation and status
       - COMBAT: ${combatSimulation ? `Use the EXACT combat simulation values provided above` : `Player attacks ALWAYS deal ${actualPlayerDamage} damage`}. Use targetsToAttack field only!
         * Do NOT set stateChanges.health for combat - the game handles damage automatically
         * Do NOT use stateChanges.health for healing items - the game handles consumables automatically
         * Only use stateChanges.health for environmental damage or poison/disease effects
         ${combatSimulation ? `* DESCRIBE THE COMPLETE SEQUENCE: Your attack dealing ${combatSimulation.playerDamage} damage, then ${combatSimulation.monsterCounterAttack ? `the monster's counter-attack dealing ${combatSimulation.monsterCounterAttack.actualDamageTaken} damage` : 'the monster being defeated'}` : `* If damage >= monster's health: Monster is defeated/killed
         * If damage < monster's health: Monster takes damage but survives`}
         * Improvised weapons (items used as weapons) still deal damage but may break
       - INTERACTION: Allow creative interactions with items/environment
    8. IMPORTANT: For movement to new rooms:
       - ONLY describe the act of moving (opening door, stepping through, etc.)
       - Do NOT describe what's in the new room - the game will show that separately
       - Keep movement narration brief (1-2 sentences max)
       - Focus on the transition, not the destination
       - Example: "You push open the heavy wooden door and step through." (STOP THERE)
    
    CRITICAL: MULTIPLE ACTIONS AND CONVERSATION RULES:
    - If the player says things like "take all and then go east" or "grab torch then attack goblin", parse this into MULTIPLE separate actions in the intendedActions array
    - Each action should be processed in sequence
    - "take all", "grab all", "pick up everything" should ONLY take items, NEVER attack monsters
    - Monsters might notice you taking items, but taking items alone does NOT deal damage to them
    - Only explicit combat actions like "attack", "hit", "strike" should cause damage
    - Item collection is NOT hostile unless explicitly combined with combat
    
    CONVERSATION ACTIONS:
    - When player uses words like "talk", "speak", "say", "greet", "hello", detect this as conversation
    - For conversation actions, respond with narrative but DO NOT process the conversation mechanics here
    - The game engine will handle conversation through the /conversation endpoint
    - Example: "talk to merchant" = narrative: "You approach the merchant to start a conversation." (conversation handled separately)
    - Example: "say hello to guard" = narrative: "You greet the guard politely." (conversation handled separately)
    
    CRITICAL FOR itemsToTake:
    - For "take all", "grab all", "pick up everything", etc. -> itemsToTake: ["all"]
    - For specific items -> itemsToTake: ["torch"], ["sword"], etc. (use exact item names from the room)
    - NEVER list out all items when player says "take all" - just return ["all"]
    
    Examples:
    - "eat torch" = Single action: eating the torch
    - "take all and go north" = Two actions: 1) take all items (itemsToTake: ["all"]), 2) move north
      * Narrative: "You quickly gather everything. You head north." (BRIEF!)
    - "grab sword then attack goblin" = Two actions: 1) take sword (itemsToTake: ["sword"]), 2) attack goblin
    - "take all" = itemsToTake: ["all"] (NOT ["Rusty Torch", "Stale Bread"])
    - "grab everything" = itemsToTake: ["all"] (NOT a list of items)
    - "i guess i'll take one bread" = itemsToTake: ["bread"] (ignore quantity modifiers like "one", just take the item)
    - "maybe grab the torch" = itemsToTake: ["torch"] (casual phrasing still means take action)
    - "go through the door" = moveDirection: choose most logical door direction
    - "enter the north door" = moveDirection: "north", narrative: "You step through the north door."
    - "run west" = moveDirection: "west", narrative: "You dash westward."
    - "use the torch on the wall" = itemsToUse: ["torch"], narrative describes moving to torch, monsters react
    - "throw the bone at goblin" = itemsToUse: ["bone"], itemsToRemove: ["bone"], goblin becomes alert/aggressive
    
    IMPROVISED WEAPON COMBAT:
    - When player uses an item as an improvised weapon (e.g., "smash gnawer with rib bone"):
      * The attack still deals ${totalDamage} damage
      * Describe the impact based on damage vs monster health
      * Fragile items (bones, sticks, etc.) might break: add itemsToRemove and describe destruction
    
    USING ITEMS FROM THE ROOM:
    - When the player uses an item that's in the room (not in inventory):
      * They must move to get it - this might alert monsters!
      * Consider distance: is the item near monsters? Behind them? In plain sight?
      * Monsters should react based on their current state and behavior:
        - Alert monsters will notice movement
        - Distracted/sleeping monsters might not notice careful movement
        - Aggressive monsters may attack during the attempt
      * Add the item to itemsToUse array
      * If item is destroyed/consumed/taken, add to itemsToRemove (works for both room and inventory items)
      * Examples:
        - "grab torch from wall" = Player moves across room, monsters notice
        - "use the lever" = Player must reach it, might trigger reactions
        - "throw the rock at goblin" = Must get rock first, goblin sees you coming
    
    MONSTER AWARENESS AND REACTIONS:
    - Monsters have states: calm, alert, aggressive, distracted, sleeping, etc.
    - Movement across the room changes monster states:
      * Calm → Alert (they notice you)
      * Alert → Aggressive (they prepare to attack)
      * Sleeping → Alert (if you're noisy) or stays Sleeping (if careful)
    - Consider line of sight and positioning
    - Multiple monsters might react differently based on their positions
    
    CHAIN OF THOUGHT REASONING:
    First, in the 'reasoning' field, think through:
    1. What exactly is the player trying to do?
    2. Is the item in their inventory or in the room? Do they need to move to get it?
    3. What environmental factors might affect this action?
    4. How would monsters react to the player's movement/actions?
    5. What unexpected consequences might occur?
    6. Should the item be removed from the room after use? (add to itemsToRemove)
    7. How can this create an emergent, memorable moment?
    
    Then use your reasoning to craft the narrative and determine outcomes.
    This ensures consistency and reduces the need for multiple clarifications.

    Keep narratives SHORT:
    - Simple actions (take, move): 2-3 sentences
    - Unusual or absurd actions: 3-5 sentences max
    - Complex actions (combat, crafting): 3-4 sentences max
    - Remember: The game UI shows room details, items, and monsters - focus on describing state changes and reactions and consequences.
    
    `;

    const schema = {
      type: "object",
      properties: {
        reasoning: { 
          type: "string",
          description: "Step-by-step reasoning about the action, environment, and consequences"
        },
        narrative: { type: "string" },
        success: { type: "boolean" },
        intendedActions: {
          type: "array",
          description: "Array of actions to perform in sequence. Parse compound commands into multiple actions.",
          items: {
            type: "object",
            properties: {
              itemsToTake: { 
                type: "array",
                items: { type: "string" }
              },
              itemsToUse: {
                type: "array", 
                items: { type: "string" }
              },
              moveDirection: { type: "string" },
              targetsToAttack: {
                type: "array",
                items: { type: "string" }
              },
              targetsToTalkTo: {
                type: "array",
                items: { type: "string" },
                description: "NPCs to initiate conversation with"
              },
              itemsToCraft: {
                type: "array",
                items: { type: "string" }
              },
              bodiesToSearch: {
                type: "array",
                items: { type: "string" },
                description: "Bodies to search for loot"
              },
              stateChanges: {
                type: "object",
                properties: {
                  health: { 
                    type: "integer",
                    description: "ONLY for environmental damage or status effects. Do NOT use for healing items or combat - the game handles those automatically!"
                  },
                  addStatuses: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string" },
                        duration: { type: "integer" },
                        type: { type: "string" },
                        effects: {
                          type: "object",
                          properties: {
                            damagePerTurn: { type: "integer" },
                            healingPerTurn: { type: "integer" },
                            speedModifier: { type: "number" },
                            damageModifier: { type: "number", description: "Multiplier for outgoing damage (e.g., 0.2 = +20% damage)" },
                            damageTakenModifier: { type: "number", description: "Multiplier for incoming damage (e.g., 0.2 = +20% damage taken)" },
                            visionReduction: { type: "boolean" }
                          }
                        }
                      }
                    }
                  },
                  removeStatuses: {
                    type: "array",
                    items: { type: "string" }
                  },
                  roomChanges: {
                    type: "object",
                    properties: {
                      addFeatures: {
                        type: "array",
                        items: { type: "string" }
                      }
                    }
                  },
                  // Room generation removed - rooms are now pre-generated
                }
              },
              itemsToRemove: {
                type: "array",
                items: { type: "string" },
                description: "Items to remove from either room or inventory (e.g., consumed, destroyed, or taken)"
              },
              itemsToAdd: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string" },
                    stackable: { type: "boolean" },
                    quantity: { type: "integer" },
                    // properties is a flexible object, no schema validation
                  }
                }
              },
              customEffects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    message: { type: "string" }
                  }
                }
              }
            }
          }
        },
        consequences: { 
          type: "array",
          items: { type: "string" }
        },
      },
      required: ["reasoning", "narrative", "success", "intendedActions", "consequences"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    
    // Log the LLM response for debugging
    console.log('LLM Action Response:', JSON.stringify(response, null, 2));
    
    // Room data is now handled directly in the game engine
    
    return c.json(response);
  } catch (error) {
    console.error('Error processing action:', error);
    return c.json({ 
      error: 'Failed to process action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Generate room
gameRouter.post('/generate/room', async (c) => {
  try {
    const body = await c.req.json();
    const { theme, difficulty, connectedDirections, additionalDoors = [] } = body;
    
    // Combine required doors (entry) with additional exits
    const allRequiredDoors = [...connectedDirections, ...additionalDoors];
    
    const prompt = `You are a professional game master for a text-based dungeon crawler RPG. Generate a detailed dungeon room.
    
    Theme: ${theme}
    Difficulty: ${difficulty}/10
    REQUIRED exits (MUST have ALL of these): ${allRequiredDoors.join(', ')}
    
    The room should feel like a natural dungeon progression while being unique and MEMORABLE.
    
    Focus on emergent, unpredictable experiences. Events may already be happening - the player might be interrupting something.
    Entities may be interacting with each other or the environment, not just waiting for the player.
    The player often sneaks in unnoticed initially.
    
    Include:
    1. A unique initial impression (sights/smells/sounds/sensations when entering)
    2. Detailed atmospheric description of the room and contents
    3. 0-4 items (PRIORITIZE potions, food, consumables! Also weapons, tools, containers)
    4. 0-4 creatures (mix of hostile monsters AND friendly NPCs like shopkeepers, merchants, witches, travelers, guards, hermits)
    5. Special features, puzzles, mysterious signs, or interactive elements
    6. EXACTLY ${allRequiredDoors.length} exits in the directions: ${allRequiredDoors.join(', ')}
    
    IMPORTANT: Focus on what distinguishes this room from similar rooms:
    - Small environmental effects (dripping water, echoes, temperature, drafts)
    - Unique features (furniture, decorations, architectural oddities)
    - Interactive elements that make the room memorable
    - Specific details on walls, floors, ceilings (carvings, stains, damage)
    - Ongoing events (rituals, arguments, experiments, meals)
    
    Creatures (Monsters AND NPCs) should have:
    - Current emotional state (calm, agitated, fearful, etc)
    - What they're doing right now (not just standing around)
    - Physical condition (healthy, injured, tired, etc)
    - Whether they've noticed the player (usually NO on first encounter)
    
    NPCs can be:
    - Shopkeepers with wares to sell
    - Traveling merchants with exotic goods
    - Witches brewing potions
    - Lost travelers needing rescue
    - Hermits with wisdom/information
    - Guards protecting areas
    - Use "friendly" or "neutral" behavior for NPCs instead of "aggressive"
    
    Make it atmospheric, engaging, and full of potential for emergent gameplay!`;

    const schema = {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              type: { type: "string" },
              stackable: { type: "boolean" },
              quantity: { type: "integer" },
              // properties is a flexible object, no schema validation
            }
          }
        },
        monsters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              health: { type: "integer" },
              maxHealth: { type: "integer" },
              damage: { type: "integer" },
              behavior: { type: "string" },
              occupation: { type: "string" },
              goals: { 
                type: "array",
                items: { type: "string" }
              },
              secrets: {
                type: "array", 
                items: { type: "string" }
              },
              possessions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    description: { type: "string" },
                    type: { type: "string" }
                  }
                }
              }
            }
          }
        },
        doors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              direction: { type: "string" },
              description: { type: "string" },
              locked: { type: "boolean" }
            }
          }
        },
        specialFeatures: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["id", "name", "description", "items", "monsters", "doors"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    
    // Generate unique IDs
    response.id = crypto.randomUUID();
    response.items.forEach((item: any) => { item.id = crypto.randomUUID(); });
    response.monsters.forEach((monster: any) => { monster.id = crypto.randomUUID(); });
    response.doors.forEach((door: any) => { door.id = crypto.randomUUID(); });
    
    // Verify we have all required doors
    const generatedDirections = response.doors.map((d: any) => d.direction.toLowerCase());
    const missingDoors = allRequiredDoors.filter(dir => 
      !generatedDirections.includes(dir.toLowerCase())
    );
    
    // Add any missing doors
    if (missingDoors.length > 0) {
      console.warn(`Adding missing doors for directions: ${missingDoors.join(', ')}`);
      missingDoors.forEach(dir => {
        response.doors.push({
          id: crypto.randomUUID(),
          direction: dir,
          description: 'A dark passage leading deeper into the dungeon',
          locked: false
        });
      });
    }
    
    return c.json(response);
  } catch (error) {
    console.error('Error generating room:', error);
    return c.json({ 
      error: 'Failed to generate room',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Generate item
gameRouter.post('/generate/item', async (c) => {
  try {
    const body = await c.req.json();
    const { context, rarity } = body;
    
    const prompt = `Generate a unique item for a dungeon crawler themed around: ${context}
    Rarity: ${rarity}
    
    Create items that are:
    - Interesting or useful on their own
    - Potentially useful when combined with other items
    - Thematically consistent with the dungeon setting
    - Memorable and distinctive
    
    PRIORITIZE CONSUMABLES AND POTIONS - they're rare in this dungeon!
    Include: healing potions, antidotes, buff potions, food items, magical consumables
    
    Tips for balanced items:
    - Align power with rarity level
    - Rarer items should have more unique effects or properties
    - Include strategic use cases or surprising interactions
    - Connect to game narrative through lore or descriptions
    - Balance benefits against drawbacks (cursed items, weight, requirements)
    - Ensure clear, evocative descriptions
    
    IMPORTANT: Focus on what makes THIS item unique:
    - Small bonuses or drawbacks that affect gameplay
    - Unique effects or properties (glowing, humming, temperature)
    - Special requirements or conditions for use
    - Lore or mysterious attributes (especially for rare items)
    - For common items: visual differences, wear patterns, inscriptions
    - Consider multi-use potential (weapon that's also a tool, armor with pockets)
    
    Examples by rarity:
    CONSUMABLES:
    - Common: "Healing Potion" (restores 25 health), "Stale Bread" (restores 5 health)
    - Uncommon: "Antidote Vial" (cures poison), "Strength Elixir" (+3 damage for 5 turns)
    - Rare: "Potion of Regeneration" (heals 5 HP per turn for 10 turns), "Courage Draught" (immunity to fear effects)
    - Epic: "Elixir of Life" (full heal + temporary max health boost), "Philosopher's Stone" (transmutes materials)
    
    WEAPONS & TOOLS:
    - Common: "Rusty Dagger", "Torch" (provides light, can be weapon)
    - Uncommon: "Ever-burning Torch" (never goes out, different colored flame)
    - Rare: "Torch of Revealing" (shows hidden doors, dispels illusions)
    
    Make the item memorable through specific details, not just stats!`;

    const schema = {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        type: { type: "string" },
        stackable: { type: "boolean" },
        quantity: { type: "integer" },
        // properties is a flexible object, no schema validation
      },
      required: ["name", "description", "type", "stackable", "quantity"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    response.id = crypto.randomUUID();
    
    return c.json(response);
  } catch (error) {
    console.error('Error generating item:', error);
    return c.json({ 
      error: 'Failed to generate item',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Generate monster
gameRouter.post('/generate/monster', async (c) => {
  try {
    const body = await c.req.json();
    const { theme, challengeRating } = body;
    
    const prompt = `Generate a monster for a dungeon crawler themed around: ${theme}
    Challenge rating: ${challengeRating}/10
    
    Create interesting, challenging enemies that feel alive and integrated with their environment.
    
    Tips for balanced enemies:
    - Scale power with challenge rating (1-3: weak, 4-6: moderate, 7-9: strong, 10: boss-level)
    - Vary threat levels and abilities to encourage different tactics
    - Design for emergent combat scenarios
    - Connect to dungeon narrative and theme
    - Include weaknesses and resistances that make sense
    - Clear, evocative ability descriptions
    
    IMPORTANT: The monster's current state when first encountered:
    1. Emotional state (calm, agitated, territorial, curious, hungry, playful)
    2. Current behavior (pacing, sleeping, eating, grooming, practicing combat, reading)
    3. Physical condition (healthy, scarred, wounded, exhausted, well-fed)
    4. Mental state (alert, distracted, focused, daydreaming, paranoid)
    5. Has NOT noticed the player yet (they're busy with their own activities)
    
    Focus on what makes THIS monster instance unique:
    - Behavioral quirks or patterns (collects shiny things, afraid of fire, talks to itself)
    - Physical distinguishing marks (scars, missing parts, unusual coloration)
    - Unique abilities or weaknesses tied to their personality
    - Environmental adaptations (uses room features, has a lair/nest)
    - Personal history or motivations (seeking revenge, protecting young, following orders)
    
    Examples of memorable monsters:
    - A goblin chef tasting his poisonous stew (low CR)
    - Twin gargoyles that argue with each other mid-combat (medium CR)
    - An ancient lich practicing pickup lines in a mirror (high CR)
    
    Make monsters that players will remember, not just fight!`;

    const schema = {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        health: { type: "integer" },
        maxHealth: { type: "integer" },
        damage: { type: "integer" },
        behavior: { type: "string" },
        loot: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              type: { type: "string" },
              stackable: { type: "boolean" },
              quantity: { type: "integer" }
            }
          }
        }
      },
      required: ["name", "description", "health", "maxHealth", "damage", "behavior"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    response.id = crypto.randomUUID();
    if (response.loot) {
      response.loot.forEach((item: any) => { item.id = crypto.randomUUID(); });
    }
    
    return c.json(response);
  } catch (error) {
    console.error('Error generating monster:', error);
    return c.json({ 
      error: 'Failed to generate monster',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Process conversation with NPC
gameRouter.post('/conversation', async (c) => {
  try {
    const body = await c.req.json();
    const { npc, playerAction, playerRapport, roomContext, interactionHistory } = body;
    
    const prompt = `You are managing an emotionally intelligent NPC in a text-based RPG with deep conversation capabilities.
    
    NPC: ${npc.name}
    Description: ${npc.description}
    Current emotion: ${npc.currentEmotion?.primary?.emotion || 'curious'} (intensity: ${npc.currentEmotion?.intensity || 5})
    Emotional cause: ${npc.currentEmotion?.primary?.cause || 'Meeting the player'}
    Player rapport: ${playerRapport}/100
    
    Room context: ${roomContext}
    Player says/does: "${playerAction}"
    Previous interactions: ${interactionHistory.join(', ') || 'None'}
    
    NPC Personality traits: ${npc.personality_traits?.map((t: any) => `${t.trait} (${t.intensity}/10)`).join(', ') || 'Adaptable and curious'}
    Communication style: Formality ${npc.communicationStyle?.formality || 5}/10, Verbosity ${npc.communicationStyle?.verbosity || 5}/10, Emotional ${npc.communicationStyle?.emotiveness || 5}/10
    Occupation: ${npc.occupation || 'Wanderer'}
    Goals: ${npc.goals?.join(', ') || 'Survive in the dungeon'}
    
    The NPC should respond in character, considering:
    1. Their current emotional state and what caused it
    2. Their personality traits and communication style
    3. Their relationship with the player (rapport level)
    4. The context of the room and situation
    5. Their goals, fears, and motivations
    6. Their memories of past interactions
    
    IMPORTANT CONVERSATION RULES:
    - NPCs should ACTUALLY SPEAK with dialogue, not just have actions described
    - Use quotation marks for actual speech: "Hello there, traveler!"
    - Include emotional reactions, body language, and mannerisms
    - Make conversations feel natural and character-driven
    - NPCs can offer information, quests, trade, or just chat
    - Consider their occupation and role in the world
    - React appropriately to player's rapport level
    
    Examples of good NPC responses:
    - Friendly merchant: "Ah, a customer! Welcome to my humble stall. I've got the finest wares this side of the mountains!"
    - Suspicious guard: "State your business here, stranger. These are dangerous times."
    - Wise hermit: "I sense great potential in you, young one. Sit, and I shall share what wisdom these old bones have gathered."
    - Injured traveler: "Thank the gods, another person! Please, I need help - bandits took everything I had!"
    
    The response should:
    - Feel authentic to their personality and emotional state
    - Appropriately reflect their relationship with the player
    - May change their emotional state based on the interaction
    - Could affect their rapport with the player
    - Might lead to new conversation topics or actions
    - Create a memorable character moment
    
    Be creative with emotional responses - NPCs should feel alive and reactive!`;

    const schema = {
      type: "object",
      properties: {
        npc_response: { 
          type: "string",
          description: "What the NPC actually says (include quotation marks for dialogue)"
        },
        emotional_tone: { 
          type: "string",
          description: "Emotional tone of response (happy, suspicious, excited, etc)"
        },
        rapport_change: { 
          type: "integer",
          description: "How this affects relationship (-10 to +10)"
        },
        emotional_change: {
          type: "object",
          properties: {
            id: { type: "string" },
            primary: {
              type: "object",
              properties: {
                emotion: { type: "string" },
                cause: { type: "string" }
              }
            },
            intensity: { type: "integer" },
            stability: { type: "integer" },
            triggers: { type: "array", items: { type: "object" } },
            duration: { type: "integer" },
            lastUpdated: { type: "integer" }
          }
        },
        new_topics: {
          type: "array",
          items: { type: "string" },
          description: "New conversation topics unlocked"
        },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action_type: { type: "string" },
              description: { type: "string" },
              parameters: { type: "object" }
            }
          },
          description: "Actions the NPC takes (give_item, move, etc)"
        },
        memory_formed: { 
          type: "string",
          description: "New memory created from this interaction"
        }
      },
      required: ["npc_response", "emotional_tone", "rapport_change"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    
    console.log('NPC Conversation Response:', JSON.stringify(response, null, 2));
    
    return c.json(response);
  } catch (error) {
    console.error('Error processing conversation:', error);
    return c.json({ 
      error: 'Failed to process conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Start conversation with NPC
gameRouter.post('/conversation/start', async (c) => {
  try {
    const body = await c.req.json();
    const { npcId, currentRoom, playerInventory, playerStatuses, playerHealth, playerLevel } = body;
    
    // Find the NPC in the room
    const npc = currentRoom.monsters?.find((m: any) => m.id === npcId);
    if (!npc) {
      return c.json({ error: 'NPC not found' }, 404);
    }
    
    const prompt = `You are initializing a conversation with an NPC in a text-based RPG.
    
    NPC: ${npc.name}
    Description: ${npc.description}
    Occupation: ${npc.occupation || 'Unknown'}
    Behavior: ${npc.behavior}
    
    Room: ${currentRoom.name}
    Room description: ${currentRoom.description}
    
    Player info:
    - Health: ${playerHealth}
    - Level: ${playerLevel}
    - Inventory: ${playerInventory?.map((i: any) => i.name).join(', ') || 'Empty'}
    - Status effects: ${playerStatuses?.map((s: any) => s.name).join(', ') || 'None'}
    
    Initialize this NPC for conversation by determining:
    1. Their initial mood when the player approaches
    2. Available conversation topics they might discuss
    3. Their general attitude and personality
    
    Consider the NPC's occupation, the current room context, and the player's appearance.
    Friendly NPCs might be welcoming, suspicious ones might be cautious, etc.`;

    const schema = {
      type: "object",
      properties: {
        mood: { 
          type: "string",
          description: "Initial conversation mood (welcoming, cautious, friendly, suspicious, etc)"
        },
        available_topics: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              subject: { type: "string" },
              npcWillingness: { type: "integer" },
              requiresRapport: { type: "integer" },
              onceOnly: { type: "boolean" }
            }
          },
          description: "Topics this NPC can discuss"
        },
        greeting: {
          type: "string",
          description: "What the NPC might say when first approached"
        }
      },
      required: ["mood", "available_topics"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    
    return c.json(response);
  } catch (error) {
    console.error('Error starting conversation:', error);
    return c.json({ 
      error: 'Failed to start conversation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Update NPC emotional state
gameRouter.post('/npc/emotional-state', async (c) => {
  try {
    const body = await c.req.json();
    const { npcId, event, roomContext, witnesses } = body;
    
    const prompt = `Update an NPC's emotional state based on an event.
    
    NPC ID: ${npcId}
    Event: ${JSON.stringify(event)}
    Room context: ${roomContext}
    Witnesses: ${witnesses.join(', ') || 'None'}
    
    Determine how this event should affect the NPC's emotional state:
    1. What emotion should they feel?
    2. How intense should it be?
    3. How long should it last?
    4. How does it affect their behavior?
    
    Consider the nature of the event and realistic emotional responses.`;

    const schema = {
      type: "object",
      properties: {
        new_emotional_state: {
          type: "object",
          properties: {
            primary: {
              type: "object",
              properties: {
                emotion: { type: "string" },
                cause: { type: "string" }
              }
            },
            intensity: { type: "integer" },
            stability: { type: "integer" },
            duration: { type: "integer" }
          }
        },
        behavior_change: { 
          type: "string",
          description: "How their behavior might change"
        }
      },
      required: ["new_emotional_state"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    
    return c.json(response);
  } catch (error) {
    console.error('Error updating emotional state:', error);
    return c.json({ 
      error: 'Failed to update emotional state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Attempt crafting
gameRouter.post('/craft', async (c) => {
  try {
    const body = await c.req.json();
    const { items, playerLevel } = body;
    
    const prompt = `The player is trying to craft something from these items: ${JSON.stringify(items)}
    Player level: ${playerLevel}
    
    Consider:
    - Item materials and properties from their descriptions
    - Logical combinations based on item types and themes
    - Sensible results (torch + sword = flaming sword)
    - Player level limitations (no god-tier items at level 1)
    
    If these items can be combined into something useful, funny, or thematically appropriate,
    generate the resulting item. Otherwise, return null.
    
    The crafted item should:
    - Make sense given the components (or be amusingly logical)
    - Be balanced for the player's level
    - Have properties derived from BOTH/ALL ingredients
    - Include crafting marks or combined attributes
    - Often be better than components, but not always
    - Sometimes have unexpected but logical properties
    
    Examples of good crafting:
    - Rope + Hook = Grappling Hook (utility combination)
    - Poison + Dagger = Poisoned Dagger (enhancement)
    - Torch + Oil = Long-burning Torch (improvement)
    - Mirror + Shield = Reflective Shield (creative fusion)
    - Cheese + Trap = Baited Trap (clever combination)
    
    Examples of bad crafting:
    - Rock + Feather = ??? (no logical connection)
    - Sword + Sword = Double Sword (lazy, uncreative)
    
    Be creative and reward player experimentation!`;

    const schema = {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        type: { type: "string" },
        stackable: { type: "boolean" },
        quantity: { type: "integer" },
        // properties is a flexible object, no schema validation
      }
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    if (response) {
      response.id = crypto.randomUUID();
    }
    
    return c.json(response);
  } catch (error) {
    console.error('Error attempting craft:', error);
    return c.json({ 
      error: 'Failed to attempt crafting',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Evaluate combat behavior (retreat/surrender decision)
gameRouter.post('/combat/evaluate-behavior', async (c) => {
  try {
    const { npc, healthPercentage, isOutnumbered, escapeRoutes, playerReputation, recentCombatEvents } = await c.req.json();
    
    const prompt = `An NPC must decide their combat behavior in a life-threatening situation.
    
    NPC: ${npc.name}
    Current health: ${healthPercentage}%
    Personality traits: ${JSON.stringify(npc.personality_traits || [])}
    Current emotion: ${npc.current_emotion?.primary_emotion || 'unknown'} (intensity: ${npc.current_emotion?.intensity || 5})
    Communication style: ${JSON.stringify(npc.communication_style || {})}
    Occupation: ${npc.occupation || 'unknown'}
    Goals: ${JSON.stringify(npc.goals || [])}
    Fears: ${JSON.stringify(npc.fears || [])}
    
    Combat situation:
    - Is outnumbered: ${isOutnumbered}
    - Available escape routes: ${escapeRoutes}
    - Player's reputation: ${playerReputation}/100
    - Recent events: ${JSON.stringify(recentCombatEvents)}
    
    Evaluate what this NPC would realistically do based on:
    1. Their personality (brave vs cowardly, proud vs pragmatic)
    2. Their current health and desperation level
    3. Their occupation and social standing
    4. Their goals and what they have to live for
    5. Their assessment of the player (reputation, previous actions)
    6. Available options (escape routes, allies)
    
    Generate authentic dialogue that fits their personality and communication style.
    Consider that:
    - Cowardly NPCs retreat or surrender earlier
    - Proud NPCs may fight to the death rather than surrender
    - Pragmatic NPCs make calculated decisions
    - Occupation matters (guards vs merchants vs scholars)
    - Some may try to negotiate or bargain`;
    
    const schema = {
      type: "object",
      properties: {
        decision: { 
          type: "string",
          enum: ["FIGHT", "RETREAT", "SURRENDER", "NEGOTIATE"]
        },
        reasoning: { type: "string" },
        desperation_level: { type: "integer", minimum: 1, maximum: 10 },
        escape_probability: { type: "number", minimum: 0, maximum: 1 },
        emotional_state: {
          type: "object",
          properties: {
            primary_emotion: { type: "string" },
            intensity: { type: "integer" },
            cause: { type: "string" }
          }
        },
        dialogue: { type: "string" }
      },
      required: ["decision", "reasoning", "desperation_level", "escape_probability", "emotional_state", "dialogue"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    
    return c.json(response);
  } catch (error) {
    console.error('Error evaluating combat behavior:', error);
    return c.json({ 
      error: 'Failed to evaluate combat behavior',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Process retreat attempt
gameRouter.post('/combat/retreat', async (c) => {
  try {
    const { npc, room, playerPosition, npcAgility, environmentalFactors } = await c.req.json();
    
    const prompt = `An NPC is attempting to retreat from combat.
    
    NPC: ${npc.name}
    Current state: ${JSON.stringify(npc.current_state || {})}
    Room: ${room.name}
    Available exits: ${JSON.stringify(room.doors.map((d: any) => ({ direction: d.direction, locked: d.locked })))}
    Player position: ${playerPosition}
    NPC agility/speed: ${npcAgility}/10
    Environmental factors: ${JSON.stringify(environmentalFactors)}
    
    Determine:
    1. Which exit they try to use (if any)
    2. How they attempt to escape (run, dodge, use environment)
    3. What might block their escape
    4. Whether the player could pursue
    5. Where they might flee to
    
    Consider:
    - Room layout and obstacles
    - NPC's physical condition and injuries
    - Environmental advantages/disadvantages
    - Player's position relative to exits
    - NPC's familiarity with the area
    
    Make it dramatic and specific to the situation.`;
    
    const schema = {
      type: "object",
      properties: {
        success: { type: "boolean" },
        escape_route: { type: "string" },
        obstacles: { 
          type: "array",
          items: { type: "string" }
        },
        pursuit_possible: { type: "boolean" },
        final_message: { type: "string" },
        npc_destination: { type: "string", nullable: true }
      },
      required: ["success", "escape_route", "obstacles", "pursuit_possible", "final_message"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    
    return c.json(response);
  } catch (error) {
    console.error('Error processing retreat:', error);
    return c.json({ 
      error: 'Failed to process retreat',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Process surrender
gameRouter.post('/combat/surrender', async (c) => {
  try {
    const { npc, desperationLevel, playerReputation, witnessNpcs, previousMercyShown } = await c.req.json();
    
    const prompt = `An NPC is surrendering in combat.
    
    NPC: ${npc.name}
    Personality: ${JSON.stringify(npc.personality_traits || [])}
    Communication style: ${JSON.stringify(npc.communication_style || {})}
    Occupation: ${npc.occupation || 'unknown'}
    Secrets: ${JSON.stringify(npc.secrets || [])}
    Possessions: ${JSON.stringify(npc.possessions?.map((i: any) => i.name) || [])}
    Desperation: ${desperationLevel}/10
    
    Context:
    - Player reputation: ${playerReputation}/100
    - Witnesses present: ${JSON.stringify(witnessNpcs)}
    - Player has shown mercy before: ${previousMercyShown}
    
    Generate:
    1. Authentic surrender dialogue fitting their personality
    2. What they offer to save their life (items, information, service)
    3. Secrets they might desperately reveal
    4. Their emotional state (fear, shame, relief, anger)
    5. Whether they'd genuinely cooperate if spared
    
    Consider:
    - Proud NPCs surrender differently than cowardly ones
    - Occupation affects what they can offer
    - Desperation level affects what secrets they'll reveal
    - Some may surrender tactically vs genuinely
    - Witnesses affect reputation consequences
    
    Make the dialogue emotional and character-specific.`;
    
    const schema = {
      type: "object",
      properties: {
        npc_dialogue: { type: "string" },
        emotional_impact: {
          type: "object",
          properties: {
            primary_emotion: { type: "string" },
            intensity: { type: "integer" },
            cause: { type: "string" }
          }
        },
        offers: {
          type: "array",
          items: { type: "string" }
        },
        information_revealed: {
          type: "array",
          items: { type: "string" }
        },
        future_cooperation: { type: "boolean" },
        reputation_impact: { type: "integer" }
      },
      required: ["npc_dialogue", "emotional_impact", "offers", "information_revealed", "future_cooperation", "reputation_impact"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    
    return c.json(response);
  } catch (error) {
    console.error('Error processing surrender:', error);
    return c.json({ 
      error: 'Failed to process surrender',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Search body
gameRouter.post('/search/body', async (c) => {
  try {
    const { body, searcherId, roomContext } = await c.req.json();
    
    const prompt = `A player is searching the body of ${body.name} in ${roomContext}.
    
    Body condition: ${body.bodyState?.condition || 'Unknown'}
    Decomposition level: ${body.bodyState?.decompositionLevel || 0}/10
    Cause of death: ${body.bodyState?.causeOfDeath || 'Unknown'}
    
    NPC Background:
    - Name: ${body.name}
    - Original occupation: ${body.originalOccupation || 'Unknown'}
    - Description: ${body.description}
    
    Available loot: ${JSON.stringify(body.originalLoot || [])}
    Personal possessions: ${JSON.stringify(body.originalPossessions || [])}
    
    IMPORTANT: If the body has no items (empty loot and possessions), generate appropriate items based on:
    1. The NPC's occupation (e.g. blacksmith = hammer, tongs, ingots)
    2. The NPC's apparent wealth and status
    3. Personal effects everyone would carry (food, water, small coins)
    4. The cause of death (some items might be damaged)
    5. Time since death (decomposition affects item condition)
    
    Generate realistic items that tell a story about who this person was.
    
    Examples:
    - Griznak the Smith: Smith's hammer, leather apron, iron ingots, bread, water flask
    - Merchant: Ledger, coin purse (10-50 gold), fine cloak, dried meat, personal letter
    - Guard: Guard badge, leather armor, sword, rations, dice
    - Peasant: Common clothes, wooden spoon, stale bread, 1-5 copper coins
    
    The response should:
    1. List the items found (either existing or generated)
    2. Describe the search process atmospherically
    3. Note any emotional impact on the searcher
    4. Consider if witnesses would react`;
    
    const schema = {
      type: "object",
      properties: {
        success: { type: "boolean" },
        itemsFound: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              type: { type: "string" },
              stackable: { type: "boolean" },
              quantity: { type: "integer" },
              properties: { type: "object" }
            }
          }
        },
        searchDescription: { type: "string" },
        emotionalImpact: { type: "string" },
        witnessesReact: { type: "boolean" }
      },
      required: ["success", "itemsFound", "searchDescription", "emotionalImpact", "witnessesReact"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    
    // Generate IDs for any new items
    if (response.itemsFound) {
      response.itemsFound.forEach((item: any) => {
        if (!item.id) {
          item.id = crypto.randomUUID();
        }
      });
    }
    
    return c.json(response);
  } catch (error) {
    console.error('Error searching body:', error);
    return c.json({ 
      error: 'Failed to search body',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});