import { GameState, Player, Room, PlayerAction, DungeonMasterResponse, GameEvent } from '@/types/game';
import { GameAPI } from '@/lib/api/gameApi';
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export class GameEngine {
  private gameState: GameState;
  private api: GameAPI;

  constructor(playerName: string) {
    this.api = new GameAPI();
    // Initialize with a starting room
    const startingRoom = this.createStartingRoom();
    
    this.gameState = {
      id: uuidv4(),
      player: this.createPlayer(playerName, startingRoom.id),
      rooms: new Map([[startingRoom.id, startingRoom]]),
      currentTurn: 0,
      gameLog: [],
      gameOver: false,
      victory: false
    };

    this.addGameEvent('system', `${playerName} enters the dungeon...`);
  }

  private createStartingRoom(): Room {
    return {
      id: 'start',
      name: 'Dungeon Entrance',
      description: 'You stand at the entrance of a dimly lit dungeon. The air is musty and cold. Stone walls drip with moisture, and you can hear distant echoes from deeper within.',
      items: [
        {
          id: uuidv4(),
          name: 'Rusty Torch',
          description: 'A barely functional torch that provides dim light',
          type: 'misc',
          stackable: false,
          quantity: 1,
          properties: { light_radius: 5 }
        },
        {
          id: uuidv4(),
          name: 'Stale Bread',
          description: 'A piece of bread that has seen better days',
          type: 'consumable',
          stackable: true,
          quantity: 2,
          properties: { healing: 5 }
        }
      ],
      monsters: [],
      doors: [
        {
          id: uuidv4(),
          direction: 'north',
          description: 'A heavy wooden door with iron reinforcements',
          locked: false,
          leadsTo: undefined
        },
        {
          id: uuidv4(),
          direction: 'east',
          description: 'A narrow archway leading into darkness',
          locked: false,
          leadsTo: undefined
        },
        {
          id: uuidv4(),
          direction: 'west',
          description: 'A crumbling stone doorway covered in moss',
          locked: false,
          leadsTo: undefined
        }
      ],
      visited: true,
      specialFeatures: ['ancient_inscription', 'dripping_water']
    };
  }

  private createPlayer(name: string, startingRoomId: string): Player {
    return {
      name,
      health: 100,
      maxHealth: 100,
      inventory: [],
      equippedItems: {},
      statuses: [],
      position: { x: 0, y: 0 },
      currentRoomId: startingRoomId
    };
  }

  addGameEvent(type: GameEvent['type'] | 'player', message: string, details?: Record<string, any>) {
    this.gameState.gameLog.push({
      id: uuidv4(),
      timestamp: Date.now(),
      type: type as GameEvent['type'],
      message,
      details
    });
  }

  async processAction(action: PlayerAction): Promise<DungeonMasterResponse> {
    try {
      const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
      if (!currentRoom) {
        throw new Error('Current room not found');
      }

      // Use API to process the action
      const response = await this.api.processPlayerAction({
        currentRoom,
        playerInventory: this.gameState.player.inventory,
        playerStatuses: this.gameState.player.statuses,
        playerHealth: this.gameState.player.health,
        playerEquippedWeapon: this.gameState.player.equippedItems.weapon,
        action
      });

      // Debug log the response to check for status effects
      if (response.intendedActions) {
        response.intendedActions.forEach((action: any, index: number) => {
          if (action.stateChanges?.addStatuses) {
            console.log(`Action ${index} adding statuses:`, JSON.stringify(action.stateChanges.addStatuses, null, 2));
          }
        });
      }

      // Add player input to game log first
      this.addGameEvent('player', action.details || action.type);
      
      // Apply consequences based on the response
      if (response.success && response.intendedActions) {
        await this.applyLLMActions(response.intendedActions);
      }

      // Add DM response to game log
      this.addGameEvent('action', response.narrative, { success: response.success });

      // Increment turn
      this.gameState.currentTurn++;

      // Update status effect durations (only once per turn)
      console.log(`Turn ${this.gameState.currentTurn}: Updating status effects`);
      this.updateStatusEffects();

      return {
        message: response.narrative,
        success: response.success,
        updatedGameState: this.gameState,
        generatedContent: {}
      };
    } catch (error) {
      console.error('Error processing action:', error);
      return {
        message: 'The dungeon master is confused by your action. Try something else.',
        success: false,
        updatedGameState: this.gameState,
        generatedContent: {}
      };
    }
  }

  private async applyLLMActions(intendedActions: any[]) {
    // Let the LLM's response drive all the state changes
    // The LLM will tell us exactly what should happen
    for (const action of intendedActions) {
      await this.executeLLMAction(action);
    }
  }

  private async executeLLMAction(action: any) {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId)!;
    
    // The LLM will provide specific state changes
    if (action.stateChanges) {
      // Apply any direct state changes the LLM specifies
      this.applyStateChanges(action.stateChanges);
    }

    // Handle item removal (for transformations like breaking items)
    if (action.itemsToRemove) {
      for (const itemName of action.itemsToRemove) {
        this.removeItemFromInventory(itemName);
      }
    }

    // Handle item additions (for new items created by actions)
    if (action.itemsToAdd) {
      for (const item of action.itemsToAdd) {
        // Generate unique ID if not provided
        if (!item.id) {
          item.id = uuidv4();
        }
        this.gameState.player.inventory.push(item);
        this.addGameEvent('action', `Acquired ${item.name}`);
      }
    }

    // Handle any items to move from room to inventory
    if (action.itemsToTake) {
      console.log('Items to take:', action.itemsToTake);
      for (const itemName of action.itemsToTake) {
        console.log(`Attempting to take item: "${itemName}"`);
        this.handleTakeItem(itemName, currentRoom);
      }
    }

    // Handle any items to use
    if (action.itemsToUse) {
      for (const itemName of action.itemsToUse) {
        this.handleUseItem(itemName);
      }
    }

    // Handle movement
    if (action.moveDirection) {
      await this.handleMovement(action.moveDirection);
    }

    // Handle combat
    if (action.targetsToAttack) {
      for (const target of action.targetsToAttack) {
        this.handleAttack(target, currentRoom);
      }
    }

    // Handle crafting
    if (action.itemsToCraft) {
      await this.handleCrafting(action.itemsToCraft.join(' and '));
    }

    // Apply any custom effects the LLM specifies
    if (action.customEffects) {
      this.applyCustomEffects(action.customEffects);
    }
  }

  private applyStateChanges(changes: any) {
    // Apply health changes
    if (changes.health !== undefined) {
      this.gameState.player.health = Math.max(0, Math.min(changes.health, this.gameState.player.maxHealth));
    }

    // Add new status effects
    if (changes.addStatuses) {
      for (const status of changes.addStatuses) {
        // Check if a status with the same name already exists
        const existingStatus = this.gameState.player.statuses.find(
          s => s.name.toLowerCase() === status.name.toLowerCase()
        );
        
        if (existingStatus) {
          // Reset duration and update effects if the same status is reapplied
          existingStatus.duration = Math.max(existingStatus.duration, status.duration);
          existingStatus.effects = status.effects || existingStatus.effects;
          console.log(`Status effect ${status.name} already exists, refreshing duration to ${existingStatus.duration}, effects:`, existingStatus.effects);
        } else {
          // Add new status
          this.gameState.player.statuses.push(status);
          console.log(`Adding new status effect: ${status.name} with duration ${status.duration}, effects:`, status.effects);
        }
      }
    }

    // Remove status effects
    if (changes.removeStatuses) {
      this.gameState.player.statuses = this.gameState.player.statuses.filter(
        s => !changes.removeStatuses.includes(s.id)
      );
    }

    // Modify room state
    if (changes.roomChanges) {
      const room = this.gameState.rooms.get(this.gameState.player.currentRoomId);
      if (room && changes.roomChanges.addFeatures) {
        room.specialFeatures = [...(room.specialFeatures || []), ...changes.roomChanges.addFeatures];
      }
    }
  }

  private applyCustomEffects(effects: any[]) {
    for (const effect of effects) {
      this.addGameEvent(effect.type || 'action', effect.message || 'Something strange happens...');
    }
  }

  private removeItemFromInventory(itemName: string) {
    const itemIndex = this.gameState.player.inventory.findIndex(
      item => item.name.toLowerCase() === itemName.toLowerCase() ||
              item.name.toLowerCase().includes(itemName.toLowerCase())
    );
    
    if (itemIndex !== -1) {
      const item = this.gameState.player.inventory[itemIndex];
      if (item.stackable && item.quantity > 1) {
        item.quantity--;
      } else {
        this.gameState.player.inventory.splice(itemIndex, 1);
      }
    }
  }

  private async handleMovement(direction: string) {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId)!;
    const door = currentRoom.doors.find(d => d.direction.toLowerCase() === direction.toLowerCase());
    
    if (!door) return;
    
    if (door.locked) {
      this.addGameEvent('action', `The door to the ${direction} is locked.`);
      return;
    }

    // Generate new room if needed
    if (!door.leadsTo) {
      const newRoom = await this.generateNewRoom(direction);
      door.leadsTo = newRoom.id;
      this.gameState.rooms.set(newRoom.id, newRoom);
    }

    // Move player
    this.gameState.player.currentRoomId = door.leadsTo;
    const newRoom = this.gameState.rooms.get(door.leadsTo)!;
    newRoom.visited = true;
  }

  private async generateNewRoom(fromDirection: string): Promise<Room> {
    const oppositeDirection = this.getOppositeDirection(fromDirection);
    
    // Generate 1-3 additional doors in random directions
    const allDirections = ['north', 'south', 'east', 'west', 'up', 'down'];
    const availableDirections = allDirections.filter(d => d !== oppositeDirection);
    
    // Randomly select 1-3 additional directions for new doors
    const numAdditionalDoors = Math.floor(Math.random() * 3) + 1; // 1-3 additional doors
    const additionalDoors: string[] = [];
    
    for (let i = 0; i < numAdditionalDoors && availableDirections.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableDirections.length);
      additionalDoors.push(availableDirections.splice(randomIndex, 1)[0]);
    }
    
    try {
      const generatedRoom = await this.api.generateRoom({
        theme: 'dark fantasy dungeon',
        difficulty: Math.min(this.gameState.currentTurn / 10 + 1, 10),
        connectedDirections: [oppositeDirection],
        additionalDoors
      });
      
      // Ensure the room has a door back
      const backDoor = generatedRoom.doors.find((d: any) => d.direction === oppositeDirection);
      if (backDoor) {
        backDoor.leadsTo = this.gameState.player.currentRoomId;
      }
      
      return generatedRoom;
    } catch (error) {
      console.error('Error generating room:', error);
      // Fallback room - still create multiple exits
      const fallbackDoors = [{
        id: uuidv4(),
        direction: oppositeDirection as any,
        description: 'The way back',
        locked: false,
        leadsTo: this.gameState.player.currentRoomId
      }];
      
      // Add at least one additional door
      if (additionalDoors.length > 0) {
        additionalDoors.forEach(dir => {
          fallbackDoors.push({
            id: uuidv4(),
            direction: dir as any,
            description: 'A dark passage leading further into the dungeon',
            locked: false,
            leadsTo: undefined
          });
        });
      }
      
      return {
        id: uuidv4(),
        name: 'Empty Chamber',
        description: 'A bare stone chamber with rough-hewn walls. Despite its emptiness, several passages lead deeper into the dungeon.',
        items: [],
        monsters: [],
        doors: fallbackDoors,
        visited: false
      };
    }
  }

  private getOppositeDirection(direction: string): string {
    const opposites: Record<string, string> = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up'
    };
    return opposites[direction.toLowerCase()] || 'south';
  }

  private handleTakeItem(itemName: string, currentRoom: Room) {
    console.log(`handleTakeItem called with: "${itemName}"`);
    console.log('Available items in room:', currentRoom.items.map(i => i.name));
    
    // Handle "all" keyword
    if (itemName.toLowerCase() === 'all' || itemName.toLowerCase() === 'everything') {
      const itemsToTake = [...currentRoom.items];
      currentRoom.items = [];
      this.gameState.player.inventory.push(...itemsToTake);
      if (itemsToTake.length > 0) {
        const itemNames = itemsToTake.map(i => i.name).join(', ');
        this.addGameEvent('action', `Picked up: ${itemNames}`);
      }
      return;
    }

    // Handle specific item by exact name first
    let itemIndex = currentRoom.items.findIndex(
      item => item.name.toLowerCase() === itemName.toLowerCase()
    );
    
    // If no exact match, try partial match
    if (itemIndex === -1) {
      itemIndex = currentRoom.items.findIndex(
        item => item.name.toLowerCase().includes(itemName.toLowerCase())
      );
    }
    
    if (itemIndex !== -1) {
      const item = currentRoom.items.splice(itemIndex, 1)[0];
      this.gameState.player.inventory.push(item);
      this.addGameEvent('action', `Picked up ${item.name}`);
      console.log(`Successfully picked up: ${item.name}`);
    } else {
      console.log(`Item not found: "${itemName}"`);
    }
  }

  private handleUseItem(itemName: string) {
    const itemIndex = this.gameState.player.inventory.findIndex(
      item => item.name.toLowerCase().includes(itemName.toLowerCase())
    );
    
    if (itemIndex === -1) return;
    
    const item = this.gameState.player.inventory[itemIndex];
    
    if (item.type === 'consumable' && item.properties?.healing) {
      this.gameState.player.health = Math.min(
        this.gameState.player.health + item.properties.healing,
        this.gameState.player.maxHealth
      );
      
      item.quantity--;
      if (item.quantity <= 0) {
        this.gameState.player.inventory.splice(itemIndex, 1);
      }
      
      this.addGameEvent('action', `Used ${item.name} and restored ${item.properties.healing} health`);
    }
  }

  private handleAttack(targetName: string, currentRoom: Room) {
    const monsterIndex = currentRoom.monsters.findIndex(
      monster => monster.name.toLowerCase().includes(targetName.toLowerCase())
    );
    
    if (monsterIndex === -1) return;
    
    const monster = currentRoom.monsters[monsterIndex];
    const damage = this.calculatePlayerDamage();
    
    monster.health -= damage;
    this.addGameEvent('combat', `Dealt ${damage} damage to ${monster.name}`);
    
    if (monster.health <= 0) {
      // Monster defeated
      currentRoom.monsters.splice(monsterIndex, 1);
      this.addGameEvent('combat', `${monster.name} has been defeated!`);
      
      // Drop loot
      if (monster.loot) {
        currentRoom.items.push(...monster.loot);
        this.addGameEvent('discovery', `${monster.name} dropped some items!`);
      }
    } else {
      // Monster counterattacks
      this.gameState.player.health -= monster.damage;
      this.addGameEvent('combat', `${monster.name} deals ${monster.damage} damage to you!`);
      
      if (this.gameState.player.health <= 0) {
        this.gameState.gameOver = true;
        this.addGameEvent('system', 'You have been defeated!');
      }
    }
  }

  private calculatePlayerDamage(): number {
    let baseDamage = 10;
    
    if (this.gameState.player.equippedItems.weapon) {
      baseDamage += this.gameState.player.equippedItems.weapon.properties?.damage || 0;
    }
    
    return baseDamage;
  }

  private async handleCrafting(itemNames: string) {
    // Parse item names from the action details
    const items = this.gameState.player.inventory.filter(item => 
      itemNames.toLowerCase().includes(item.name.toLowerCase())
    );
    
    if (items.length < 2) {
      this.addGameEvent('action', 'You need at least two items to craft something.');
      return;
    }
    
    try {
      const craftedItem = await this.api.attemptCrafting({
        items,
        playerLevel: 1
      });
      
      if (craftedItem) {
        // Remove used items
        items.forEach(item => {
          const index = this.gameState.player.inventory.findIndex(i => i.id === item.id);
          if (index !== -1) {
            this.gameState.player.inventory.splice(index, 1);
          }
        });
        
        // Add crafted item
        this.gameState.player.inventory.push(craftedItem);
        this.addGameEvent('action', `Successfully crafted ${craftedItem.name}!`);
      } else {
        this.addGameEvent('action', 'These items cannot be combined.');
      }
    } catch (error) {
      console.error('Crafting error:', error);
      this.addGameEvent('action', 'The crafting attempt failed mysteriously.');
    }
  }

  private updateStatusEffects() {
    console.log(`--- Updating status effects for turn ${this.gameState.currentTurn} ---`);
    console.log(`Active status effects: ${this.gameState.player.statuses.map(s => `${s.name} (${s.duration} turns)`).join(', ')}`);
    
    // Process status effects before decreasing duration
    for (const status of this.gameState.player.statuses) {
      this.processStatusEffect(status);
    }
    
    // Decrease duration of all status effects
    this.gameState.player.statuses = this.gameState.player.statuses
      .map(status => ({ ...status, duration: status.duration - 1 }))
      .filter(status => {
        if (status.duration <= 0) {
          this.addGameEvent('system', `${status.name} has worn off.`);
          console.log(`Status effect ${status.name} has expired`);
          return false;
        }
        return true;
      });
  }
  
  private processStatusEffect(status: StatusEffect) {
    // Process different status effect types
    const effects = status.effects || {};
    
    // Damage over time
    if (effects.damagePerTurn !== undefined && effects.damagePerTurn !== null) {
      // Ensure damagePerTurn is a number and not a string
      const damage = typeof effects.damagePerTurn === 'number' 
        ? effects.damagePerTurn 
        : parseInt(String(effects.damagePerTurn), 10) || 0;
      
      // Log for debugging
      console.log(`Processing status effect: ${status.name}, damagePerTurn raw value: ${effects.damagePerTurn} (type: ${typeof effects.damagePerTurn}), parsed damage: ${damage}`);
      
      this.gameState.player.health = Math.max(0, 
        this.gameState.player.health - damage
      );
      this.addGameEvent('combat', `${status.name} deals ${damage} damage!`);
    }
    
    // Healing over time
    if (effects.healingPerTurn !== undefined && effects.healingPerTurn !== null) {
      // Ensure healingPerTurn is a number and not a string
      const healing = typeof effects.healingPerTurn === 'number'
        ? effects.healingPerTurn
        : parseInt(String(effects.healingPerTurn), 10) || 0;
      
      console.log(`Processing status effect: ${status.name}, healingPerTurn raw value: ${effects.healingPerTurn} (type: ${typeof effects.healingPerTurn}), parsed healing: ${healing}`);
      
      this.gameState.player.health = Math.min(this.gameState.player.maxHealth,
        this.gameState.player.health + healing
      );
      this.addGameEvent('action', `${status.name} heals ${healing} health.`);
    }
    
    // Other effects can be added here (speed modifiers, vision reduction, etc.)
  }

  getGameState(): GameState {
    return this.gameState;
  }

  isGameOver(): boolean {
    return this.gameState.gameOver;
  }

  isVictory(): boolean {
    return this.gameState.victory;
  }
}