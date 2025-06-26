// Game state types for the dungeon crawler

export interface Position {
  x: number;
  y: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'quest' | 'misc';
  stackable: boolean;
  quantity: number;
  properties?: Record<string, any>; // Flexible properties for items
}

// Enhanced emotional state system
export interface EmotionalState {
  id: string;
  primary: EmotionalCore;
  secondary?: EmotionalCore;
  intensity: number; // 0-10 scale
  stability: number; // 0-10, how easily the emotion changes
  triggers: EmotionalTrigger[];
  duration: number; // turns remaining for temporary emotions
  lastUpdated: number; // timestamp
}

export interface EmotionalCore {
  emotion: BaseEmotion;
  cause: string; // What caused this emotion
  targetEntityId?: string; // Who/what this emotion is directed at
}

export enum BaseEmotion {
  // Positive emotions
  HAPPY = 'happy',
  EXCITED = 'excited',
  CONTENT = 'content',
  GRATEFUL = 'grateful',
  ADMIRING = 'admiring',
  CURIOUS = 'curious',
  PLAYFUL = 'playful',
  CONFIDENT = 'confident',
  
  // Negative emotions
  ANGRY = 'angry',
  FEARFUL = 'fearful',
  SAD = 'sad',
  DISGUSTED = 'disgusted',
  JEALOUS = 'jealous',
  FRUSTRATED = 'frustrated',
  SUSPICIOUS = 'suspicious',
  HOSTILE = 'hostile',
  
  // Neutral emotions
  CALM = 'calm',
  BORED = 'bored',
  FOCUSED = 'focused',
  THOUGHTFUL = 'thoughtful',
  INDIFFERENT = 'indifferent'
}

export interface EmotionalTrigger {
  id: string;
  event: TriggerEvent;
  emotionChange: EmotionalStateChange;
  conditions?: TriggerCondition[];
}

export enum TriggerEvent {
  PLAYER_APPROACHES = 'player_approaches',
  PLAYER_SPEAKS = 'player_speaks',
  PLAYER_ATTACKS = 'player_attacks',
  PLAYER_HELPS = 'player_helps',
  PLAYER_GIVES_ITEM = 'player_gives_item',
  PLAYER_THREATENS = 'player_threatens',
  WITNESS_VIOLENCE = 'witness_violence',
  WITNESS_DEATH = 'witness_death',
  ALLY_DIES = 'ally_dies',
  ENEMY_DIES = 'enemy_dies',
  RECEIVES_DAMAGE = 'receives_damage',
  HEALTH_LOW = 'health_low',
  ITEM_STOLEN = 'item_stolen',
  ENVIRONMENT_CHANGE = 'environment_change'
}

export interface EmotionalStateChange {
  newPrimary?: BaseEmotion;
  newSecondary?: BaseEmotion;
  intensityChange: number;
  duration?: number;
}

export interface TriggerCondition {
  type: 'rapport' | 'health' | 'item' | 'time' | 'location';
  operator: 'greater' | 'less' | 'equal' | 'contains';
  value: any;
}

// Rapport and relationship tracking
export interface RapportLevel {
  entityId: string; // Who this rapport is with
  level: number; // -100 to 100 scale
  category: RapportCategory;
  lastInteraction: number; // timestamp
  significantEvents: RapportEvent[];
  trustLevel: number; // 0-10 scale
  fearLevel: number; // 0-10 scale
  respectLevel: number; // 0-10 scale
}

export enum RapportCategory {
  MORTAL_ENEMY = 'mortal_enemy', // -100 to -80
  ENEMY = 'enemy', // -79 to -40
  HOSTILE = 'hostile', // -39 to -20
  UNFRIENDLY = 'unfriendly', // -19 to -5
  NEUTRAL = 'neutral', // -4 to 4
  FRIENDLY = 'friendly', // 5 to 19
  ALLY = 'ally', // 20 to 39
  CLOSE_FRIEND = 'close_friend', // 40 to 79
  DEVOTED = 'devoted' // 80 to 100
}

export interface RapportEvent {
  id: string;
  timestamp: number;
  eventType: string;
  description: string;
  rapportChange: number;
  emotionalImpact: BaseEmotion;
  significance: number; // 1-10, how memorable this event is
}

// NPC Memory System
export interface NPCMemory {
  entityId: string; // The NPC who has this memory
  memories: Memory[];
  personalityTraits: PersonalityTrait[];
  coreBeliefs: CoreBelief[];
  fears: Fear[];
  desires: Desire[];
  habits: Habit[];
}

