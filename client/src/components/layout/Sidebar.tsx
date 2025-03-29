import { useState, useContext } from 'react';
import { Link, useLocation } from 'wouter';
import { AuthContext, type AuthContextType } from '@/App';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Home,
  Wallet,
  BarChart2,
  Dice,
  Bomb,
  LineChart,
  ChevronUp,
  User,
  History,
  LogOut
} from 'lucide-react';

export default function Sidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout, setShowAuthModal, setAuthModalTab } = useContext(AuthContext) as AuthContextType;
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const NavLink = ({ href, icon, children }: { href: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <Link href={href}>
      <a className={cn(
        "flex items-center px-4 py-2 rounded-lg transition-colors",
        location === href 
          ? "text-white bg-accent" 
          : "text-gray-400 hover:text-white hover:bg-primary-light"
      )}>
        <span className="mr-3">{icon}</span>
        <span>{children}</span>
      </a>
    </Link>
  );

  const handleAuthClick = () => {
    setAuthModalTab('login');
    setShowAuthModal(true);
  };

  return (
    <aside className={cn(
      "bg-primary-dark border-r border-gray-800 flex flex-col",
      "w-full md:w-64 md:h-screen md:sticky md:top-0 md:flex-shrink-0",
      isMobileOpen ? "min-h-screen" : "h-auto md:min-h-screen",
      "md:flex z-30"
    )}>
      <div className="p-4 flex items-center justify-between md:justify-center border-b border-gray-800">
        <Link href="/">
          <a className="flex items-center">
            <span className="text-accent text-2xl font-heading font-bold">
              Crypto<span className="text-white">Play</span>
            </span>
          </a>
        </Link>
        <button 
          className="md:hidden text-gray-400 hover:text-white"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? <ChevronUp size={24} /> : <div className="w-6 h-0.5 bg-gray-400 mb-1.5"></div>}
        </button>
      </div>
      
      <nav className={cn(
        "flex flex-col p-4 space-y-2",
        isMobileOpen ? "block" : "hidden md:block"
      )}>
        <div className="text-xs uppercase text-gray-500 font-semibold mb-2 tracking-wider">Main</div>
        
        <NavLink href="/" icon={<Home size={18} />}>Home</NavLink>
        <NavLink href="/wallet" icon={<Wallet size={18} />}>Wallet</NavLink>
        <NavLink href="/history" icon={<BarChart2 size={18} />}>Stats</NavLink>
        
        <div className="text-xs uppercase text-gray-500 font-semibold mt-6 mb-2 tracking-wider">Games</div>
        
        <NavLink href="/dice" icon={<Dice size={18} />}>Dice</NavLink>
        <NavLink href="/mines" icon={<Bomb size={18} />}>Mines</NavLink>
        <NavLink href="/crash" icon={<LineChart size={18} />}>Crash</NavLink>
        
        <div className="text-xs uppercase text-gray-500 font-semibold mt-6 mb-2 tracking-wider">Account</div>
        
        {isAuthenticated ? (
          <>
            <NavLink href="/profile" icon={<User size={18} />}>Profile</NavLink>
            <NavLink href="/history" icon={<History size={18} />}>History</NavLink>
            <a 
              className="flex items-center px-4 py-2 text-gray-400 hover:text-white hover:bg-primary-light rounded-lg cursor-pointer" 
              onClick={logout}
            >
              <span className="mr-3"><LogOut size={18} /></span>
              <span>Logout</span>
            </a>
            
            {user?.isAdmin && (
              <>
                <div className="text-xs uppercase text-gray-500 font-semibold mt-6 mb-2 tracking-wider">Admin</div>
                <NavLink href="/admin" icon={<Shield size={18} />}>Admin Panel</NavLink>
              </>
            )}
          </>
        ) : (
          <Button 
            variant="default" 
            className="bg-accent hover:bg-accent-light text-white mt-2"
            onClick={handleAuthClick}
          >
            Login / Sign Up
          </Button>
        )}
      </nav>
      
      {isAuthenticated && (
        <div className={cn(
          "mt-auto p-4 border-t border-gray-800",
          isMobileOpen ? "block" : "hidden md:block"
        )}>
          <div className="bg-primary rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400">Balance</div>
              <div className="font-semibold text-white">{user?.balance.toLocaleString()} Credits</div>
            </div>
            <Link href="/wallet">
              <Button size="sm" className="bg-accent text-white hover:bg-accent-light">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
