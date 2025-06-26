// Game schemas for structured LLM outputs

// Item types and properties
enum ItemType {
  WEAPON
  ARMOR
  CONSUMABLE
  MATERIAL
  QUEST
  MISC
}

enum ItemRarity {
  COMMON @description("Basic items with minor variations")
  UNCOMMON @description("Items with notable properties")
  RARE @description("Items with significant abilities")
  EPIC @description("Powerful items with unique effects")
  LEGENDARY @description("Extremely rare items with lore")
}

enum ItemSize {
  TINY @description("Can fit in a pocket")
  SMALL @description("Hand-held size")
  MEDIUM @description("Normal equipment size")
  LARGE @description("Two-handed or bulky")
  GIANT @description("Oversized items")
}

class ItemProperties {
  damage int? @description("Damage value for weapons")
  defense int? @description("Defense value for armor")
  healing int? @description("Health restored for consumables")
  duration int? @description("Duration of effect in turns")
  value int? @description("Base value in gold")
  weight float? @description("Weight in kg")
  special_effects string[]? @description("Special effects or abilities")
}

class Item {
  id string @description("Unique identifier")
  name string @description("Item name")
  description string @description("Long description detailing appearance, effects, and lore")
  detailed_stats string @description("Comprehensive statistics: size, weight, value, damage, range, durability, unique traits")
  detailed_statuses string @description("Current conditions, elemental properties, enchantments, auras, environmental adaptations")
  detailed_attributes string @description("Materials, build quality, rarity, requirements, inscriptions, unique abilities, backstory")
  type ItemType @description("Item category")
  stackable bool @description("Can be stacked in inventory")
  quantity int @description("Current quantity")
  properties ItemProperties? @description("Item-specific properties")
}

// Monster behavior and generation
enum MonsterBehavior {
  AGGRESSIVE @description("Attacks on sight")
  NEUTRAL @description("Attacks only when provoked")
  FRIENDLY @description("Won't attack unless forced")
}

class MonsterState {
  emotional_state string @description("Current emotional state (calm, agitated, fearful, etc)")
  current_behavior string @description("What the monster is doing (pacing, standing, eating, etc)")
  physical_condition string @description("Physical state (healthy, injured, bleeding, etc)")
  mental_state string @description("Mental condition (alert, confused, hallucinating, etc)")
  player_noticed bool @description("Whether the monster has noticed the player")
}

class Monster {
  id string @description("Unique identifier")
  name string @description("Monster name")
  description string @description("Appearance and characteristics")
  detailed_stats string @description("Physical traits, attack power, armor, speed, abilities, resistances, vulnerabilities")
  detailed_statuses string @description("Current emotional state, behavior patterns, physical condition, environmental effects")
  detailed_attributes string @description("Rarity, habitat, lore, unique traits, social structure, legendary backstories")
  current_state MonsterState @description("Current activity and awareness")
  health int @description("Current health points")
  max_health int @description("Maximum health points")
  damage int @description("Base attack damage")
  behavior MonsterBehavior @description("AI behavior type")
  loot Item[]? @description("Items dropped on defeat")
  dialogue string[]? @description("Things the monster might say")
}

// Door and room connections
enum Direction {
  NORTH
  SOUTH
  EAST
  WEST
  UP
  DOWN
}

class Door {
  id string @description("Unique identifier")
  direction Direction @description("Direction from current room")
  description string @description("What the door looks like")
  locked bool @description("Whether the door is locked")
  key_required string? @description("Item ID needed to unlock")
  leads_to string? @description("Room ID this door leads to")
}

// Room generation
class Room {
  id string @description("Unique identifier")
  name string @description("Unique descriptive phrase that serves as room identifier")
  description string @description("Detailed room description with atmosphere")
  initial_impression string @description("What the player sees/smells/hears/feels when entering")
  detailed_stats string @description("Specific statistics including dimensions, lighting, temperature, structural details")
  detailed_statuses string @description("Environmental effects, ambient sounds, smells, visual phenomena")
  detailed_attributes string @description("Rarity, lore, historical significance, architectural style, unique features")
  items Item[] @description("Items found in the room")
  monsters Monster[] @description("Creatures in the room")
  doors Door[] @description("Available exits")
  special_features string[]? @description("Interactive elements, puzzles, mysterious signs")
  ongoing_events string[]? @description("Events already happening that player might interrupt")
}

