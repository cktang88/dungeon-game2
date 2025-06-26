# Comprehensive Emotional State System Design for Humanoid NPCs

## Overview

This document outlines a comprehensive emotional state system for humanoid NPCs with rapport tracking, memory, and persistent relationships. The system addresses key issues from user experience:

- **NPC Dialogue**: NPCs not speaking (like Griznak)
- **Emotional Persistence**: Inconsistent emotional states across interactions
- **Body Persistence**: Bodies disappearing after death
- **Relationship Memory**: NPCs forgetting player interactions
- **Character Development**: Lack of personality evolution based on player actions

## 1. Enhanced TypeScript Types

### Core Emotional State Types

```typescript
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

// Enhanced NPC with emotional states
export interface HumanoidNPC {
  id: string;
  name: string;
  description: string;
  
  // Core stats
  health: number;
  maxHealth: number;
  damage: number;
  behavior: NPCBehavior;
  
  // Emotional and social systems
  currentEmotion: EmotionalState;
  emotionalHistory: EmotionalState[];
  rapport: Map<string, RapportLevel>; // Keyed by entity ID
  memory: NPCMemory;
  
  // Conversation system
  conversationState: ConversationState;
  dialogueOptions: DialogueOption[];
  currentTopic?: string;
  
  // Physical and persistent state
  isDead: boolean;
  deathTimestamp?: number;
  bodyState?: BodyState;
  
  // Unique traits
  occupation?: string;
  goals: string[];
  secrets: string[];
  possessions: Item[];
  
  // Interaction preferences
  communicationStyle: CommunicationStyle;
  tradingPreferences?: TradingPreferences;
  
  // Loot (only if killed)
  loot?: Item[];
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

// Game state extensions
export interface EnhancedGameState extends GameState {
  npcs: Map<string, HumanoidNPC>;
  deadBodies: Map<string, HumanoidNPC>; // Persistent dead NPCs
  globalRapport: number; // Player's overall reputation
  emotionalEvents: EmotionalEvent[];
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
```

## 2. BAML Schema Enhancements

### Enhanced NPC Generation Schema

```baml
// Enhanced emotional and social classes for NPCs
enum EmotionalCore {
  HAPPY
  EXCITED
  CONTENT
  GRATEFUL
  ADMIRING
  CURIOUS
  PLAYFUL
  CONFIDENT
  ANGRY
  FEARFUL
  SAD
  DISGUSTED
  JEALOUS
  FRUSTRATED
  SUSPICIOUS
  HOSTILE
  CALM
  BORED
  FOCUSED
  THOUGHTFUL
  INDIFFERENT
}

enum RapportCategory {
  MORTAL_ENEMY
  ENEMY
  HOSTILE
  UNFRIENDLY
  NEUTRAL
  FRIENDLY
  ALLY
  CLOSE_FRIEND
  DEVOTED
}

enum ConversationMood {
  WELCOMING
  CAUTIOUS
  EAGER
  BORED
  IMPATIENT
  SUSPICIOUS
  FRIENDLY
  HOSTILE
  FEARFUL
  ROMANTIC
  BUSINESS
}

class EmotionalState {
  primary_emotion EmotionalCore @description("Main emotional state")
  secondary_emotion EmotionalCore? @description("Secondary emotional undertone")
  intensity int @description("Emotional intensity 0-10")
  cause string @description("What caused this emotional state")
  target_entity string? @description("Who this emotion is directed at")
  stability int @description("How stable this emotion is 0-10")
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
  emotional_tone EmotionalCore @description("Emotional tone of response")
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

class TradingPreferences {
  will_trade bool @description("Whether this NPC trades")
  preferred_items string[] @description("Items they especially want")
  disliked_items string[] @description("Items they won't trade for")
  price_modifier float @description("Price adjustment 0.5-2.0")
  relationship_matters bool @description("Does rapport affect prices")
}

// Enhanced NPC class with emotional intelligence
class HumanoidNPC {
  id string @description("Unique identifier")
  name string @description("NPC name")
  description string @description("Physical appearance and initial impression")
  
  // Core stats
  health int @description("Current health")
  max_health int @description("Maximum health")
  damage int @description("Base damage if fighting")
  behavior string @description("Current behavior pattern")
  
  // Emotional and social
  current_emotion EmotionalState @description("Current emotional state")
  personality_traits PersonalityTrait[] @description("Core personality traits")
  key_memories NPCMemory[] @description("Significant memories shaping behavior")
  communication_style CommunicationStyle @description("How they communicate")
  
  // Conversation system
  conversation_mood ConversationMood @description("Current mood for conversation")
  available_topics ConversationTopic[] @description("Topics they can discuss")
  greeting_options DialogueOption[] @description("How they greet the player")
  
  // Background and motivation
  occupation string? @description("What they do for a living")
  goals string[] @description("What they want to achieve")
  fears string[] @description("What they're afraid of")
  secrets string[] @description("Information they're hiding")
  
  // Trading and items
  trading_preferences TradingPreferences? @description("Trading behavior if applicable")
  possessions Item[] @description("Items they carry or own")
  
  // Dialogue lines for various situations
  combat_dialogue string[] @description("Things they might say in combat")
  friendly_dialogue string[] @description("Casual conversation options")
  trade_dialogue string[] @description("Trading-related responses")
  quest_dialogue string[] @description("Quest-related conversation")
  
  // Relationship with player starts neutral
  initial_rapport int @description("Starting rapport with player -10 to 10")
}

// Enhanced conversation processing
class ConversationResponse {
  npc_response string @description("What the NPC says in response")
  emotional_tone EmotionalCore @description("Emotional tone of response")
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

// Enhanced room generation with persistent NPCs
class RoomWithNPCs {
  id string @description("Unique identifier")
  name string @description("Room name")
  description string @description("Room description")
  items Item[] @description("Items in the room")
  monsters Monster[] @description("Hostile creatures")
  npcs HumanoidNPC[] @description("Friendly or neutral NPCs")
  dead_bodies string[] @description("IDs of dead NPCs whose bodies remain")
  doors Door[] @description("Available exits")
  emotional_atmosphere string @description("Overall emotional feeling of the room")
  recent_events string[] @description("Recent events that NPCs might remember")
}

// Functions for emotional state processing
function ProcessNPCInteraction(
  npc: HumanoidNPC,
  player_action: string,
  player_rapport: int,
  room_context: string,
  interaction_history: string[]
) -> ConversationResponse {
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

function UpdateNPCEmotionalState(
  npc: HumanoidNPC,
  triggering_event: string,
  event_context: string,
  witnesses: string[],
  player_involved: bool
) -> EmotionalState {
  client GeminiFlash
  prompt #"
    An event has occurred that may affect this NPC's emotional state.
    
    NPC: {{ npc.name }}
    Current emotion: {{ npc.current_emotion.primary_emotion }} ({{ npc.current_emotion.intensity }}/10)
    Personality: {{ npc.personality_traits }}
    
    Triggering event: {{ triggering_event }}
    Context: {{ event_context }}
    Other witnesses: {{ witnesses }}
    Player involved: {{ player_involved }}
    
    Consider how this NPC would emotionally react based on:
    1. Their current emotional state
    2. Their personality traits and typical reactions
    3. Their relationship with those involved
    4. The severity and nature of the event
    5. Their personal fears, goals, and values
    
    Determine their new emotional state, considering:
    - Primary emotion (main feeling)
    - Secondary emotion (undertone)
    - Intensity (0-10)
    - Stability (how long this emotion will last)
    - What specifically caused this emotional change
    
    {{ ctx.output_format }}
  "#
}

function GenerateNPCMemory(
  npc: HumanoidNPC,
  event_description: string,
  participants: string[],
  emotional_impact: EmotionalCore,
  location: string
) -> NPCMemory {
  client GeminiFlash
  prompt #"
    Create a memory for this NPC based on a recent event.
    
    NPC: {{ npc.name }}
    Personality: {{ npc.personality_traits }}
    
    Event: {{ event_description }}
    Participants: {{ participants }}
    Emotional impact: {{ emotional_impact }}
    Location: {{ location }}
    
    Generate a memory that:
    1. Captures how the NPC perceived and interpreted the event
    2. Reflects their personality and emotional state
    3. Includes relevant details they would remember
    4. Considers how this might affect future interactions
    5. Determines the emotional weight and significance
    
    The memory should feel personal to this NPC's perspective and experiences.
    
    {{ ctx.output_format }}
  "#
}

// Enhanced room generation with emotional context
function GenerateRoomWithEmotionalContext(
  theme: string,
  difficulty: int,
  connected_directions: Direction[],
  recent_player_actions: string[],
  global_reputation: int
) -> RoomWithNPCs {
  client GeminiFlash
  prompt #"
    Generate a room with emotionally intelligent NPCs who may react to the player's reputation.
    
    Theme: {{ theme }}
    Difficulty: {{ difficulty }}/10
    Required exits: {{ connected_directions }}
    Player's recent actions: {{ recent_player_actions }}
    Player's global reputation: {{ global_reputation }}/100
    
    Create a room with:
    1. Detailed atmospheric description
    2. 0-3 items (mix of consumables, tools, treasures)
    3. 0-2 hostile monsters
    4. 1-3 NPCs with rich personalities and emotional states
    
    NPCs should:
    - Have distinct personalities and motivations
    - React appropriately to the player's reputation
    - Have their own goals and stories
    - Offer meaningful interactions (trade, information, quests)
    - Feel like real people with emotions and memories
    
    Consider the player's recent actions when determining:
    - NPC initial attitudes and rapport
    - Conversation topics available
    - Trading willingness and prices
    - Overall room atmosphere
    
    Make NPCs memorable through:
    - Unique personality traits
    - Interesting backstories
    - Emotional depth and reactions
    - Meaningful dialogue options
    - Clear motivations and goals
    
    {{ ctx.output_format }}
  "#
}
```

