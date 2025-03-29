import { pgTable, text, serial, integer, boolean, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  avatarInitial: text("avatar_initial"),
  isAdmin: boolean("is_admin").default(false),
  balance: integer("balance").default(1000),
  createdAt: timestamp("created_at").defaultNow()
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // deposit, withdraw, bet, win
  amount: integer("amount").notNull(),
  gameType: text("game_type"), // dice, mines, crash, null for deposit/withdraw
  timestamp: timestamp("timestamp").defaultNow(),
  meta: jsonb("meta") // additional game-specific metadata
});

export const gameHistory = pgTable("game_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  gameType: text("game_type").notNull(), // dice, mines, crash
  betAmount: integer("bet_amount").notNull(),
  multiplier: real("multiplier"),
  payout: integer("payout"),
  result: jsonb("result").notNull(), // game-specific result data
  clientSeed: text("client_seed").notNull(),
  serverSeed: text("server_seed").notNull(),
  serverSeedHashed: text("server_seed_hashed").notNull(),
  nonce: integer("nonce").notNull(),
  timestamp: timestamp("timestamp").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  avatarInitial: true
});

export const loginUserSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  type: true,
  amount: true,
  gameType: true,
  meta: true
});

export const insertGameHistorySchema = createInsertSchema(gameHistory).pick({
  userId: true,
  gameType: true,
  betAmount: true,
  multiplier: true,
  payout: true,
  result: true,
  clientSeed: true,
  serverSeed: true,
  serverSeedHashed: true,
  nonce: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertGameHistory = z.infer<typeof insertGameHistorySchema>;
export type GameHistory = typeof gameHistory.$inferSelect;
