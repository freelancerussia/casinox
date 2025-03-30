import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../../lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { AppState } from "@/App";
import ActivityTable from "@/components/ui/activity-table";
import { User, GameHistory, Transaction } from "@shared/schema";


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
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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
    try {
      await apiRequest("POST", "/api/admin/reset-balance", {
        userId: parseInt(resetUserId),
        amount: parseFloat(resetAmount)
      });
      toast({
        title: "Success",
        description: "Balance has been reset"
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset balance",
        variant: "destructive"
      });
    }
  };

  const handleBanUser = async (userId: number) => {
    try {
      await apiRequest("POST", `/api/admin/users/${userId}/ban`);
      toast({
        title: "Success",
        description: "User has been banned"
      });
      fetchAllData();
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

  if (loading) {
    return <div>Loading...</div>;
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-primary/50">
                        <TableCell>{user.id}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.balance}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleBanUser(user.id)}
                            variant="destructive"
                            size="sm"
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
              onClick={() => handleResetPassword(selectedUser?.id!, selectedUser?.newPassword!)}
            >
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}