## 3. Game Engine Integration

### Enhanced Game Engine Methods

```typescript
// Add to GameEngine class
export class EnhancedGameEngine extends GameEngine {
  private npcEmotionalStates: Map<string, EmotionalState> = new Map();
  private npcRapport: Map<string, Map<string, RapportLevel>> = new Map();
  private npcMemories: Map<string, NPCMemory> = new Map();
  private deadBodies: Map<string, HumanoidNPC> = new Map();
  private globalReputation: number = 0;

  // Enhanced NPC management
  async updateNPCEmotionalStates(event: EmotionalEvent): Promise<void> {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
    if (!currentRoom) return;

    // Find all NPCs in current room
    const npcsInRoom = currentRoom.monsters.filter(m => this.isHumanoidNPC(m));
    
    for (const npc of npcsInRoom) {
      if (this.shouldNPCReactToEvent(npc, event)) {
        const newEmotionalState = await this.api.updateNPCEmotionalState({
          npc,
          event,
          currentRapport: this.getNPCRapport(npc.id, this.gameState.player.name),
          roomContext: currentRoom.description
        });
        
        this.npcEmotionalStates.set(npc.id, newEmotionalState);
        
        // Update NPC's behavior based on new emotional state
        this.updateNPCBehavior(npc, newEmotionalState);
        
        // Create memory of this event
        await this.createNPCMemory(npc, event);
      }
    }
  }

  private shouldNPCReactToEvent(npc: any, event: EmotionalEvent): boolean {
    // Check if NPC should react based on:
    // - Distance from event
    // - Relationship with participants
    // - Personality traits
    // - Current emotional state
    
    const currentEmotion = this.npcEmotionalStates.get(npc.id);
    const rapport = this.getNPCRapport(npc.id, this.gameState.player.name);
    
    // High rapport NPCs care more about player actions
    if (event.playerInvolved && rapport && Math.abs(rapport.level) > 20) {
      return true;
    }
    
    // Emotional NPCs react more to events
    if (currentEmotion && currentEmotion.intensity > 7) {
      return true;
    }
    
    // Always react to violence in the same room
    if (event.type.includes('violence') || event.type.includes('death')) {
      return true;
    }
    
    return false;
  }

  private updateNPCBehavior(npc: any, emotionalState: EmotionalState): void {
    // Update NPC behavior based on emotional state
    switch (emotionalState.primary.emotion) {
      case BaseEmotion.FEARFUL:
        if (emotionalState.intensity > 7) {
          npc.behavior = NPCBehavior.FLEEING;
        } else {
          npc.behavior = NPCBehavior.DEFENSIVE;
        }
        break;
      
      case BaseEmotion.ANGRY:
        if (emotionalState.intensity > 6) {
          npc.behavior = NPCBehavior.HOSTILE;
        } else {
          npc.behavior = NPCBehavior.AGGRESSIVE;
        }
        break;
      
      case BaseEmotion.HAPPY:
      case BaseEmotion.GRATEFUL:
        npc.behavior = NPCBehavior.FRIENDLY;
        break;
      
      case BaseEmotion.SUSPICIOUS:
        npc.behavior = NPCBehavior.DEFENSIVE;
        break;
      
      default:
        npc.behavior = NPCBehavior.NEUTRAL;
    }
  }

  async processNPCInteraction(npcId: string, playerAction: string): Promise<ConversationResponse> {
    const npc = this.findNPCById(npcId);
    if (!npc) throw new Error('NPC not found');

    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
    const rapport = this.getNPCRapport(npcId, this.gameState.player.name);
    const interactionHistory = this.getInteractionHistory(npcId);

    const response = await this.api.processNPCInteraction({
      npc,
      playerAction,
      playerRapport: rapport?.level || 0,
      roomContext: currentRoom?.description || '',
      interactionHistory
    });

    // Apply consequences of the interaction
    if (response.rapportChange !== 0) {
      this.updateNPCRapport(npcId, this.gameState.player.name, response.rapportChange);
    }

    if (response.emotionalChange) {
      this.npcEmotionalStates.set(npcId, response.emotionalChange);
      this.updateNPCBehavior(npc, response.emotionalChange);
    }

    // Process any actions the NPC takes
    for (const action of response.actions) {
      await this.executeNPCAction(npc, action);
    }

    // Create memory of this interaction
    if (response.memoryFormed) {
      await this.createNPCMemory(npc, {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'conversation',
        description: response.memoryFormed,
        affectedNPCs: [npcId],
        playerInvolved: true,
        location: this.gameState.player.currentRoomId,
        significance: Math.abs(response.rapportChange) + 1
      });
    }

    return response;
  }

  private async executeNPCAction(npc: any, action: NPCAction): Promise<void> {
    switch (action.action_type) {
      case 'give_item':
        await this.handleNPCGiveItem(npc, action.parameters);
        break;
      case 'take_item':
        await this.handleNPCTakeItem(npc, action.parameters);
        break;
      case 'attack':
        await this.handleNPCAttack(npc, action.parameters);
        break;
      case 'flee':
        await this.handleNPCFlee(npc, action.parameters);
        break;
      case 'offer_quest':
        await this.handleNPCOfferQuest(npc, action.parameters);
        break;
      case 'reveal_secret':
        await this.handleNPCRevealSecret(npc, action.parameters);
        break;
    }
  }

  private async handleNPCGiveItem(npc: any, parameters: Record<string, any>): Promise<void> {
    const itemName = parameters.item_name;
    const message = parameters.message || `${npc.name} gives you ${itemName}`;
    
    // Find item in NPC's possessions
    const itemIndex = npc.possessions?.findIndex((item: Item) => 
      item.name.toLowerCase().includes(itemName.toLowerCase())
    );
    
    if (itemIndex !== undefined && itemIndex !== -1 && npc.possessions) {
      const item = npc.possessions.splice(itemIndex, 1)[0];
      this.gameState.player.inventory.push(item);
      this.addGameEvent('action', message);
      
      // This is a significant positive interaction
      this.updateNPCRapport(npc.id, this.gameState.player.name, 5);
    }
  }

  private async handleNPCAttack(npc: any, parameters: Record<string, any>): Promise<void> {
    const target = parameters.target || this.gameState.player.name;
    const damage = npc.damage || 10;
    
    if (target === this.gameState.player.name) {
      this.gameState.player.health -= damage;
      this.addGameEvent('combat', `${npc.name} attacks you for ${damage} damage!`);
      
      // Attacking creates a strong negative relationship
      this.updateNPCRapport(npc.id, this.gameState.player.name, -20);
      
      // Create emotional event for other NPCs to witness
      await this.createEmotionalEvent({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'npc_attacks_player',
        description: `${npc.name} attacked the player`,
        affectedNPCs: [npc.id],
        playerInvolved: true,
        location: this.gameState.player.currentRoomId,
        significance: 8
      });
      
      if (this.gameState.player.health <= 0) {
        this.gameState.gameOver = true;
        this.addGameEvent('system', `You have been killed by ${npc.name}!`);
      }
    }
  }

  private async handleNPCFlee(npc: any, parameters: Record<string, any>): Promise<void> {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
    if (!currentRoom) return;
    
    // Remove NPC from current room
    const npcIndex = currentRoom.monsters.findIndex(m => m.id === npc.id);
    if (npcIndex !== -1) {
      currentRoom.monsters.splice(npcIndex, 1);
      this.addGameEvent('action', `${npc.name} flees from the room!`);
      
      // NPC might appear in a different room later
      // For now, just remove them from the current encounter
    }
  }

  // Handle NPC death with body persistence
  async handleNPCDeath(npc: any, cause: string): Promise<void> {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
    if (!currentRoom) return;

    // Remove from living NPCs
    const npcIndex = currentRoom.monsters.findIndex(m => m.id === npc.id);
    if (npcIndex !== -1) {
      currentRoom.monsters.splice(npcIndex, 1);
    }

    // Create persistent body
    const deadNPC: HumanoidNPC = {
      ...npc,
      isDead: true,
      deathTimestamp: Date.now(),
      bodyState: {
        condition: BodyCondition.FRESH,
        timeOfDeath: Date.now(),
        causeOfDeath: cause,
        decompositionLevel: 0,
        searchable: true,
        witnessedByNPCs: this.getNPCWitnesses(currentRoom)
      }
    };

    this.deadBodies.set(npc.id, deadNPC);

    // Create emotional event for witnesses
    await this.createEmotionalEvent({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'npc_death',
      description: `${npc.name} was killed by ${cause}`,
      affectedNPCs: this.getNPCWitnesses(currentRoom),
      playerInvolved: cause.includes('player') || cause.includes('you'),
      location: this.gameState.player.currentRoomId,
      significance: 9
    });

    // Update global reputation if player was involved
    if (cause.includes('player') || cause.includes('you')) {
      this.updateGlobalReputation(npc, -10); // Killing NPCs hurts reputation
    }

    this.addGameEvent('combat', `${npc.name} has died from ${cause}.`);
  }

  private getNPCWitnesses(room: Room): string[] {
    return room.monsters
      .filter(m => this.isHumanoidNPC(m) && m.id !== this.gameState.player.name)
      .map(m => m.id);
  }

  private updateGlobalReputation(npc: any, change: number): void {
    // Adjust based on NPC's role and player's existing reputation
    const reputationChange = change * (npc.occupation === 'guard' ? 2 : 1);
    this.globalReputation = Math.max(-100, Math.min(100, this.globalReputation + reputationChange));
    
    this.addGameEvent('system', `Your reputation has ${change > 0 ? 'improved' : 'worsened'}.`);
  }

  // Body management and decomposition
  updateBodies(): void {
    const currentTime = Date.now();
    const roomBodies = Array.from(this.deadBodies.values())
      .filter(body => this.getBodyLocation(body.id) === this.gameState.player.currentRoomId);

    for (const body of roomBodies) {
      if (!body.bodyState) continue;

      const timeSinceDeath = currentTime - body.bodyState.timeOfDeath;
      const hoursSinceDeath = timeSinceDeath / (1000 * 60 * 60);

      // Update decomposition
      if (hoursSinceDeath > 24) {
        body.bodyState.condition = BodyCondition.DECOMPOSING;
        body.bodyState.decompositionLevel = Math.min(10, Math.floor(hoursSinceDeath / 24));
      } else if (hoursSinceDeath > 2) {
        body.bodyState.condition = BodyCondition.RECENTLY_DEAD;
      }

      // Bodies become unsearchable after heavy decomposition
      if (body.bodyState.decompositionLevel > 7) {
        body.bodyState.searchable = false;
      }

      // Remove completely decomposed bodies
      if (body.bodyState.decompositionLevel >= 10) {
        this.deadBodies.delete(body.id);
        this.addGameEvent('system', `The remains of ${body.name} have completely decomposed.`);
      }
    }
  }

  searchBody(bodyId: string): Item[] {
    const body = this.deadBodies.get(bodyId);
    if (!body || !body.bodyState?.searchable) {
      return [];
    }

    const items = [...(body.loot || []), ...(body.possessions || [])];
    
    // Clear the body's items after searching
    if (body.loot) body.loot = [];
    if (body.possessions) body.possessions = [];
    body.bodyState.searchable = false;

    return items;
  }

  // Rapport management
  private updateNPCRapport(npcId: string, targetId: string, change: number): void {
    let npcRapport = this.npcRapport.get(npcId);
    if (!npcRapport) {
      npcRapport = new Map();
      this.npcRapport.set(npcId, npcRapport);
    }

    let rapport = npcRapport.get(targetId);
    if (!rapport) {
      rapport = {
        entityId: targetId,
        level: 0,
        category: RapportCategory.NEUTRAL,
        lastInteraction: Date.now(),
        significantEvents: [],
        trustLevel: 5,
        fearLevel: 0,
        respectLevel: 5
      };
    }

    rapport.level = Math.max(-100, Math.min(100, rapport.level + change));
    rapport.lastInteraction = Date.now();
    rapport.category = this.calculateRapportCategory(rapport.level);

    // Add significant event if the change is large
    if (Math.abs(change) >= 10) {
      rapport.significantEvents.push({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        eventType: change > 0 ? 'positive_interaction' : 'negative_interaction',
        description: `Rapport changed by ${change}`,
        rapportChange: change,
        emotionalImpact: change > 0 ? BaseEmotion.GRATEFUL : BaseEmotion.ANGRY,
        significance: Math.abs(change)
      });
    }

    npcRapport.set(targetId, rapport);
  }

  private calculateRapportCategory(level: number): RapportCategory {
    if (level >= 80) return RapportCategory.DEVOTED;
    if (level >= 40) return RapportCategory.CLOSE_FRIEND;
    if (level >= 20) return RapportCategory.ALLY;
    if (level >= 5) return RapportCategory.FRIENDLY;
    if (level >= -4) return RapportCategory.NEUTRAL;
    if (level >= -19) return RapportCategory.UNFRIENDLY;
    if (level >= -39) return RapportCategory.HOSTILE;
    if (level >= -79) return RapportCategory.ENEMY;
    return RapportCategory.MORTAL_ENEMY;
  }

  getNPCRapport(npcId: string, targetId: string): RapportLevel | null {
    const npcRapport = this.npcRapport.get(npcId);
    return npcRapport?.get(targetId) || null;
  }

  // Memory management
  private async createNPCMemory(npc: any, event: EmotionalEvent): Promise<void> {
    let memory = this.npcMemories.get(npc.id);
    if (!memory) {
      memory = {
        entityId: npc.id,
        memories: [],
        personalityTraits: [],
        coreBeliefs: [],
        fears: [],
        desires: [],
        habits: []
      };
      this.npcMemories.set(npc.id, memory);
    }

    const newMemory: Memory = {
      id: crypto.randomUUID(),
      timestamp: event.timestamp,
      type: this.determineMemoryType(event.type),
      content: event.description,
      participants: event.affectedNPCs,
      location: event.location,
      emotionalWeight: event.significance,
      clarity: 10, // Fresh memories start with full clarity
      relatedMemories: []
    };

    memory.memories.push(newMemory);

    // Link related memories
    this.linkRelatedMemories(memory, newMemory);

    // Fade old memories
    this.fadeMemories(memory);
  }

  private determineMemoryType(eventType: string): MemoryType {
    if (eventType.includes('conversation')) return MemoryType.CONVERSATION;
    if (eventType.includes('combat')) return MemoryType.COMBAT;
    if (eventType.includes('death')) return MemoryType.DEATH_WITNESSED;
    if (eventType.includes('trade')) return MemoryType.TRADE;
    if (eventType.includes('gift')) return MemoryType.GIFT_RECEIVED;
    if (eventType.includes('rescue')) return MemoryType.RESCUE;
    if (eventType.includes('betrayal')) return MemoryType.BETRAYAL;
    return MemoryType.CONVERSATION; // Default
  }

  private linkRelatedMemories(memory: NPCMemory, newMemory: Memory): void {
    // Find memories with same participants or location
    const relatedMemories = memory.memories.filter(m => 
      m.id !== newMemory.id && (
        m.participants.some(p => newMemory.participants.includes(p)) ||
        m.location === newMemory.location
      )
    );

    newMemory.relatedMemories = relatedMemories.slice(0, 5).map(m => m.id);
    
    // Update related memories to reference this new one
    relatedMemories.forEach(m => {
      if (m.relatedMemories.length < 5) {
        m.relatedMemories.push(newMemory.id);
      }
    });
  }

  private fadeMemories(memory: NPCMemory): void {
    const currentTime = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    memory.memories.forEach(m => {
      const age = currentTime - m.timestamp;
      if (age > oneWeek) {
        // Fade memories based on emotional weight and age
        const fadeFactor = Math.max(0.1, m.emotionalWeight / 10);
        m.clarity = Math.max(1, m.clarity - (age / oneWeek) * (1 - fadeFactor));
      }
    });

    // Remove completely faded unimportant memories
    memory.memories = memory.memories.filter(m => 
      m.clarity > 0.5 || m.emotionalWeight >= 7
    );
  }

  getInteractionHistory(npcId: string): string[] {
    const memory = this.npcMemories.get(npcId);
    if (!memory) return [];

    return memory.memories
      .filter(m => m.type === MemoryType.CONVERSATION && m.clarity > 3)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(m => m.content);
  }

  // Utility methods
  private isHumanoidNPC(entity: any): boolean {
    return entity.behavior === 'friendly' || 
           entity.behavior === 'neutral' || 
           entity.behavior === 'trading' ||
           entity.occupation !== undefined;
  }

  private findNPCById(npcId: string): any {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
    return currentRoom?.monsters.find(m => m.id === npcId);
  }

  private getBodyLocation(bodyId: string): string {
    // For now, assume bodies stay in the room where they died
    // In a more complex system, bodies could be moved
    return this.gameState.player.currentRoomId;
  }

  private async createEmotionalEvent(event: EmotionalEvent): Promise<void> {
    // Store the event
    this.gameState.emotionalEvents?.push(event);

    // Update emotional states of affected NPCs
    await this.updateNPCEmotionalStates(event);

    // Limit stored events to prevent memory bloat
    if (this.gameState.emotionalEvents && this.gameState.emotionalEvents.length > 100) {
      this.gameState.emotionalEvents = this.gameState.emotionalEvents.slice(-50);
    }
  }
}
```

