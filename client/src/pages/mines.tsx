import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MinesGame from "@/components/games/MinesGame";
import { AppState } from "@/App";
import { useLocation } from "wouter";
import { useEffect } from "react";
import AuthModal from "@/components/layout/AuthModal";
import { useState } from "react";

interface MinesPageProps {
  appState: AppState;
}

export default function MinesPage({ appState }: MinesPageProps) {
  const [, setLocation] = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!appState.user && !appState.isLoading) {
      setShowAuthModal(true);
    }
  }, [appState.user, appState.isLoading]);

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
        <TopBar title="Mines Game" />
        
        <div className="p-4 md:p-6">
          <MinesGame appState={appState} />
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
