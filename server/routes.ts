import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, loginUserSchema, insertTransactionSchema, insertGameHistorySchema } from "@shared/schema";
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import expressSession from 'express-session';
import MemoryStore from 'memorystore';

const MS_Store = MemoryStore(expressSession);
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Generate a provably fair result for dice game
function generateDiceResult(serverSeed: string, clientSeed: string, nonce: number): number {
  const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
  
  // Use first 8 characters of hash as hexadecimal number
  const hexSubstring = hash.substring(0, 8);
  // Convert to decimal and divide by max possible value (0xffffffff)
  const decimalValue = parseInt(hexSubstring, 16);
  const normalizedValue = decimalValue / 0xffffffff;
  
  // Scale to 0-100 range with 2 decimal places
  return parseFloat((normalizedValue * 100).toFixed(2));
}

// Generate a mines grid
function generateMinesGrid(numMines: number, serverSeed: string, clientSeed: string, nonce: number): number[] {
  const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
  
  // Create array of 25 positions (0-24)
  const positions = Array.from({ length: 25 }, (_, i) => i);
  
  // Shuffle using Fisher-Yates algorithm with the hash as randomness source
  for (let i = positions.length - 1; i > 0; i--) {
    // Use subsequence of the hash for each iteration
    const hashPart = hash.substring((i * 2) % (hash.length - 8), (i * 2) % (hash.length - 8) + 8);
    const j = Math.floor((parseInt(hashPart, 16) / 0xffffffff) * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  // Return first n positions as mine locations
  return positions.slice(0, numMines);
}

// Generate a crash point
function generateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
  const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
  
  // Use first 8 characters of hash as hexadecimal number
  const hexSubstring = hash.substring(0, 8);
  const decimalValue = parseInt(hexSubstring, 16);
  
  // Formula: (1 / (1 - R)) * 0.99, where R is a random number between 0 and 1
  // This creates an exponential distribution where most results are low values
  // but occasionally you get very high values
  const r = decimalValue / 0xffffffff;
  
  // If r is very close to 1, cap it to avoid infinity
  const cappedR = Math.min(r, 0.99);
  let crashPoint = (1 / (1 - cappedR)) * 0.99;
  
  // Cap maximum crash point and round to 2 decimal places
  crashPoint = Math.min(crashPoint, 100.0);
  return parseFloat(crashPoint.toFixed(2));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    expressSession({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new MS_Store({
        checkPeriod: 86400000 // prune expired entries every 24 hours
      }),
      resave: false,
      saveUninitialized: false,
      secret: 'casino-session-secret'
    })
  );
  
  // Auth middleware
  const authenticateJWT = (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
          return res.status(403).json({ message: 'Invalid or expired token' });
        }
        
        req.user = user;
        next();
      });
    } else {
      res.status(401).json({ message: 'Unauthorized: No token provided' });
    }
  };
  
  // Admin middleware
  const isAdmin = async (req: Request, res: Response, next: Function) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: Not logged in' });
    }
    
    const user = await storage.getUser(req.user.id);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    
    next();
  };
  
  // API routes
  // Auth endpoints
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userInput = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByUsername(userInput.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(userInput.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      
      // Create user
      const newUser = await storage.createUser(userInput);
      
      // Create token
      const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '1d' });
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json({ 
        message: 'User created successfully',
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  
  app.post('/api/auth/login', async (req, res) => {
    try {
      const credentials = loginUserSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(credentials.username);
      
      if (!user || user.password !== credentials.password) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Create token
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      res.json({ 
        message: 'Login successful',
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // User endpoints
  app.get('/api/users/me', authenticateJWT, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Wallet endpoints
  app.post('/api/wallet/deposit', authenticateJWT, async (req, res) => {
    try {
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
      }
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(req.user.id, amount);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Create transaction record
      const transaction = await storage.createTransaction({
        userId: req.user.id,
        type: 'deposit',
        amount,
        gameType: null,
        meta: {}
      });
      
      res.json({ 
        message: 'Deposit successful',
        balance: updatedUser.balance,
        transaction
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post('/api/wallet/withdraw', authenticateJWT, async (req, res) => {
    try {
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount' });
      }
      
      // Get current user
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has enough balance
      if (user.balance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(req.user.id, -amount);
      
      // Create transaction record
      const transaction = await storage.createTransaction({
        userId: req.user.id,
        type: 'withdraw',
        amount: -amount,
        gameType: null,
        meta: {}
      });
      
      res.json({ 
        message: 'Withdrawal successful',
        balance: updatedUser.balance,
        transaction
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get('/api/wallet/transactions', authenticateJWT, async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByUserId(req.user.id);
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Game endpoints - Dice
  app.post('/api/games/dice/play', authenticateJWT, async (req, res) => {
    try {
      const { betAmount, target, mode, clientSeed } = req.body;
      
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: 'Invalid bet amount' });
      }
      
      if (!target || target < 1 || target > 95) {
        return res.status(400).json({ message: 'Invalid target (1-95)' });
      }
      
      if (!mode || (mode !== 'under' && mode !== 'over')) {
        return res.status(400).json({ message: 'Invalid mode (under/over)' });
      }
      
      if (!clientSeed) {
        return res.status(400).json({ message: 'Client seed is required' });
      }
      
      // Get current user
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has enough balance
      if (user.balance < betAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      
      // Create server seed and hash it
      const serverSeed = storage.generateServerSeed();
      const serverSeedHashed = storage.hashServerSeed(serverSeed);
      const nonce = Math.floor(Math.random() * 1000000);
      
      // Generate result
      const roll = generateDiceResult(serverSeed, clientSeed, nonce);
      
      // Determine if user won
      let won = false;
      if (mode === 'under') {
        won = roll < target;
      } else {
        won = roll > target;
      }
      
      // Calculate multiplier and payout
      // Multiplier formula: 99 / target for "under", 99 / (100 - target) for "over"
      let multiplier = 0;
      if (mode === 'under') {
        multiplier = parseFloat((99 / target).toFixed(2));
      } else {
        multiplier = parseFloat((99 / (100 - target)).toFixed(2));
      }
      
      // Calculate payout
      const payout = won ? Math.floor(betAmount * multiplier) : 0;
      
      // Update user balance (-betAmount + payout)
      const balanceChange = -betAmount + payout;
      const updatedUser = await storage.updateUserBalance(req.user.id, balanceChange);
      
      // Create game history record
      const gameHistory = await storage.createGameHistory({
        userId: req.user.id,
        gameType: 'dice',
        betAmount,
        multiplier,
        payout,
        result: { roll, target, mode, won },
        clientSeed,
        serverSeed,
        serverSeedHashed,
        nonce
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: req.user.id,
        type: 'bet',
        amount: -betAmount,
        gameType: 'dice',
        meta: { gameHistoryId: gameHistory.id }
      });
      
      if (won) {
        await storage.createTransaction({
          userId: req.user.id,
          type: 'win',
          amount: payout,
          gameType: 'dice',
          meta: { gameHistoryId: gameHistory.id }
        });
      }
      
      res.json({
        result: {
          roll,
          won,
          multiplier,
          payout
        },
        balance: updatedUser.balance,
        serverSeedHashed,
        nonce
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Game endpoints - Mines
  app.post('/api/games/mines/setup', authenticateJWT, async (req, res) => {
    try {
      const { betAmount, mineCount, clientSeed } = req.body;
      
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: 'Invalid bet amount' });
      }
      
      if (!mineCount || mineCount < 1 || mineCount > 24) {
        return res.status(400).json({ message: 'Invalid mine count (1-24)' });
      }
      
      if (!clientSeed) {
        return res.status(400).json({ message: 'Client seed is required' });
      }
      
      // Get current user
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has enough balance
      if (user.balance < betAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      
      // Create server seed and hash it
      const serverSeed = storage.generateServerSeed();
      const serverSeedHashed = storage.hashServerSeed(serverSeed);
      const nonce = Math.floor(Math.random() * 1000000);
      
      // Generate mine positions (but don't send them to client)
      const minePositions = generateMinesGrid(mineCount, serverSeed, clientSeed, nonce);
      
      // Update user balance (-betAmount)
      const updatedUser = await storage.updateUserBalance(req.user.id, -betAmount);
      
      // Store game state in session
      req.session.minesGame = {
        betAmount,
        mineCount,
        minePositions,
        clientSeed,
        serverSeed,
        serverSeedHashed,
        nonce,
        revealed: [],
        cashoutMultiplier: 0,
        gameOver: false
      };
      
      // Create transaction record
      await storage.createTransaction({
        userId: req.user.id,
        type: 'bet',
        amount: -betAmount,
        gameType: 'mines',
        meta: { mineCount }
      });
      
      res.json({
        message: 'Game setup successfully',
        balance: updatedUser.balance,
        serverSeedHashed,
        nonce
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post('/api/games/mines/reveal', authenticateJWT, async (req, res) => {
    try {
      const { position } = req.body;
      
      if (position === undefined || position < 0 || position > 24) {
        return res.status(400).json({ message: 'Invalid position (0-24)' });
      }
      
      // Check if game is in progress
      if (!req.session.minesGame) {
        return res.status(400).json({ message: 'No active game' });
      }
      
      // Check if game is over
      if (req.session.minesGame.gameOver) {
        return res.status(400).json({ message: 'Game is over' });
      }
      
      // Check if position already revealed
      if (req.session.minesGame.revealed.includes(position)) {
        return res.status(400).json({ message: 'Position already revealed' });
      }
      
      // Check if it's a mine
      const isMine = req.session.minesGame.minePositions.includes(position);
      
      // Add to revealed positions
      req.session.minesGame.revealed.push(position);
      
      // Calculate current multiplier based on revealed safe cells
      const safeRevealed = req.session.minesGame.revealed.length;
      const totalSafeCells = 25 - req.session.minesGame.mineCount;
      
      // Use a multiplier formula that increases exponentially with each reveal
      // This is similar to how real mines games work
      const baseMultiplier = 25 / (25 - req.session.minesGame.mineCount);
      const currentMultiplier = parseFloat((baseMultiplier ** safeRevealed).toFixed(2));
      
      req.session.minesGame.cashoutMultiplier = currentMultiplier;
      
      let result;
      
      if (isMine) {
        // Game over - player lost
        req.session.minesGame.gameOver = true;
        
        // Create game history record
        await storage.createGameHistory({
          userId: req.user.id,
          gameType: 'mines',
          betAmount: req.session.minesGame.betAmount,
          multiplier: 0,
          payout: 0,
          result: { 
            minePositions: req.session.minesGame.minePositions,
            revealed: req.session.minesGame.revealed,
            lastRevealed: position,
            won: false
          },
          clientSeed: req.session.minesGame.clientSeed,
          serverSeed: req.session.minesGame.serverSeed,
          serverSeedHashed: req.session.minesGame.serverSeedHashed,
          nonce: req.session.minesGame.nonce
        });
        
        result = {
          isMine: true,
          gameOver: true,
          minePositions: req.session.minesGame.minePositions,
          multiplier: 0,
          payout: 0
        };
      } else {
        // Safe cell revealed
        // Check if all safe cells revealed (game won)
        const allSafeCellsRevealed = req.session.minesGame.revealed.length === totalSafeCells;
        
        if (allSafeCellsRevealed) {
          req.session.minesGame.gameOver = true;
          
          // Maximum payout reached
          const payout = Math.floor(req.session.minesGame.betAmount * currentMultiplier);
          
          // Update user balance
          const updatedUser = await storage.updateUserBalance(req.user.id, payout);
          
          // Create game history record
          await storage.createGameHistory({
            userId: req.user.id,
            gameType: 'mines',
            betAmount: req.session.minesGame.betAmount,
            multiplier: currentMultiplier,
            payout,
            result: { 
              minePositions: req.session.minesGame.minePositions,
              revealed: req.session.minesGame.revealed,
              lastRevealed: position,
              won: true
            },
            clientSeed: req.session.minesGame.clientSeed,
            serverSeed: req.session.minesGame.serverSeed,
            serverSeedHashed: req.session.minesGame.serverSeedHashed,
            nonce: req.session.minesGame.nonce
          });
          
          // Create win transaction
          await storage.createTransaction({
            userId: req.user.id,
            type: 'win',
            amount: payout,
            gameType: 'mines',
            meta: { 
              mineCount: req.session.minesGame.mineCount,
              revealedCount: req.session.minesGame.revealed.length
            }
          });
          
          result = {
            isMine: false,
            gameOver: true,
            multiplier: currentMultiplier,
            payout,
            potentialMultiplier: null,
            balance: updatedUser.balance
          };
        } else {
          // Game continues
          // Calculate potential multiplier for next reveal
          const nextMultiplier = parseFloat((baseMultiplier ** (safeRevealed + 1)).toFixed(2));
          
          result = {
            isMine: false,
            gameOver: false,
            multiplier: currentMultiplier,
            potentialMultiplier: nextMultiplier,
            payout: Math.floor(req.session.minesGame.betAmount * currentMultiplier)
          };
        }
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post('/api/games/mines/cashout', authenticateJWT, async (req, res) => {
    try {
      // Check if game is in progress
      if (!req.session.minesGame) {
        return res.status(400).json({ message: 'No active game' });
      }
      
      // Check if game is over
      if (req.session.minesGame.gameOver) {
        return res.status(400).json({ message: 'Game is already over' });
      }
      
      // Check if any cells have been revealed
      if (req.session.minesGame.revealed.length === 0) {
        return res.status(400).json({ message: 'No cells revealed yet' });
      }
      
      // Calculate payout
      const payout = Math.floor(req.session.minesGame.betAmount * req.session.minesGame.cashoutMultiplier);
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(req.user.id, payout);
      
      // Create game history record
      await storage.createGameHistory({
        userId: req.user.id,
        gameType: 'mines',
        betAmount: req.session.minesGame.betAmount,
        multiplier: req.session.minesGame.cashoutMultiplier,
        payout,
        result: { 
          minePositions: req.session.minesGame.minePositions,
          revealed: req.session.minesGame.revealed,
          won: true,
          cashedOut: true
        },
        clientSeed: req.session.minesGame.clientSeed,
        serverSeed: req.session.minesGame.serverSeed,
        serverSeedHashed: req.session.minesGame.serverSeedHashed,
        nonce: req.session.minesGame.nonce
      });
      
      // Create win transaction
      await storage.createTransaction({
        userId: req.user.id,
        type: 'win',
        amount: payout,
        gameType: 'mines',
        meta: { 
          mineCount: req.session.minesGame.mineCount,
          revealedCount: req.session.minesGame.revealed.length,
          cashedOut: true
        }
      });
      
      // Mark game as over
      req.session.minesGame.gameOver = true;
      
      res.json({
        message: 'Cashout successful',
        multiplier: req.session.minesGame.cashoutMultiplier,
        payout,
        minePositions: req.session.minesGame.minePositions,
        balance: updatedUser.balance
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Game endpoints - Crash
  app.post('/api/games/crash/play', authenticateJWT, async (req, res) => {
    try {
      const { betAmount, autoCashout, clientSeed } = req.body;
      
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: 'Invalid bet amount' });
      }
      
      if (autoCashout && (autoCashout < 1.01 || autoCashout > 100)) {
        return res.status(400).json({ message: 'Invalid auto-cashout (1.01-100)' });
      }
      
      if (!clientSeed) {
        return res.status(400).json({ message: 'Client seed is required' });
      }
      
      // Get current user
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has enough balance
      if (user.balance < betAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      
      // Create server seed and hash it
      const serverSeed = storage.generateServerSeed();
      const serverSeedHashed = storage.hashServerSeed(serverSeed);
      const nonce = Math.floor(Math.random() * 1000000);
      
      // Generate crash point
      const crashPoint = generateCrashPoint(serverSeed, clientSeed, nonce);
      
      // Update user balance (-betAmount)
      const updatedUser = await storage.updateUserBalance(req.user.id, -betAmount);
      
      // Determine if user won with auto-cashout
      let won = false;
      let cashoutMultiplier = 0;
      let payout = 0;
      
      if (autoCashout && autoCashout < crashPoint) {
        won = true;
        cashoutMultiplier = autoCashout;
        payout = Math.floor(betAmount * cashoutMultiplier);
        
        // Update user balance with winnings
        await storage.updateUserBalance(req.user.id, payout);
      }
      
      // Create game history record
      await storage.createGameHistory({
        userId: req.user.id,
        gameType: 'crash',
        betAmount,
        multiplier: cashoutMultiplier,
        payout,
        result: { 
          crashPoint,
          autoCashout,
          won,
          cashoutMultiplier
        },
        clientSeed,
        serverSeed,
        serverSeedHashed,
        nonce
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: req.user.id,
        type: 'bet',
        amount: -betAmount,
        gameType: 'crash',
        meta: { autoCashout }
      });
      
      if (won) {
        await storage.createTransaction({
          userId: req.user.id,
          type: 'win',
          amount: payout,
          gameType: 'crash',
          meta: { cashoutMultiplier }
        });
      }
      
      // If auto-cashout was used, return final result
      if (autoCashout) {
        const finalBalance = won ? updatedUser.balance + payout : updatedUser.balance;
        
        res.json({
          crashPoint,
          won,
          cashoutMultiplier,
          payout,
          balance: finalBalance,
          serverSeedHashed,
          nonce
        });
      } else {
        // For manual cashout, store game state in session
        req.session.crashGame = {
          betAmount,
          crashPoint,
          clientSeed,
          serverSeed,
          serverSeedHashed,
          nonce,
          gameOver: false
        };
        
        res.json({
          message: 'Bet placed successfully',
          balance: updatedUser.balance,
          serverSeedHashed,
          nonce
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post('/api/games/crash/cashout', authenticateJWT, async (req, res) => {
    try {
      const { cashoutMultiplier } = req.body;
      
      if (!cashoutMultiplier || cashoutMultiplier < 1.01) {
        return res.status(400).json({ message: 'Invalid cashout multiplier' });
      }
      
      // Check if game is in progress
      if (!req.session.crashGame) {
        return res.status(400).json({ message: 'No active game' });
      }
      
      // Check if game is over
      if (req.session.crashGame.gameOver) {
        return res.status(400).json({ message: 'Game is already over' });
      }
      
      // Check if cashout is valid (not after crash)
      if (cashoutMultiplier >= req.session.crashGame.crashPoint) {
        return res.status(400).json({ message: 'Invalid cashout: game already crashed' });
      }
      
      // Calculate payout
      const payout = Math.floor(req.session.crashGame.betAmount * cashoutMultiplier);
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(req.user.id, payout);
      
      // Update game history record
      await storage.createGameHistory({
        userId: req.user.id,
        gameType: 'crash',
        betAmount: req.session.crashGame.betAmount,
        multiplier: cashoutMultiplier,
        payout,
        result: { 
          crashPoint: req.session.crashGame.crashPoint,
          won: true,
          cashoutMultiplier
        },
        clientSeed: req.session.crashGame.clientSeed,
        serverSeed: req.session.crashGame.serverSeed,
        serverSeedHashed: req.session.crashGame.serverSeedHashed,
        nonce: req.session.crashGame.nonce
      });
      
      // Create win transaction
      await storage.createTransaction({
        userId: req.user.id,
        type: 'win',
        amount: payout,
        gameType: 'crash',
        meta: { cashoutMultiplier }
      });
      
      // Mark game as over
      req.session.crashGame.gameOver = true;
      
      res.json({
        message: 'Cashout successful',
        crashPoint: req.session.crashGame.crashPoint,
        cashoutMultiplier,
        payout,
        balance: updatedUser.balance
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Game history endpoints
  app.get('/api/games/history', authenticateJWT, async (req, res) => {
    try {
      const history = await storage.getGameHistoryByUserId(req.user.id);
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get('/api/games/history/:type', authenticateJWT, async (req, res) => {
    try {
      const { type } = req.params;
      
      if (!['dice', 'mines', 'crash'].includes(type)) {
        return res.status(400).json({ message: 'Invalid game type' });
      }
      
      const history = await storage.getGameHistoryByType(type);
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  // Admin endpoints
  app.get('/api/admin/users', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Don't return passwords
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get('/api/admin/transactions', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get('/api/admin/games/history', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const history = await storage.getAllGameHistory();
      
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.post('/api/admin/users/:id/balance', authenticateJWT, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      
      if (!amount) {
        return res.status(400).json({ message: 'Amount is required' });
      }
      
      const userId = parseInt(id);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
      
      // Check if user exists
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(userId, amount);
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        type: amount > 0 ? 'deposit' : 'withdraw',
        amount,
        gameType: null,
        meta: { adminAction: true, adminId: req.user.id }
      });
      
      res.json({ 
        message: 'Balance updated successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          balance: updatedUser.balance
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