## 4. API Structure

### Enhanced API Endpoints

```typescript
// Add to GameAPI class
export interface NPCInteractionRequest {
  npc: HumanoidNPC;
  playerAction: string;
  playerRapport: number;
  roomContext: string;
  interactionHistory: string[];
}

export interface EmotionalStateUpdateRequest {
  npc: HumanoidNPC;
  event: EmotionalEvent;
  currentRapport: RapportLevel | null;
  roomContext: string;
}

export interface NPCMemoryRequest {
  npc: HumanoidNPC;
  event: EmotionalEvent;
  existingMemories: Memory[];
}

export class EnhancedGameAPI extends GameAPI {
  // Process NPC conversations with emotional intelligence
  async processNPCInteraction(request: NPCInteractionRequest): Promise<ConversationResponse> {
    const response = await fetch(`${this.apiBase}/npc/interaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error('Failed to process NPC interaction');
    }
    
    return response.json();
  }

  // Update NPC emotional state based on events
  async updateNPCEmotionalState(request: EmotionalStateUpdateRequest): Promise<EmotionalState> {
    const response = await fetch(`${this.apiBase}/npc/emotion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update NPC emotional state');
    }
    
    return response.json();
  }

  // Create NPC memory from events
  async createNPCMemory(request: NPCMemoryRequest): Promise<Memory> {
    const response = await fetch(`${this.apiBase}/npc/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create NPC memory');
    }
    
    return response.json();
  }

  // Generate room with emotionally aware NPCs
  async generateRoomWithNPCs(request: {
    theme: string;
    difficulty: number;
    connectedDirections: string[];
    playerReputation: number;
    recentPlayerActions: string[];
  }): Promise<Room> {
    const response = await fetch(`${this.apiBase}/generate/room-with-npcs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate room with NPCs');
    }
    
    return response.json();
  }

  // Save and load persistent state
  async saveNPCState(gameId: string, npcData: {
    emotionalStates: Map<string, EmotionalState>;
    rapport: Map<string, Map<string, RapportLevel>>;
    memories: Map<string, NPCMemory>;
    deadBodies: Map<string, HumanoidNPC>;
    globalReputation: number;
  }): Promise<void> {
    const response = await fetch(`${this.apiBase}/save/npc-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        npcData: {
          emotionalStates: Array.from(npcData.emotionalStates.entries()),
          rapport: Array.from(npcData.rapport.entries()).map(([npcId, rapportMap]) => [
            npcId,
            Array.from(rapportMap.entries())
          ]),
          memories: Array.from(npcData.memories.entries()),
          deadBodies: Array.from(npcData.deadBodies.entries()),
          globalReputation: npcData.globalReputation
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save NPC state');
    }
  }

  async loadNPCState(gameId: string): Promise<{
    emotionalStates: Map<string, EmotionalState>;
    rapport: Map<string, Map<string, RapportLevel>>;
    memories: Map<string, NPCMemory>;
    deadBodies: Map<string, HumanoidNPC>;
    globalReputation: number;
  } | null> {
    const response = await fetch(`${this.apiBase}/load/npc-state/${gameId}`);
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to load NPC state');
    }
    
    const data = await response.json();
    
    return {
      emotionalStates: new Map(data.emotionalStates),
      rapport: new Map(data.rapport.map(([npcId, rapportArray]: [string, any[]]) => [
        npcId,
        new Map(rapportArray)
      ])),
      memories: new Map(data.memories),
      deadBodies: new Map(data.deadBodies),
      globalReputation: data.globalReputation
    };
  }
}
```

### Enhanced Worker Handlers

```typescript
// Add to game handlers
gameRouter.post('/npc/interaction', async (c) => {
  try {
    const body = await c.req.json();
    const { npc, playerAction, playerRapport, roomContext, interactionHistory } = body;
    
    const prompt = `Process this NPC interaction with emotional intelligence.
    
    NPC: ${npc.name}
    Description: ${npc.description}
    Current emotion: ${npc.currentEmotion?.primary || 'calm'}
    Personality: ${npc.personalityTraits?.map((t: any) => `${t.trait} (${t.intensity}/10)`).join(', ') || 'unknown'}
    Communication style: Formality ${npc.communicationStyle?.formality}/10, Verbosity ${npc.communicationStyle?.verbosity}/10
    
    Player action: "${playerAction}"
    Current rapport: ${playerRapport}/100 (${getRapportCategory(playerRapport)})
    Room context: ${roomContext}
    Previous interactions: ${interactionHistory.join('; ')}
    
    Generate a response that:
    1. Matches the NPC's personality and emotional state
    2. Reflects their relationship with the player
    3. Considers the room context and situation
    4. May change their emotional state
    5. Could affect rapport (+/- 1-10 based on interaction)
    6. Might unlock new topics or trigger actions
    7. Creates a memorable character moment
    
    The NPC should feel like a real person with:
    - Consistent personality across interactions
    - Emotional reactions to player behavior
    - Memory of past interactions
    - Personal goals and motivations
    - Believable dialogue and responses
    `;

    const schema = {
      type: "object",
      properties: {
        npc_response: { type: "string" },
        emotional_tone: { type: "string" },
        rapport_change: { type: "integer" },
        emotional_change: {
          type: "object",
          properties: {
            primary_emotion: { type: "string" },
            secondary_emotion: { type: "string" },
            intensity: { type: "integer" },
            cause: { type: "string" },
            stability: { type: "integer" }
          }
        },
        new_topics: { type: "array", items: { type: "string" } },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              action_type: { type: "string" },
              description: { type: "string" },
              parameters: { type: "object" }
            }
          }
        },
        memory_formed: { type: "string" }
      },
      required: ["npc_response", "emotional_tone", "rapport_change"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    return c.json(response);
  } catch (error) {
    console.error('Error processing NPC interaction:', error);
    return c.json({ error: 'Failed to process NPC interaction' }, 500);
  }
});

