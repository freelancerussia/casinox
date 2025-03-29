import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import GameCard from "@/components/games/GameCard";
import StatsRow from "@/components/dashboard/StatsRow";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { AppState } from "@/App";
import AuthModal from "@/components/layout/AuthModal";
import DiceGame from "@/components/games/DiceGame";
import CrashGame from "@/components/games/CrashGame";
import MinesGame from "@/components/games/MinesGame";

interface DashboardProps {
  appState: AppState;
}

export default function Dashboard({ appState }: DashboardProps) {
  const [location] = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState<"login" | "register">("login");
  const [activeGamePreview, setActiveGamePreview] = useState<string | null>("dice");

  useEffect(() => {
    // Check if the user is not logged in and has visited the page before
    const hasVisited = localStorage.getItem("hasVisitedDashboard");
    
    if (!appState.user && !hasVisited) {
      setTimeout(() => {
        setShowAuthModal(true);
        setAuthType("login");
      }, 2000);
      
      localStorage.setItem("hasVisitedDashboard", "true");
    }
  }, [appState.user]);

  const handlePlayGame = (game: string) => {
    if (!appState.user) {
      setShowAuthModal(true);
      setAuthType("login");
      return;
    }
    
    setActiveGamePreview(game);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-primary">
      <Sidebar appState={appState} />
      
      <main className="flex-grow">
        <TopBar title="Dashboard" />
        
        <div className="p-4 md:p-6">
          {/* Stats Row */}
          <StatsRow appState={appState} />
          
          {/* Games Section */}
          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-4">Popular Games</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GameCard
                title="Dice"
                description="Roll under or over a target"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="12" height="12" x="6" y="6" rx="2" />
                    <path d="m10 10 4 4m0-4-4 4"/>
                  </svg>
                }
                playersCount={1245}
                rtp={97}
                route="/dice"
                accentColor="#8C52FF"
                buttonColor="#8C52FF"
              />
              
              <GameCard
                title="Crash"
                description="Cash out before the crash"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                  </svg>
                }
                playersCount={2187}
                rtp={96}
                route="/crash"
                accentColor="#FF3E3E"
                buttonColor="#FF3E3E"
              />
              
              <GameCard
                title="Mines"
                description="Avoid the hidden mines"
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                }
                playersCount={1623}
                rtp={98}
                route="/mines"
                accentColor="#00E701"
                buttonColor="#00E701"
              />
            </div>
          </div>
          
          {/* Game Previews */}
          {activeGamePreview === "dice" && (
            <DiceGame appState={appState} />
          )}
          
          {activeGamePreview === "crash" && (
            <CrashGame appState={appState} />
          )}
          
          {activeGamePreview === "mines" && (
            <MinesGame appState={appState} />
          )}
          
          {/* Recent Activity */}
          <RecentActivity appState={appState} />
        </div>
      </main>
      
      <AuthModal
        isOpen={showAuthModal}
        authType={authType}
        onClose={() => setShowAuthModal(false)}
        appState={appState}
      />
    </div>
  );
}
