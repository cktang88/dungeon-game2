// API wrapper for game actions
export interface UnifiedActionRequest {
  // Core game state
  currentRoom: any;
  playerInventory: any[];
  playerStatuses: any[];
  playerHealth: number;
  playerLevel: number;
  
  // Action details
  actionType: 'move' | 'take' | 'use' | 'attack' | 'craft' | 'interact' | 'custom';
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
      throw new Error('Failed to execute action');
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
      throw new Error('Failed to process action');
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
      throw new Error('Failed to generate room');
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
      throw new Error('Failed to generate item');
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
      throw new Error('Failed to generate monster');
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
      throw new Error('Failed to attempt crafting');
    }
    
    return response.json();
  }
}