gameRouter.post('/npc/emotion', async (c) => {
  try {
    const body = await c.req.json();
    const { npc, event, currentRapport, roomContext } = body;
    
    const prompt = `Update this NPC's emotional state based on a recent event.
    
    NPC: ${npc.name}
    Current emotion: ${npc.currentEmotion?.primary || 'calm'} (intensity: ${npc.currentEmotion?.intensity || 5})
    Personality: ${npc.personalityTraits?.map((t: any) => `${t.trait} (${t.intensity}/10)`).join(', ') || 'unknown'}
    
    Event: ${event.description}
    Event significance: ${event.significance}/10
    Player involved: ${event.playerInvolved}
    Current rapport with player: ${currentRapport?.level || 0}/100
    Room context: ${roomContext}
    
    Consider how this NPC would emotionally react based on:
    1. Their personality traits and typical reactions
    2. Their current emotional state
    3. Their relationship with those involved (especially the player)
    4. The nature and severity of the event
    5. Their personal values, fears, and goals
    
    Generate a new emotional state that feels authentic to this character.
    `;

    const schema = {
      type: "object",
      properties: {
        primary_emotion: { type: "string" },
        secondary_emotion: { type: "string" },
        intensity: { type: "integer" },
        cause: { type: "string" },
        stability: { type: "integer" },
        duration: { type: "integer" }
      },
      required: ["primary_emotion", "intensity", "cause", "stability"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    return c.json(response);
  } catch (error) {
    console.error('Error updating NPC emotional state:', error);
    return c.json({ error: 'Failed to update NPC emotional state' }, 500);
  }
});

gameRouter.post('/generate/room-with-npcs', async (c) => {
  try {
    const body = await c.req.json();
    const { theme, difficulty, connectedDirections, playerReputation, recentPlayerActions } = body;
    
    const reputationDesc = getReputationDescription(playerReputation);
    
    const prompt = `Generate a room with emotionally intelligent NPCs who react to the player's reputation.
    
    Theme: ${theme}
    Difficulty: ${difficulty}/10
    Required exits: ${connectedDirections.join(', ')}
    Player reputation: ${playerReputation}/100 (${reputationDesc})
    Recent player actions: ${recentPlayerActions.join(', ')}
    
    Create a room with rich NPCs that:
    1. Have distinct personalities and emotional states
    2. React appropriately to the player's reputation
    3. Offer meaningful interactions (conversation, trading, quests)
    4. Have their own goals, fears, and motivations
    5. Feel like real people with depth and history
    
    Include:
    - Detailed room description with atmosphere
    - 0-3 items (mix of useful and interesting)
    - 0-2 hostile creatures
    - 1-3 NPCs with rich emotional profiles
    
    NPCs should have:
    - Unique personality traits
    - Current emotional state with clear cause
    - Communication style preferences
    - Personal goals and background
    - Appropriate initial rapport based on player reputation
    - Interesting dialogue options
    - Potential for trading, information, or quests
    
    Make each NPC memorable and distinct!
    `;

    // Enhanced schema for rooms with complex NPCs
    const schema = {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        emotional_atmosphere: { type: "string" },
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
              quantity: { type: "integer" }
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
        npcs: {
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
              current_emotion: {
                type: "object",
                properties: {
                  primary: { type: "string" },
                  intensity: { type: "integer" },
                  cause: { type: "string" }
                }
              },
              personality_traits: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    trait: { type: "string" },
                    intensity: { type: "integer" },
                    description: { type: "string" }
                  }
                }
              },
              communication_style: {
                type: "object",
                properties: {
                  formality: { type: "integer" },
                  verbosity: { type: "integer" },
                  emotiveness: { type: "integer" },
                  humor: { type: "integer" },
                  honesty: { type: "integer" }
                }
              },
              goals: { type: "array", items: { type: "string" } },
              fears: { type: "array", items: { type: "string" } },
              secrets: { type: "array", items: { type: "string" } },
              initial_rapport: { type: "integer" },
              greeting_options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    emotional_tone: { type: "string" },
                    rapport_requirement: { type: "integer" }
                  }
                }
              },
              trading_preferences: {
                type: "object",
                properties: {
                  will_trade: { type: "boolean" },
                  preferred_items: { type: "array", items: { type: "string" } },
                  price_modifier: { type: "number" }
                }
              },
              possessions: {
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
        specialFeatures: { type: "array", items: { type: "string" } }
      },
      required: ["id", "name", "description", "items", "monsters", "npcs", "doors"]
    };
    
    const response = await callGemini(c.env.GOOGLE_API_KEY, prompt, schema);
    
    // Generate unique IDs for all entities
    response.id = crypto.randomUUID();
    response.items?.forEach((item: any) => { item.id = crypto.randomUUID(); });
    response.monsters?.forEach((monster: any) => { monster.id = crypto.randomUUID(); });
    response.npcs?.forEach((npc: any) => { 
      npc.id = crypto.randomUUID();
      npc.possessions?.forEach((item: any) => { item.id = crypto.randomUUID(); });
    });
    response.doors?.forEach((door: any) => { door.id = crypto.randomUUID(); });
    
    return c.json(response);
  } catch (error) {
    console.error('Error generating room with NPCs:', error);
    return c.json({ error: 'Failed to generate room with NPCs' }, 500);
  }
});

