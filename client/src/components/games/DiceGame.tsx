import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AppState } from "@/App";
import { useLocation } from "wouter";
import { generateClientSeed } from "@/lib/provably-fair";

interface DiceGameProps {
  appState: AppState;
}

export default function DiceGame({ appState }: DiceGameProps) {
  const { user } = appState;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [betAmount, setBetAmount] = useState(10);
  const [winChance, setWinChance] = useState(50);
  const [target, setTarget] = useState(50);
  const [isUnder, setIsUnder] = useState(true);
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [payout, setPayout] = useState(2);
  const [profit, setProfit] = useState(10);
  const [recentRolls, setRecentRolls] = useState<Array<{value: number, win: boolean}>>([]);
  const [clientSeed, setClientSeed] = useState(generateClientSeed());
  
  // Calculate payout and profit when parameters change
  useEffect(() => {
    // Payout formula: 100 / win chance (with 1% house edge)
    const calculatedPayout = 0.99 * (100 / winChance);
    setPayout(parseFloat(calculatedPayout.toFixed(2)));
    setProfit(parseFloat((betAmount * calculatedPayout - betAmount).toFixed(2)));
  }, [betAmount, winChance]);
  
  // Update target and recalculate win chance when switching between under/over
  useEffect(() => {
    if (isUnder) {
      setWinChance(target - 1);
    } else {
      setWinChance(100 - target);
    }
  }, [target, isUnder]);
  
  // Handle win chance slider change
  const handleWinChanceChange = (value: number[]) => {
    const newWinChance = value[0];
    setWinChance(newWinChance);
    
    // Update target based on isUnder
    if (isUnder) {
      setTarget(newWinChance + 1);
    } else {
      setTarget(100 - newWinChance);
    }
  };
  
  // Handle roll under/over toggle
  const toggleRollDirection = () => {
    const newIsUnder = !isUnder;
    setIsUnder(newIsUnder);
    
    // Recalculate win chance
    if (newIsUnder) {
      setWinChance(target - 1);
    } else {
      setWinChance(100 - target);
    }
  };
  
  // Set quick target values
  const setQuickTarget = (percent: number) => {
    if (isUnder) {
      setTarget(percent);
      setWinChance(percent - 1);
    } else {
      setTarget(percent);
      setWinChance(100 - percent);
    }
  };
  
  // Set random target
  const setRandomTarget = () => {
    const randomValue = Math.floor(Math.random() * 98) + 2; // 2-99
    setQuickTarget(randomValue);
  };
  
  // Handle dice roll
  const handleRollDice = async () => {
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
    
    setIsRolling(true);
    
    try {
      const res = await apiRequest("POST", "/api/games/dice/play", {
        betAmount,
        target,
        isUnder,
        clientSeed
      });
      
      const data = await res.json();
      
      // Simulate rolling animation
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 50));
        setResult(Math.floor(Math.random() * 100) + 1);
      }
      
      // Show actual result
      setResult(data.result);
      
      // Generate new client seed for next roll
      setClientSeed(generateClientSeed());
      
      // Update recent rolls
      setRecentRolls(prev => [
        { value: data.result, win: data.hasWon },
        ...prev.slice(0, 7)
      ]);
      
      // Show toast with result
      toast({
        title: data.hasWon ? "You Won!" : "You Lost",
        description: data.hasWon
          ? `Rolled ${data.result}. You won ${data.profit.toFixed(2)} credits!`
          : `Rolled ${data.result}. Better luck next time.`,
        variant: data.hasWon ? "default" : "destructive",
      });
      
      // Update user balance in AppState
      appState.setUser({
        ...user,
        balance: data.balance
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error processing your bet",
        variant: "destructive",
      });
    } finally {
      setIsRolling(false);
    }
  };
  
  return (
    <div className="bg-secondary rounded-xl p-6 border border-neutral-border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg">Dice</h3>
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
              />
              <Button
                className="bg-purple-500 text-white px-4 font-medium rounded-none hover:bg-purple-600"
                onClick={() => user && setBetAmount(user.balance)}
              >
                MAX
              </Button>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-neutral-400">Win Chance</label>
              <span className="font-mono text-sm">{winChance}%</span>
            </div>
            <Slider
              defaultValue={[50]}
              value={[winChance]}
              onValueChange={handleWinChanceChange}
              min={1}
              max={95}
              step={1}
              className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-md"
            />
            <div className="flex justify-between text-xs text-neutral-400 mt-1">
              <span>1%</span>
              <span>95%</span>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-neutral-400">
                Roll {isUnder ? "Under" : "Over"}
              </label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-primary p-1 rounded text-neutral-400 hover:text-white h-8 w-8"
                  onClick={() => setTarget(Math.max(2, target - 1))}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </Button>
                <span className="font-mono text-sm">{target}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-primary p-1 rounded text-neutral-400 hover:text-white h-8 w-8"
                  onClick={() => setTarget(Math.min(99, target + 1))}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <Button
                variant="ghost"
                className="bg-primary py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 text-xs"
                onClick={() => setQuickTarget(25)}
              >
                25
              </Button>
              <Button
                variant="ghost"
                className="bg-primary py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 text-xs"
                onClick={() => setQuickTarget(50)}
              >
                50
              </Button>
              <Button
                variant="ghost"
                className="bg-primary py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 text-xs"
                onClick={() => setQuickTarget(75)}
              >
                75
              </Button>
              <Button
                variant="ghost"
                className="bg-primary py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 text-xs"
                onClick={setRandomTarget}
              >
                Random
              </Button>
              <Button
                variant="ghost"
                className="bg-primary py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 text-xs"
                onClick={toggleRollDirection}
              >
                {isUnder ? "Under" : "Over"}
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary p-3 rounded-lg">
              <p className="text-xs text-neutral-400 mb-1">Payout</p>
              <p className="font-mono text-lg">{payout.toFixed(2)}x</p>
            </div>
            <div className="bg-primary p-3 rounded-lg">
              <p className="text-xs text-neutral-400 mb-1">Profit</p>
              <p className="font-mono text-lg text-green-500">+{profit.toFixed(2)}</p>
            </div>
          </div>
          
          <Button
            className="w-full py-6 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium text-base"
            onClick={handleRollDice}
            disabled={isRolling}
          >
            {isRolling ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                  ></path>
                </svg>
                Rolling...
              </div>
            ) : (
              "Roll Dice"
            )}
          </Button>
        </div>
        
        {/* Game Visualization */}
        <div className="lg:col-span-2 bg-primary rounded-lg p-4 h-full flex flex-col">
          <div className="flex-grow flex items-center justify-center">
            <div className="text-center">
              <div
                className={`font-mono text-7xl mb-2 transition-all duration-500 ${
                  result === null
                    ? "text-white"
                    : isUnder
                    ? result < target
                      ? "text-green-500"
                      : "text-red-500"
                    : result > target
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {result === null ? "?" : result}
              </div>
              <div className="text-neutral-400 text-sm">
                Roll {isUnder ? "under" : "over"}{" "}
                <span className="text-white font-medium">{target}</span> to win
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="bg-secondary rounded-lg p-3">
              <div className="text-xs text-neutral-400 mb-2">Recent Rolls</div>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {recentRolls.map((roll, index) => (
                  <div
                    key={index}
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center font-mono ${
                      roll.win
                        ? "bg-green-500/20 text-green-500"
                        : "bg-red-500/20 text-red-500"
                    }`}
                  >
                    {roll.value}
                  </div>
                ))}
                {recentRolls.length === 0 && (
                  <div className="text-xs text-neutral-400">No recent rolls</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
