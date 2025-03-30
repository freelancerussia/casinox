import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Dice from "@/pages/dice";
import Crash from "@/pages/crash";
import Mines from "@/pages/mines";
import Wallet from "@/pages/wallet";
import History from "@/pages/history";
import Admin from "@/pages/admin";
import { useEffect, useState } from "react";
import { apiRequest } from "./lib/queryClient";
import { User as BaseUser } from "@shared/schema";
import { initWebSocket } from "./lib/websocket";

// Extend User type to include token property
export type User = BaseUser & {
  token?: string;
};

export type AppState = {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  token?: string;
};

// Added functions for token management
const getAuthToken = () => localStorage.getItem('authToken');
const setAuthToken = (token: string | null) => localStorage.setItem('authToken', token || '');
const removeAuthToken = () => localStorage.removeItem('authToken');


function Router() {
  const [appState, setAppState] = useState<AppState>({
    user: null,
    isLoading: true,
    setUser: (user) => {
      if (user) {
        setAuthToken(user.token); //Store token separately
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        removeAuthToken();
        localStorage.removeItem('user');
      }
      setAppState(prev => ({ ...prev, user, token: user?.token }));
    }
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getAuthToken();
        if (token) {
          const res = await apiRequest("GET", "/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
          const userData = await res.json();
          setAppState(prev => ({ ...prev, user: userData, isLoading: false }));
        } else {
          const res = await apiRequest("GET", "/api/auth/me");
          const userData = await res.json();
          setAppState(prev => ({ ...prev, user: userData, isLoading: false }));
        }
      } catch (error) {
        removeAuthToken();
        setAppState(prev => ({ ...prev, isLoading: false }));
      }
    };

    checkAuth();
  }, []);

  if (appState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="w-8 h-8 border-4 border-accent rounded-full border-b-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={() => <Dashboard appState={appState} />} />
      <Route path="/login" component={() => <Login appState={appState} />} />
      <Route path="/register" component={() => <Login appState={appState} />} />
      <Route path="/dice" component={() => <Dice appState={appState} />} />
      <Route path="/crash" component={() => <Crash appState={appState} />} />
      <Route path="/mines" component={() => <Mines appState={appState} />} />
      <Route path="/wallet" component={() => <Wallet appState={appState} />} />
      <Route path="/history" component={() => <History appState={appState} />} />
      {appState.user?.isAdmin && <Route path="/admin" component={() => <Admin appState={appState} />} />}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  // Initialize WebSocket connection
  useEffect(() => {
    initWebSocket();
    // Check if user is admin
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(user => setIsAdmin(user.isAdmin));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      {isAdmin && <Link to="/admin" className="fixed bottom-4 right-4 bg-purple-600 text-white p-2 rounded">Admin Panel</Link>}
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;