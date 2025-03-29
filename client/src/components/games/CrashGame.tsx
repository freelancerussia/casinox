import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AppState } from "@/App";
import { useLocation } from "wouter";
import { generateClientSeed } from "@/lib/provably-fair";
import { addEventListener, removeEventListener, sendMessage } from "@/lib/websocket";

interface CrashGameProps {
  appState: AppState;
}

interface ActivePlayer {
  username: string;
  betAmount: number;
  status: "active" | "cashed_out" | "busted";
  cashoutMultiplier?: number;
}

export default function CrashGame({ appState }: CrashGameProps) {
  const { user } = appState;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [betAmount, setBetAmount] = useState(25);
  const [autoCashout, setAutoCashout] = useState(2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [hasAutoCashedOut, setHasAutoCashedOut] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [recentCrashes, setRecentCrashes] = useState<number[]>([]);
  const [activePlayers, setActivePlayers] = useState<ActivePlayer[]>([]);
  const [potentialWin, setPotentialWin] = useState(50);
  const [clientSeed, setClientSeed] = useState(generateClientSeed());
  
  const crashLineRef = useRef<HTMLDivElement>(null);
  const gameIntervalRef = useRef<number | null>(null);
  
  // Update potential win when bet amount changes
  useEffect(() => {
    setPotentialWin(betAmount * 2);
  }, [betAmount]);
  
  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) {
        window.clearInterval(gameIntervalRef.current);
      }
    };
  }, []);
  
  // Handle auto cashout
  useEffect(() => {
    if (isPlaying && currentMultiplier >= autoCashout && !hasAutoCashedOut) {
      handleCashout();
      setHasAutoCashedOut(true);
    }
  }, [isPlaying, currentMultiplier, autoCashout, hasAutoCashedOut]);
  
  // WebSocket event listeners
  useEffect(() => {
    // Handler for player bet events
    const handlePlayerBet = (data: any) => {
      setActivePlayers(prev => [
        {
          username: data.username,
          betAmount: data.betAmount,
          status: "active"
        },
        ...prev
      ]);
    };
    
    // Handler for player cashout events
    const handlePlayerCashout = (data: any) => {
      setActivePlayers(prev => 
        prev.map(player => 
          player.username === data.username
            ? { ...player, status: "cashed_out", cashoutMultiplier: data.cashoutMultiplier }
            : player
        )
      );
    };
    
    // Handler for crash events
    const handleCrashEvent = (data: any) => {
      setRecentCrashes(prev => [data.crashPoint, ...prev.slice(0, 5)]);
    };
    
    // Register WebSocket event listeners
    addEventListener("player_bet", handlePlayerBet);
    addEventListener("player_cashout", handlePlayerCashout);
    addEventListener("crash_result", handleCrashEvent);
    
    // Cleanup event listeners on unmount
    return () => {
      removeEventListener("player_bet", handlePlayerBet);
      removeEventListener("player_cashout", handlePlayerCashout);
      removeEventListener("crash_result", handleCrashEvent);
    };
  }, []);
  
  // Handle crash animation
  const animateCrash = (targetCrashPoint: number) => {
    setIsAnimating(true);
    
    const startTime = Date.now();
    const duration = 10000; // 10 seconds max for animation
    const baseSpeed = 0.05; // Base speed for multiplier increase
    
    const updateCrashAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Exponential increase based on elapsed time
      const multiplierIncrement = baseSpeed * Math.pow(1.1, progress * 10);
      const newMultiplier = currentMultiplier + multiplierIncrement;
      
      // Update multiplier state
      setCurrentMultiplier(newMultiplier);
      
      // Update line height
      if (crashLineRef.current) {
        const maxHeight = 250; // Max height of crash graph in pixels
        const heightPercentage = (Math.log(newMultiplier) / Math.log(10)) * 100;
        const height = Math.min(maxHeight, heightPercentage * 2.5);
        crashLineRef.current.style.height = `${height}px`;
      }
      
      // Check if we've reached the crash point
      if (newMultiplier >= targetCrashPoint) {
        if (gameIntervalRef.current) {
          window.clearInterval(gameIntervalRef.current);
          gameIntervalRef.current = null;
        }
        
        // Crash!
        setIsPlaying(false);
        setRecentCrashes(prev => [targetCrashPoint, ...prev.slice(0, 5)]);
        
        // Update players who didn't cash out
        setActivePlayers(prev => 
          prev.map(player => 
            player.status === "active" 
              ? { ...player, status: "busted" } 
              : player
          )
        );
        
        toast({
          title: "Crash!",
          description: `Game crashed at ${targetCrashPoint.toFixed(2)}x`,
          variant: "destructive",
        });
        
        // Reset for next game
        setTimeout(() => {
          setCurrentMultiplier(1);
          setIsAnimating(false);
          setCrashPoint(null);
          if (crashLineRef.current) {
            crashLineRef.current.style.height = "0";
          }
        }, 3000);
      }
    };
    
    gameIntervalRef.current = window.setInterval(updateCrashAnimation, 50);
  };
  
  // Handle place bet
  const handlePlaceBet = async () => {
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
      const res = await apiRequest("POST", "/api/games/crash/bet", {
        betAmount,
        autoCashout,
        clientSeed
      });
      
      const data = await res.json();
      
      // Update user balance in app state
      appState.setUser({
        ...user,
        balance: user.balance - betAmount
      });
      
      // Add user to active players
      setActivePlayers(prev => [
        {
          username: user.username,
          betAmount,
          status: "active"
        },
        ...prev
      ]);
      
      // Start game
      setCrashPoint(data.crashPoint);
      setIsPlaying(true);
      setHasAutoCashedOut(false);
      setCurrentMultiplier(1);
      
      // Generate new client seed for next game
      setClientSeed(generateClientSeed());
      
      // Start animation
      animateCrash(data.crashPoint);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error placing your bet",
        variant: "destructive",
      });
    }
  };
  
  // Handle cashout
  const handleCashout = async () => {
    if (!isPlaying || !crashPoint) return;
    
    try {
      const res = await apiRequest("POST", "/api/games/crash/cashout", {
        betAmount,
        cashoutMultiplier: currentMultiplier,
        crashPoint
      });
      
      const data = await res.json();
      
      // Update user in active players
      setActivePlayers(prev => 
        prev.map(player => 
          player.username === user?.username
            ? { ...player, status: "cashed_out", cashoutMultiplier: currentMultiplier }
            : player
        )
      );
      
      // Update user balance
      appState.setUser({
        ...user!,
        balance: data.balance
      });
      
      toast({
        title: "Cashed Out!",
        description: `You cashed out at ${currentMultiplier.toFixed(2)}x and won ${data.profit.toFixed(2)} credits!`,
      });
      
      setIsPlaying(false);
      
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
        <h3 className="font-bold text-lg">Crash</h3>
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
                disabled={isPlaying || isAnimating}
              />
              <Button
                className="bg-red-500 text-white px-4 font-medium rounded-none hover:bg-red-600"
                onClick={() => user && setBetAmount(user.balance)}
                disabled={isPlaying || isAnimating}
              >
                MAX
              </Button>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-neutral-400">Auto Cashout At</label>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm">{autoCashout.toFixed(2)}x</span>
              </div>
            </div>
            <Slider
              defaultValue={[2]}
              value={[autoCashout]}
              onValueChange={(value) => setAutoCashout(value[0])}
              min={1.1}
              max={10}
              step={0.1}
              disabled={isPlaying || isAnimating}
              className="h-2 rounded-md"
            />
            <div className="flex justify-between text-xs text-neutral-400 mt-1">
              <span>1.1x</span>
              <span>10.0x</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-primary p-3 rounded-lg">
              <p className="text-xs text-neutral-400 mb-1">Potential Win</p>
              <p className="font-mono text-lg">{potentialWin.toFixed(2)}</p>
            </div>
            <div className="bg-primary p-3 rounded-lg">
              <p className="text-xs text-neutral-400 mb-1">Current Multiplier</p>
              <p className="font-mono text-lg text-green-500">{currentMultiplier.toFixed(2)}x</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
              onClick={handlePlaceBet}
              disabled={isPlaying || isAnimating}
            >
              Place Bet
            </Button>
            <Button
              className={`w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium ${
                !isPlaying ? "opacity-50 cursor-not-allowed" : ""
              }`}
              onClick={handleCashout}
              disabled={!isPlaying}
            >
              Cashout
            </Button>
          </div>
        </div>
        
        {/* Game Visualization */}
        <div className="lg:col-span-2 bg-primary rounded-lg p-4 h-full flex flex-col">
          <div className="relative h-[250px] mb-4 bg-primary">
            <div className="absolute top-2 left-2 right-2 flex justify-between text-xs text-neutral-400">
              <span>1.00x</span>
              <span>10.00x</span>
            </div>
            <div className="absolute left-0 bottom-0 right-0 h-px bg-neutral-border/30"></div>
            <div
              ref={crashLineRef}
              className="absolute left-0 bottom-0 w-3 h-0 bg-gradient-to-t from-green-500 to-purple-500 transition-height duration-100"
            ></div>
            
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-mono text-4xl text-white">
              {isAnimating && !isPlaying && currentMultiplier > 1
                ? "BUST!"
                : `${currentMultiplier.toFixed(2)}x`}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary rounded-lg p-3">
              <div className="text-xs text-neutral-400 mb-2">Recent Crashes</div>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {recentCrashes.map((crash, index) => {
                  let bgColor = "bg-red-500/20";
                  let textColor = "text-red-500";
                  
                  if (crash >= 2) {
                    bgColor = "bg-green-500/20";
                    textColor = "text-green-500";
                  }
                  
                  if (crash >= 5) {
                    bgColor = "bg-purple-500/20";
                    textColor = "text-purple-500";
                  }
                  
                  return (
                    <div
                      key={index}
                      className={`flex-shrink-0 px-2 py-1 rounded-lg flex items-center justify-center font-mono text-xs ${bgColor} ${textColor}`}
                    >
                      {crash.toFixed(2)}x
                    </div>
                  );
                })}
                {recentCrashes.length === 0 && (
                  <div className="text-xs text-neutral-400">No recent crashes</div>
                )}
              </div>
            </div>
            
            <div className="bg-secondary rounded-lg p-3">
              <div className="text-xs text-neutral-400 mb-2">Active Players</div>
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {activePlayers.map((player, index) => (
                  <div key={index} className="flex justify-between items-center text-xs">
                    <div className="flex items-center">
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-2 ${
                          player.status === "active"
                            ? "bg-green-500"
                            : player.status === "cashed_out"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      ></span>
                      <span className="text-white">{player.username}</span>
                    </div>
                    <div className="font-mono">
                      <span className="text-neutral-400">{player.betAmount.toFixed(2)} @ </span>
                      {player.status === "active" ? (
                        <span className="text-white">active</span>
                      ) : player.status === "cashed_out" ? (
                        <span className="text-green-500">{player.cashoutMultiplier?.toFixed(2)}x</span>
                      ) : (
                        <span className="text-red-500">bust</span>
                      )}
                    </div>
                  </div>
                ))}
                {activePlayers.length === 0 && (
                  <div className="text-xs text-neutral-400">No active players</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
