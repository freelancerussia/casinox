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
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";

export default function AdminPanel() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      const [usersRes, transactionsRes, historyRes] = await Promise.all([
        apiRequest("GET", "/api/admin/users"),
        apiRequest("GET", "/api/admin/transactions"),
        apiRequest("GET", "/api/admin/game-history")
      ]);

      const [usersData, transactionsData, historyData] = await Promise.all([
        usersRes.json(),
        transactionsRes.json(),
        historyRes.json()
      ]);

      setUsers(usersData);
      setTransactions(transactionsData);
      setGameHistory(historyData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load admin data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBanUser = async (userId: number) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/ban`);
      toast({
        title: "Success",
        description: "User has been banned"
      });
      loadAdminData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to ban user",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async (userId: number, newPassword: string) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/reset-password`, {
        newPassword
      });
      toast({
        title: "Success",
        description: "Password has been reset"
      });
      setShowResetDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>
      
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="history">Game History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <div className="bg-secondary rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">Username</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Balance</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: any) => (
                  <tr key={user.id} className="border-t border-neutral-border">
                    <td className="p-2">{user.username}</td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">{user.balance}</td>
                    <td className="p-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleBanUser(user.id)}
                      >
                        Ban
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowResetDialog(true);
                        }}
                      >
                        Reset Password
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <div className="bg-secondary rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Amount</th>
                  <th className="text-left p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx: any) => (
                  <tr key={tx.id} className="border-t border-neutral-border">
                    <td className="p-2">{tx.userId}</td>
                    <td className="p-2">{tx.type}</td>
                    <td className="p-2">{tx.amount}</td>
                    <td className="p-2">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <div className="bg-secondary rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2">User</th>
                  <th className="text-left p-2">Game</th>
                  <th className="text-left p-2">Bet</th>
                  <th className="text-left p-2">Outcome</th>
                  <th className="text-left p-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {gameHistory.map((game: any) => (
                  <tr key={game.id} className="border-t border-neutral-border">
                    <td className="p-2">{game.userId}</td>
                    <td className="p-2">{game.gameType}</td>
                    <td className="p-2">{game.betAmount}</td>
                    <td className="p-2">{game.outcome}</td>
                    <td className="p-2">
                      {new Date(game.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-secondary rounded-lg p-4">
              <h3 className="text-sm text-neutral-400">Total Users</h3>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <h3 className="text-sm text-neutral-400">Total Games</h3>
              <p className="text-2xl font-bold">{gameHistory.length}</p>
            </div>
            <div className="bg-secondary rounded-lg p-4">
              <h3 className="text-sm text-neutral-400">Today's Volume</h3>
              <p className="text-2xl font-bold">
                {transactions
                  .filter((tx: any) => 
                    new Date(tx.timestamp).toDateString() === new Date().toDateString()
                  )
                  .reduce((acc: number, tx: any) => acc + Math.abs(tx.amount), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="New password"
              onChange={(e) => setSelectedUser({ ...selectedUser, newPassword: e.target.value })}
            />
            <Button
              onClick={() => handleResetPassword(selectedUser?.id, selectedUser?.newPassword)}
            >
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
