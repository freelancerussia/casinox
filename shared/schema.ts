import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  balance: doublePrecision("balance").notNull().default(1000),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const gameHistory = pgTable("game_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gameType: text("game_type").notNull(), // "dice", "crash", "mines"
  betAmount: doublePrecision("bet_amount").notNull(),
  multiplier: doublePrecision("multiplier").notNull(),
  outcome: doublePrecision("outcome").notNull(), // can be negative or positive
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  gameData: text("game_data"), // JSON string with additional game-specific data
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // "deposit", "withdraw", "win", "loss"
  amount: doublePrecision("amount").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const serverSeeds = pgTable("server_seeds", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  seed: text("seed").notNull(),
  hash: text("hash").notNull(),
  used: boolean("used").notNull().default(false),
  nonce: integer("nonce").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  balance: true,
  isAdmin: true,
});

export const insertGameHistorySchema = createInsertSchema(gameHistory).pick({
  userId: true,
  gameType: true,
  betAmount: true,
  multiplier: true,
  outcome: true,
  gameData: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  type: true,
  amount: true,
});

export const insertServerSeedSchema = createInsertSchema(serverSeeds).pick({
  userId: true,
  seed: true,
  hash: true,
  used: true,
  nonce: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGameHistory = z.infer<typeof insertGameHistorySchema>;
export type GameHistory = typeof gameHistory.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertServerSeed = z.infer<typeof insertServerSeedSchema>;
export type ServerSeed = typeof serverSeeds.$inferSelect;

export type GameTypes = "dice" | "crash" | "mines";
