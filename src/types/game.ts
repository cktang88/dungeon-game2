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

export interface Monster {
  id: string;
  name: string;
  description: string;
  health: number;
  maxHealth: number;
  damage: number;
  loot?: Item[];
  behavior: 'aggressive' | 'neutral' | 'friendly';
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
}

export interface Player {
  name: string;
  health: number;
  maxHealth: number;
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
  type: 'action' | 'combat' | 'discovery' | 'system';
  message: string;
  details?: Record<string, any>;
}

export interface GameState {
  id: string;
  player: Player;
  rooms: Map<string, Room>;
  currentTurn: number;
  gameLog: GameEvent[];
  gameOver: boolean;
  victory: boolean;
}

// Action types that players can perform
export interface PlayerAction {
  type: 'move' | 'take' | 'use' | 'attack' | 'talk' | 'examine' | 'craft' | 'custom';
  target?: string; // item id, monster id, direction, etc.
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