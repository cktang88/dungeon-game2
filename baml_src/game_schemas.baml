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

// Enhanced emotional state system
enum BaseEmotion {
  HAPPY @description("Positive, joyful emotion")
  EXCITED @description("High-energy positive emotion")
  CONTENT @description("Peaceful satisfaction")
  GRATEFUL @description("Thankful and appreciative")
  ADMIRING @description("Respect and appreciation")
  CURIOUS @description("Interested and inquisitive")
  PLAYFUL @description("Light-hearted and fun")
  CONFIDENT @description("Self-assured and bold")
  ANGRY @description("Irritated or enraged")
  FEARFUL @description("Afraid or anxious")
  SAD @description("Melancholy or depressed")
  DISGUSTED @description("Repulsed or revolted")
  JEALOUS @description("Envious or possessive")
  FRUSTRATED @description("Annoyed or blocked")
  SUSPICIOUS @description("Distrustful or wary")
  HOSTILE @description("Aggressive or antagonistic")
  CALM @description("Peaceful and serene")
  BORED @description("Uninterested or restless")
  FOCUSED @description("Concentrated and attentive")
  THOUGHTFUL @description("Contemplative and reflective")
  INDIFFERENT @description("Uncaring or apathetic")
}

enum RapportCategory {
  MORTAL_ENEMY @description("Complete hostility, -100 to -80")
  ENEMY @description("Strong dislike, -79 to -40")
  HOSTILE @description("Unfriendly, -39 to -20")
  UNFRIENDLY @description("Cold or distant, -19 to -5")
  NEUTRAL @description("No strong feelings, -4 to 4")
  FRIENDLY @description("Warm and welcoming, 5 to 19")
  ALLY @description("Trusted friend, 20 to 39")
  CLOSE_FRIEND @description("Deep friendship, 40 to 79")
  DEVOTED @description("Absolute loyalty, 80 to 100")
}

enum ConversationMood {
  WELCOMING @description("Warm and inviting")
  CAUTIOUS @description("Careful and watchful")
  EAGER @description("Excited to talk")
  BORED @description("Uninterested in conversation")
  IMPATIENT @description("Wants to end conversation quickly")
  SUSPICIOUS @description("Distrustful of player")
  FRIENDLY @description("Open and warm")
  HOSTILE @description("Aggressive or threatening")
  FEARFUL @description("Afraid of player")
  ROMANTIC @description("Attracted to player")
  BUSINESS @description("Professional and transactional")
}

enum NPCBehavior {
  AGGRESSIVE @description("Attacks on sight")
  HOSTILE @description("Unfriendly but not immediately violent")
  DEFENSIVE @description("Ready to defend but won't initiate")
  NEUTRAL @description("Indifferent to player presence")
  FRIENDLY @description("Welcoming and helpful")
  HELPFUL @description("Actively assists player")
  TRADING @description("Focused on commerce")
  GUARDING @description("Protecting something")
  PATROLLING @description("Moving around area")
  HIDING @description("Trying to stay concealed")
  FLEEING @description("Running away from danger")
}

enum BodyCondition {
  FRESH @description("Recently deceased, intact")
  RECENTLY_DEAD @description("Dead for hours, showing rigor")
  DECOMPOSING @description("Visible decay and smell")
  SKELETAL @description("Mostly bones remaining")
  DUST @description("Completely decomposed")
}

class EmotionalState {
  primary_emotion BaseEmotion @description("Main emotional state")
  secondary_emotion BaseEmotion? @description("Secondary emotional undertone")
  intensity int @description("Emotional intensity 0-10")
  cause string @description("What caused this emotional state")
  target_entity string? @description("Who this emotion is directed at")
  stability int @description("How stable this emotion is 0-10")
  duration int @description("Turns remaining for temporary emotions")
}

class PersonalityTrait {
  trait string @description("Specific personality trait")
  intensity int @description("How strongly expressed 1-10")
  description string @description("How this trait manifests")
}

class NPCMemory {
  significant_memory string @description("A key memory that shapes this NPC")
  emotional_weight int @description("How emotionally significant 1-10")
  affects_behavior string @description("How this memory affects current behavior")
}

class CommunicationStyle {
  formality int @description("Speech formality 0-10 (casual to formal)")
  verbosity int @description("How much they talk 0-10 (terse to verbose)")
  emotiveness int @description("Emotional expression 0-10 (stoic to emotional)")
  humor int @description("Use of humor 0-10 (serious to funny)")
  honesty int @description("Truthfulness 0-10 (deceptive to honest)")
}

class DialogueOption {
  id string @description("Unique identifier")
  text string @description("What the NPC says")
  emotional_tone BaseEmotion @description("Emotional tone of response")
  rapport_requirement int @description("Minimum rapport needed (-100 to 100)")
  leads_to_topics string[] @description("Topics this response can lead to")
}

