import { useState, useContext } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AuthContext, type AuthContextType } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { Wallet, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

export default function WalletCard() {
  const { user } = useContext(AuthContext) as AuthContextType;
  const { toast } = useToast();
  const [amount, setAmount] = useState('100');
  const [tab, setTab] = useState('deposit');
  const queryClient = useQueryClient();

  const depositMutation = useMutation({
    mutationFn: async (depositAmount: number) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      
      const response = await apiRequest('POST', '/api/wallet/deposit', { amount: depositAmount });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Deposit successful',
        description: `${formatCurrency(parseInt(amount))} has been added to your balance.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      setAmount('100');
    },
    onError: (error: Error) => {
      toast({
        title: 'Deposit failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const withdrawMutation = useMutation({
    mutationFn: async (withdrawAmount: number) => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Not authenticated');
      
      const response = await apiRequest('POST', '/api/wallet/withdraw', { amount: withdrawAmount });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Withdrawal successful',
        description: `${formatCurrency(parseInt(amount))} has been withdrawn from your balance.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/users/me'] });
      setAmount('100');
    },
    onError: (error: Error) => {
      toast({
        title: 'Withdrawal failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAmount(value);
  };

  const handleSubmit = () => {
    const amountValue = parseInt(amount);
    
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0.',
        variant: 'destructive',
      });
      return;
    }
    
    if (tab === 'deposit') {
      depositMutation.mutate(amountValue);
    } else {
      // Check if withdrawal amount is greater than balance
      if (amountValue > (user?.balance || 0)) {
        toast({
          title: 'Insufficient balance',
          description: 'You cannot withdraw more than your current balance.',
          variant: 'destructive',
        });
        return;
      }
      
      withdrawMutation.mutate(amountValue);
    }
  };

  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <Card className="bg-primary border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center text-white">
          <Wallet className="mr-2" /> Your Wallet
        </CardTitle>
        <CardDescription className="text-gray-400">
          Manage your virtual balance
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="mb-6 p-4 bg-primary-dark rounded-lg">
          <div className="text-sm text-gray-400">Current Balance</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(user?.balance || 0)}</div>
        </div>
        
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4 bg-primary-dark">
            <TabsTrigger 
              value="deposit"
              className="data-[state=active]:bg-accent data-[state=active]:text-white"
            >
              <ArrowDownCircle className="h-4 w-4 mr-2" /> Deposit
            </TabsTrigger>
            <TabsTrigger 
              value="withdraw"
              className="data-[state=active]:bg-accent data-[state=active]:text-white"
            >
              <ArrowUpCircle className="h-4 w-4 mr-2" /> Withdraw
            </TabsTrigger>
          </TabsList>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                {tab === 'deposit' ? 'Deposit Amount' : 'Withdraw Amount'}
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  className="bg-primary-dark border-gray-700 text-white pr-16"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-400">Credits</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Quick Amounts
              </label>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-primary-dark border-gray-700 text-white hover:bg-primary-light"
                    onClick={() => setAmount(quickAmount.toString())}
                  >
                    {formatCurrency(quickAmount)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Tabs>
      </CardContent>
      
      <CardFooter>
        <Button
          className="w-full bg-accent hover:bg-accent-light text-white"
          onClick={handleSubmit}
          disabled={depositMutation.isPending || withdrawMutation.isPending}
        >
          {depositMutation.isPending || withdrawMutation.isPending
            ? 'Processing...'
            : tab === 'deposit'
            ? 'Deposit Credits'
            : 'Withdraw Credits'}
        </Button>
      </CardFooter>
    </Card>
  );
}
