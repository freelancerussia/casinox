import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { AppState } from "@/App";
import AuthModal from "@/components/layout/AuthModal";
import ActivityTable from "@/components/ui/activity-table";

interface WalletProps {
  appState: AppState;
}

export default function Wallet({ appState }: WalletProps) {
  const { user, setUser } = appState;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [depositAmount, setDepositAmount] = useState(100);
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user && !appState.isLoading) {
      setShowAuthModal(true);
    }
  }, [user, appState.isLoading]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/games/history");
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!user) return;
    
    if (depositAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive amount to deposit",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      const res = await apiRequest("POST", "/api/wallet/deposit", {
        amount: depositAmount
      });
      
      const data = await res.json();
      
      // Update user balance
      setUser({
        ...user,
        balance: data.balance
      });
      
      toast({
        title: "Deposit Successful",
        description: `${depositAmount} credits have been added to your account`,
      });
      
      // Reset form
      setDepositAmount(100);
      
      // Refresh transactions
      fetchTransactions();
      
    } catch (error) {
      toast({
        title: "Deposit Failed",
        description: "There was an error processing your deposit",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user) return;
    
    if (withdrawAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a positive amount to withdraw",
        variant: "destructive",
      });
      return;
    }
    
    if (withdrawAmount > user.balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance to withdraw this amount",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      const res = await apiRequest("POST", "/api/wallet/withdraw", {
        amount: withdrawAmount
      });
      
      const data = await res.json();
      
      // Update user balance
      setUser({
        ...user,
        balance: data.balance
      });
      
      toast({
        title: "Withdrawal Successful",
        description: `${withdrawAmount} credits have been withdrawn from your account`,
      });
      
      // Reset form
      setWithdrawAmount(100);
      
      // Refresh transactions
      fetchTransactions();
      
    } catch (error) {
      toast({
        title: "Withdrawal Failed",
        description: "There was an error processing your withdrawal",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseAuthModal = () => {
    setShowAuthModal(false);
    if (!user) {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-primary">
      <Sidebar appState={appState} />
      
      <main className="flex-grow">
        <TopBar title="Wallet" />
        
        <div className="p-4 md:p-6">
          {user && (
            <>
              <div className="mb-6">
                <Card className="bg-secondary border-neutral-border">
                  <CardHeader>
                    <CardTitle>Your Balance</CardTitle>
                    <CardDescription>Manage your virtual credits</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-primary p-6 rounded-lg text-center mb-6">
                      <p className="text-neutral-400 mb-2">Available Balance</p>
                      <h2 className="text-4xl font-bold font-mono">{user.balance.toFixed(2)}</h2>
                      <p className="text-sm text-neutral-400 mt-2">Credits</p>
                    </div>
                    
                    <Tabs defaultValue="deposit">
                      <TabsList className="grid grid-cols-2 mb-4">
                        <TabsTrigger value="deposit">Deposit</TabsTrigger>
                        <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="deposit" className="space-y-4">
                        <div>
                          <label className="block text-sm text-neutral-400 mb-2">Deposit Amount</label>
                          <Input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                            className="bg-primary border-neutral-border text-white"
                          />
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                          <Button
                            variant="outline"
                            className="bg-primary border-neutral-border text-white hover:bg-neutral-800"
                            onClick={() => setDepositAmount(50)}
                          >
                            50
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-primary border-neutral-border text-white hover:bg-neutral-800"
                            onClick={() => setDepositAmount(100)}
                          >
                            100
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-primary border-neutral-border text-white hover:bg-neutral-800"
                            onClick={() => setDepositAmount(500)}
                          >
                            500
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-primary border-neutral-border text-white hover:bg-neutral-800"
                            onClick={() => setDepositAmount(1000)}
                          >
                            1000
                          </Button>
                        </div>
                        
                        <Button
                          className="w-full bg-green-500 hover:bg-green-600 text-white"
                          onClick={handleDeposit}
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <span className="flex items-center">
                              <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                                ></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            "Deposit Credits"
                          )}
                        </Button>
                        
                        <p className="text-xs text-neutral-400 text-center">
                          This is a virtual deposit for demonstration purposes only.
                        </p>
                      </TabsContent>
                      
                      <TabsContent value="withdraw" className="space-y-4">
                        <div>
                          <label className="block text-sm text-neutral-400 mb-2">Withdraw Amount</label>
                          <Input
                            type="number"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                            className="bg-primary border-neutral-border text-white"
                          />
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                          <Button
                            variant="outline"
                            className="bg-primary border-neutral-border text-white hover:bg-neutral-800"
                            onClick={() => setWithdrawAmount(50)}
                          >
                            50
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-primary border-neutral-border text-white hover:bg-neutral-800"
                            onClick={() => setWithdrawAmount(100)}
                          >
                            100
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-primary border-neutral-border text-white hover:bg-neutral-800"
                            onClick={() => setWithdrawAmount(500)}
                          >
                            500
                          </Button>
                          <Button
                            variant="outline"
                            className="bg-primary border-neutral-border text-white hover:bg-neutral-800"
                            onClick={() => setWithdrawAmount(user?.balance || 0)}
                          >
                            All
                          </Button>
                        </div>
                        
                        <Button
                          className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                          onClick={handleWithdraw}
                          disabled={isProcessing || (user && withdrawAmount > user.balance)}
                        >
                          {isProcessing ? (
                            <span className="flex items-center">
                              <svg
                                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                                ></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            "Withdraw Credits"
                          )}
                        </Button>
                        
                        <p className="text-xs text-neutral-400 text-center">
                          This is a virtual withdrawal for demonstration purposes only.
                        </p>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="bg-secondary border-neutral-border">
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-40 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                  ) : (
                    <ActivityTable items={transactions} />
                  )}
                </CardContent>
              </Card>
            </>
          )}
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
