import { useContext } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthContext, type AuthContextType } from '@/App';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, authModalTab, setAuthModalTab } = useContext(AuthContext) as AuthContextType;

  return (
    <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
      <DialogContent className="bg-primary border-gray-800 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-heading font-semibold text-white">
            Welcome to CryptoPlay
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={authModalTab} onValueChange={(value) => setAuthModalTab(value as 'login' | 'signup')} className="mt-4">
          <TabsList className="grid grid-cols-2 bg-primary-dark">
            <TabsTrigger 
              value="login"
              className="data-[state=active]:bg-accent data-[state=active]:text-white"
            >
              Login
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="data-[state=active]:bg-accent data-[state=active]:text-white"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          
          <TabsContent value="signup">
            <SignupForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
