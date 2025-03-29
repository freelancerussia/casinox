import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, GameHistory, Transaction } from "@shared/schema";
import ActivityTable from "@/components/ui/activity-table";
import { AppState } from "@/App";

interface AdminPanelProps {
  appState: AppState;
}

export default function AdminPanel({ appState }: AdminPanelProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetUserId, setResetUserId] = useState<string>("");
  const [resetAmount, setResetAmount] = useState<string>("1000");

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchGameHistory(),
      fetchTransactions()
    ]);
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/users");
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  const fetchGameHistory = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/game-history");
      const data = await res.json();
      setGameHistory(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load game history",
        variant: "destructive",
      });
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/transactions");
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    }
  };

  const handleResetBalance = async () => {
    const userId = parseInt(resetUserId);
    const balance = parseFloat(resetAmount);
    
    if (isNaN(userId) || isNaN(balance)) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid user ID and balance",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const res = await apiRequest("POST", "/api/admin/reset-balance", {
        userId,
        balance
      });
      
      const data = await res.json();
      
      toast({
        title: "Balance Reset",
        description: `User #${userId} balance updated from ${data.previousBalance} to ${data.newBalance}`,
      });
      
      // Refresh user list
      fetchUsers();
      fetchTransactions();
      
      // Clear form
      setResetUserId("");
      setResetAmount("1000");
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset user balance",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-secondary border-neutral-border">
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="users">
            <TabsList className="mb-4">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="games">Game History</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="users" className="space-y-4">
              <Card className="bg-primary border-neutral-border">
                <CardHeader>
                  <CardTitle className="text-lg">Reset User Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block text-sm text-neutral-400 mb-2">User ID</label>
                      <Input
                        type="number"
                        value={resetUserId}
                        onChange={(e) => setResetUserId(e.target.value)}
                        placeholder="Enter user ID"
                        className="bg-secondary border-neutral-border text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-400 mb-2">New Balance</label>
                      <Input
                        type="number"
                        value={resetAmount}
                        onChange={(e) => setResetAmount(e.target.value)}
                        placeholder="Enter new balance"
                        className="bg-secondary border-neutral-border text-white"
                      />
                    </div>
                    <Button 
                      onClick={handleResetBalance}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      Reset Balance
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <div className="overflow-x-auto rounded-md border border-neutral-border">
                <Table>
                  <TableHeader className="bg-primary">
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Admin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-primary/50">
                        <TableCell>{user.id}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell className="font-mono">{user.balance.toFixed(2)}</TableCell>
                        <TableCell>
                          {user.isAdmin ? (
                            <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-500">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-neutral-500/10 px-2.5 py-0.5 text-xs font-medium text-neutral-400">
                              No
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-neutral-400 py-4">
                          No users found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            
            <TabsContent value="games">
              <div className="rounded-md border border-neutral-border overflow-hidden">
                <ActivityTable items={gameHistory} showUsername={true} />
              </div>
            </TabsContent>
            
            <TabsContent value="transactions">
              <div className="rounded-md border border-neutral-border overflow-hidden">
                <ActivityTable items={transactions} showUsername={true} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
