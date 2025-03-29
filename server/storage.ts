import { users, gameHistory, transactions, serverSeeds, type User, type InsertUser, type GameHistory, type InsertGameHistory, type Transaction, type InsertTransaction, type ServerSeed, type InsertServerSeed } from "@shared/schema";
import * as crypto from "crypto";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(id: number, amount: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Game history operations
  createGameHistory(history: InsertGameHistory): Promise<GameHistory>;
  getGameHistoryByUserId(userId: number, limit?: number): Promise<GameHistory[]>;
  getAllGameHistory(limit?: number): Promise<GameHistory[]>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number, limit?: number): Promise<Transaction[]>;
  getAllTransactions(limit?: number): Promise<Transaction[]>;
  
  // Provably fair operations
  createServerSeed(seed: InsertServerSeed): Promise<ServerSeed>;
  getServerSeedPair(userId: number): Promise<ServerSeed | undefined>;
  updateServerSeedNonce(id: number): Promise<ServerSeed | undefined>;
  markServerSeedAsUsed(id: number): Promise<ServerSeed | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private gameHistories: Map<number, GameHistory>;
  private transactions: Map<number, Transaction>;
  private serverSeeds: Map<number, ServerSeed>;
  private currentId: { users: number; gameHistories: number; transactions: number; serverSeeds: number };

  constructor() {
    this.users = new Map();
    this.gameHistories = new Map();
    this.transactions = new Map();
    this.serverSeeds = new Map();
    this.currentId = { users: 1, gameHistories: 1, transactions: 1, serverSeeds: 1 };
    
    // Create default admin user
    this.createUser({
      username: "admin",
      password: "admin123",
      email: "admin@casinox.com",
      balance: 10000,
      isAdmin: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    
    // Create a properly typed User object with all required fields
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email,
      balance: insertUser.balance !== undefined ? insertUser.balance : 1000, // Default to 1000 if not provided
      isAdmin: insertUser.isAdmin !== undefined ? insertUser.isAdmin : false // Default to false if not provided
    };
    this.users.set(id, user);
    
    // Create initial server seed for the user
    const serverSeed = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(serverSeed).digest("hex");
    
    this.createServerSeed({
      userId: id,
      seed: serverSeed,
      hash: hash,
      used: false,
      nonce: 0
    });
    
    return user;
  }

  async updateUserBalance(id: number, amount: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, balance: user.balance + amount };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Game history operations
  async createGameHistory(insertHistory: InsertGameHistory): Promise<GameHistory> {
    const id = this.currentId.gameHistories++;
    const timestamp = new Date();
    
    // Create a properly typed GameHistory object with all required fields
    const history: GameHistory = {
      id,
      userId: insertHistory.userId,
      gameType: insertHistory.gameType,
      betAmount: insertHistory.betAmount,
      multiplier: insertHistory.multiplier,
      outcome: insertHistory.outcome,
      timestamp,
      gameData: insertHistory.gameData || null // Ensure gameData is null if not provided
    };
    this.gameHistories.set(id, history);
    return history;
  }

  async getGameHistoryByUserId(userId: number, limit: number = 50): Promise<GameHistory[]> {
    return Array.from(this.gameHistories.values())
      .filter((history) => history.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async getAllGameHistory(limit: number = 100): Promise<GameHistory[]> {
    return Array.from(this.gameHistories.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Transaction operations
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId.transactions++;
    const timestamp = new Date();
    
    // Create a properly typed Transaction object with all required fields
    const transaction: Transaction = {
      id,
      userId: insertTransaction.userId,
      type: insertTransaction.type,
      amount: insertTransaction.amount,
      timestamp
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getUserTransactions(userId: number, limit: number = 50): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async getAllTransactions(limit: number = 100): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Server seed operations
  async createServerSeed(insertSeed: InsertServerSeed): Promise<ServerSeed> {
    const id = this.currentId.serverSeeds++;
    const createdAt = new Date();
    
    // Create a properly typed ServerSeed object with all required fields
    const serverSeed: ServerSeed = {
      id,
      userId: insertSeed.userId,
      seed: insertSeed.seed,
      hash: insertSeed.hash,
      used: insertSeed.used !== undefined ? insertSeed.used : false, // Default to false if not provided
      nonce: insertSeed.nonce !== undefined ? insertSeed.nonce : 0, // Default to 0 if not provided
      createdAt
    };
    this.serverSeeds.set(id, serverSeed);
    return serverSeed;
  }

  async getServerSeedPair(userId: number): Promise<ServerSeed | undefined> {
    return Array.from(this.serverSeeds.values())
      .filter((seed) => seed.userId === userId && !seed.used)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  async updateServerSeedNonce(id: number): Promise<ServerSeed | undefined> {
    const serverSeed = this.serverSeeds.get(id);
    if (!serverSeed) return undefined;
    
    const updatedSeed = { ...serverSeed, nonce: serverSeed.nonce + 1 };
    this.serverSeeds.set(id, updatedSeed);
    return updatedSeed;
  }

  async markServerSeedAsUsed(id: number): Promise<ServerSeed | undefined> {
    const serverSeed = this.serverSeeds.get(id);
    if (!serverSeed) return undefined;
    
    const updatedSeed = { ...serverSeed, used: true };
    this.serverSeeds.set(id, updatedSeed);
    
    // Create a new server seed for the user
    const newServerSeed = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(newServerSeed).digest("hex");
    
    this.createServerSeed({
      userId: serverSeed.userId,
      seed: newServerSeed,
      hash: hash,
      used: false,
      nonce: 0
    });
    
    return updatedSeed;
  }
}

export const storage = new MemStorage();
