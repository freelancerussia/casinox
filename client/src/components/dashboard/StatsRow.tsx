import { useState, useEffect } from "react";
import StatsCard from "@/components/ui/stats-card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppState } from "@/App";

interface StatsRowProps {
  appState: AppState;
}

interface Stats {
  totalBets: number;
  winRate: number;
  biggestWin: number;
  profitLoss: number;
}

export default function StatsRow({ appState }: StatsRowProps) {
  const { user } = appState;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalBets: 0,
    winRate: 0,
    biggestWin: 0,
    profitLoss: 0,
  });

  useEffect(() => {
    if (user) {
      calculateUserStats();
    }
  }, [user]);

  const calculateUserStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/games/history");
      const history = await res.json();
      
      if (history.length === 0) {
        setStats({
          totalBets: 0,
          winRate: 0,
          biggestWin: 0,
          profitLoss: 0,
        });
        return;
      }
      
      // Calculate stats from game history
      const totalBets = history.length;
      
      // Calculate wins
      const wins = history.filter((game: any) => game.outcome > 0).length;
      const winRate = (wins / totalBets) * 100;
      
      // Find biggest win
      const biggestWin = history.reduce((max: number, game: any) => {
        return game.outcome > max ? game.outcome : max;
      }, 0);
      
      // Calculate profit/loss
      const profitLoss = history.reduce((sum: number, game: any) => {
        return sum + game.outcome;
      }, 0);
      
      setStats({
        totalBets,
        winRate,
        biggestWin,
        profitLoss,
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-secondary rounded-xl p-4 border border-neutral-border animate-pulse h-[100px]"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <StatsCard
        title="Total Bets"
        value={stats.totalBets}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="text-purple-500"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        }
        trend={
          stats.totalBets > 0
            ? {
                value: "24% from last week",
                isPositive: true,
              }
            : undefined
        }
      />
      
      <StatsCard
        title="Win Rate"
        value={`${stats.winRate.toFixed(1)}%`}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="text-green-500"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22V8" />
            <path d="m17 13-5-5-5 5" />
            <path d="M8 2h8" />
          </svg>
        }
        trend={
          stats.winRate > 0
            ? {
                value: "2.7% from last week",
                isPositive: true,
              }
            : undefined
        }
      />
      
      <StatsCard
        title="Biggest Win"
        value={stats.biggestWin.toFixed(2)}
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="text-red-500"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="14 9 9 4 4 9" />
            <path d="M20 20h-7a4 4 0 0 1-4-4V4" />
          </svg>
        }
      />
      
      <StatsCard
        title="Profit/Loss"
        value={
          stats.profitLoss > 0
            ? `+${stats.profitLoss.toFixed(2)}`
            : stats.profitLoss.toFixed(2)
        }
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="text-green-500"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        }
        trend={
          stats.profitLoss !== 0
            ? {
                value: "17.8% from last week",
                isPositive: stats.profitLoss > 0,
              }
            : undefined
        }
      />
    </div>
  );
}
