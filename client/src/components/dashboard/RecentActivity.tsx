import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ActivityTable from "@/components/ui/activity-table";
import { GameHistory } from "@shared/schema";
import { AppState } from "@/App";

interface RecentActivityProps {
  appState: AppState;
}

export default function RecentActivity({ appState }: RecentActivityProps) {
  const { user } = appState;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<GameHistory[]>([]);

  useEffect(() => {
    if (user) {
      fetchGameHistory();
    }
  }, [user]);

  const fetchGameHistory = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/games/history");
      const data = await res.json();
      setHistory(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load game history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-secondary rounded-xl border border-neutral-border">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="font-heading font-semibold text-lg">Recent Activity</CardTitle>
          <a href="/history" className="text-xs text-purple-500 hover:underline">View All</a>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <ActivityTable items={history} />
        )}
      </CardContent>
    </Card>
  );
}