// Helper functions
function getRapportCategory(level: number): string {
  if (level >= 80) return 'devoted';
  if (level >= 40) return 'close friend';
  if (level >= 20) return 'ally';
  if (level >= 5) return 'friendly';
  if (level >= -4) return 'neutral';
  if (level >= -19) return 'unfriendly';
  if (level >= -39) return 'hostile';
  if (level >= -79) return 'enemy';
  return 'mortal enemy';
}

function getReputationDescription(reputation: number): string {
  if (reputation >= 80) return 'legendary hero';
  if (reputation >= 60) return 'well-known hero';
  if (reputation >= 40) return 'respected adventurer';
  if (reputation >= 20) return 'known do-gooder';
  if (reputation >= -10) return 'unknown';
  if (reputation >= -30) return 'suspicious character';
  if (reputation >= -50) return 'known troublemaker';
  if (reputation >= -70) return 'dangerous criminal';
  return 'feared villain';
}
```

## 5. Persistence Strategy

### Data Storage Structure

```typescript
// Database schema for persistent emotional states
export interface GameSaveData {
  gameId: string;
  playerId: string;
  createdAt: number;
  lastPlayed: number;
  
  // Core game state
  coreGameState: GameState;
  
  // Extended NPC state
  npcData: {
    emotionalStates: [string, EmotionalState][]; // NPC ID -> Emotional State
    rapportLevels: [string, [string, RapportLevel][]][]; // NPC ID -> (Target ID -> Rapport)
    memories: [string, NPCMemory][]; // NPC ID -> Memory
    deadBodies: [string, HumanoidNPC][]; // Body ID -> NPC Data
    globalReputation: number;
    emotionalEvents: EmotionalEvent[];
  };
  
