import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import AuthModal from "@/components/layout/AuthModal";
import { AppState } from "@/App";

interface LoginProps {
  appState: AppState;
}

export default function Login({ appState }: LoginProps) {
  const [, setLocation] = useLocation();
  const [showModal, setShowModal] = useState(true);
  const [authType, setAuthType] = useState<"login" | "register">("login");

  useEffect(() => {
    // Check if we should show login or register
    const path = window.location.pathname;
    if (path === "/register") {
      setAuthType("register");
    } else {
      setAuthType("login");
    }
  }, []);

  // Redirect to home if already logged in
  useEffect(() => {
    if (appState.user) {
      setLocation("/");
    }
  }, [appState.user, setLocation]);

  // Redirect to home if modal is closed
  const handleCloseModal = () => {
    setShowModal(false);
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-md bg-secondary border-neutral-border">
        <CardContent className="p-0">
          <AuthModal
            isOpen={showModal}
            authType={authType}
            onClose={handleCloseModal}
            appState={appState}
          />
        </CardContent>
      </Card>
    </div>
  );
}
