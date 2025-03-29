import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ActivityTable from "@/components/ui/activity-table";
import { GameHistory } from "@shared/schema";
import { AppState } from "@/App";
import AuthModal from "@/components/layout/AuthModal";

interface HistoryPageProps {
  appState: AppState;
}

export default function HistoryPage({ appState }: HistoryPageProps) {
  const [, setLocation] = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<GameHistory[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!appState.user && !appState.isLoading) {
      setShowAuthModal(true);
    } else if (appState.user) {
      fetchGameHistory();
    }
  }, [appState.user, appState.isLoading]);

  const fetchGameHistory = async () => {
    if (!appState.user) return;
    
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/games/history");
      const data = await res.json();
      setHistory(data);
      console.log("Game history loaded successfully");
    } catch (error) {
      console.error("Error fetching game history:", error);
      toast({
        title: "Error",
        description: "Failed to load game history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
    if (!appState.user) {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-primary">
      <Sidebar appState={appState} />
      
      <main className="flex-grow">
        <TopBar title="Game History" />
        
        <div className="p-4 md:p-6">
          <Card className="bg-secondary border-neutral-border">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">
                Your Game History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-accent rounded-full border-b-transparent animate-spin"></div>
                </div>
              ) : (
                <ActivityTable 
                  items={history} 
                  showUsername={false}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          authType="login"
          onClose={handleCloseAuthModal}
          appState={appState}
        />
      )}
    </div>
  );
}