import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AppState } from "@/App";
import { useLocation } from "wouter";
import { generateClientSeed } from "@/lib/provably-fair";
import { addEventListener, removeEventListener } from "@/lib/websocket";
import { Tooltip } from "@/components/ui/tooltip";

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
  const [clientSeed, setClientSeed] = useState(generateClientSeed());
  const [isLoading, setIsLoading] = useState(false);

  const crashLineRef = useRef<HTMLDivElement>(null);
  const gameIntervalRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio elements
    audioRef.current = new Audio("/sounds/tick.mp3");
    
    return () => {
      if (gameIntervalRef.current) {
        window.clearInterval(gameIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying && currentMultiplier >= autoCashout && !hasAutoCashedOut) {
      handleCashout();
      setHasAutoCashedOut(true);
      if (audioRef.current) audioRef.current.play();
    }
  }, [isPlaying, currentMultiplier, autoCashout, hasAutoCashedOut]);

  // WebSocket event listeners
  useEffect(() => {
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

    const handlePlayerCashout = (data: any) => {
      setActivePlayers(prev =>
        prev.map(player =>
          player.username === data.username
            ? {
                ...player,
                status: "cashed_out",
                cashoutMultiplier: data.cashoutMultiplier
              }
            : player
        )
      );
    };

    const handleCrashEvent = (data: any) => {
      setRecentCrashes(prev => [data.crashPoint, ...prev.slice(0, 9)]);
      if (data.crashPoint >= 2) {
        new Audio("/sounds/win.mp3").play();
      } else {
        new Audio("/sounds/lose.mp3").play();
      }
    };

    addEventListener("player_bet", handlePlayerBet);
    addEventListener("player_cashout", handlePlayerCashout);
    addEventListener("crash_result", handleCrashEvent);

    return () => {
      removeEventListener("player_bet", handlePlayerBet);
      removeEventListener("player_cashout", handlePlayerCashout);
      removeEventListener("crash_result", handleCrashEvent);
    };
  }, []);

  const handlePlaceBet = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login to play",
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

    try {
      setIsLoading(true);
      const res = await apiRequest("POST", "/api/games/crash/bet", {
        betAmount,
        autoCashout,
        clientSeed
      });

      const data = await res.json();
      appState.setUser({
        ...user,
        balance: user.balance - betAmount
      });

      setIsPlaying(true);
      setCrashPoint(data.crashPoint); // Added this line to update crashPoint
      animateCrash(data.crashPoint);
      if (audioRef.current) audioRef.current.play();

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place bet",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCashout = async () => {
    if (!isPlaying) return;

    try {
      setIsLoading(true);
      const res = await apiRequest("POST", "/api/games/crash/cashout", {
        betAmount,
        cashoutMultiplier: currentMultiplier,
        crashPoint: crashPoint || currentMultiplier
      });

      const data = await res.json();
      appState.setUser({
        ...user!,
        balance: data.balance
      });

      new Audio("/sounds/win.mp3").play();
      toast({
        title: "Success!",
        description: `Cashed out at ${currentMultiplier.toFixed(2)}x!`,
      });

      setIsPlaying(false);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cash out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle crash animation (from original code)
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

      // Update line height (adapted for new structure)
      if (crashLineRef.current) {
        const maxHeight = 400; // Max height of crash graph in pixels
        const heightPercentage = (Math.log(newMultiplier) / Math.log(10)) * 100;
        const height = Math.min(maxHeight, heightPercentage * 4); // Adjusted scaling
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
        setRecentCrashes(prev => [targetCrashPoint, ...prev.slice(0, 9)]);


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


  return (
    <div className="bg-secondary rounded-xl p-6 border border-neutral-border">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Game Graph */}
          <div className="relative h-[400px] bg-primary rounded-lg p-4">
            <div ref={crashLineRef} className="w-full h-full bg-gradient-to-t from-green-500 to-purple-500 transition-height duration-100"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl font-mono">
              {isPlaying ? `${currentMultiplier.toFixed(2)}x` : crashPoint ? "CRASHED!" : "Ready"}
            </div>
          </div>

          {/* Recent Crashes */}
          <div className="mt-4 flex gap-2 overflow-x-auto">
            {recentCrashes.map((crash, i) => (
              <div
                key={i}
                className={`px-3 py-1 rounded ${
                  crash >= 2 ? "bg-green-500/20" : "bg-red-500/20"
                }`}
              >
                {crash.toFixed(2)}x
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {/* Game Controls */}
          <div>
            <label className="block text-sm mb-2">
              Bet Amount
              <Tooltip content="Enter the amount you want to bet">
                <span className="ml-1 text-neutral-400">ⓘ</span>
              </Tooltip>
            </label>
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              disabled={isPlaying || isLoading}
            />
          </div>

          <div>
            <label className="block text-sm mb-2">
              Auto Cashout
              <Tooltip content="The game will automatically cash out at this multiplier">
                <span className="ml-1 text-neutral-400">ⓘ</span>
              </Tooltip>
            </label>
            <Input
              type="number"
              value={autoCashout}
              onChange={(e) => setAutoCashout(Number(e.target.value))}
              disabled={isPlaying || isLoading}
            />
          </div>

          <Button
            className="w-full"
            onClick={isPlaying ? handleCashout : handlePlaceBet}
            disabled={isLoading}
          >
            {isLoading ? "..." : isPlaying ? "Cash Out!" : "Place Bet"}
          </Button>

          {/* Active Players */}
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Active Players</h3>
            <div className="bg-primary rounded-lg p-3 max-h-[200px] overflow-y-auto">
              {activePlayers.map((player, i) => (
                <div key={i} className="flex justify-between items-center py-1">
                  <span>{player.username}</span>
                  <span className={
                    player.status === "cashed_out"
                      ? "text-green-500"
                      : player.status === "busted"
                      ? "text-red-500"
                      : ""
                  }>
                    {player.status === "cashed_out"
                      ? `${player.cashoutMultiplier}x`
                      : player.status === "busted"
                      ? "BUST"
                      : `${player.betAmount}`
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}