class ConversationTopic {
  id string @description("Unique topic identifier")
  subject string @description("What this topic is about")
  npc_willingness int @description("How willing NPC is to discuss 0-10")
  requires_rapport int @description("Minimum rapport to discuss")
  response_options DialogueOption[] @description("Possible NPC responses")
  once_only bool @description("Can only be discussed once")
}

class ConversationState {
  is_active bool @description("Whether currently in conversation")
  turn_count int @description("Number of conversation exchanges")
  mood ConversationMood @description("Current conversation mood")
  available_topics ConversationTopic[] @description("Topics that can be discussed")
  last_player_message string? @description("Last thing player said")
}

class TradingPreferences {
  will_trade bool @description("Whether this NPC trades")
  preferred_items string[] @description("Items they especially want")
  disliked_items string[] @description("Items they won't trade for")
  price_modifier float @description("Price adjustment 0.5-2.0")
  relationship_matters bool @description("Does rapport affect prices")
}

class BodyState {
  condition BodyCondition @description("Current state of decomposition")
  time_of_death int @description("Timestamp when death occurred")
  cause_of_death string @description("What killed this NPC")
  decomposition_level int @description("Decay level 0-10")
  searchable bool @description("Can the body be searched for items")
  witnessed_by string[] @description("NPC IDs who saw the death")
}

class DeadBody {
  id string @description("Unique identifier for the body")
  original_npc_id string @description("ID of the NPC when alive")
  name string @description("Name of the deceased")
  description string @description("Appearance of the body")
  body_state BodyState @description("Current condition of the body")
  original_loot Item[]? @description("Items the NPC would have dropped")
  original_possessions Item[]? @description("Items the NPC was carrying")
  searched_by string[] @description("Player IDs who have searched this body")
  room_id string @description("Current location of the body")
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
  
  // Enhanced emotional and social systems (for humanoid NPCs)
  current_emotion EmotionalState? @description("Current emotional state")
  personality_traits PersonalityTrait[]? @description("Core personality traits")
  communication_style CommunicationStyle? @description("How they communicate")
  conversation_state ConversationState? @description("Current conversation status")
  
  // Background and motivation (for humanoid NPCs)
  occupation string? @description("What they do for a living")
  goals string[]? @description("What they want to achieve")
  fears string[]? @description("What they're afraid of")
  secrets string[]? @description("Information they're hiding")
  possessions Item[]? @description("Items they carry or own")
  
  // Trading and relationship preferences (for humanoid NPCs)
  trading_preferences TradingPreferences? @description("Trading behavior if applicable")
  initial_rapport int? @description("Starting rapport with player -10 to 10")
  
  // Physical and persistent state
  is_dead bool? @description("Whether this entity is deceased")
  death_timestamp int? @description("When death occurred")
  body_state BodyState? @description("Condition of body if dead")
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
  dead_bodies DeadBody[]? @description("Bodies of deceased NPCs in this room")
  emotional_atmosphere string? @description("Overall emotional feeling of the room")
  recent_events string[]? @description("Recent events that NPCs might remember")
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
  SEARCH @description("Search a body or container")
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
}

