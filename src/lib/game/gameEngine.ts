import { GameState, Player, Room, PlayerAction, DungeonMasterResponse, GameEvent, DeadBody, BodyState, BodyCondition, EmotionalEvent, Monster, BaseEmotion, ConversationState } from '@/types/game';
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
      level: 1,
      experience: 0,
      experienceToNext: 100,
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

      // Check if this is a talk action that needs conversation handling
      if (action.type === 'talk' || (action.type === 'custom' && this.isTalkAction(action.details || ''))) {
        return await this.handleTalkAction(action);
      }

      // Check if this is a movement action that needs room generation
      let newRoomData = null;
      if (action.type === 'move' || (action.type === 'custom' && this.isMovementAction(action.details || ''))) {
        const direction = this.extractDirection(action.details || '');
        if (direction) {
          const door = currentRoom.doors.find(d => d.direction.toLowerCase() === direction.toLowerCase());
          if (door && !door.locked && !door.leadsTo) {
            // Generate the new room BEFORE processing the action
            newRoomData = await this.generateNewRoom(direction);
            // Add it to the game state immediately
            door.leadsTo = newRoomData.id;
            this.gameState.rooms.set(newRoomData.id, newRoomData);
          }
        }
      }

      // Pre-calculate combat results if this is an attack action
      let combatSimulation = null;
      if (this.isAttackAction(action.details || '')) {
        const targetName = this.extractAttackTarget(action.details || '');
        if (targetName) {
          combatSimulation = this.simulateCombatAction(targetName);
        }
      }

      // Use API to process the action
      const response = await this.api.processPlayerAction({
        currentRoom,
        playerInventory: this.gameState.player.inventory,
        playerStatuses: this.gameState.player.statuses,
        playerHealth: this.gameState.player.health,
        playerEquippedWeapon: this.gameState.player.equippedItems.weapon,
        action,
        newRoomData, // Pass the pre-generated room data
        combatSimulation // Pass pre-calculated combat results
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
      
      // Add DM narrative response to game log BEFORE applying actions
      this.addGameEvent('action', response.narrative, { success: response.success });
      
      // Apply consequences based on the response AFTER narrative
      if (response.success && response.intendedActions) {
        await this.applyLLMActions(response.intendedActions);
      }

      // Increment turn
      this.gameState.currentTurn++;

      // Update status effect durations (only once per turn)
      console.log(`Turn ${this.gameState.currentTurn}: Updating status effects`);
      this.updateStatusEffects();

      // Update body decomposition over time
      this.updateBodyDecomposition();

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
        // Try to remove from inventory first
        const removed = this.removeItemFromInventory(itemName);
        if (!removed) {
          // If not in inventory, try to remove from current room
          this.removeItemFromRoom(itemName);
        }
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

    // Handle body searching
    if (action.bodiesToSearch) {
      for (const bodyTarget of action.bodiesToSearch) {
        const searchResult = await this.handleSearchAction(bodyTarget);
        this.addGameEvent('action', searchResult.message);
      }
    }

    // Apply any custom effects the LLM specifies
    if (action.customEffects) {
      this.applyCustomEffects(action.customEffects);
    }
  }

  private applyStateChanges(changes: any) {
    // Apply health changes (as relative changes, not absolute values)
    if (changes.health !== undefined) {
      this.gameState.player.health = Math.max(0, Math.min(
        this.gameState.player.health + changes.health,
        this.gameState.player.maxHealth
      ));
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
          this.addGameEvent('system', `${status.name} effect refreshed.`);
        } else {
          // Add new status
          this.gameState.player.statuses.push(status);
          console.log(`Adding new status effect: ${status.name} with duration ${status.duration}, effects:`, status.effects);
          this.addGameEvent('system', `You are now affected by ${status.name}.`);
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

  private removeItemFromInventory(itemName: string): boolean {
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
      return true;
    }
    return false;
  }

  private removeItemFromRoom(itemName: string): boolean {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId)!;
    const itemIndex = currentRoom.items.findIndex(
      item => item.name.toLowerCase() === itemName.toLowerCase() ||
              item.name.toLowerCase().includes(itemName.toLowerCase())
    );
    
    if (itemIndex !== -1) {
      const item = currentRoom.items[itemIndex];
      if (item.stackable && item.quantity > 1) {
        item.quantity--;
      } else {
        currentRoom.items.splice(itemIndex, 1);
      }
      console.log(`Removed ${itemName} from room`);
      return true;
    }
    return false;
  }

  private async handleMovement(direction: string) {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId)!;
    const door = currentRoom.doors.find(d => d.direction.toLowerCase() === direction.toLowerCase());
    
    if (!door) return;
    
    if (door.locked) {
      this.addGameEvent('action', `The door to the ${direction} is locked.`);
      return;
    }

    // Room should already be generated if needed (done in processAction)
    if (!door.leadsTo) {
      console.warn('Room not pre-generated, generating now as fallback');
      const newRoom = await this.generateNewRoom(direction);
      door.leadsTo = newRoom.id;
      this.gameState.rooms.set(newRoom.id, newRoom);
    }

    // Move player
    this.gameState.player.currentRoomId = door.leadsTo;
    const newRoom = this.gameState.rooms.get(door.leadsTo)!;
    
    // Award XP for discovering new rooms
    if (!newRoom.visited) {
      newRoom.visited = true;
      const explorationXP = 15 + (this.gameState.player.level * 3);
      this.gainExperience(explorationXP, 'Discovered ' + newRoom.name);
    }
    
    // Simply note that we entered a new room - the UI will show the details
    this.addGameEvent('discovery', `Entered ${newRoom.name}`);
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
        difficulty: Math.min(this.gameState.player.level + 1, 10),
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
    // First check inventory
    const inventoryIndex = this.gameState.player.inventory.findIndex(
      item => item.name.toLowerCase().includes(itemName.toLowerCase())
    );
    
    if (inventoryIndex !== -1) {
      // Item is in inventory
      const item = this.gameState.player.inventory[inventoryIndex];
      
      if (item.type === 'consumable') {
        // Handle consumable items
        if (item.properties?.healing) {
          this.gameState.player.health = Math.min(
            this.gameState.player.health + item.properties.healing,
            this.gameState.player.maxHealth
          );
          this.addGameEvent('action', `Used ${item.name} and restored ${item.properties.healing} health`);
        }
        
        // Remove consumable after use
        item.quantity--;
        if (item.quantity <= 0) {
          this.gameState.player.inventory.splice(inventoryIndex, 1);
        }
      }
      // Non-consumable items from inventory are handled by the LLM narrative
      return;
    }
    
    // If not in inventory, check current room
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId)!;
    const roomItemIndex = currentRoom.items.findIndex(
      item => item.name.toLowerCase().includes(itemName.toLowerCase())
    );
    
    if (roomItemIndex !== -1) {
      // Item is in room - player is using it directly
      const item = currentRoom.items[roomItemIndex];
      
      // For most items used from the room, they should be removed
      // (The LLM will describe what happens)
      if (item.type === 'consumable' && item.properties?.healing) {
        // Consumable healing items get consumed
        this.gameState.player.health = Math.min(
          this.gameState.player.health + item.properties.healing,
          this.gameState.player.maxHealth
        );
        this.addGameEvent('action', `Used ${item.name} from the room and restored ${item.properties.healing} health`);
        currentRoom.items.splice(roomItemIndex, 1);
      } else if (item.type === 'key' || item.type === 'weapon' || item.type === 'tool') {
        // Keys, weapons, and tools might be picked up automatically when used
        this.gameState.player.inventory.push(item);
        currentRoom.items.splice(roomItemIndex, 1);
        this.addGameEvent('action', `Picked up and used ${item.name}`);
      } else {
        // Other items might be used in place or destroyed
        // Let the LLM decide via itemsToRemove if it should be removed
        // For improvised weapons and similar uses, they'll be removed via itemsToRemove
        console.log(`Item ${item.name} used from room, LLM will decide removal via itemsToRemove`);
      }
    } else {
      console.log(`Item not found: "${itemName}" (checked both inventory and room)`);
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
    if (damage > 0) {
      this.addGameEvent('combat', `Dealt ${damage} damage to ${monster.name}`);
    }
    
    if (monster.health <= 0) {
      // Monster defeated - create persistent body instead of removing
      currentRoom.monsters.splice(monsterIndex, 1);
      this.addGameEvent('combat', `${monster.name} has been defeated!`);
      
      // Create persistent body
      this.createPersistentBody(monster, currentRoom, 'killed by player');
      
      // Award experience for killing monsters
      const xpGain = Math.max(5, monster.maxHealth * 2); // 2 XP per max HP, minimum 5
      this.gainExperience(xpGain, 'Defeated ' + monster.name);
      
      // Create emotional event for witnesses
      this.createEmotionalEvent({
        id: uuidv4(),
        timestamp: Date.now(),
        type: 'monster_death_by_player',
        description: `${monster.name} was killed by the player`,
        affectedNPCs: this.getNPCWitnessesInRoom(currentRoom),
        playerInvolved: true,
        location: currentRoom.id,
        significance: 7
      });
    } else {
      // Check for retreat or surrender before counterattack
      const combatDecision = this.handleCombatDecision(monster, currentRoom);
      
      if (combatDecision.type === 'retreat') {
        this.addGameEvent('combat', combatDecision.message);
        if (combatDecision.success) {
          // Remove the monster from the room if retreat succeeds
          currentRoom.monsters.splice(monsterIndex, 1);
        }
      } else if (combatDecision.type === 'surrender') {
        this.addGameEvent('combat', combatDecision.message);
        // Monster is still in room but won't attack
        monster.behavior = 'neutral' as any;
        if (monster.currentEmotion) {
          monster.currentEmotion.primary = { emotion: 'fearful' as any, cause: 'Surrendered to player' };
          monster.currentEmotion.intensity = 8;
        }
      } else {
        // Monster counterattacks
        const actualDamageTaken = this.calculateDamageTaken(monster.damage);
        this.gameState.player.health -= actualDamageTaken;
        if (actualDamageTaken > 0) {
          this.addGameEvent('combat', `${monster.name} deals ${actualDamageTaken} damage to you!`);
        }
        
        if (this.gameState.player.health <= 0) {
          this.gameState.gameOver = true;
          this.addGameEvent('system', 'You have been defeated!');
        }
      }
    }
  }

  private calculatePlayerDamage(): number {
    let baseDamage = 10;
    
    if (this.gameState.player.equippedItems.weapon) {
      baseDamage += this.gameState.player.equippedItems.weapon.properties?.damage || 0;
    }
    
    // Apply status effect damage modifiers
    for (const status of this.gameState.player.statuses) {
      if (status.effects?.damageModifier) {
        const modifier = typeof status.effects.damageModifier === 'number' 
          ? status.effects.damageModifier 
          : parseFloat(String(status.effects.damageModifier)) || 0;
        baseDamage = Math.floor(baseDamage * (1 + modifier));
        console.log(`Status effect ${status.name} modified damage by ${modifier}, new damage: ${baseDamage}`);
      }
    }
    
    return baseDamage;
  }

  private calculateDamageTaken(incomingDamage: number): number {
    let finalDamage = incomingDamage;
    
    // Apply status effect damage taken modifiers
    for (const status of this.gameState.player.statuses) {
      if (status.effects?.damageTakenModifier) {
        const modifier = typeof status.effects.damageTakenModifier === 'number'
          ? status.effects.damageTakenModifier
          : parseFloat(String(status.effects.damageTakenModifier)) || 0;
        finalDamage = Math.floor(finalDamage * (1 + modifier));
        console.log(`Status effect ${status.name} modified damage taken by ${modifier}, new damage taken: ${finalDamage}`);
      }
    }
    
    return finalDamage;
  }

  simulateCombatAction(targetName: string): {
    playerDamage: number;
    monsterWillBeDefeated: boolean;
    monsterCounterAttack?: {
      damage: number;
      actualDamageTaken: number;
    };
    targetMonster?: any;
  } | null {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId)!;
    const monster = currentRoom.monsters.find(
      m => m.name.toLowerCase().includes(targetName.toLowerCase())
    );
    
    if (!monster) {
      return null;
    }
    
    const playerDamage = this.calculatePlayerDamage();
    const monsterWillBeDefeated = monster.health <= playerDamage;
    
    let monsterCounterAttack = undefined;
    if (!monsterWillBeDefeated) {
      const actualDamageTaken = this.calculateDamageTaken(monster.damage);
      monsterCounterAttack = {
        damage: monster.damage,
        actualDamageTaken
      };
    }
    
    return {
      playerDamage,
      monsterWillBeDefeated,
      monsterCounterAttack,
      targetMonster: monster
    };
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
        playerLevel: this.gameState.player.level
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
        
        // Award XP for successful crafting
        const craftingXP = 10 + (this.gameState.player.level * 2);
        this.gainExperience(craftingXP, 'Successful crafting');
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
    
    // Decrease duration of all status effects (except permanent ones)
    this.gameState.player.statuses = this.gameState.player.statuses
      .map(status => {
        // Don't decrease duration for permanent effects (duration -1)
        if (status.duration === -1) {
          return status;
        }
        return { ...status, duration: status.duration - 1 };
      })
      .filter(status => {
        // Only remove status effects that have expired (duration 0)
        // Permanent effects (duration -1) will never be removed this way
        if (status.duration === 0) {
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
      if (damage > 0) {
        this.addGameEvent('combat', `${status.name} deals ${damage} damage!`);
      }
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
      if (healing > 0) {
        this.addGameEvent('action', `${status.name} heals ${healing} health.`);
      }
    }
    
    // Other effects can be added here (speed modifiers, vision reduction, etc.)
  }

  getGameState(): GameState {
    return this.gameState;
  }

  private isMovementAction(details: string): boolean {
    const movementKeywords = ['go', 'move', 'walk', 'run', 'enter', 'through', 'door', 'exit', 'head'];
    const lowerDetails = details.toLowerCase();
    return movementKeywords.some(keyword => lowerDetails.includes(keyword));
  }

  private extractDirection(details: string): string | null {
    const directions = ['north', 'south', 'east', 'west', 'up', 'down'];
    const lowerDetails = details.toLowerCase();
    
    // Check for explicit directions
    for (const dir of directions) {
      if (lowerDetails.includes(dir)) {
        return dir;
      }
    }
    
    // Check for "through the door" type commands
    if (lowerDetails.includes('door') || lowerDetails.includes('exit')) {
      const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId)!;
      if (currentRoom.doors.length === 1) {
        return currentRoom.doors[0].direction;
      }
    }
    
    return null;
  }

  private isAttackAction(details: string): boolean {
    const attackKeywords = ['attack', 'hit', 'strike', 'fight', 'punch', 'kick', 'smash', 'throw', 'shoot', 'stab'];
    const lowerDetails = details.toLowerCase();
    return attackKeywords.some(keyword => lowerDetails.includes(keyword));
  }

  private extractAttackTarget(details: string): string | null {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId)!;
    const lowerDetails = details.toLowerCase();
    
    // Look for monster names in the action details
    for (const monster of currentRoom.monsters) {
      const monsterWords = monster.name.toLowerCase().split(' ');
      if (monsterWords.some(word => lowerDetails.includes(word))) {
        return monster.name;
      }
    }
    
    return null;
  }

  isGameOver(): boolean {
    return this.gameState.gameOver;
  }

  isVictory(): boolean {
    return this.gameState.victory;
  }

  private gainExperience(amount: number, reason: string) {
    this.gameState.player.experience += amount;
    this.addGameEvent('system', `+${amount} XP (${reason})`);
    
    // Check for level up
    if (this.gameState.player.experience >= this.gameState.player.experienceToNext) {
      this.levelUp();
    }
  }

  private levelUp() {
    const oldLevel = this.gameState.player.level;
    this.gameState.player.level++;
    
    // Calculate new XP requirement (exponential growth)
    const baseXP = 100;
    this.gameState.player.experienceToNext = Math.floor(baseXP * Math.pow(1.5, this.gameState.player.level - 1));
    
    // Level up benefits
    const healthGain = 20 + (this.gameState.player.level * 5);
    this.gameState.player.maxHealth += healthGain;
    this.gameState.player.health = this.gameState.player.maxHealth; // Full heal on level up
    
    this.addGameEvent('levelup', `LEVEL UP! You are now level ${this.gameState.player.level}!`);
    this.addGameEvent('levelup', `+${healthGain} max health! Fully healed!`);
    
    console.log(`Player leveled up from ${oldLevel} to ${this.gameState.player.level}`);
  }

  // Persistent body system methods
  private createPersistentBody(monster: any, currentRoom: Room, causeOfDeath: string): void {
    // Generate appropriate items based on the NPC's description and occupation
    const generatedItems = this.generateLootForNPC(monster);
    
    const deadBody: DeadBody = {
      id: uuidv4(),
      originalNPCId: monster.id,
      name: monster.name,
      description: `The lifeless body of ${monster.name}. ${this.getDeathDescription(causeOfDeath)}`,
      bodyState: {
        condition: BodyCondition.FRESH,
        timeOfDeath: Date.now(),
        causeOfDeath: causeOfDeath,
        decompositionLevel: 0,
        searchable: true,
        witnessedByNPCs: this.getNPCWitnessesInRoom(currentRoom)
      },
      originalLoot: monster.loot || [],
      originalPossessions: [...(monster.possessions || []), ...generatedItems],
      searchedBy: [],
      roomId: currentRoom.id,
      originalOccupation: monster.occupation || 'unknown'
    };

    // Initialize dead bodies array if it doesn't exist
    if (!currentRoom.deadBodies) {
      currentRoom.deadBodies = [];
    }
    currentRoom.deadBodies.push(deadBody);

    // Also add to game state's global dead body registry
    if (!this.gameState.deadBodies) {
      this.gameState.deadBodies = new Map();
    }
    this.gameState.deadBodies.set(deadBody.id, deadBody);

    // Add atmospheric description
    this.addGameEvent('system', `The body of ${monster.name} lies motionless on the ground.`);
  }

  private getDeathDescription(causeOfDeath: string): string {
    if (causeOfDeath.includes('player')) {
      return 'Multiple wounds are visible from the fatal encounter.';
    } else if (causeOfDeath.includes('fire')) {
      return 'The body shows signs of severe burns.';
    } else if (causeOfDeath.includes('poison')) {
      return 'The skin has a sickly pallor, suggesting poisoning.';
    } else {
      return 'The cause of death is unclear from external examination.';
    }
  }

  // Generate appropriate loot based on NPC type and description
  private generateLootForNPC(npc: any): any[] {
    const items: any[] = [];
    
    // Generate personal items based on occupation and personality
    items.push(...this.generatePersonalItems(npc));
    
    // Generate tools and equipment based on occupation
    items.push(...this.generateToolsAndEquipment(npc));
    
    // Generate clothing and accessories
    items.push(...this.generateClothingAndAccessories(npc));
    
    // Generate consumables and trinkets
    items.push(...this.generateConsumablesAndTrinkets(npc));
    
    return items;
  }

  private generatePersonalItems(npc: any): any[] {
    const items: any[] = [];
    
    // Check for occupation-specific personal items
    if (npc.occupation) {
      const occupation = npc.occupation.toLowerCase();
      
      if (occupation.includes('merchant') || occupation.includes('trader')) {
        items.push({
          id: uuidv4(),
          name: 'Merchant\'s Ledger',
          description: `A well-worn ledger belonging to ${npc.name}, filled with trade records and contacts`,
          type: 'misc',
          stackable: false,
          quantity: 1,
          properties: { value: 25 }
        });
        
        // Add coins based on merchant status
        const coinAmount = 10 + Math.floor(Math.random() * 40);
        items.push({
          id: uuidv4(),
          name: 'Gold Coins',
          description: `A leather pouch containing ${coinAmount} gold coins`,
          type: 'misc',
          stackable: true,
          quantity: coinAmount,
          properties: { value: 1 }
        });
      }
      
      if (occupation.includes('guard') || occupation.includes('soldier')) {
        items.push({
          id: uuidv4(),
          name: 'Guard\'s Badge',
          description: `An official badge identifying ${npc.name} as a member of the guard`,
          type: 'misc',
          stackable: false,
          quantity: 1,
          properties: { value: 10 }
        });
      }
      
      if (occupation.includes('scholar') || occupation.includes('wizard') || occupation.includes('mage')) {
        items.push({
          id: uuidv4(),
          name: 'Spellbook',
          description: `A leather-bound spellbook filled with ${npc.name}'s arcane notes and research`,
          type: 'misc',
          stackable: false,
          quantity: 1,
          properties: { value: 50, magical: true }
        });
      }
    }
    
    // Add personal effects based on personality
    if (npc.personality_traits && npc.personality_traits.length > 0) {
      const traits = npc.personality_traits.map((t: any) => t.trait.toLowerCase());
      
      if (traits.some((t: string) => t.includes('religious') || t.includes('devout'))) {
        items.push({
          id: uuidv4(),
          name: 'Holy Symbol',
          description: `A worn holy symbol that ${npc.name} carried for protection`,
          type: 'misc',
          stackable: false,
          quantity: 1,
          properties: { value: 15, blessed: true }
        });
      }
      
      if (traits.some((t: string) => t.includes('romantic') || t.includes('sentimental'))) {
        items.push({
          id: uuidv4(),
          name: 'Locket',
          description: `A small silver locket containing a miniature portrait`,
          type: 'misc',
          stackable: false,
          quantity: 1,
          properties: { value: 20 }
        });
      }
    }
    
    return items;
  }

  private generateToolsAndEquipment(npc: any): any[] {
    const items: any[] = [];
    
    if (!npc.occupation) return items;
    
    const occupation = npc.occupation.toLowerCase();
    
    // Blacksmith/Smith tools
    if (occupation.includes('smith') || occupation.includes('blacksmith')) {
      items.push({
        id: uuidv4(),
        name: 'Smith\'s Hammer',
        description: `A well-used smithing hammer with ${npc.name}'s mark on the handle`,
        type: 'weapon',
        stackable: false,
        quantity: 1,
        properties: { damage: 12, weight: 3, tool: true }
      });
      
      items.push({
        id: uuidv4(),
        name: 'Iron Tongs',
        description: 'Heavy iron tongs used for handling hot metal',
        type: 'tool',
        stackable: false,
        quantity: 1,
        properties: { weight: 2 }
      });
      
      // Add some raw materials
      const ingotCount = 2 + Math.floor(Math.random() * 4);
      items.push({
        id: uuidv4(),
        name: 'Iron Ingots',
        description: 'Raw iron ingots ready for forging',
        type: 'material',
        stackable: true,
        quantity: ingotCount,
        properties: { value: 5 }
      });
    }
    
    // Alchemist/Healer tools
    if (occupation.includes('alchemist') || occupation.includes('healer') || occupation.includes('witch')) {
      items.push({
        id: uuidv4(),
        name: 'Mortar and Pestle',
        description: 'A stone mortar and pestle stained with various herbs',
        type: 'tool',
        stackable: false,
        quantity: 1,
        properties: { value: 15 }
      });
      
      // Add potions
      const potionTypes = [
        { name: 'Healing Potion', healing: 25, value: 20 },
        { name: 'Antidote', curesPoison: true, value: 15 },
        { name: 'Stamina Elixir', restoresStamina: true, value: 18 }
      ];
      
      const potionType = potionTypes[Math.floor(Math.random() * potionTypes.length)];
      items.push({
        id: uuidv4(),
        name: potionType.name,
        description: `A small vial containing a ${potionType.name.toLowerCase()}`,
        type: 'consumable',
        stackable: true,
        quantity: 1 + Math.floor(Math.random() * 2),
        properties: potionType
      });
    }
    
    // Thief/Rogue tools
    if (occupation.includes('thief') || occupation.includes('rogue') || occupation.includes('scout')) {
      items.push({
        id: uuidv4(),
        name: 'Lockpicks',
        description: 'A set of finely crafted lockpicks in a leather case',
        type: 'tool',
        stackable: false,
        quantity: 1,
        properties: { value: 25, unlocking: true }
      });
      
      items.push({
        id: uuidv4(),
        name: 'Smoke Bomb',
        description: 'A small glass orb that creates a cloud of smoke when broken',
        type: 'consumable',
        stackable: true,
        quantity: 1 + Math.floor(Math.random() * 2),
        properties: { value: 15, escape: true }
      });
    }
    
    return items;
  }

  private generateClothingAndAccessories(npc: any): any[] {
    const items: any[] = [];
    
    // Basic clothing based on occupation/status
    if (npc.occupation) {
      const occupation = npc.occupation.toLowerCase();
      
      if (occupation.includes('noble') || occupation.includes('merchant')) {
        items.push({
          id: uuidv4(),
          name: 'Fine Cloak',
          description: `A well-tailored cloak of quality fabric bearing ${npc.name}'s insignia`,
          type: 'armor',
          stackable: false,
          quantity: 1,
          properties: { defense: 2, value: 30 }
        });
      } else if (occupation.includes('guard') || occupation.includes('soldier')) {
        items.push({
          id: uuidv4(),
          name: 'Leather Armor',
          description: 'Standard issue leather armor, worn but serviceable',
          type: 'armor',
          stackable: false,
          quantity: 1,
          properties: { defense: 5, value: 20 }
        });
      } else if (occupation.includes('smith')) {
        items.push({
          id: uuidv4(),
          name: 'Leather Apron',
          description: 'A thick leather apron marked with burns and metal shavings',
          type: 'armor',
          stackable: false,
          quantity: 1,
          properties: { defense: 2, fireResistance: true, value: 10 }
        });
      } else {
        // Generic clothing
        items.push({
          id: uuidv4(),
          name: 'Common Clothes',
          description: 'Simple but functional clothing',
          type: 'armor',
          stackable: false,
          quantity: 1,
          properties: { defense: 1, value: 5 }
        });
      }
    }
    
    // Add accessories based on wealth/status
    if (Math.random() < 0.3) {
      const accessories = [
        { name: 'Silver Ring', description: 'A simple silver band', value: 15 },
        { name: 'Leather Belt', description: 'A sturdy leather belt with iron buckle', value: 8 },
        { name: 'Woolen Scarf', description: 'A warm woolen scarf', value: 5 }
      ];
      
      const accessory = accessories[Math.floor(Math.random() * accessories.length)];
      items.push({
        id: uuidv4(),
        name: accessory.name,
        description: accessory.description,
        type: 'misc',
        stackable: false,
        quantity: 1,
        properties: { value: accessory.value }
      });
    }
    
    return items;
  }

  private generateConsumablesAndTrinkets(npc: any): any[] {
    const items: any[] = [];
    
    // Food items - most NPCs carry some food
    if (Math.random() < 0.7) {
      const foodItems = [
        { name: 'Bread Loaf', description: 'A day-old loaf of bread', healing: 5 },
        { name: 'Dried Meat', description: 'Strips of salted, dried meat', healing: 8 },
        { name: 'Apple', description: 'A slightly bruised apple', healing: 3 },
        { name: 'Cheese Wedge', description: 'A small wedge of hard cheese', healing: 6 },
        { name: 'Water Flask', description: 'A leather flask half-full of water', healing: 2 }
      ];
      
      const food = foodItems[Math.floor(Math.random() * foodItems.length)];
      items.push({
        id: uuidv4(),
        name: food.name,
        description: food.description,
        type: 'consumable',
        stackable: true,
        quantity: 1,
        properties: { healing: food.healing, value: 2 }
      });
    }
    
    // Random trinkets
    if (Math.random() < 0.4) {
      const trinkets = [
        { name: 'Dice Set', description: 'A set of bone dice in a small pouch' },
        { name: 'Pipe', description: 'A well-used wooden pipe' },
        { name: 'Playing Cards', description: 'A worn deck of playing cards' },
        { name: 'Small Mirror', description: 'A small polished metal mirror' },
        { name: 'Rabbit\'s Foot', description: 'A preserved rabbit\'s foot on a chain' },
        { name: 'Glass Beads', description: 'A handful of colorful glass beads' }
      ];
      
      const trinket = trinkets[Math.floor(Math.random() * trinkets.length)];
      items.push({
        id: uuidv4(),
        name: trinket.name,
        description: trinket.description,
        type: 'misc',
        stackable: false,
        quantity: 1,
        properties: { value: 3 + Math.floor(Math.random() * 7) }
      });
    }
    
    // Small chance for a note or letter
    if (Math.random() < 0.2) {
      items.push({
        id: uuidv4(),
        name: 'Personal Letter',
        description: `A folded letter addressed to ${npc.name}, its contents might be revealing`,
        type: 'misc',
        stackable: false,
        quantity: 1,
        properties: { value: 1, readable: true }
      });
    }
    
    return items;
  }

  private getNPCWitnessesInRoom(room: Room): string[] {
    return room.monsters
      .filter(monster => this.isHumanoidNPC(monster))
      .map(monster => monster.id);
  }

  private isHumanoidNPC(monster: any): boolean {
    // Check if this is a humanoid NPC based on behavior or occupation
    return monster.behavior === 'friendly' || 
           monster.behavior === 'neutral' || 
           monster.behavior === 'trading' ||
           monster.occupation !== undefined ||
           monster.conversationState !== undefined;
  }

  private createEmotionalEvent(event: EmotionalEvent): void {
    if (!this.gameState.emotionalEvents) {
      this.gameState.emotionalEvents = [];
    }
    this.gameState.emotionalEvents.push(event);

    // Limit stored events to prevent memory bloat
    if (this.gameState.emotionalEvents.length > 100) {
      this.gameState.emotionalEvents = this.gameState.emotionalEvents.slice(-50);
    }

    // Log the event for debugging
    console.log(`Emotional event created: ${event.type} - ${event.description}`);
  }

  // Body searching and looting methods
  async searchBody(bodyId: string): Promise<{ success: boolean; items: any[]; message: string }> {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
    if (!currentRoom?.deadBodies) {
      return { success: false, items: [], message: 'No bodies to search here.' };
    }

    const bodyIndex = currentRoom.deadBodies.findIndex(body => body.id === bodyId || body.name.toLowerCase().includes(bodyId.toLowerCase()));
    if (bodyIndex === -1) {
      return { success: false, items: [], message: 'Body not found.' };
    }

    const body = currentRoom.deadBodies[bodyIndex];
    
    // Check if body is searchable
    if (!body.bodyState.searchable) {
      return { 
        success: false, 
        items: [], 
        message: `The body of ${body.name} is too decomposed to search effectively.` 
      };
    }

    // Check if already searched by this player
    if (body.searchedBy.includes(this.gameState.player.name)) {
      return { 
        success: false, 
        items: [], 
        message: `You have already searched ${body.name}'s body.` 
      };
    }

    try {
      // Use API to handle body search (will generate items if needed)
      const searchResult = await this.api.searchBody({
        body: body,
        searcherId: this.gameState.player.name,
        roomContext: `${currentRoom.name}: ${currentRoom.description}`
      });

      if (searchResult.success) {
        // Mark body as searched
        body.searchedBy.push(this.gameState.player.name);
        
        // Add found items directly to player inventory
        if (searchResult.itemsFound && searchResult.itemsFound.length > 0) {
          for (const item of searchResult.itemsFound) {
            this.gameState.player.inventory.push(item);
            this.addGameEvent('action', `Found ${item.name} on the body`);
          }
        }

        // Create emotional event for witnesses if they react
        if (searchResult.witnessesReact) {
          const witnesses = this.getNPCWitnessesInRoom(currentRoom);
          if (witnesses.length > 0) {
            this.createEmotionalEvent({
              id: uuidv4(),
              timestamp: Date.now(),
              type: 'player_searches_body',
              description: `Player searched the body of ${body.name}`,
              affectedNPCs: witnesses,
              playerInvolved: true,
              location: currentRoom.id,
              significance: 5
            });
          }
        }

        // Add narrative to game log
        this.addGameEvent('action', searchResult.searchDescription);
        
        // Add emotional impact if significant
        if (searchResult.emotionalImpact && searchResult.emotionalImpact.length > 20) {
          this.addGameEvent('system', searchResult.emotionalImpact);
        }

        return {
          success: true,
          items: searchResult.itemsFound || [],
          message: searchResult.searchDescription
        };
      } else {
        return {
          success: false,
          items: [],
          message: searchResult.searchDescription || 'Failed to search the body.'
        };
      }
    } catch (error) {
      console.error('Error searching body:', error);
      // Fallback to local generation if API fails
      const foundItems = [...(body.originalLoot || []), ...(body.originalPossessions || [])];
      body.searchedBy.push(this.gameState.player.name);
      body.originalLoot = [];
      body.originalPossessions = [];

      if (foundItems.length > 0) {
        currentRoom.items.push(...foundItems);
      }

      const itemNames = foundItems.map(item => item.name).join(', ');
      const message = foundItems.length > 0 
        ? `You search ${body.name}'s body and find: ${itemNames}`
        : `You search ${body.name}'s body but find nothing of value.`;

      this.addGameEvent('action', message);
      return { success: true, items: foundItems, message };
    }
  }

  // Body decomposition over time
  updateBodyDecomposition(): void {
    const currentTime = Date.now();
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
    
    if (!currentRoom?.deadBodies) return;

    for (const body of currentRoom.deadBodies) {
      const timeSinceDeath = currentTime - body.bodyState.timeOfDeath;
      const hoursSinceDeath = timeSinceDeath / (1000 * 60 * 60);

      let newCondition = body.bodyState.condition;
      let newDecompositionLevel = body.bodyState.decompositionLevel;

      // Update decomposition based on time
      if (hoursSinceDeath > 168) { // 7 days
        newCondition = BodyCondition.SKELETAL;
        newDecompositionLevel = Math.min(10, Math.floor(hoursSinceDeath / 168) + 7);
      } else if (hoursSinceDeath > 24) { // 1 day
        newCondition = BodyCondition.DECOMPOSING;
        newDecompositionLevel = Math.min(7, Math.floor(hoursSinceDeath / 24) + 2);
      } else if (hoursSinceDeath > 2) { // 2 hours
        newCondition = BodyCondition.RECENTLY_DEAD;
        newDecompositionLevel = Math.min(2, Math.floor(hoursSinceDeath / 2));
      }

      // Update body state
      if (newCondition !== body.bodyState.condition || newDecompositionLevel !== body.bodyState.decompositionLevel) {
        body.bodyState.condition = newCondition;
        body.bodyState.decompositionLevel = newDecompositionLevel;

        // Bodies become unsearchable after heavy decomposition
        if (newDecompositionLevel > 7) {
          body.bodyState.searchable = false;
        }

        // Update description based on condition
        body.description = this.getBodyDescriptionByCondition(body.name, newCondition, body.bodyState.causeOfDeath);
      }
    }

    // Remove completely decomposed bodies
    if (currentRoom.deadBodies) {
      const bodiesRemoved = currentRoom.deadBodies.filter(body => body.bodyState.decompositionLevel >= 10);
      currentRoom.deadBodies = currentRoom.deadBodies.filter(body => body.bodyState.decompositionLevel < 10);
      
      bodiesRemoved.forEach(body => {
        this.addGameEvent('system', `The remains of ${body.name} have completely decomposed and are no longer visible.`);
        this.gameState.deadBodies?.delete(body.id);
      });
    }
  }

  private getBodyDescriptionByCondition(name: string, condition: BodyCondition, causeOfDeath: string): string {
    const deathDesc = this.getDeathDescription(causeOfDeath);
    
    switch (condition) {
      case BodyCondition.FRESH:
        return `The recently deceased body of ${name}. ${deathDesc}`;
      case BodyCondition.RECENTLY_DEAD:
        return `The body of ${name}, showing early signs of rigor mortis. ${deathDesc}`;
      case BodyCondition.DECOMPOSING:
        return `The decomposing remains of ${name}. The body is bloated and has a strong odor. ${deathDesc}`;
      case BodyCondition.SKELETAL:
        return `The skeletal remains of ${name}. Only bones and some dried tissue remain.`;
      case BodyCondition.DUST:
        return `Barely visible traces of what was once ${name}. Time has claimed all but the faintest remnants.`;
      default:
        return `The lifeless body of ${name}. ${deathDesc}`;
    }
  }

  // Handle search action
  async handleSearchAction(target: string): Promise<{ success: boolean; message: string }> {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
    if (!currentRoom) {
      return { success: false, message: 'Cannot search here.' };
    }

    // Check if searching a body
    if (currentRoom.deadBodies && currentRoom.deadBodies.length > 0) {
      const result = await this.searchBody(target);
      return { success: result.success, message: result.message };
    }

    return { success: false, message: 'Nothing to search here.' };
  }

  // Conversation system methods
  private isTalkAction(details: string): boolean {
    const talkKeywords = ['talk', 'speak', 'chat', 'greet', 'hello', 'hi', 'converse', 'say'];
    const lowerDetails = details.toLowerCase();
    return talkKeywords.some(keyword => lowerDetails.includes(keyword));
  }

  async handleTalkAction(action: PlayerAction): Promise<DungeonMasterResponse> {
    try {
      const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
      if (!currentRoom) {
        throw new Error('Current room not found');
      }

      // Find target NPC
      const targetName = this.extractTalkTarget(action.details || '');
      let targetNPC = null;

      if (targetName) {
        targetNPC = currentRoom.monsters.find(monster => 
          this.isHumanoidNPC(monster) && 
          monster.name.toLowerCase().includes(targetName.toLowerCase())
        );
      } else if (currentRoom.monsters.length === 1 && this.isHumanoidNPC(currentRoom.monsters[0])) {
        // If only one NPC in room, talk to them
        targetNPC = currentRoom.monsters[0];
      }

      if (!targetNPC) {
        return {
          message: 'There is no one here to talk to.',
          success: false,
          updatedGameState: this.gameState,
          generatedContent: {}
        };
      }

      // Initialize conversation state if needed
      if (!targetNPC.conversationState) {
        await this.startConversation(targetNPC);
      }

      // Get rapport level with this NPC
      const rapport = this.getPlayerRapport(targetNPC.id);

      // Process conversation through API
      const response = await this.api.processConversation({
        npc: targetNPC,
        playerAction: action.details || 'greet',
        playerRapport: rapport,
        roomContext: `${currentRoom.name}: ${currentRoom.description}`,
        interactionHistory: this.getInteractionHistory(targetNPC.id)
      });

      // Update conversation state
      this.updateConversationState(targetNPC, response);

      // Add conversation to game log
      this.addGameEvent('action', `You talk to ${targetNPC.name}: "${action.details}"`);
      this.addGameEvent('action', `${targetNPC.name}: "${response.npc_response}"`);

      // Update rapport if changed
      if (response.rapport_change) {
        this.updatePlayerRapport(targetNPC.id, response.rapport_change);
      }

      // Update emotional state if changed
      if (response.emotional_change) {
        targetNPC.currentEmotion = response.emotional_change;
      }

      // Increment turn
      this.gameState.currentTurn++;

      return {
        message: `${targetNPC.name}: "${response.npc_response}"`,
        success: true,
        updatedGameState: this.gameState,
        generatedContent: {}
      };
    } catch (error) {
      console.error('Error processing talk action:', error);
      return {
        message: 'The conversation doesn\'t go as expected...',
        success: false,
        updatedGameState: this.gameState,
        generatedContent: {}
      };
    }
  }

  async startConversation(npc: Monster): Promise<void> {
    try {
      const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
      if (!currentRoom) return;

      const response = await this.api.startConversation({
        npcId: npc.id,
        currentRoom,
        playerInventory: this.gameState.player.inventory,
        playerStatuses: this.gameState.player.statuses,
        playerHealth: this.gameState.player.health,
        playerLevel: this.gameState.player.level
      });

      // Initialize conversation state
      npc.conversationState = {
        isActive: true,
        turn: 0,
        mood: response.mood || 'cautious',
        topics: response.available_topics || [],
        questsOffered: [],
        questsCompleted: []
      };

      // Initialize emotional state if not present
      if (!npc.currentEmotion) {
        npc.currentEmotion = {
          id: uuidv4(),
          primary: { emotion: 'curious', cause: 'Player approached' },
          intensity: 5,
          stability: 5,
          triggers: [],
          duration: -1, // Persistent
          lastUpdated: Date.now()
        };
      }

      // Initialize rapport if not present
      if (!npc.rapport) {
        npc.rapport = new Map();
      }
      if (!npc.rapport.has(this.gameState.player.name)) {
        npc.rapport.set(this.gameState.player.name, {
          entityId: this.gameState.player.name,
          level: 0,
          category: 'neutral',
          lastInteraction: Date.now(),
          significantEvents: [],
          trustLevel: 5,
          fearLevel: 0,
          respectLevel: 5
        });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  }

  updateConversationState(npc: Monster, response: any): void {
    if (!npc.conversationState) return;

    npc.conversationState.turn++;
    npc.conversationState.lastPlayerMessage = response.last_player_message;
    
    if (response.new_topics) {
      npc.conversationState.topics.push(...response.new_topics);
    }

    if (response.memory_formed) {
      this.addNPCMemory(npc.id, response.memory_formed);
    }
  }

  endConversation(npc: Monster): void {
    if (npc.conversationState) {
      npc.conversationState.isActive = false;
      this.addGameEvent('action', `You end your conversation with ${npc.name}.`);
    }
  }

  private extractTalkTarget(details: string): string | null {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId)!;
    const lowerDetails = details.toLowerCase();
    
    // Look for NPC names in the action details
    for (const monster of currentRoom.monsters) {
      if (this.isHumanoidNPC(monster)) {
        const monsterWords = monster.name.toLowerCase().split(' ');
        if (monsterWords.some(word => lowerDetails.includes(word))) {
          return monster.name;
        }
      }
    }
    
    return null;
  }

  private getPlayerRapport(npcId: string): number {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
    if (!currentRoom) return 0;

    const npc = currentRoom.monsters.find(m => m.id === npcId);
    if (!npc?.rapport) return 0;

    const playerRapport = npc.rapport.get(this.gameState.player.name);
    return playerRapport?.level || 0;
  }

  private updatePlayerRapport(npcId: string, change: number): void {
    const currentRoom = this.gameState.rooms.get(this.gameState.player.currentRoomId);
    if (!currentRoom) return;

    const npc = currentRoom.monsters.find(m => m.id === npcId);
    if (!npc?.rapport) return;

    const playerRapport = npc.rapport.get(this.gameState.player.name);
    if (playerRapport) {
      playerRapport.level = Math.max(-100, Math.min(100, playerRapport.level + change));
      playerRapport.lastInteraction = Date.now();

      // Update category based on new level
      if (playerRapport.level >= 80) playerRapport.category = 'devoted';
      else if (playerRapport.level >= 40) playerRapport.category = 'close_friend';
      else if (playerRapport.level >= 20) playerRapport.category = 'ally';
      else if (playerRapport.level >= 5) playerRapport.category = 'friendly';
      else if (playerRapport.level >= -4) playerRapport.category = 'neutral';
      else if (playerRapport.level >= -19) playerRapport.category = 'unfriendly';
      else if (playerRapport.level >= -39) playerRapport.category = 'hostile';
      else if (playerRapport.level >= -79) playerRapport.category = 'enemy';
      else playerRapport.category = 'mortal_enemy';
    }
  }

  private getInteractionHistory(npcId: string): string[] {
    // Return recent conversation history with this NPC
    return this.gameState.gameLog
      .filter(event => event.type === 'action' && event.details?.npcId === npcId)
      .slice(-5) // Last 5 interactions
      .map(event => event.message);
  }

  private addNPCMemory(npcId: string, memory: string): void {
    // For now, just add to game log - could be expanded to full memory system
    this.addGameEvent('system', `${memory} (Memory formed for NPC ${npcId})`);
  }

  // Combat decision methods for retreat/surrender
  private checkRetreatConditions(monster: Monster, currentRoom: Room): boolean {
    // Only humanoid NPCs can make intelligent retreat decisions
    if (!this.isHumanoidNPC(monster)) return false;
    
    const healthPercentage = (monster.health / monster.maxHealth) * 100;
    const isOutnumbered = this.isMonsterOutnumbered(monster, currentRoom);
    const hasEscapeRoute = currentRoom.doors.length > 1;
    
    // Check personality traits for cowardice/bravery
    const isCowardly = monster.personality_traits?.some(trait => 
      trait.trait.toLowerCase().includes('coward') || 
      trait.trait.toLowerCase().includes('cautious')
    ) || false;
    
    const isBrave = monster.personality_traits?.some(trait => 
      trait.trait.toLowerCase().includes('brave') || 
      trait.trait.toLowerCase().includes('fearless')
    ) || false;
    
    // Check emotional state
    const isFearful = monster.currentEmotion?.primary.emotion === 'fearful' ||
                     monster.currentEmotion?.primary.emotion === 'suspicious';
    
    // Retreat conditions
    if (healthPercentage < 20) return true; // Very low health
    if (healthPercentage < 40 && (isCowardly || isFearful)) return true;
    if (healthPercentage < 50 && isOuutnumbered && !isBrave) return true;
    if (isFearful && monster.currentEmotion?.intensity && monster.currentEmotion.intensity > 7) return true;
    
    return false;
  }
  
  private checkSurrenderConditions(monster: Monster, currentRoom: Room): boolean {
    // Only humanoid NPCs can surrender
    if (!this.isHumanoidNPC(monster)) return false;
    
    const healthPercentage = (monster.health / monster.maxHealth) * 100;
    const isOutnumbered = this.isMonsterOutnumbered(monster, currentRoom);
    
    // Check personality traits
    const isCowardly = monster.personality_traits?.some(trait => 
      trait.trait.toLowerCase().includes('coward') || 
      trait.trait.toLowerCase().includes('pragmatic')
    ) || false;
    
    const isProud = monster.personality_traits?.some(trait => 
      trait.trait.toLowerCase().includes('proud') || 
      trait.trait.toLowerCase().includes('honor')
    ) || false;
    
    // Surrender conditions
    if (healthPercentage < 10 && !isProud) return true; // Near death
    if (healthPercentage < 25 && isCowardly) return true;
    if (healthPercentage < 30 && isOuutnumbered && isCowardly) return true;
    
    return false;
  }
  
  private isMonsterOutnumbered(monster: Monster, currentRoom: Room): boolean {
    // Count allies (monsters with same behavior type or faction)
    const allies = currentRoom.monsters.filter(m => 
      m.id !== monster.id && 
      (m.behavior === monster.behavior || this.areAllied(m, monster))
    ).length;
    
    // Player counts as 1, but may count as more if well-equipped
    const playerThreatLevel = this.gameState.player.equippedItems.weapon ? 2 : 1;
    
    return playerThreatLevel > allies + 1;
  }
  
  private areAllied(monster1: Monster, monster2: Monster): boolean {
    // Check if monsters are allied based on various factors
    if (monster1.occupation && monster2.occupation) {
      // Same occupation often means alliance
      return monster1.occupation === monster2.occupation;
    }
    
    // Check rapport if they know each other
    if (monster1.rapport?.has(monster2.id)) {
      const rapport = monster1.rapport.get(monster2.id)!;
      return rapport.level > 20; // Allied if rapport is positive
    }
    
    return false;
  }
  
  private executeRetreat(monster: Monster, currentRoom: Room): { success: boolean; message: string } {
    const hasEscapeRoute = currentRoom.doors.length > 1;
    const retreatChance = hasEscapeRoute ? 0.7 : 0.3; // Higher chance with escape routes
    
    // Modify retreat chance based on monster condition
    const healthPercentage = (monster.health / monster.maxHealth) * 100;
    const modifiedChance = retreatChance * (healthPercentage / 100);
    
    const success = Math.random() < modifiedChance;
    
    if (success) {
      // Update emotional state
      if (monster.currentEmotion) {
        monster.currentEmotion.primary = { emotion: 'fearful' as any, cause: 'Fled from combat' };
        monster.currentEmotion.intensity = 9;
      }
      
      // Create emotional event
      this.createEmotionalEvent({
        id: uuidv4(),
        timestamp: Date.now(),
        type: 'monster_retreat',
        description: `${monster.name} fled from combat`,
        affectedNPCs: this.getNPCWitnessesInRoom(currentRoom),
        playerInvolved: true,
        location: currentRoom.id,
        significance: 5
      });
      
      return {
        success: true,
        message: `${monster.name} turns and flees through one of the exits!"`
      };
    } else {
      return {
        success: false,
        message: `${monster.name} tries to flee but you block their escape!`
      };
    }
  }
  
  private executeSurrender(monster: Monster, currentRoom: Room): { success: boolean; message: string } {
    // Surrender is usually successful unless the player has shown no mercy before
    const success = true;
    
    // Update emotional state
    if (monster.currentEmotion) {
      monster.currentEmotion.primary = { emotion: 'fearful' as any, cause: 'Surrendered in combat' };
      monster.currentEmotion.secondary = { emotion: 'sad' as any, cause: 'Defeated and humiliated' };
      monster.currentEmotion.intensity = 8;
    }
    
    // Update rapport - surrendering creates complex feelings
    if (monster.rapport && !monster.rapport.has(this.gameState.player.name)) {
      monster.rapport.set(this.gameState.player.name, {
        entityId: this.gameState.player.name,
        level: -10, // Slight negative due to defeat
        category: 'unfriendly' as any,
        lastInteraction: Date.now(),
        significantEvents: [{
          id: uuidv4(),
          timestamp: Date.now(),
          eventType: 'surrender',
          description: 'Surrendered to player in combat',
          rapportChange: -10,
          emotionalImpact: 'fearful' as any,
          significance: 8
        }],
        trustLevel: 2,
        fearLevel: 8,
        respectLevel: 3
      });
    }
    
    // Create emotional event
    this.createEmotionalEvent({
      id: uuidv4(),
      timestamp: Date.now(),
      type: 'monster_surrender',
      description: `${monster.name} surrendered to the player`,
      affectedNPCs: this.getNPCWitnessesInRoom(currentRoom),
      playerInvolved: true,
      location: currentRoom.id,
      significance: 6
    });
    
    // Generate surrender dialogue based on personality
    const surrenderMessages = this.generateSurrenderMessage(monster);
    
    return {
      success: true,
      message: surrenderMessages
    };
  }
  
  private generateSurrenderMessage(monster: Monster): string {
    const name = monster.name;
    const isCowardly = monster.personality_traits?.some(trait => 
      trait.trait.toLowerCase().includes('coward')
    ) || false;
    
    const isProud = monster.personality_traits?.some(trait => 
      trait.trait.toLowerCase().includes('proud')
    ) || false;
    
    if (isCowardly) {
      return `${name} drops their weapon and falls to their knees. "Please! I yield! I don't want to die! Take whatever you want!"`;
    } else if (isProud) {
      return `${name} lowers their weapon with visible reluctance. "I... I surrender. You have bested me in combat."`;
    } else {
      return `${name} raises their hands in surrender. "Enough! I surrender! You win!"`;
    }
  }
  
  private handleCombatDecision(monster: Monster, currentRoom: Room): { type: 'fight' | 'retreat' | 'surrender'; success: boolean; message: string } {
    // Check surrender first (more desperate)
    if (this.checkSurrenderConditions(monster, currentRoom)) {
      const result = this.executeSurrender(monster, currentRoom);
      return { type: 'surrender', ...result };
    }
    
    // Then check retreat
    if (this.checkRetreatConditions(monster, currentRoom)) {
      const result = this.executeRetreat(monster, currentRoom);
      return { type: 'retreat', ...result };
    }
    
    // Default to fighting
    return { type: 'fight', success: true, message: '' };
  }
}