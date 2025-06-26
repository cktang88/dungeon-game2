import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Heart, Sword, Shield, Package, Search } from "lucide-react";
import { GameEngine } from "@/lib/game/gameEngine";
import { PlayerAction, GameState, Item } from "@/types/game";
import { toast } from "sonner";

interface GamePageProps {
  playerName: string;
}

export function GamePage({ playerName }: GamePageProps) {
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize game engine
    const engine = new GameEngine(playerName);
    setGameEngine(engine);
    setGameState(engine.getGameState());
  }, [playerName]);

  const parseUserInput = (input: string): PlayerAction => {
    // Send everything as a custom action for the LLM to interpret
    return { type: "custom", details: input };
  };

  const handleSubmit = async () => {
    // Validate input with user feedback
    if (!inputValue.trim()) {
      toast.error("Please enter a command");
      return;
    }
    
    if (!gameEngine) {
      toast.error("Game is still loading, please wait...");
      return;
    }
    
    if (isProcessing) {
      toast.error("Still processing previous command, please wait...");
      return;
    }

    setIsProcessing(true);
    const currentInput = inputValue; // Save input in case of error
    const action = parseUserInput(inputValue);

    try {
      const response = await gameEngine.processAction(action);
      setGameState(response.updatedGameState);

      // Don't show toast for action failures - the game narrative handles this

      // Scroll to bottom of terminal
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);

      // Only clear input on successful processing
      setInputValue("");
    } catch (error) {
      console.error("Error processing action:", error);
      console.error("Failed input:", currentInput);
      
      // Show detailed error message
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to process: "${currentInput}". Error: ${errorMessage}`);
      
      // Don't clear input on error - let user retry or edit
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!gameState) {
    return <div className="container mx-auto py-8">Loading game...</div>;
  }

  const currentRoom = gameState.rooms.get(gameState.player.currentRoomId);
  const recentEvents = gameState.gameLog.slice(-50);

  return (
    <TooltipProvider>
      <div className="container mx-auto py-2 px-2 max-w-full">
        <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-4">
          {/* Main Game Area */}
          <div className="xl:col-span-3 lg:col-span-2 space-y-4">
            {/* Current Room */}
            <Card>
              <CardHeader>
                <CardTitle>{currentRoom?.name || "Unknown Location"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 text-lg leading-relaxed text-left">
                  {currentRoom?.description}
                </p>

                {currentRoom?.doors && currentRoom.doors.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-lg">Exits:</h4>
                    <div className="flex gap-2 flex-wrap">
                      {currentRoom.doors.map((door) => (
                        <Tooltip key={door.id}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="cursor-help flex items-center gap-1 px-3 py-1 text-sm"
                            >
                              {door.direction.toUpperCase()}
                              <Search className="h-4 w-4" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{door.description}</p>
                            {door.locked && (
                              <p className="text-destructive mt-1">🔒 Locked</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                {currentRoom?.items && currentRoom.items.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-lg">Items:</h4>
                    <div className="flex gap-2 flex-wrap">
                      {currentRoom.items.map((item) => (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="secondary"
                              className="cursor-help flex items-center gap-1 px-3 py-1 text-sm"
                            >
                              {item.name}{" "}
                              {item.stackable &&
                                item.quantity > 1 &&
                                `(${item.quantity})`}
                              <Search className="h-4 w-4" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{item.description}</p>
                            {item.type && (
                              <p className="text-muted-foreground text-sm mt-1">
                                Type: {item.type}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}

                {currentRoom?.monsters && currentRoom.monsters.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-lg">Creatures:</h4>
                    <div className="flex gap-2 flex-wrap">
                      {currentRoom.monsters.map((monster) => (
                        <Tooltip key={monster.id}>
                          <TooltipTrigger asChild>
                            <Badge variant="destructive" className="cursor-help flex items-center gap-1">
                              {monster.name} ({monster.health}/{monster.maxHealth}{" "}
                              HP)
                              <Search className="h-4 w-4" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div>
                              <p className="font-semibold">{monster.name}</p>
                              {monster.description && <p>{monster.description}</p>}
                              {monster.appearance && <p className="text-muted-foreground mt-1">{monster.appearance}</p>}
                              {monster.emotionalState && (
                                <p className="text-sm mt-1">Mood: {monster.emotionalState.mood}</p>
                              )}
                              {monster.occupation && <p className="text-sm">Occupation: {monster.occupation}</p>}
                              <p className="text-sm mt-1">Health: {monster.health}/{monster.maxHealth}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Terminal Interface - Combined Log and Input */}
            <div className="terminal-container">
              <div className="terminal-log text-left" ref={scrollAreaRef}>
                {recentEvents.map((event) => (
                  <div key={event.id} className="mb-2">
                    {event.type === "player" ? (
                      <div className="text-green-600 dark:text-green-400">
                        <span className="select-none font-bold">&gt; </span>
                        <span className="font-semibold">{event.message}</span>
                      </div>
                    ) : (
                      <div
                        className={`pl-6 ${
                          event.type === "combat"
                            ? "text-red-600 dark:text-red-400"
                            : event.type === "discovery"
                            ? "text-yellow-600 dark:text-yellow-400"
                            : event.type === "system"
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-foreground"
                        }`}
                      >
                        {event.message}
                      </div>
                    )}
                  </div>
                ))}

                {/* Current Input Line */}
                <div className="terminal-prompt mt-4">
                  <input
                    type="text"
                    className={`terminal-input ${
                      !isProcessing && !gameEngine?.isGameOver()
                        ? "blinking-caret"
                        : ""
                    }`}
                    placeholder="What do you do?"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isProcessing || gameEngine?.isGameOver()}
                    maxLength={1000}
                    autoFocus
                  />
                  {inputValue.length > 800 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      {inputValue.length}/1000
                    </span>
                  )}
                </div>

                {isProcessing && (
                  <div className="pl-6 mt-2 text-muted-foreground italic">
                    The dungeon master is thinking...
                  </div>
                )}

                {gameEngine?.isGameOver() && (
                  <div className="mt-6 text-center">
                    <p
                      className="text-xl font-bold ${
                    gameEngine.isVictory() ? 'text-yellow-500' : 'text-red-500'
                  }"
                    >
                      {gameEngine.isVictory()
                        ? "🎉 Victory! 🎉"
                        : "💀 Game Over 💀"}
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => window.location.reload()}
                    >
                      Start New Game
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Player Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  {gameState.player.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-lg">
                    <span>Level</span>
                    <span className="font-semibold text-yellow-600">
                      {gameState.player.level || 1}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center text-lg">
                    <span>Health</span>
                    <span className="font-semibold">
                      {gameState.player.health}/{gameState.player.maxHealth}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5">
                    <div
                      className="bg-red-500 h-2.5 rounded-full transition-all"
                      style={{
                        width: `${
                          (gameState.player.health /
                            gameState.player.maxHealth) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span>Experience</span>
                    <span className="font-semibold">
                      {gameState.player.experience || 0}/{gameState.player.experienceToNext || 100}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${
                          ((gameState.player.experience || 0) /
                            (gameState.player.experienceToNext || 100)) *
                          100
                        }%`,
                      }}
                    />
                  </div>

                  {gameState.player.statuses.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold mb-2">Active Effects:</h4>
                      {gameState.player.statuses.map((status) => (
                        <Tooltip key={status.id}>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={
                                status.type === "buff"
                                  ? "default"
                                  : "destructive"
                              }
                              className="mr-2 mb-2 cursor-help flex items-center gap-1"
                            >
                              {status.name} ({status.duration} turns)
                              <Search className="h-4 w-4" />
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{status.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Inventory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all" className="text-sm px-2">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="equipment" className="text-sm px-2">
                      Gear
                    </TabsTrigger>
                    <TabsTrigger value="consumables" className="text-sm px-2">
                      Items
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-4">
                    <ScrollArea className="h-[200px]">
                      {gameState.player.inventory.length === 0 ? (
                        <p className="text-muted-foreground text-base">Empty</p>
                      ) : (
                        <div className="space-y-2">
                          {gameState.player.inventory.map((item) => (
                            <InventoryItem key={item.id} item={item} />
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="equipment" className="mt-4">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {gameState.player.inventory
                          .filter(
                            (item) =>
                              item.type === "weapon" || item.type === "armor"
                          )
                          .map((item) => (
                            <InventoryItem key={item.id} item={item} />
                          ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="consumables" className="mt-4">
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {gameState.player.inventory
                          .filter((item) => item.type === "consumable")
                          .map((item) => (
                            <InventoryItem key={item.id} item={item} />
                          ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

function InventoryItem({ item }: { item: Item }) {
  const getIcon = () => {
    switch (item.type) {
      case "weapon":
        return <Sword className="h-4 w-4" />;
      case "armor":
        return <Shield className="h-4 w-4" />;
      case "consumable":
        return <Heart className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-help">
          {getIcon()}
          <div className="flex-1 flex items-center gap-1">
            <span className="text-base font-medium">
              {item.name}{" "}
              {item.stackable && item.quantity > 1 && `(${item.quantity})`}
            </span>
            <Search className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{item.description}</p>
        {item.type && (
          <p className="text-muted-foreground text-sm mt-1">
            Type: {item.type}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
