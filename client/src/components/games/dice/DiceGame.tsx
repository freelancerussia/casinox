import { useState, useContext, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AuthContext, type AuthContextType } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  calculateMultiplier, 
  calculatePotentialWin, 
  formatCurrency,
  generateClientSeed,
  getWinChance
} from '@/lib/utils';
import { Check, X, Info, Shield, Settings } from 'lucide-react';

export default function DiceGame() {
  const { user, isAuthenticated, setShowAuthModal } = useContext(AuthContext) as AuthContextType;
  const { toast } = useToast();
  
  // Game state
  const [betAmount, setBetAmount] = useState(50);
  const [target, setTarget] = useState(47);
  const [mode, setMode] = useState<'under' | 'over'>('under');
  const [clientSeed, setClientSeed] = useState(generateClientSeed());
  const [serverSeedHashed, setServerSeedHashed] = useState('');
  const [nonce, setNonce] = useState(0);
  const [recentResults, setRecentResults] = useState<Array<{
    roll: number;
    won: boolean;
  }>>([]);
  const [sessionProfit, setSessionProfit] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [totalBets, setTotalBets] = useState(0);
  
  // Calculate derived values
  const multiplier = calculateMultiplier(target, mode);
  const potentialWin = calculatePotentialWin(betAmount, multiplier);
  const winChance = getWinChance(target, mode);
  
  // Call the dice API
  const diceRollMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You need to be logged in to play');
      }
      
      if (betAmount <= 0) {
        throw new Error('Bet amount must be greater than 0');
      }
      
      if (betAmount > (user?.balance || 0)) {
        throw new Error('Insufficient balance');
      }
      
      const response = await apiRequest('POST', '/api/games/dice/play', {
        betAmount,
        target,
        mode,
        clientSeed
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      // Update roll result
      const { roll, won, multiplier, payout, balance, serverSeedHashed: newServerSeedHashed, nonce: newNonce } = data.result;
      
      // Update game state
      setServerSeedHashed(newServerSeedHashed);
      setNonce(newNonce);
      
      // Update recent results
      setRecentResults(prev => [{ roll, won }, ...prev.slice(0, 4)]);
      
      // Update stats
      setSessionProfit(prev => prev + (won ? payout - betAmount : -betAmount));
      setTotalBets(prev => prev + 1);
      setWinRate(prev => {
        const wins = prev * (totalBets) + (won ? 1 : 0);
        return wins / (totalBets + 1);
      });
      
      // Update streak
      if (won) {
        setCurrentStreak(prev => (prev >= 0 ? prev + 1 : 1));
      } else {
        setCurrentStreak(prev => (prev <= 0 ? prev - 1 : -1));
      }
      
      // Show toast
      toast({
        title: won ? 'You won!' : 'You lost',
        description: won 
          ? `Rolled ${roll}. You won ${formatCurrency(payout)}!` 
          : `Rolled ${roll}. Better luck next time.`,
        variant: won ? 'default' : 'destructive',
      });
      
      // Generate new client seed for next roll
      setClientSeed(generateClientSeed());
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      
      if (error.message.includes('logged in')) {
        setShowAuthModal(true);
      }
    }
  });
  
  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setBetAmount(value);
    }
  };
  
  const handleRoll = () => {
    diceRollMutation.mutate();
  };
  
  const handleHalfBet = () => {
    setBetAmount(Math.max(1, Math.floor(betAmount / 2)));
  };
  
  const handleDoubleBet = () => {
    setBetAmount(betAmount * 2);
  };
  
  const handleMaxBet = () => {
    setBetAmount(user?.balance || 0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Game Controls */}
      <div className="lg:col-span-2">
        <Card className="bg-primary">
          <CardContent className="p-6">
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-400">Roll Mode</span>
                <Tabs value={mode} onValueChange={(value) => setMode(value as 'under' | 'over')} className="h-8">
                  <TabsList className="h-8 bg-primary-dark">
                    <TabsTrigger
                      value="under"
                      className="h-8 px-4 data-[state=active]:bg-accent data-[state=active]:text-white"
                    >
                      Roll Under
                    </TabsTrigger>
                    <TabsTrigger
                      value="over"
                      className="h-8 px-4 data-[state=active]:bg-accent data-[state=active]:text-white"
                    >
                      Roll Over
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-400">Target Number: <span className="text-white">{target}</span></span>
                <span className="text-sm text-green-500">Win Chance: {winChance}%</span>
              </div>
              <div className="relative mb-1">
                <Slider
                  value={[target]}
                  min={1}
                  max={95}
                  step={1}
                  onValueChange={(values) => setTarget(values[0])}
                  className="dice-slider"
                />
              </div>
              <div className="w-full flex justify-between text-xs text-gray-500 px-2">
                <span>1</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>95</span>
              </div>
            </div>
            
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Bet Amount</label>
                <div className="relative">
                  <Input
                    type="text"
                    value={betAmount}
                    onChange={handleBetAmountChange}
                    className="w-full bg-primary-dark border border-gray-700 rounded-lg py-2 px-3 text-white"
                  />
                </div>
                <div className="flex space-x-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-primary-light hover:bg-accent text-gray-400 hover:text-white"
                    onClick={handleHalfBet}
                  >
                    1/2
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-primary-light hover:bg-accent text-gray-400 hover:text-white"
                    onClick={handleDoubleBet}
                  >
                    2x
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-primary-light hover:bg-accent text-gray-400 hover:text-white"
                    onClick={handleMaxBet}
                  >
                    Max
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-2">Potential Win</label>
                <div className="bg-primary-dark border border-gray-700 rounded-lg py-2 px-3 text-green-500">
                  {formatCurrency(potentialWin)}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Multiplier: <span className="text-white">{multiplier}x</span>
                </div>
              </div>
            </div>
            
            <div>
              <Button
                className="w-full bg-accent hover:bg-accent-light text-white py-3 rounded-lg text-lg font-semibold transition duration-200 h-12"
                onClick={handleRoll}
                disabled={diceRollMutation.isPending || !isAuthenticated || betAmount <= 0 || betAmount > (user?.balance || 0)}
              >
                {diceRollMutation.isPending ? 'Rolling...' : 'Roll Dice'}
              </Button>
            </div>
            
            <div className="flex justify-center mt-4 text-xs">
              <a href="#" className="text-accent hover:text-accent-light mr-4 flex items-center">
                <Shield className="h-3 w-3 mr-1" /> Provably Fair
              </a>
              <a href="#" className="text-accent hover:text-accent-light flex items-center">
                <Settings className="h-3 w-3 mr-1" /> Game Settings
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Game Results & Stats */}
      <div>
        <Card className="bg-primary h-full">
          <CardContent className="p-6">
            <div className="border-b border-gray-800 pb-4 mb-4">
              <div className="text-center mb-8">
                <div className="text-xs text-gray-400 mb-1">Last Roll</div>
                <div className="text-5xl font-heading font-bold text-white">
                  {recentResults.length > 0 ? recentResults[0].roll.toFixed(2) : '0.00'}
                </div>
                {recentResults.length > 0 && (
                  <div className="mt-2 inline-block bg-opacity-20 px-2 py-1 rounded-md text-sm">
                    {recentResults[0].won ? (
                      <span className="text-green-500 flex items-center">
                        <Check className="h-4 w-4 mr-1" /> Win
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center">
                        <X className="h-4 w-4 mr-1" /> Loss
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex justify-center mt-4">
                <div className="flex space-x-1">
                  {recentResults.map((result, index) => (
                    <div
                      key={index}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                        result.won
                          ? 'bg-green-500 bg-opacity-20 text-green-500'
                          : 'bg-red-500 bg-opacity-20 text-red-500'
                      }`}
                    >
                      {result.roll.toFixed(0)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Session Profit</div>
                <div className={`text-xl font-semibold ${
                  sessionProfit > 0 
                    ? 'text-green-500' 
                    : sessionProfit < 0 
                    ? 'text-red-500' 
                    : 'text-white'
                }`}>
                  {sessionProfit > 0 ? '+' : ''}{formatCurrency(sessionProfit)}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">Win Rate</div>
                <div className="text-xl font-semibold text-white">
                  {totalBets > 0 ? `${Math.round(winRate * 100)}%` : '0%'}
                </div>
              </div>
              
              <div>
                <div className="text-xs text-gray-400 mb-1">Streak</div>
                <div className="text-xl font-semibold text-white flex items-center">
                  {currentStreak !== 0 && (
                    <span className={`mr-1 ${currentStreak > 0 ? 'text-orange-500' : 'text-blue-500'}`}>
                      {currentStreak > 0 ? '🔥' : '❄️'}
                    </span>
                  )}
                  {Math.abs(currentStreak)} {Math.abs(currentStreak) === 1 ? (
                    currentStreak > 0 ? 'Win' : 'Loss'
                  ) : (
                    currentStreak > 0 ? 'Wins' : 'Losses'
                  )}
                </div>
              </div>
              
              {serverSeedHashed && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Server Seed</div>
                  <div className="flex items-center">
                    <span className="text-sm text-white truncate">{serverSeedHashed.substring(0, 6)}...</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="ml-2 text-accent hover:text-accent-light h-6 w-6 p-0"
                      onClick={() => {
                        navigator.clipboard.writeText(serverSeedHashed);
                        toast({
                          title: "Copied to clipboard",
                          description: "Server seed hash copied to clipboard.",
                        });
                      }}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
