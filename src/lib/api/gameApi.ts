// API wrapper for game actions
export interface UnifiedActionRequest {
  // Core game state
  currentRoom: any;
  playerInventory: any[];
  playerStatuses: any[];
  playerHealth: number;
  playerLevel: number;
  
  // Action details
  actionType: 'move' | 'take' | 'use' | 'attack' | 'craft' | 'interact' | 'talk' | 'custom';
  actionDetails: string;
  
  // Optional parameters for specific actions
  targetDirection?: string;
  targetItems?: string[];
  targetMonsters?: string[];
  craftingMaterials?: any[];
  
  // Context for generation
  theme?: string;
  difficulty?: number;
  connectedDirections?: string[];
  additionalDoors?: string[];
}

export interface ProcessActionRequest {
  currentRoom: any;
  playerInventory: any[];
  playerStatuses: any[];
  playerHealth: number;
  playerEquippedWeapon?: any;
  action: any;
  newRoomData?: any;
  combatSimulation?: {
    playerDamage: number;
    monsterWillBeDefeated: boolean;
    monsterCounterAttack?: {
      damage: number;
      actualDamageTaken: number;
    };
    targetMonster?: any;
  } | null;
}

export interface GenerateRoomRequest {
  theme: string;
  difficulty: number;
  connectedDirections: string[];
  additionalDoors?: string[];
}

export interface GenerateItemRequest {
  context: string;
  rarity: string;
}

export interface GenerateMonsterRequest {
  theme: string;
  challengeRating: number;
}

export interface CraftingRequest {
  items: any[];
  playerLevel: number;
}

export interface ConversationRequest {
  npc: any;
  playerAction: string;
  playerRapport: number;
  roomContext: string;
  interactionHistory: string[];
}

export interface StartConversationRequest {
  npcId: string;
  currentRoom: any;
  playerInventory: any[];
  playerStatuses: any[];
  playerHealth: number;
  playerLevel: number;
}

export interface UpdateNPCEmotionalStateRequest {
  npcId: string;
  event: any;
  roomContext: string;
  witnesses: string[];
}

export interface EvaluateCombatBehaviorRequest {
  npc: any;
  healthPercentage: number;
  isOutnumbered: boolean;
  escapeRoutes: number;
  playerReputation: number;
  recentCombatEvents: string[];
}

export interface ProcessRetreatRequest {
  npc: any;
  room: any;
  playerPosition: string;
  npcAgility: number;
  environmentalFactors: string[];
}

export interface ProcessSurrenderRequest {
  npc: any;
  desperationLevel: number;
  playerReputation: number;
  witnessNpcs: string[];
  previousMercyShown: boolean;
}

export interface SearchBodyRequest {
  body: any;
  searcherId: string;
  roomContext: string;
}

// API client that calls our Cloudflare Worker endpoints
export class GameAPI {
  private apiBase = '/api/game';

  // New unified action endpoint
  async executeAction(request: UnifiedActionRequest) {
    const response = await fetch(`${this.apiBase}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to execute action: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async processPlayerAction(request: ProcessActionRequest) {
    const response = await fetch(`${this.apiBase}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to process action: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async generateRoom(request: GenerateRoomRequest) {
    const response = await fetch(`${this.apiBase}/generate/room`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to generate room: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async generateItem(request: GenerateItemRequest) {
    const response = await fetch(`${this.apiBase}/generate/item`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to generate item: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async generateMonster(request: GenerateMonsterRequest) {
    const response = await fetch(`${this.apiBase}/generate/monster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to generate monster: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async attemptCrafting(request: CraftingRequest) {
    const response = await fetch(`${this.apiBase}/craft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to attempt crafting: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async processConversation(request: ConversationRequest) {
    const response = await fetch(`${this.apiBase}/conversation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to process conversation: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async updateNPCEmotionalState(request: UpdateNPCEmotionalStateRequest) {
    const response = await fetch(`${this.apiBase}/npc/emotional-state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to update NPC emotional state: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async startConversation(request: StartConversationRequest) {
    const response = await fetch(`${this.apiBase}/conversation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to start conversation: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async evaluateCombatBehavior(request: EvaluateCombatBehaviorRequest) {
    const response = await fetch(`${this.apiBase}/combat/evaluate-behavior`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to evaluate combat behavior: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async processRetreat(request: ProcessRetreatRequest) {
    const response = await fetch(`${this.apiBase}/combat/retreat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to process retreat: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async processSurrender(request: ProcessSurrenderRequest) {
    const response = await fetch(`${this.apiBase}/combat/surrender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to process surrender: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }

  async searchBody(request: SearchBodyRequest) {
    const response = await fetch(`${this.apiBase}/search/body`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`Failed to search body: ${response.statusText} (${response.status})`);
    }
    
    return response.json();
  }
}