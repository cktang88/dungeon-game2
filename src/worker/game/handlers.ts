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
      newRoomData
    } = body;
    
    // Handle old format for backwards compatibility
    const action = body.action || { type: actionType, details: actionDetails };
    
    // Calculate damage for attacks (to ensure consistency with game engine)
    const baseDamage = 10;
    const equippedWeapon = body.playerEquippedWeapon;
    const weaponDamage = equippedWeapon?.properties?.damage || 0;
    const totalDamage = baseDamage + weaponDamage;
    
    const prompt = `You are a WITTY dungeon master managing a text-based dungeon crawler. Be CONCISE - this is an action game, not a novel. Keep responses SHORT and PUNCHY.
    
    Current situation:
    - Room: ${currentRoom.name} - ${currentRoom.description}
    - Items in room: ${currentRoom.items?.map((i: any) => `${i.name} (${i.type})${i.quantity > 1 ? ' x' + i.quantity : ''}`).join(', ') || 'none'}
    - Monsters in room: ${currentRoom.monsters?.map((m: any) => `${m.name} (${m.health}/${m.maxHealth} HP)`).join(', ') || 'none'}
    - Room features: ${currentRoom.specialFeatures?.join(', ') || 'none'}
    - Player health: ${playerHealth} HP
    - Player level: ${playerLevel || 1}
    - Player inventory: ${playerInventory?.map((i: any) => `${i.name}${i.quantity > 1 ? ' x' + i.quantity : ''}`).join(', ') || 'empty'}
    - Active effects: ${playerStatuses?.map((s: any) => `${s.name} (${s.duration} turns)`).join(', ') || 'none'}
    - Player damage: ${totalDamage} (base: ${baseDamage}${weaponDamage > 0 ? `, weapon: +${weaponDamage}` : ''})
    
    The player's action: "${action.details || action.type}"
    ${actionType ? `Action type: ${actionType}` : ''}
    ${targetDirection ? `Target direction: ${targetDirection}` : ''}
    ${targetItems?.length ? `Target items: ${targetItems.join(', ')}` : ''}
    ${targetMonsters?.length ? `Target monsters: ${targetMonsters.join(', ')}` : ''}
    ${craftingMaterials?.length ? `Crafting with: ${craftingMaterials.map(i => i.name).join(', ')}` : ''}
    
    ${newRoomData ? `
    MOVEMENT NOTE: The player is moving to a new room. Just describe the act of moving/transitioning. Do NOT describe the new room's contents.
    ` : ''}
    
    Consider ENVIRONMENTAL STATUS EFFECTS:
    - Walking through water → "Wet" (vulnerable to electricity, slower movement)
    - Fighting monsters → "Tired" (reduced damage after many actions)
    - Not drinking for many turns → "Thirsty" (reduced max health)
    - Poisonous attacks/items → "Poisoned" (damage over time)
    - Dark rooms → "Blinded" (miss attacks more often)
    - Cold environments → "Frozen" (slower actions)
    - Hot environments → "Burning" (damage over time)
    
    Add/remove status effects based on the player's actions and environment.
    Status effects should be creative and enhance gameplay!
    
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
       - COMBAT: Player attacks ALWAYS deal ${totalDamage} damage. Describe the impact accurately!
         * If damage >= monster's health: Monster is defeated/killed
         * If damage < monster's health: Monster takes damage but survives
         * Improvised weapons (items used as weapons) still deal damage but may break
       - INTERACTION: Allow creative interactions with items/environment
    8. IMPORTANT: For movement to new rooms:
       - ONLY describe the act of moving (opening door, stepping through, etc.)
       - Do NOT describe what's in the new room - the game will show that separately
       - Keep movement narration brief (1-2 sentences max)
       - Focus on the transition, not the destination
       - Example: "You push open the heavy wooden door and step through." (STOP THERE)
    
    CRITICAL: MULTIPLE ACTIONS AND COMBAT RULES:
    - If the player says things like "take all and then go east" or "grab torch then attack goblin", parse this into MULTIPLE separate actions in the intendedActions array
    - Each action should be processed in sequence
    - "take all", "grab all", "pick up everything" should ONLY take items, NEVER attack monsters
    - Monsters might notice you taking items, but taking items alone does NOT deal damage to them
    - Only explicit combat actions like "attack", "hit", "strike" should cause damage
    - Item collection is NOT hostile unless explicitly combined with combat
    
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
    - Unusual or absurd actions: 3-4 sentences max
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
              itemsToCraft: {
                type: "array",
                items: { type: "string" }
              },
              stateChanges: {
                type: "object",
                properties: {
                  health: { type: "integer" },
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
                            damageModifier: { type: "number" },
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
    3. 0-4 items (consider containers, hidden items, items in use by monsters)
    4. 0-4 monsters (weaker enemies often appear in groups, monsters should be doing something)
    5. Special features, puzzles, mysterious signs, or interactive elements
    6. EXACTLY ${allRequiredDoors.length} exits in the directions: ${allRequiredDoors.join(', ')}
    
    IMPORTANT: Focus on what distinguishes this room from similar rooms:
    - Small environmental effects (dripping water, echoes, temperature, drafts)
    - Unique features (furniture, decorations, architectural oddities)
    - Interactive elements that make the room memorable
    - Specific details on walls, floors, ceilings (carvings, stains, damage)
    - Ongoing events (rituals, arguments, experiments, meals)
    
    Monsters should have:
    - Current emotional state (calm, agitated, fearful, etc)
    - What they're doing right now (not just standing around)
    - Physical condition (healthy, injured, tired, etc)
    - Whether they've noticed the player (usually NO on first encounter)
    
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
              behavior: { type: "string" }
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
    - Common: "Torch" (provides light, can be weapon, burns things)
    - Uncommon: "Ever-burning Torch" (never goes out, different colored flame)
    - Rare: "Torch of Revealing" (shows hidden doors, dispels illusions)
    - Epic: "Sunfire Torch" (damages undead, heals allies, daylight spell)
    - Legendary: "The First Flame" (ancient artifact, multiple powers, quest significance)
    
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
    - Humorous but sensible results (torch + sword = flaming sword)
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