  // Room persistence with NPC locations
  roomNPCMapping: [string, string[]][]; // Room ID -> NPC IDs
  
  // Player relationship history
  playerRelationships: {
    totalNPCsInteracted: number;
    averageRapport: number;
    significantRelationships: string[]; // NPC IDs with |rapport| > 40
    majorEvents: EmotionalEvent[];
  };
}

// Persistence manager
export class NPCPersistenceManager {
  private saveInterval: number = 30000; // 30 seconds
  private autoSaveTimer?: NodeJS.Timeout;

  constructor(private gameEngine: EnhancedGameEngine, private api: EnhancedGameAPI) {
    this.startAutoSave();
  }

  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(() => {
      this.saveGameState();
    }, this.saveInterval);
  }

  async saveGameState(): Promise<void> {
    try {
      const gameState = this.gameEngine.getGameState();
      const npcData = this.extractNPCData();
      
      await this.api.saveNPCState(gameState.id, npcData);
      console.log('NPC state saved successfully');
    } catch (error) {
      console.error('Failed to save NPC state:', error);
    }
  }

  async loadGameState(gameId: string): Promise<boolean> {
    try {
      const savedNPCData = await this.api.loadNPCState(gameId);
      if (!savedNPCData) return false;

      this.restoreNPCData(savedNPCData);
      console.log('NPC state loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load NPC state:', error);
      return false;
    }
  }

  private extractNPCData(): {
    emotionalStates: Map<string, EmotionalState>;
    rapport: Map<string, Map<string, RapportLevel>>;
    memories: Map<string, NPCMemory>;
    deadBodies: Map<string, HumanoidNPC>;
    globalReputation: number;
  } {
    // Extract data from the enhanced game engine
    return {
      emotionalStates: this.gameEngine['npcEmotionalStates'],
      rapport: this.gameEngine['npcRapport'],
      memories: this.gameEngine['npcMemories'],
      deadBodies: this.gameEngine['deadBodies'],
      globalReputation: this.gameEngine['globalReputation']
    };
  }

  private restoreNPCData(data: {
    emotionalStates: Map<string, EmotionalState>;
    rapport: Map<string, Map<string, RapportLevel>>;
    memories: Map<string, NPCMemory>;
    deadBodies: Map<string, HumanoidNPC>;
    globalReputation: number;
  }): void {
    // Restore data to the enhanced game engine
    this.gameEngine['npcEmotionalStates'] = data.emotionalStates;
    this.gameEngine['npcRapport'] = data.rapport;
    this.gameEngine['npcMemories'] = data.memories;
    this.gameEngine['deadBodies'] = data.deadBodies;
    this.gameEngine['globalReputation'] = data.globalReputation;
  }

  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = undefined;
    }
  }

  // Manual save for important moments
  async saveImportantMoment(reason: string): Promise<void> {
    await this.saveGameState();
    console.log(`Game state saved: ${reason}`);
  }
}
```

## 6. Example Use Cases

### Example 1: Meeting Griznak the Blacksmith

```typescript
// When player first encounters Griznak
const griznak: HumanoidNPC = {
  id: "griznak_001",
  name: "Griznak the Blacksmith",
  description: "A burly orc with intricate tattoos covering his muscular arms. His hands are stained with soot and he wears a leather apron over simple clothes.",
  
  // Stats
  health: 80,
  maxHealth: 80,
  damage: 15,
  behavior: NPCBehavior.NEUTRAL,
  
  // Emotional state
  currentEmotion: {
    id: "emotion_001",
    primary: {
      emotion: BaseEmotion.FOCUSED,
      cause: "Working on a complex sword commission",
      targetEntityId: undefined
    },
    secondary: {
      emotion: BaseEmotion.SUSPICIOUS,
      cause: "Strangers often mean trouble",
      targetEntityId: "player"
    },
    intensity: 6,
    stability: 8,
    triggers: [],
    duration: -1, // Persistent
    lastUpdated: Date.now()
  },
  
  // Personality
  personalityTraits: [
    { trait: "Perfectionist", intensity: 9, description: "Takes great pride in craftsmanship" },
    { trait: "Cautious", intensity: 7, description: "Doesn't trust easily, but loyal once earned" },
    { trait: "Gruff", intensity: 6, description: "Speaks bluntly but not unkindly" }
  ],
  
  // Communication style
  communicationStyle: {
    formality: 3, // Casual
    verbosity: 4, // Moderate
    emotiveness: 2, // Stoic
    humor: 3, // Dry humor
    honesty: 9 // Very honest
  },
  
  // Background
  occupation: "blacksmith",
  goals: ["Complete the noble's sword commission", "Improve forge efficiency", "Train an apprentice"],
  secrets: ["Knows location of rare metal deposits", "Has noble's daughter's favor"],
  fears: ["Fire getting out of control", "Disappointing customers", "Orcs being persecuted"],
  
  // Dialogue system
  conversationState: {
    isActive: false,
    turn: 0,
    mood: ConversationMood.CAUTIOUS,
    topics: [
      {
        id: "blacksmithing",
        subject: "Blacksmithing and metalwork",
        playerInterest: 0,
        npcWillingness: 8,
        requiresRapport: -10,
        onceOnly: false,
        responses: [
          {
            id: "blacksmith_passion",
            text: "Been working the forge for thirty years. Each piece of metal has its own spirit - you have to listen to it, understand it, before you can shape it into something worthy.",
            emotionalTone: BaseEmotion.CONTENT,
            rapportChange: 2,
            followUpTopics: ["apprenticeship", "rare_metals"],
            actions: []
          }
        ]
      },
      {
        id: "current_work",
        subject: "Current smithing projects",
        playerInterest: 0,
        npcWillingness: 6,
        requiresRapport: 0,
        onceOnly: false,
        responses: [
          {
            id: "noble_commission",
            text: "Working on a blade for some fancy noble. Demanding perfection, as they all do. *grunts* Though I suppose that's what they're paying for.",
            emotionalTone: BaseEmotion.FRUSTRATED,
            rapportChange: 1,
            followUpTopics: ["nobles", "payment"],
            actions: []
          }
        ]
      }
    ],
    questsOffered: [],
    questsCompleted: []
  },
  
  // Initial greeting options based on player reputation
  dialogueOptions: [
    {
      id: "greeting_neutral",
      text: "*Looks up from anvil, hammer paused mid-swing* What do you want? I'm busy.",
      requirements: [{ type: 'rapport', value: { min: -20, max: 20 } }],
      consequences: [{ type: 'rapport_change', parameters: { change: 0 } }]
    },
    {
      id: "greeting_good_rep",
      text: "*Nods respectfully* Heard good things about you, traveler. What brings you to my forge?",
      requirements: [{ type: 'rapport', value: { min: 21 } }],
      consequences: [{ type: 'rapport_change', parameters: { change: 2 } }]
    },
    {
      id: "greeting_bad_rep",
      text: "*Grips hammer tighter, eyes narrowing* I know your reputation. State your business quickly and leave.",
      requirements: [{ type: 'rapport', value: { max: -21 } }],
      consequences: [{ type: 'rapport_change', parameters: { change: -1 } }]
    }
  ],
  
  // Trading
  tradingPreferences: {
    preferredItems: ["iron ore", "steel ingots", "rare gems", "coal"],
    dislikedItems: ["rotten food", "cursed items"],
    priceModifier: 1.0,
    relationshipBonus: true
  },
  
  possessions: [
    {
      id: "smithing_hammer",
      name: "Master's Smithing Hammer",
      description: "A well-worn hammer with perfect balance",
      type: "tool",
      stackable: false,
      quantity: 1,
      properties: { crafting_bonus: 3 }
    },
    {
      id: "iron_ingots",
      name: "Iron Ingots",
      description: "High-quality iron ready for forging",
      type: "material",
      stackable: true,
      quantity: 5,
      properties: { value: 10 }
    }
  ],
  
  // Memory and relationships
  rapport: new Map(),
  memory: {
    entityId: "griznak_001",
    memories: [],
    personalityTraits: [],
    coreBeliefs: [
      { belief: "Quality work speaks for itself", conviction: 9, source: "Lifetime of experience" },
      { belief: "Trust must be earned", conviction: 8, source: "Too many disappointments" }
    ],
    fears: [],
    desires: [
      { desire: "Create a masterwork weapon", urgency: 7, progress: 60 },
      { desire: "Find a worthy apprentice", urgency: 5, progress: 10 }
    ],
    habits: [
      { action: "Test blade sharpness on leather", frequency: "every weapon", triggers: ["finishing_weapon"] },
      { action: "Mutter complaints while working", frequency: "when frustrated", triggers: ["difficult_work"] }
    ]
  },
  
  isDead: false,
  loot: undefined // Only available if killed
};