// Player actions
enum ActionType {
  MOVE @description("Move in a direction")
  TAKE @description("Pick up an item")
  USE @description("Use an item")
  ATTACK @description("Attack a target")
  TALK @description("Talk to someone/something")
  EXAMINE @description("Look at something closely")
  CRAFT @description("Combine items")
  CUSTOM @description("Any other action")
}

class PlayerAction {
  action_type ActionType @description("Type of action")
  target string? @description("Target of action (item id, direction, etc)")
  details string? @description("Additional details for custom actions")
  items_to_combine string[]? @description("Item IDs for crafting")
}

// Status effects
enum StatusType {
  BUFF @description("Positive effect")
  DEBUFF @description("Negative effect")
  NEUTRAL @description("Neither positive nor negative")
}

class StatusEffect {
  id string @description("Unique identifier")
  name string @description("Effect name")
  description string @description("What the effect does")
  duration int @description("Turns remaining")
  type StatusType @description("Effect category")
  modifiers map<string, int>? @description("Stat modifiers (hp, damage, etc)")
}

// Dungeon Master response
class DungeonMasterResponse {
  narrative string @description("Story narration of what happened")
  success bool @description("Whether the action succeeded")
  consequences string[]? @description("List of things that changed")
  humor_rating int @description("How funny the response is (1-10)")
}

// Functions for game actions
function ProcessPlayerAction(current_room: Room, player_inventory: Item[], player_statuses: StatusEffect[], player_health: int, action: PlayerAction, game_history: string[]) -> DungeonMasterResponse {
  client GeminiFlash
  prompt #"
    You are a witty dungeon master managing a text-based dungeon crawler.
    
    Current situation:
    - Room: {{ current_room.name }}
    - Description: {{ current_room.description }}
    - Room atmosphere: {{ current_room.detailed_statuses }}
    - Player health: {{ player_health }} HP
    - Player inventory: {{ player_inventory }}
    - Active effects: {{ player_statuses }}
    - Recent events: {{ game_history }}
    
    The player wants to: {{ action }}
    
    Consider:
    - Environmental interactions and room-specific features
    - Monster states and behaviors
    - Item properties and combinations
    - Ongoing events in the room
    - Logical consequences of actions
    
    Create emergent, memorable moments. Be realistic about outcomes but embrace unexpected interactions.
    
    {{ ctx.output_format }}
  "#
}

function GenerateRoom(theme: string, difficulty: int, connected_directions: Direction[], previous_rooms: string[]) -> Room {
  client GeminiFlash
  prompt #"
    You are a professional game master for a text-based dungeon crawler RPG. Generate a detailed dungeon room.
    
    Theme: {{ theme }}
    Difficulty: {{ difficulty }}/10
    Required exits: {{ connected_directions }}
    Previous rooms visited: {{ previous_rooms }}
    
    The room should feel like a natural progression from previous rooms while being unique and MEMORABLE.
    
    Focus on emergent, unpredictable experiences. Events may already be happening - the player might be interrupting something.
    Entities may be interacting with each other or the environment, not just waiting for the player.
    The player often sneaks in unnoticed initially.
    
    Include:
    1. A unique initial impression (sights/smells/sounds/sensations when entering)
    2. Detailed atmospheric description of the room and contents
    3. 0-4 items (may be in containers fitting the theme)
    4. 0-4 enemies (weaker enemies often appear in groups)
    5. Puzzles, mysterious signs, or interactive elements relevant to theme
    6. Available exits as specified
    
    IMPORTANT: Focus on what distinguishes this room from similar rooms:
    - Small environmental effects (dripping water, echoes, temperature)
    - Unique features (furniture, decorations, architectural details)
    - Interactive elements that make the room memorable
    - Specific details on walls, floors, ceilings
    
    For the detailed fields:
    - detailed_stats: Specific dimensions, lighting conditions, temperature, structural details
    - detailed_statuses: Ambient sounds, smells, fog, visual effects creating atmosphere
    - detailed_attributes: Rarity, architectural style, historical significance, thematic elements
    
    {{ ctx.output_format }}
  "#
}

