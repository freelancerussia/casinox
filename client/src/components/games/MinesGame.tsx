import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AppState } from "@/App";
import { useLocation } from "wouter";
import { generateClientSeed } from "@/lib/provably-fair";
import { calculateMinesPayout, calculateMinesWinChance } from "@/lib/game-utils";

interface MinesGameProps {
  appState: AppState;
}

interface MineCell {
  index: number;
  revealed: boolean;
  isGem: boolean;
  isMine: boolean;
}

export default function MinesGame({ appState }: MinesGameProps) {
  const { user } = appState;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [betAmount, setBetAmount] = useState(15);
  const [minesCount, setMinesCount] = useState(5);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [grid, setGrid] = useState<MineCell[]>(Array(25).fill(null).map((_, i) => ({
    index: i,
    revealed: false,
    isGem: false,
    isMine: false
  })));
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  const [nextProfit, setNextProfit] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [winChance, setWinChance] = useState(80);
  const [maxWin, setMaxWin] = useState(0);
  const [clientSeed, setClientSeed] = useState(generateClientSeed());
  const [serverSeed, setServerSeed] = useState("");
  const [nonce, setNonce] = useState(0);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [gameId, setGameId] = useState<number | null>(null);
  
  // Calculate next profit and win chance when parameters change
  useEffect(() => {
    // Calculate potential profit for next gem
    const nextMultiplier = calculateMinesPayout(minesCount, revealedPositions.length + 1);
    setNextProfit(parseFloat((betAmount * (nextMultiplier - 1)).toFixed(2)));
    
    // Calculate current multiplier
    const currMultiplier = revealedPositions.length > 0 
      ? calculateMinesPayout(minesCount, revealedPositions.length)
      : 1;
    setCurrentMultiplier(currMultiplier);
    
    // Calculate win chance for next cell
    const nextWinChance = calculateMinesWinChance(minesCount, revealedPositions.length);
    setWinChance(nextWinChance);
    
    // Calculate max potential win
    const maxMultiplier = calculateMinesPayout(minesCount, 25 - minesCount);
    setMaxWin(parseFloat((betAmount * maxMultiplier).toFixed(2)));
  }, [betAmount, minesCount, revealedPositions]);
  
  // Handle starting a new game
  const handleNewGame = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to play games",
        variant: "destructive",
      });
      setLocation("/login");
      return;
    }
    
    if (betAmount <= 0) {
      toast({
        title: "Invalid Bet",
        description: "Bet amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    if (user.balance < betAmount) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance to place this bet",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const res = await apiRequest("POST", "/api/games/mines/new", {
        betAmount,
        minesCount,
        clientSeed
      });
      
      const data = await res.json();
      
      // Update user balance
      appState.setUser({
        ...user,
        balance: user.balance - betAmount
      });
      
      // Save game data
      setServerSeed(data.gameData.serverSeedHash);
      setNonce(data.gameData.nonce);
      setGameId(data.gameId);
      
      // Generate new client seed for next game
      setClientSeed(generateClientSeed());
      
      // Reset game state
      setIsGameActive(true);
      setGameOver(false);
      setGrid(Array(25).fill(null).map((_, i) => ({
        index: i,
        revealed: false,
        isGem: false,
        isMine: false
      })));
      setRevealedPositions([]);
      setTotalProfit(0);
      
      toast({
        title: "New Game Started",
        description: `Placed ${betAmount} credits bet with ${minesCount} mines.`,
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error starting the game",
        variant: "destructive",
      });
    }
  };
  
  // Handle revealing a cell
  const handleRevealCell = async (index: number) => {
    console.log("Click detected on cell:", index);
    console.log("Game state:", { isGameActive, gameOver, gameId });
    
    if (!isGameActive || gameOver) {
      console.log("Game not active or already over, ignoring click");
      return;
    }
    
    // Don't reveal already revealed cells
    if (grid[index].revealed) {
      console.log("Cell already revealed, ignoring click");
      return;
    }
    
    try {
      console.log("Revealing cell at index:", index, "with gameId:", gameId);
      const res = await apiRequest("POST", "/api/games/mines/reveal", {
        gameId,
        position: index,
        betAmount,
        minesCount,
        clientSeed,
        revealedPositions
      });
      
      const data = await res.json();
      console.log("Reveal response:", data);
      
      // Create a new grid to update
      const newGrid = [...grid];
      
      if (data.isHit) {
        // Hit a mine, game over
        newGrid[index] = {
          ...newGrid[index],
          revealed: true,
          isMine: true
        };
        
        // Reveal all mines
        data.minePositions.forEach((pos: number) => {
          if (pos !== index) {
            newGrid[pos] = {
              ...newGrid[pos],
              revealed: true,
              isMine: true
            };
          }
        });
        
        setGrid(newGrid);
        setGameOver(true);
        setIsGameActive(false);
        
        toast({
          title: "Game Over!",
          description: "You hit a mine and lost your bet.",
          variant: "destructive",
        });
        
      } else {
        // Revealed a gem
        newGrid[index] = {
          ...newGrid[index],
          revealed: true,
          isGem: true
        };
        
        setGrid(newGrid);
        
        // Add to revealed positions
        const newRevealedPositions = [...revealedPositions, index];
        setRevealedPositions(newRevealedPositions);
        
        // Update potential cashout amount
        setTotalProfit(data.potentialPayout - betAmount);
        
        toast({
          title: "Gem Found!",
          description: `Current multiplier: ${data.multiplier.toFixed(2)}x`,
        });
        
        // Check if all safe cells have been revealed
        if (newRevealedPositions.length === 25 - minesCount) {
          await handleCashout();
        }
      }
      
    } catch (error) {
      console.error("Error revealing cell:", error);
      toast({
        title: "Error",
        description: "There was an error revealing the cell",
        variant: "destructive",
      });
    }
  };
  
  // Handle cashing out
  const handleCashout = async () => {
    if (!isGameActive || gameOver || revealedPositions.length === 0) return;
    
    try {
      const res = await apiRequest("POST", "/api/games/mines/cashout", {
        gameId,
        betAmount,
        multiplier: currentMultiplier,
        minesCount,
        revealedPositions
      });
      
      const data = await res.json();
      
      // Update user balance
      appState.setUser({
        ...user!,
        balance: data.balance
      });
      
      setIsGameActive(false);
      setGameOver(true);
      
      toast({
        title: "Cashed Out!",
        description: `You won ${data.profit.toFixed(2)} credits at ${currentMultiplier.toFixed(2)}x!`,
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error cashing out",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="bg-secondary rounded-xl p-6 border border-neutral-border">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <h3 className="font-bold text-lg">Mines</h3>
          {isGameActive && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              Game Active
            </span>
          )}
          {gameOver && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Game Over
            </span>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button className="text-neutral-400 hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </button>
          <button className="text-neutral-400 hover:text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Settings */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Bet Amount</label>
            <div className="flex rounded-lg overflow-hidden border border-neutral-border">
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-primary px-4 py-3 text-white font-mono outline-none border-none"
                min="1"
                step="1"
                disabled={isGameActive}
              />
              <Button
                className="bg-green-500 text-white px-4 font-medium rounded-none hover:bg-green-600"
                onClick={() => user && setBetAmount(user.balance)}
                disabled={isGameActive}
              >
                MAX
              </Button>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-neutral-400">Number of Mines</label>
              <span className="font-mono text-sm">{minesCount}</span>
            </div>
            <Slider
              defaultValue={[5]}
              value={[minesCount]}
              onValueChange={(value) => setMinesCount(value[0])}
              min={1}
              max={24}
              step={1}
              disabled={isGameActive}
            />
            <div className="flex justify-between text-xs text-neutral-400 mt-1">
              <span>1</span>
              <span>24</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary p-3 rounded-lg">
              <p className="text-xs text-neutral-400 mb-1">Next Profit</p>
              <p className="font-mono text-lg text-green-500">+{nextProfit.toFixed(2)}</p>
            </div>
            <div className="bg-primary p-3 rounded-lg">
              <p className="text-xs text-neutral-400 mb-1">Total Profit</p>
              <p className="font-mono text-lg text-white">{totalProfit.toFixed(2)}</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
              onClick={handleNewGame}
              disabled={isGameActive}
            >
              {gameOver ? "New Game" : "Start Game"}
            </Button>
            <Button
              className={`w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium ${
                !isGameActive || revealedPositions.length === 0 ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={handleCashout}
              disabled={!isGameActive || revealedPositions.length === 0}
            >
              Cashout ({totalProfit.toFixed(2)})
            </Button>
          </div>
        </div>
        
        {/* Game Visualization */}
        <div className="lg:col-span-2 bg-primary rounded-lg p-4 h-full flex flex-col">
          <div className="flex-grow">
            {gameId && (
              <div className="mb-3 text-xs text-gray-400">
                Game ID: {gameId} | Game Active: {isGameActive ? "Yes" : "No"} | 
                Revealed Positions: {revealedPositions.length}
              </div>
            )}
            <div className="grid grid-cols-5 gap-2.5">
              {grid.map((cell) => (
                <button
                  key={cell.index}
                  onClick={() => handleRevealCell(cell.index)}
                  className={`aspect-square rounded-lg flex items-center justify-center transition-all duration-200 border ${
                    cell.revealed
                      ? cell.isGem
                        ? "bg-green-500/20 border-green-500"
                        : cell.isMine
                        ? "bg-red-500/20 border-red-500"
                        : "bg-primary border-neutral-700"
                      : isGameActive
                        ? "bg-secondary hover:bg-neutral-800 border-neutral-700 hover:border-neutral-500 cursor-pointer"
                        : "bg-secondary border-neutral-700 opacity-70 cursor-not-allowed"
                  }`}
                  type="button"
                >
                  {cell.revealed && cell.isGem && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-green-500"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  )}
                  {cell.revealed && cell.isMine && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-red-500"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="8" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  )}
                  {isGameActive && !cell.revealed && (
                    <span className="text-neutral-500 text-xs">?</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mt-4">
            <div className="bg-secondary rounded-lg p-3">
              <div className="text-xs text-neutral-400 mb-2">Game Statistics</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-neutral-400">Win Chance</p>
                  <p className="font-mono text-sm">{winChance.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Current Multiplier</p>
                  <p className="font-mono text-sm">{currentMultiplier.toFixed(2)}x</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Max Win</p>
                  <p className="font-mono text-sm">{maxWin.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
