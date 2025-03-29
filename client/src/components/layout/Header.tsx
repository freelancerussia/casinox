import { useContext } from 'react';
import { useLocation } from 'wouter';
import { AuthContext, type AuthContextType } from '@/App';
import { Bell, Settings, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Header() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useContext(AuthContext) as AuthContextType;
  
  // Convert location path to title (e.g., "/dice" -> "Dice")
  const getPageTitle = () => {
    if (location === '/') return 'Home';
    return location.substring(1).charAt(0).toUpperCase() + location.substring(2);
  };
  
  return (
    <header className="bg-primary p-4 border-b border-gray-800 flex justify-between items-center">
      <h1 className="text-xl font-heading font-semibold">{getPageTitle()}</h1>
      
      {isAuthenticated ? (
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="bg-primary-dark hover:bg-primary-light text-gray-400 rounded-full">
              <Bell size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="bg-primary-dark hover:bg-primary-light text-gray-400 rounded-full">
              <Settings size={20} />
            </Button>
            {user?.isAdmin && (
              <Button variant="ghost" size="icon" className="bg-primary-dark hover:bg-primary-light text-gray-400 rounded-full">
                <Shield size={20} />
              </Button>
            )}
          </div>
          
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-accent-dark flex items-center justify-center text-white font-semibold mr-2">
              {user?.avatarInitial || user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-medium">{user?.username}</div>
              <div className="text-xs text-gray-400">{user?.email}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center">
          <div className="text-sm text-gray-400">Not logged in</div>
        </div>
      )}
    </header>
  );
}