export interface Memory {
  id: string;
  timestamp: number;
  type: MemoryType;
  content: string;
  participants: string[]; // Entity IDs involved
  location: string; // Room ID where it happened
  emotionalWeight: number; // 1-10, how emotionally significant
  clarity: number; // 1-10, how clearly remembered (degrades over time)
  relatedMemories: string[]; // IDs of connected memories
}

export enum MemoryType {
  FIRST_MEETING = 'first_meeting',
  CONVERSATION = 'conversation',
  COMBAT = 'combat',
  TRADE = 'trade',
  GIFT_RECEIVED = 'gift_received',
  GIFT_GIVEN = 'gift_given',
  BETRAYAL = 'betrayal',
  RESCUE = 'rescue',
  DEATH_WITNESSED = 'death_witnessed',
  HUMILIATION = 'humiliation',
  KINDNESS_RECEIVED = 'kindness_received',
  LESSON_LEARNED = 'lesson_learned',
  SECRET_SHARED = 'secret_shared'
}

export interface PersonalityTrait {
  trait: string;
  intensity: number; // 1-10
  description: string;
}

export interface CoreBelief {
  belief: string;
  conviction: number; // 1-10
  source: string; // What formed this belief
}

export interface Fear {
  fear: string;
  intensity: number; // 1-10
  triggers: string[];
}

export interface Desire {
  desire: string;
  urgency: number; // 1-10
  progress: number; // 0-100%
}

export interface Habit {
  action: string;
  frequency: string;
  triggers: string[];
}

// Conversation system
export interface ConversationState {
  isActive: boolean;
  turn: number;
  lastPlayerMessage?: string;
  mood: ConversationMood;
  topics: ConversationTopic[];
  questsOffered: string[];
  questsCompleted: string[];
}

export enum ConversationMood {
  WELCOMING = 'welcoming',
  CAUTIOUS = 'cautious',
  EAGER = 'eager',
  BORED = 'bored',
  IMPATIENT = 'impatient',
  SUSPICIOUS = 'suspicious',
  FRIENDLY = 'friendly',
  HOSTILE = 'hostile',
  FEARFUL = 'fearful',
  ROMANTIC = 'romantic',
  BUSINESS = 'business'
}

export interface ConversationTopic {
  id: string;
  subject: string;
  playerInterest: number; // 0-10
  npcWillingness: number; // 0-10
  requiresRapport: number; // Minimum rapport to discuss
  onceOnly: boolean;
  responses: NPCResponse[];
}

export interface NPCResponse {
  id: string;
  text: string;
  emotionalTone: BaseEmotion;
  rapportChange: number;
  followUpTopics: string[];
  actions?: NPCAction[];
}

export interface NPCAction {
  type: 'give_item' | 'take_item' | 'move' | 'attack' | 'offer_quest' | 'teach_skill' | 'reveal_secret';
  parameters: Record<string, any>;
}

export interface DialogueOption {
  id: string;
  text: string;
  requirements?: DialogueRequirement[];
  consequences: DialogueConsequence[];
}

export interface DialogueRequirement {
  type: 'rapport' | 'item' | 'quest' | 'skill' | 'trait';
  value: any;
}

export interface DialogueConsequence {
  type: 'rapport_change' | 'emotional_change' | 'item_exchange' | 'quest_start' | 'information_gained';
  parameters: Record<string, any>;
}

// Body persistence system
export interface BodyState {
  condition: BodyCondition;
  timeOfDeath: number;
  causeOfDeath: string;
  decompositionLevel: number; // 0-10
  searchable: boolean;
  witnessedByNPCs: string[]; // NPC IDs who saw the death
}

export enum BodyCondition {
  FRESH = 'fresh',
  RECENTLY_DEAD = 'recently_dead',
  DECOMPOSING = 'decomposing',
  SKELETAL = 'skeletal',
  DUST = 'dust'
}

export interface CommunicationStyle {
  formality: number; // 0-10 (casual to formal)
  verbosity: number; // 0-10 (terse to verbose)
  emotiveness: number; // 0-10 (stoic to emotional)
  humor: number; // 0-10 (serious to humorous)
  honesty: number; // 0-10 (deceptive to honest)
}

export interface TradingPreferences {
  preferredItems: string[];
  dislikedItems: string[];
  priceModifier: number; // 0.5 to 2.0 (discount to premium)
  relationshipBonus: boolean; // Does rapport affect prices?
}

