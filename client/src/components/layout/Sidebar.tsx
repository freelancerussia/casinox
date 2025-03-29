import { useState } from "react";
import { Link, useLocation } from "wouter";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AppState } from "@/App";

interface SidebarProps {
  appState: AppState;
}

export default function Sidebar({ appState }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { toast } = useToast();
  const { user, setUser } = appState;

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      setUser(null);
      toast({
        title: "Logged out successfully",
        description: "You have been logged out from your account.",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <aside className="bg-secondary w-full md:w-64 flex-shrink-0 border-r border-neutral-border transition-all duration-300 ease-in-out md:h-screen md:sticky md:top-0">
      <div className="p-4 flex items-center justify-between md:justify-center border-b border-neutral-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="text-white" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="12" height="12" x="6" y="6" rx="2" />
              <path d="m10 10 4 4m0-4-4 4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">CasinoX</h1>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className={`${isOpen ? "block" : "hidden"} md:block`}>
        {user ? (
          <div className="p-4 border-b border-neutral-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-neutral-400 text-lg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 20a6 6 0 0 0-12 0" />
                  <circle cx="12" cy="10" r="4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm text-white">{user.username}</p>
                <p className="text-xs text-neutral-400">{user.email}</p>
              </div>
            </div>
            
            {/* Wallet Balance */}
            <div className="mt-4 p-3 rounded-lg bg-primary">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-400">Balance</span>
                <span className="text-xs text-green-500">+2.5%</span>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-lg font-mono font-medium">{user.balance.toFixed(2)}</span>
                <span className="ml-1 text-xs text-neutral-400">Credits</span>
              </div>
              <div className="flex space-x-2 mt-3">
                <Link href="/wallet" className="flex-1 text-center text-xs py-2 bg-green-500/10 text-green-500 rounded-lg hover:bg-green-500/20">
                  Deposit
                </Link>
                <Link href="/wallet" className="flex-1 text-center text-xs py-2 bg-neutral-800/30 text-white rounded-lg hover:bg-neutral-800/50">
                  Withdraw
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-neutral-border">
            <Link href="/login" className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white text-center rounded-lg block">
              Login
            </Link>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-4">
          <p className="text-xs text-neutral-400 mb-2">MAIN MENU</p>
          <ul>
            <li>
              <Link href="/" className={`flex items-center space-x-3 p-2 rounded-lg mb-1 ${location === "/" ? "bg-purple-500/20 text-white" : "text-neutral-400 hover:bg-primary hover:text-white"}`}>
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
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link href="/wallet" className={`flex items-center space-x-3 p-2 rounded-lg mb-1 ${location === "/wallet" ? "bg-purple-500/20 text-white" : "text-neutral-400 hover:bg-primary hover:text-white"}`}>
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
                  <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                  <path d="M20 12v4H6a2 2 0 0 0-2 2c0 1.1.9 2 2 2h12v-4" />
                  <path d="M20 12h2v4h-2v-4Z" />
                  <path d="M20 12h2V8h-2v4Z" />
                </svg>
                <span>Wallet</span>
              </Link>
            </li>
            <li>
              <Link href="/history" className={`flex items-center space-x-3 p-2 rounded-lg mb-1 ${location === "/history" ? "bg-purple-500/20 text-white" : "text-neutral-400 hover:bg-primary hover:text-white"}`}>
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
                  <path d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
                <span>History</span>
              </Link>
            </li>
            {user?.isAdmin && (
              <li>
                <Link href="/admin" className={`flex items-center space-x-3 p-2 rounded-lg mb-1 ${location === "/admin" ? "bg-purple-500/20 text-white" : "text-neutral-400 hover:bg-primary hover:text-white"}`}>
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
                    <path d="M12 2H2v10h10V2Z" />
                    <path d="M12 12H2v10h10V12Z" />
                    <path d="M22 2h-10v10h10V2Z" />
                    <path d="M22 12h-10v10h10V12Z" />
                  </svg>
                  <span>Admin</span>
                </Link>
              </li>
            )}
          </ul>

          <p className="text-xs text-neutral-400 mt-6 mb-2">GAMES</p>
          <ul>
            <li>
              <Link href="/dice" className={`flex items-center space-x-3 p-2 rounded-lg mb-1 ${location === "/dice" ? "bg-purple-500/20 text-white" : "text-neutral-400 hover:bg-primary hover:text-white"}`}>
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
                  <rect width="12" height="12" x="6" y="6" rx="2" />
                  <path d="m10 10 4 4m0-4-4 4"/>
                </svg>
                <span>Dice</span>
              </Link>
            </li>
            <li>
              <Link href="/crash" className={`flex items-center space-x-3 p-2 rounded-lg mb-1 ${location === "/crash" ? "bg-purple-500/20 text-white" : "text-neutral-400 hover:bg-primary hover:text-white"}`}>
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
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                </svg>
                <span>Crash</span>
              </Link>
            </li>
            <li>
              <Link href="/mines" className={`flex items-center space-x-3 p-2 rounded-lg mb-1 ${location === "/mines" ? "bg-purple-500/20 text-white" : "text-neutral-400 hover:bg-primary hover:text-white"}`}>
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
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
                <span>Mines</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Logout Button */}
        {user && (
          <div className="p-4 mt-auto border-t border-neutral-border">
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 text-neutral-400 hover:text-white"
            >
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
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