// Functions for game actions
function ProcessPlayerAction(current_room: Room, player_inventory: Item[], player_statuses: StatusEffect[], player_health: int, action: PlayerAction, game_history: string[]) -> DungeonMasterResponse {
  client GeminiFlash
  prompt #"
    You are a dungeon master managing a dark fantasy dungeon crawler with a Game of Thrones-like atmosphere. Be direct and explicit about violence, gore, and mature themes. Match the player's tone - respond with humor to lighthearted actions, with mature content to serious/dark actions, match vulgur content within reason.
    
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
    You are a role-playing game master for a text-based dungeon crawler RPG. Generate a detailed dungeon room.
    
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

// Enhanced NPC interaction functions
function ProcessNPCInteraction(
  npc: Monster,
  player_action: string,
  player_rapport: int,
  room_context: string,
  interaction_history: string[]
) -> NPCInteractionResponse {
  client GeminiFlash
  prompt #"
    You are managing an emotionally intelligent NPC in a text-based RPG.
    
    NPC: {{ npc.name }}
    Current emotion: {{ npc.current_emotion.primary_emotion }} (intensity: {{ npc.current_emotion.intensity }})
    Cause: {{ npc.current_emotion.cause }}
    Personality: {{ npc.personality_traits }}
    Communication style: {{ npc.communication_style }}
    Player rapport: {{ player_rapport }}/100
    
    Room context: {{ room_context }}
    Player action: {{ player_action }}
    Previous interactions: {{ interaction_history }}
    
    The NPC should respond in character, considering:
    1. Their current emotional state and what caused it
    2. Their personality traits and communication style
    3. Their relationship with the player (rapport level)
    4. The context of the room and situation
    5. Their goals, fears, and motivations
    6. Their memories of past interactions
    
    Generate a response that:
    - Feels authentic to their personality and emotional state
    - Appropriately reflects their relationship with the player
    - May change their emotional state based on the interaction
    - Could affect their rapport with the player
    - Might lead to new conversation topics or actions
    - Creates a memorable character moment
    
    Be creative with emotional responses - NPCs should feel alive and reactive!
    
    {{ ctx.output_format }}
  "#
}

class NPCInteractionResponse {
  npc_response string @description("What the NPC says in response")
  emotional_tone BaseEmotion @description("Emotional tone of response")
  rapport_change int @description("How this affects relationship (-10 to +10)")
  emotional_change EmotionalState? @description("New emotional state if changed")
  new_topics string[] @description("New conversation topics unlocked")
  actions NPCAction[] @description("Actions the NPC takes")
  memory_formed string? @description("New memory created from this interaction")
}

class NPCAction {
  action_type string @description("Type of action (give_item, attack, flee, etc)")
  description string @description("Description of the action")
  parameters map<string, string> @description("Action-specific parameters")
}

function SearchBody(body: DeadBody, searcher_id: string, room_context: string) -> BodySearchResult {
  client GeminiFlash
  prompt #"
    A player is searching the body of {{ body.name }} in {{ room_context }}.
    
    Body condition: {{ body.body_state.condition }}
    Decomposition level: {{ body.body_state.decomposition_level }}/10
    Cause of death: {{ body.body_state.cause_of_death }}
    Time since death: Check body_state.time_of_death
    Searchable: {{ body.body_state.searchable }}
    
    Available loot: {{ body.original_loot }}
    Personal possessions: {{ body.original_possessions }}
    Previously searched by: {{ body.searched_by }}
    
    Determine what the player finds when searching this body:
    1. Consider the body's condition and how it affects what can be found
    2. Account for decomposition level - heavily decomposed bodies yield less
    3. Some items might be damaged or destroyed based on cause of death
    4. Include atmospheric details about the search process
    5. Consider any emotional or psychological impact on the searcher
    
    Generate a realistic search result that reflects the body's state and history.
    
    {{ ctx.output_format }}
  "#
}

class BodySearchResult {
  success bool @description("Whether the search yielded anything")
  items_found Item[] @description("Items discovered during the search")
  description string @description("Detailed description of the search process and findings")
  emotional_impact string @description("How searching this body might affect the player emotionally")
  body_condition_change BodyCondition? @description("New body condition if searching caused changes")
  witnesses_react bool @description("Whether NPCs in the room react to this search")
}

function UpdateBodyDecomposition(body: DeadBody, time_passed: int, environment_factors: string[]) -> BodyState {
  client GeminiFlash
  prompt #"
    Update the decomposition state of {{ body.name }}'s body.
    
    Current condition: {{ body.body_state.condition }}
    Current decomposition level: {{ body.body_state.decomposition_level }}/10
    Time passed since last update: {{ time_passed }} minutes
    Environmental factors: {{ environment_factors }}
    
    Consider how the following affect decomposition:
    - Temperature (hot accelerates, cold slows)
    - Humidity and moisture
    - Air circulation
    - Presence of scavengers
    - Magical effects in the environment
    - Cause of death (some deaths preserve better/worse)
    
    Update the body's condition realistically:
    1. Fresh (0-2 hours): No visible decomposition
    2. Recently Dead (2-24 hours): Rigor mortis, slight discoloration
    3. Decomposing (1-7 days): Visible decay, strong odor
    4. Skeletal (weeks-months): Mostly bones, some tissue
    5. Dust (months-years): Complete decomposition
    
    Also determine if the body is still searchable based on its condition.
    
    {{ ctx.output_format }}
  "#
}

function NPCReactToBodySearch(witnessing_npc: Monster, body_searched: DeadBody, searcher_reputation: int) -> NPCEmotionalReaction {
  client GeminiFlash
  prompt #"
    An NPC is witnessing the player search the body of {{ body_searched.name }}.
    
    Witnessing NPC: {{ witnessing_npc.name }}
    NPC's current emotion: {{ witnessing_npc.current_emotion }}
    NPC's personality: {{ witnessing_npc.personality_traits }}
    NPC's relationship to deceased: Unknown (determine based on context)
    Player's reputation: {{ searcher_reputation }}/100
    
    Body being searched: {{ body_searched.name }}
    Body condition: {{ body_searched.body_state.condition }}
    Cause of death: {{ body_searched.body_state.cause_of_death }}
    
    Determine how this NPC reacts to witnessing body desecration:
    1. Consider their personality and moral values
    2. Their relationship to the deceased (if any)
    3. Cultural/religious views on treatment of the dead
    4. The player's reputation and their relationship with the player
    5. The context of the death and current situation
    
    Generate an authentic emotional reaction and potential action.
    
    {{ ctx.output_format }}
  "#
}

class NPCEmotionalReaction {
  emotional_change EmotionalState @description("New emotional state of the witnessing NPC")
  rapport_change int @description("How this affects their relationship with the player")
  verbal_reaction string @description("What the NPC says or does in response")
  action_taken string? @description("Any action the NPC takes (leave, attack, etc)")
  memory_formed string @description("Memory the NPC forms of this event")
  significance_level int @description("How memorable this event is (1-10)")
}

// Combat decision types
enum CombatDecisionType {
  FIGHT @description("Continue fighting")
  RETREAT @description("Attempt to escape combat")
  SURRENDER @description("Give up and beg for mercy")
  NEGOTIATE @description("Try to talk way out of combat")
}

class CombatBehaviorEvaluation {
  decision CombatDecisionType @description("What the NPC decides to do")
  reasoning string @description("Why they made this decision")
  desperation_level int @description("How desperate they are (1-10)")
  escape_probability float @description("Chance of successful retreat (0.0-1.0)")
  emotional_state EmotionalState @description("Emotional state during decision")
  dialogue string @description("What they say during this action")
}

function EvaluateCombatBehavior(
  npc: Monster,
  health_percentage: float,
  is_outnumbered: bool,
  escape_routes: int,
  player_reputation: int,
  recent_combat_events: string[]
) -> CombatBehaviorEvaluation {
  client GeminiFlash
  prompt #"
    An NPC must decide their combat behavior in a life-threatening situation.
    
    NPC: {{ npc.name }}
    Current health: {{ health_percentage }}%
    Personality traits: {{ npc.personality_traits }}
    Current emotion: {{ npc.current_emotion }}
    Communication style: {{ npc.communication_style }}
    Occupation: {{ npc.occupation }}
    Goals: {{ npc.goals }}
    Fears: {{ npc.fears }}
    
    Combat situation:
    - Is outnumbered: {{ is_outnumbered }}
    - Available escape routes: {{ escape_routes }}
    - Player's reputation: {{ player_reputation }}/100
    - Recent events: {{ recent_combat_events }}
    
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
    - Some may try to negotiate or bargain
    
    {{ ctx.output_format }}
  "#
}

class RetreatAttempt {
  success bool @description("Whether the retreat succeeds")
  escape_route string @description("How they try to escape")
  obstacles string[] @description("What might prevent escape")
  pursuit_possible bool @description("Can the player give chase")
  final_message string @description("Description of the retreat")
  npc_destination string? @description("Where the NPC flees to")
}

function ProcessRetreat(
  npc: Monster,
  room: Room,
  player_position: string,
  npc_agility: int,
  environmental_factors: string[]
) -> RetreatAttempt {
  client GeminiFlash
  prompt #"
    An NPC is attempting to retreat from combat.
    
    NPC: {{ npc.name }}
    Current state: {{ npc.current_state }}
    Room: {{ room.name }}
    Available exits: {{ room.doors }}
    Player position: {{ player_position }}
    NPC agility/speed: {{ npc_agility }}/10
    Environmental factors: {{ environmental_factors }}
    
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
    
    Make it dramatic and specific to the situation.
    
    {{ ctx.output_format }}
  "#
}

class SurrenderOutcome {
  npc_dialogue string @description("What the NPC says when surrendering")
  emotional_impact EmotionalState @description("How surrendering affects them emotionally")
  offers string[] @description("What they offer in exchange for mercy")
  information_revealed string[] @description("Secrets they might share to save themselves")
  future_cooperation bool @description("Will they help the player if spared")
  reputation_impact int @description("How this affects player's reputation")
}

function ProcessSurrender(
  npc: Monster,
  desperation_level: int,
  player_reputation: int,
  witness_npcs: string[],
  previous_mercy_shown: bool
) -> SurrenderOutcome {
  client GeminiFlash
  prompt #"
    An NPC is surrendering in combat.
    
    NPC: {{ npc.name }}
    Personality: {{ npc.personality_traits }}
    Communication style: {{ npc.communication_style }}
    Occupation: {{ npc.occupation }}
    Secrets: {{ npc.secrets }}
    Possessions: {{ npc.possessions }}
    Desperation: {{ desperation_level }}/10
    
    Context:
    - Player reputation: {{ player_reputation }}/100
    - Witnesses present: {{ witness_npcs }}
    - Player has shown mercy before: {{ previous_mercy_shown }}
    
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
    
    Make the dialogue emotional and character-specific.
    
    {{ ctx.output_format }}
  "#
}