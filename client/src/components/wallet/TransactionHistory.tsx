import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext, type AuthContextType } from '@/App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, formatTime } from '@/lib/utils';
import { ArrowDownCircle, ArrowUpCircle, Ban, Award } from 'lucide-react';

interface Transaction {
  id: number;
  userId: number;
  type: 'deposit' | 'withdraw' | 'bet' | 'win';
  amount: number;
  gameType: string | null;
  timestamp: string;
  meta: any;
}

export default function TransactionHistory() {
  const { user } = useContext(AuthContext) as AuthContextType;
  
  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ['/api/wallet/transactions'],
    enabled: !!user
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownCircle className="h-5 w-5 text-green-500" />;
      case 'withdraw':
        return <ArrowUpCircle className="h-5 w-5 text-yellow-500" />;
      case 'bet':
        return <Ban className="h-5 w-5 text-red-500" />;
      case 'win':
        return <Award className="h-5 w-5 text-green-500" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-500" />;
    }
  };

  const getGameIcon = (gameType: string | null) => {
    if (!gameType) return null;
    
    switch (gameType) {
      case 'dice':
        return <div className="h-4 w-4 bg-accent rounded-sm flex items-center justify-center text-[10px] text-white">D</div>;
      case 'mines':
        return <div className="h-4 w-4 bg-red-500 rounded-sm flex items-center justify-center text-[10px] text-white">M</div>;
      case 'crash':
        return <div className="h-4 w-4 bg-green-500 rounded-sm flex items-center justify-center text-[10px] text-white">C</div>;
      default:
        return null;
    }
  };

  return (
    <Card className="bg-primary border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Transaction History</CardTitle>
        <CardDescription className="text-gray-400">
          Recent activity in your account
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-gray-400">Loading transactions...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">Error loading transactions</div>
        ) : transactions?.length === 0 ? (
          <div className="text-center py-4 text-gray-400">No transactions found</div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {transactions?.map((transaction: Transaction) => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-primary-dark rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="mr-3">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-white capitalize">
                          {transaction.type}
                        </div>
                        {getGameIcon(transaction.gameType) && (
                          <div className="ml-2">{getGameIcon(transaction.gameType)}</div>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{formatTime(transaction.timestamp)}</div>
                    </div>
                  </div>
                  <div className={`font-medium ${transaction.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
