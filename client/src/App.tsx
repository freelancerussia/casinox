import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

// Pages
import Home from "@/pages/Home";
import Dice from "@/pages/Dice";
import Mines from "@/pages/Mines";
import Crash from "@/pages/Crash";
import Wallet from "@/pages/Wallet";
import Profile from "@/pages/Profile";
import History from "@/pages/History";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

// Components
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthModal from "@/components/auth/AuthModal";

interface User {
  id: number;
  username: string;
  email: string;
  balance: number;
  avatarInitial: string;
  isAdmin: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authModalTab: 'login' | 'signup';
  setAuthModalTab: (tab: 'login' | 'signup') => void;
}

export const AuthContext = React.createContext<AuthContextType | null>(null);

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check for stored token
    const token = localStorage.getItem('token');
    if (token) {
      // Fetch user data
      fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (!res.ok) {
          throw new Error('Authentication failed');
        }
        return res.json();
      })
      .then(userData => {
        setUser(userData);
        setIsAuthenticated(true);
      })
      .catch(err => {
        console.error('Auth error:', err);
        localStorage.removeItem('token');
      });
    }
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    setUser(userData);
    setIsAuthenticated(true);
    setShowAuthModal(false);
    toast({
      title: "Login successful",
      description: `Welcome back, ${userData.username}!`,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    setLocation('/');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  // Check if current route requires authentication
  const requiresAuth = (path: string) => {
    const authProtectedRoutes = ['/wallet', '/profile', '/history', '/admin'];
    return authProtectedRoutes.some(route => path.startsWith(route));
  };

  useEffect(() => {
    if (requiresAuth(location) && !isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to access this page.",
        variant: "destructive"
      });
      setLocation('/');
      setShowAuthModal(true);
    }
  }, [location, isAuthenticated]);

  const authContextValue: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    showAuthModal,
    setShowAuthModal,
    authModalTab,
    setAuthModalTab
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authContextValue}>
        <div className="min-h-screen flex flex-col md:flex-row bg-primary-dark text-white">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1">
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/dice" component={Dice} />
                <Route path="/mines" component={Mines} />
                <Route path="/crash" component={Crash} />
                <Route path="/wallet" component={Wallet} />
                <Route path="/profile" component={Profile} />
                <Route path="/history" component={History} />
                <Route path="/admin" component={Admin} />
                <Route component={NotFound} />
              </Switch>
            </main>
            <Footer />
          </div>
        </div>
        <AuthModal />
        <Toaster />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
