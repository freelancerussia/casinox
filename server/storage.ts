import { users, type User, type InsertUser, type Transaction, type InsertTransaction, type GameHistory, type InsertGameHistory } from "@shared/schema";
import * as crypto from 'crypto';

// Define your interfaces
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(id: number, amount: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  
  // Game History
  createGameHistory(gameHistory: InsertGameHistory): Promise<GameHistory>;
  getGameHistoryByUserId(userId: number, limit?: number): Promise<GameHistory[]>;
  getGameHistoryByType(gameType: string, limit?: number): Promise<GameHistory[]>;
  getAllGameHistory(limit?: number): Promise<GameHistory[]>;
  
  // Game-specific helper methods
  generateServerSeed(): string;
  hashServerSeed(seed: string): string;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private transactions: Map<number, Transaction>;
  private gameHistory: Map<number, GameHistory>;
  private userIdCounter: number;
  private transactionIdCounter: number;
  private gameHistoryIdCounter: number;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
    this.gameHistory = new Map();
    this.userIdCounter = 1;
    this.transactionIdCounter = 1;
    this.gameHistoryIdCounter = 1;
    
    // Create admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      email: "admin@cryptoplay.com",
      avatarInitial: "A"
    }).then(user => {
      // Update user as admin with higher balance
      const adminUser = { ...user, isAdmin: true, balance: 10000 };
      this.users.set(user.id, adminUser);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const avatarInitial = insertUser.avatarInitial || insertUser.username.charAt(0).toUpperCase();
    
    const user: User = { 
      ...insertUser, 
      id,
      avatarInitial,
      isAdmin: false,
      balance: 1000, // Default starting balance
      createdAt: now
    };
    
    this.users.set(id, user);
    
    // Create initial deposit transaction
    await this.createTransaction({
      userId: id,
      type: "deposit",
      amount: 1000,
      gameType: null,
      meta: { initial: true }
    });
    
    return user;
  }
  
  async updateUserBalance(id: number, amount: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, balance: user.balance + amount };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Transaction methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const now = new Date();
    
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      timestamp: now
    };
    
    this.transactions.set(id, transaction);
    return transaction;
  }
  
  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  // Game History methods
  async createGameHistory(insertGameHistory: InsertGameHistory): Promise<GameHistory> {
    const id = this.gameHistoryIdCounter++;
    const now = new Date();
    
    const gameHistory: GameHistory = {
      ...insertGameHistory,
      id,
      timestamp: now
    };
    
    this.gameHistory.set(id, gameHistory);
    return gameHistory;
  }
  
  async getGameHistoryByUserId(userId: number, limit = 20): Promise<GameHistory[]> {
    return Array.from(this.gameHistory.values())
      .filter(history => history.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async getGameHistoryByType(gameType: string, limit = 20): Promise<GameHistory[]> {
    return Array.from(this.gameHistory.values())
      .filter(history => history.gameType === gameType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async getAllGameHistory(limit = 50): Promise<GameHistory[]> {
    return Array.from(this.gameHistory.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  // Game-specific helper methods
  generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  hashServerSeed(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }
}

export const storage = new MemStorage();