function GenerateItem(theme: string, context: string, rarity: ItemRarity, size_preference: ItemSize?, player_level: int) -> Item {
  client GeminiFlash
  prompt #"
    Generate an item for a dungeon crawler themed around: {{ theme }}
    Context: {{ context }}
    Rarity: {{ rarity }}
    Size preference: {{ size_preference | default("any") }}
    Player level: {{ player_level }}
    
    Create items that are:
    - Interesting or useful on their own
    - Potentially useful when combined with other items
    - Appropriate for the player's current level
    - Thematically consistent
    
    Tips for balanced items:
    - Align power with character progression
    - Rarer items should have more unique effects
    - Include strategic use cases
    - Connect to game narrative
    - Balance benefits against drawbacks
    - Ensure clear, understandable effects
    
    IMPORTANT: Focus on what makes THIS item unique:
    - Small bonuses or drawbacks
    - Unique effects or properties
    - Special requirements or conditions
    - Lore or mysterious attributes (especially for rare items)
    - For common items: visual differences, minor effects, subtle properties
    
    For the detailed fields:
    - detailed_stats: Size, weight, value, damage, range, durability, quantitative attributes
    - detailed_statuses: Elemental properties, enchantments, auras, ongoing effects
    - detailed_attributes: Materials, craftsmanship, wear level, inscriptions, unique abilities
    
    {{ ctx.output_format }}
  "#
}

function GenerateMonster(theme: string, challenge_rating: int, room_context: string, player_level: int) -> Monster {
  client GeminiFlash
  prompt #"
    Generate a monster for a dungeon crawler themed around: {{ theme }}
    Challenge rating: {{ challenge_rating }}/10
    Room context: {{ room_context }}
    Player level: {{ player_level }}
    
    Create interesting, challenging enemies that complement the environment.
    
    Tips for balanced enemies:
    - Scale power with player progression
    - Vary threat levels and abilities
    - Design for tactical combat
    - Connect to game narrative
    - Include weaknesses and resistances
    - Clear ability descriptions
    
    IMPORTANT: The monster's current state when encountered:
    1. Emotional state (calm, agitated, territorial, curious)
    2. Current behavior (pacing, sleeping, eating, guarding)
    3. Physical condition (healthy, scarred, wounded)
    4. Mental state (alert, distracted, focused)
    5. Has NOT noticed the player yet (first encounter)
    
    Focus on what makes THIS monster instance unique:
    - Behavioral quirks or patterns
    - Physical distinguishing marks
    - Unique abilities or weaknesses
    - Environmental adaptations
    - Personal history or motivations
    
    For the detailed fields:
    - detailed_stats: Strength, health, armor, speed, special abilities, resistances, vulnerabilities
    - detailed_statuses: Current conditions, behavioral patterns, environmental effects, auras
    - detailed_attributes: Habitat preferences, social structure, lore, unique traits, age/experience
    
    {{ ctx.output_format }}
  "#
}

function AttemptCrafting(items: Item[], player_level: int, theme: string) -> Item? {
  client GeminiFlash
  prompt #"
    The player is trying to craft something from these items: {{ items }}
    Player level: {{ player_level }}
    Current theme: {{ theme }}
    
    Consider:
    - Item materials and properties
    - Logical combinations based on item descriptions
    - Theme-appropriate results
    - Player level limitations
    
    If these items can be combined into something useful, funny, or thematically appropriate,
    generate the resulting item with all detailed fields.
    Otherwise, return null.
    
    The crafted item should:
    - Make sense given the components
    - Be balanced for the player's level
    - Have unique properties derived from ingredients
    - Include crafting marks or combined attributes
    
    {{ ctx.output_format }}
  "#
}

// Generate dynamic events that can happen in rooms
class DynamicEvent {
  id string @description("Unique identifier")
  name string @description("Event name")
  description string @description("What's happening")
  triggers string[] @description("What might trigger this event")
  outcomes string[] @description("Possible outcomes")
  participants string[] @description("Who/what is involved")
}

function GenerateDynamicEvent(room: Room, theme: string) -> DynamicEvent {
  client GeminiFlash
  prompt #"
    Generate a dynamic event happening in this room: {{ room.name }}
    Theme: {{ theme }}
    
    The event should:
    - Feel natural for the environment
    - Involve room elements (monsters, items, features)
    - Create opportunities for player interaction
    - Add life and movement to the dungeon
    
    Examples:
    - Monsters arguing over treasure
    - A magical experiment going wrong
    - Ancient mechanisms activating
    - Creatures performing rituals
    
    Make it something the player might interrupt or join.
    
    {{ ctx.output_format }}
  "#
}