export enum NPCBehavior {
  AGGRESSIVE = 'aggressive',
  HOSTILE = 'hostile',
  DEFENSIVE = 'defensive',
  NEUTRAL = 'neutral',
  FRIENDLY = 'friendly',
  HELPFUL = 'helpful',
  TRADING = 'trading',
  GUARDING = 'guarding',
  PATROLLING = 'patrolling',
  HIDING = 'hiding',
  FLEEING = 'fleeing'
}

// Dead body interface for persistent bodies
export interface DeadBody {
  id: string;
  originalNPCId: string;
  name: string;
  description: string;
  bodyState: BodyState;
  originalLoot?: Item[];
  originalPossessions?: Item[];
  searchedBy: string[]; // Player IDs who have searched this body
  roomId: string; // Current location of the body
  originalOccupation?: string; // The NPC's occupation for loot generation
}

export interface Monster {
  id: string;
  name: string;
  description: string;
  health: number;
  maxHealth: number;
  damage: number;
  loot?: Item[];
  behavior: 'aggressive' | 'neutral' | 'friendly';
  
  // Enhanced emotional and social systems (for humanoid NPCs)
  currentEmotion?: EmotionalState;
  emotionalHistory?: EmotionalState[];
  rapport?: Map<string, RapportLevel>;
  memory?: NPCMemory;
  
  // Conversation system (for humanoid NPCs)
  conversationState?: ConversationState;
  dialogueOptions?: DialogueOption[];
  currentTopic?: string;
  
  // Physical and persistent state
  isDead?: boolean;
  deathTimestamp?: number;
  bodyState?: BodyState;
  
  // Unique traits (for humanoid NPCs)
  occupation?: string;
  goals?: string[];
  secrets?: string[];
  possessions?: Item[];
  
  // Interaction preferences (for humanoid NPCs)
  communicationStyle?: CommunicationStyle;
  tradingPreferences?: TradingPreferences;
}

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  duration: number; // turns remaining
  type: 'buff' | 'debuff' | 'neutral';
  effects: Record<string, any>; // Flexible effects
}

export interface Door {
  id: string;
  direction: 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
  description: string;
  locked: boolean;
  keyRequired?: string; // item id if locked
  leadsTo?: string; // room id
}

export interface Room {
  id: string;
  name: string;
  description: string;
  items: Item[];
  monsters: Monster[];
  doors: Door[];
  visited: boolean;
  specialFeatures?: string[]; // Things player can interact with
  deadBodies?: DeadBody[]; // Persistent bodies in this room
  emotionalAtmosphere?: string; // Overall emotional feeling of the room
  recentEvents?: string[]; // Recent events that NPCs might remember
}

export interface Player {
  name: string;
  health: number;
  maxHealth: number;
  level: number;
  experience: number;
  experienceToNext: number;
  inventory: Item[];
  equippedItems: {
    weapon?: Item;
    armor?: Item;
    accessory?: Item;
  };
  statuses: StatusEffect[];
  position: Position;
  currentRoomId: string;
}

export interface GameEvent {
  id: string;
  timestamp: number;
  type: 'action' | 'combat' | 'discovery' | 'system' | 'levelup';
  message: string;
  details?: Record<string, any>;
}

export interface EmotionalEvent {
  id: string;
  timestamp: number;
  type: string;
  description: string;
  affectedNPCs: string[];
  playerInvolved: boolean;
  location: string;
  significance: number;
}

export interface GameState {
  id: string;
  player: Player;
  rooms: Map<string, Room>;
  currentTurn: number;
  gameLog: GameEvent[];
  gameOver: boolean;
  victory: boolean;
  deadBodies?: Map<string, DeadBody>; // Global dead body registry
  globalRapport?: number; // Player's overall reputation
  emotionalEvents?: EmotionalEvent[];
}

// Action types that players can perform
export interface PlayerAction {
  type: 'move' | 'take' | 'use' | 'attack' | 'talk' | 'examine' | 'craft' | 'search' | 'custom';
  target?: string; // item id, monster id, direction, body id, etc.
  details?: string; // for custom actions
}

// Response from the dungeon master
export interface DungeonMasterResponse {
  message: string;
  success: boolean;
  updatedGameState: GameState;
  generatedContent?: {
    newRooms?: Room[];
    newItems?: Item[];
    newMonsters?: Monster[];
    newEvents?: GameEvent[];
  };
}

// LLM evaluation of player intent
export interface ActionEvaluation {
  narrative: string;
  success: boolean;
  intendedActions: {
    type: string;
    targets: string[];
    details?: any;
  }[];
  consequences: string[];
}