// Example interaction flow
async function interactWithGriznak(playerAction: string): Promise<void> {
  // Player says: "I'd like to learn about blacksmithing"
  const response = await gameEngine.processNPCInteraction("griznak_001", playerAction);
  
  // Response might be:
  // {
  //   npc_response: "Been working the forge for thirty years. Each piece of metal has its own spirit - you have to listen to it, understand it, before you can shape it into something worthy.",
  //   emotional_tone: "content",
  //   rapport_change: 2,
  //   emotional_change: {
  //     primary_emotion: "content",
  //     intensity: 7,
  //     cause: "Sharing knowledge with interested student"
  //   },
  //   new_topics: ["apprenticeship", "rare_metals"],
  //   actions: [],
  //   memory_formed: "A traveler showed genuine interest in my craft"
  // }
}
```

### Example 2: Emotional Chain Reaction from Violence

```typescript
// Player kills a goblin in front of witnesses
async function handleGoblinDeath(): Promise<void> {
  const emotionalEvent: EmotionalEvent = {
    id: "goblin_death_001",
    timestamp: Date.now(),
    type: "witness_violence",
    description: "Player killed a goblin with brutal efficiency",
    affectedNPCs: ["griznak_001", "elara_healer"],
    playerInvolved: true,
    location: "forge_room",
    significance: 7
  };

  await gameEngine.createEmotionalEvent(emotionalEvent);
  
  // Griznak's reaction (neutral orc, respects strength but dislikes unnecessary violence)
  // New emotional state: Wary (primary), Respectful (secondary)
  // Rapport change: -2 (disapproves of violence in his shop)
  // Dialogue changes: "I see you're handy with that blade. Just... keep the blood outside my forge next time."
  
  // Elara's reaction (gentle healer, abhors violence)
  // New emotional state: Horrified (primary), Fearful (secondary)
  // Rapport change: -15 (strongly disapproves)
  // Behavior change: Defensive -> Fearful
  // Dialogue changes: "How... how could you? That creature had family, feelings! Stay away from me!"
  
  // Long-term consequences:
  // - Griznak will be more cautious but still trade
  // - Elara will refuse healing services until rapport is rebuilt
  // - Both will remember this event and reference it in future interactions
  // - Global reputation decreases by 5 points
}
```

### Example 3: Building Relationships Over Time

```typescript
// Progressive relationship building with multiple interactions
async function buildRelationshipWithElara(): Promise<void> {
  const elara = gameEngine.findNPCById("elara_healer");
  
  // Initial meeting: Neutral (0 rapport)
  // Player: "Hello, I'm looking for healing supplies"
  // Elara: "Welcome, traveler. I have some basic potions if you need them."
  
  // After helping her gather herbs (+10 rapport)
  // Player: "I brought those moonflowers you needed"
  // Elara: "Oh wonderful! These will make such potent healing salves. You're very kind." 
  // Emotional state: Grateful -> Happy
  
  // After defending her from bandits (+25 rapport, total: 35 - Ally level)
  // Player approaches
  // Elara: "My dear friend! I was just thinking about you. How are your wounds healing?"
  // New dialogue options unlock: Personal stories, advanced healing techniques, special potions
  
  // After romantic gesture (+15 rapport, total: 50 - Close Friend level)
  // Player: "I picked these flowers for you"
  // Elara: *blushes* "They're beautiful... just like the kindness you've shown me."
  // Conversation mood changes to: Romantic
  // New topics: Personal dreams, fears, future plans
  
  // Long-term relationship effects:
  // - Discount on healing items (20% off)
  // - Exclusive access to powerful healing potions
  // - Will join player in dangerous situations
  // - Remembers player's preferences and health status
  // - Emotional support during difficult times
  // - May eventually propose marriage or lifelong partnership
}
```

### Example 4: Persistent Bodies and Consequences

```typescript
// When an NPC dies, their body persists with emotional impact
async function handleNPCDeath(): Promise<void> {
  const merchantNPC = gameEngine.findNPCById("merchant_bob");
  
  // Bob is killed by monsters while player watches
  await gameEngine.handleNPCDeath(merchantNPC, "torn apart by dire wolves");
  
  // Body remains in room with searchable items
  const body = gameEngine.deadBodies.get("merchant_bob");
  // body.bodyState = {
  //   condition: BodyCondition.FRESH,
  //   timeOfDeath: Date.now(),
  //   causeOfDeath: "torn apart by dire wolves",
  //   decompositionLevel: 0,
  //   searchable: true,
  //   witnessedByNPCs: ["guard_captain", "tavern_keeper"]
  // }
  
  // Other NPCs react to the death:
  // Guard Captain: "Poor Bob... he was a good man. We need to find those wolves before they kill again."
  // Tavern Keeper: "I can't believe he's gone. He always had such wonderful stories from his travels."
  
  // Days later, body decomposes:
  // "The body of Merchant Bob is now showing signs of decay. The smell is becoming overwhelming."
  
  // Weeks later:
  // "Only skeletal remains of Merchant Bob remain, picked clean by scavengers."
  
  // NPCs remember and reference the death:
  // "Ever since Bob died, trade has been scarce. We really need someone to take over his routes."
  // "I still miss Bob's jokes. The tavern hasn't been the same without him."
  
  // Player reputation affected by how they handled the situation:
  // - Tried to save Bob: +5 reputation
  // - Watched Bob die without helping: -10 reputation
  // - Looted Bob's body immediately: -15 reputation
  // - Gave Bob a proper burial: +10 reputation
}
```

## 7. Implementation Roadmap

### Phase 1: Core Emotional System (Week 1-2)
1. Implement basic emotional state types and enums
2. Add emotional state tracking to NPCs
3. Create simple emotional reactions to player actions
4. Basic rapport system with positive/negative tracking

### Phase 2: Memory and Persistence (Week 3-4)
1. Implement NPC memory system
2. Add persistent body system
3. Create save/load functionality for emotional states
4. Basic conversation system with emotional context

### Phase 3: Advanced Interactions (Week 5-6)
1. Complex dialogue trees with emotional requirements
2. Trading system affected by relationships
3. Quest system integrated with NPC relationships
4. Global reputation system

### Phase 4: Polish and Balance (Week 7-8)
1. Fine-tune emotional reactions and triggers
2. Balance rapport changes and consequences
3. Add more personality types and communication styles
4. Extensive testing and bug fixes

### Phase 5: Advanced Features (Week 9-10)
1. NPC-to-NPC relationships and social networks
2. Romantic relationship system
3. Marriage and long-term partnerships
4. Community reputation and faction systems

## 8. Success Metrics

### Player Engagement
- Average conversation length with NPCs
- Number of repeat interactions with same NPCs
- Player emotional investment in NPC relationships
- Usage of relationship-based features (trading, quests, etc.)

### System Effectiveness
- NPCs maintain consistent personalities across sessions
- Emotional states appropriately reflect recent events
- Rapport changes feel meaningful and justified
- Bodies persist appropriately without causing performance issues

### Story Impact
- Players form memorable relationships with NPCs
- NPC deaths have lasting emotional impact
- Player choices significantly affect NPC behavior
- Relationships evolve naturally over time

This comprehensive emotional state system will transform NPCs from simple interactive objects into complex, memorable characters that players genuinely care about, creating a much richer and more engaging game experience.