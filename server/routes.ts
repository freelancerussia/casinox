import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertGameHistorySchema, insertTransactionSchema } from "@shared/schema";
import * as crypto from "crypto";
import { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import { WebSocketServer, WebSocket } from "ws";

declare module "express-session" {
  interface SessionData {
    userId: number;
    isAdmin: boolean;
    username: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Create session store
  const MemoryStoreSession = MemoryStore(session);
  const sessionMiddleware = session({
    secret: 'casino-x-secret-key',
    resave: true,
    saveUninitialized: true,
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // 24 hours
    }),
    cookie: {
      maxAge: 86400000, // 24 hours
      secure: false,
      sameSite: 'lax',
      httpOnly: true
    }
  });
  
  app.use(sessionMiddleware);
  
  // WebSocket connection
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });
  
  // Broadcasting game events
  const broadcastGameEvent = (eventType: string, data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: eventType, data }));
      }
    });
  };
  
  // Authentication Routes
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(userData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      // Hash password
      const hashedPassword = crypto.createHash('sha256').update(userData.password).digest('hex');
      
      // Create user with starting balance of 1000 credits
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
        balance: 1000,
        isAdmin: false
      });
      
      // Create initial deposit transaction
      await storage.createTransaction({
        userId: user.id,
        type: 'deposit',
        amount: 1000
      });
      
      // Set session
      req.session.userId = user.id;
      req.session.isAdmin = user.isAdmin;
      req.session.username = user.username;
      
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error during registration:', err);
          return res.status(500).json({ message: 'Error during registration - session save failed' });
        }
        
        console.log('Registration successful - Session ID:', req.sessionID);
        console.log('Registration successful - User ID in session:', req.session.userId);
        
        // Return user without password and include a simple token (user ID) 
        const { password, ...userWithoutPassword } = user;
        res.status(201).json({
          ...userWithoutPassword,
          token: user.id.toString() // Simple token for auth
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid input data', errors: error.errors });
      }
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Error creating user' });
    }
  });
  
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Check password
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      if (user.password !== hashedPassword) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.isAdmin = user.isAdmin;
      req.session.username = user.username;
      
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: 'Error during login - session save failed' });
        }
        
        console.log('Login successful - Session ID:', req.sessionID);
        console.log('Login successful - User ID in session:', req.session.userId);
        
        // Return user without password and include a simple token (user ID)
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({
          ...userWithoutPassword,
          token: user.id.toString() // Simple token for auth
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Error during login' });
    }
  });
  
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error during logout' });
      }
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });
  
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user data' });
    }
  });
  
  // User middleware to check authentication
  const authMiddleware = (req: Request, res: Response, next: Function) => {
    console.log('Auth middleware check - Session ID:', req.sessionID);
    console.log('Auth middleware check - User ID in session:', req.session.userId);
    
    // Check if auth header is present as a fallback
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        // Simple token validation (in a real app, use JWT or proper token validation)
        const userId = parseInt(token);
        if (!isNaN(userId)) {
          // Set session data from token
          req.session.userId = userId;
          console.log('Using token-based authentication, userId:', userId);
          return next();
        }
      } catch (error) {
        console.error('Token validation error:', error);
      }
    }
    
    // Fall back to session-based auth if token is invalid or not present
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    next();
  };
  
  // Admin middleware
  const adminMiddleware = (req: Request, res: Response, next: Function) => {
    if (!req.session.userId || !req.session.isAdmin) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
  
  // Wallet Routes
  app.get('/api/wallet', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(200).json({ balance: user.balance });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching wallet data' });
    }
  });
  
  app.get('/api/wallet/transactions', authMiddleware, async (req: Request, res: Response) => {
    try {
      const transactions = await storage.getUserTransactions(req.session.userId!);
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching transaction history' });
    }
  });
  
  app.post('/api/wallet/deposit', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid deposit amount' });
      }
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(req.session.userId!, amount);
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Create transaction record
      await storage.createTransaction({
        userId: req.session.userId!,
        type: 'deposit',
        amount
      });
      
      res.status(200).json({ balance: updatedUser.balance });
    } catch (error) {
      res.status(500).json({ message: 'Error processing deposit' });
    }
  });
  
  app.post('/api/wallet/withdraw', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid withdrawal amount' });
      }
      
      // Check if user has sufficient balance
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (user.balance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(req.session.userId!, -amount);
      
      // Create transaction record
      await storage.createTransaction({
        userId: req.session.userId!,
        type: 'withdraw',
        amount: -amount
      });
      
      res.status(200).json({ balance: updatedUser!.balance });
    } catch (error) {
      res.status(500).json({ message: 'Error processing withdrawal' });
    }
  });
  
  // Game Routes
  // Helper function for provably fair calculations
  const calculateGameResult = (serverSeed: string, clientSeed: string, nonce: number, gameType: string) => {
    const combinedSeed = `${serverSeed}-${clientSeed}-${nonce}`;
    const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
    
    // Convert first 8 characters of hash to a decimal number between 0-1
    const hexString = hash.slice(0, 8);
    const decimalValue = parseInt(hexString, 16) / 0xffffffff; // Normalize to 0-1
    
    return decimalValue;
  };
  
  // Dice Game
  app.post('/api/games/dice/play', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { betAmount, target, isUnder, clientSeed } = req.body;
      
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: 'Invalid bet amount' });
      }
      
      if (!target || target < 1 || target > 99) {
        return res.status(400).json({ message: 'Target must be between 1 and 99' });
      }
      
      if (typeof isUnder !== 'boolean') {
        return res.status(400).json({ message: 'isUnder must be a boolean' });
      }
      
      if (!clientSeed) {
        return res.status(400).json({ message: 'Client seed is required' });
      }
      
      // Get user
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has sufficient balance
      if (user.balance < betAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      
      // Get server seed
      const serverSeedPair = await storage.getServerSeedPair(user.id);
      if (!serverSeedPair) {
        return res.status(500).json({ message: 'Error generating game result' });
      }
      
      // Calculate result
      const randomValue = calculateGameResult(serverSeedPair.seed, clientSeed, serverSeedPair.nonce, 'dice');
      const diceResult = Math.floor(randomValue * 100) + 1; // 1-100
      
      // Determine win or lose
      const hasWon = isUnder ? diceResult < target : diceResult > target;
      
      // Calculate payout multiplier and winnings
      const winChance = isUnder ? target - 1 : 100 - target;
      const multiplier = (100 - 1) / winChance; // 1% house edge
      
      let outcome = -betAmount; // Default to loss
      if (hasWon) {
        outcome = betAmount * (multiplier - 1); // Subtract original bet amount
      }
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(user.id, outcome);
      
      // Create game history record
      await storage.createGameHistory({
        userId: user.id,
        gameType: 'dice',
        betAmount,
        multiplier: hasWon ? multiplier : 0,
        outcome,
        gameData: JSON.stringify({
          target,
          isUnder,
          result: diceResult,
          hasWon,
          serverSeedHash: serverSeedPair.hash,
          clientSeed,
          nonce: serverSeedPair.nonce
        })
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: user.id,
        type: hasWon ? 'win' : 'loss',
        amount: outcome
      });
      
      // Update server seed nonce
      await storage.updateServerSeedNonce(serverSeedPair.id);
      
      // Return game result
      res.status(200).json({
        result: diceResult,
        hasWon,
        multiplier: hasWon ? multiplier : 0,
        profit: outcome,
        balance: updatedUser!.balance,
        gameData: {
          target,
          isUnder,
          serverSeedHash: serverSeedPair.hash,
          nonce: serverSeedPair.nonce
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Error processing dice game' });
    }
  });
  
  // Crash Game
  app.post('/api/games/crash/bet', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { betAmount, autoCashout, clientSeed } = req.body;
      
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: 'Invalid bet amount' });
      }
      
      if (!clientSeed) {
        return res.status(400).json({ message: 'Client seed is required' });
      }
      
      // Get user
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has sufficient balance
      if (user.balance < betAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      
      // Get server seed
      const serverSeedPair = await storage.getServerSeedPair(user.id);
      if (!serverSeedPair) {
        return res.status(500).json({ message: 'Error generating game result' });
      }
      
      // Calculate crash point
      const randomValue = calculateGameResult(serverSeedPair.seed, clientSeed, serverSeedPair.nonce, 'crash');
      
      // Formula to calculate crash point (similar to Bustabit algorithm)
      const houseEdge = 0.01; // 1%
      const crashPoint = Math.max(1, Math.floor(100 / (randomValue * 100 * houseEdge)) / 100);
      
      // Deduct the bet amount first
      await storage.updateUserBalance(user.id, -betAmount);
      
      // Broadcast player bet to all clients
      broadcastGameEvent('player_bet', {
        username: user.username,
        betAmount,
        autoCashout
      });
      
      // Return crash point and player bet info
      res.status(200).json({
        crashPoint,
        betAmount,
        autoCashout,
        gameData: {
          serverSeedHash: serverSeedPair.hash,
          clientSeed,
          nonce: serverSeedPair.nonce
        }
      });
      
      // Update server seed nonce
      await storage.updateServerSeedNonce(serverSeedPair.id);
      
      // Schedule crash result broadcast (for demo purposes)
      if (Math.random() > 0.7) { // 30% chance to simulate other players playing
        setTimeout(() => {
          broadcastGameEvent('crash_result', {
            crashPoint
          });
        }, crashPoint * 5000); // Simulate crash after time corresponding to the crash point
      }
    } catch (error) {
      res.status(500).json({ message: 'Error processing crash game bet' });
    }
  });
  
  app.post('/api/games/crash/cashout', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { betAmount, cashoutMultiplier, crashPoint } = req.body;
      
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: 'Invalid bet amount' });
      }
      
      if (!cashoutMultiplier || cashoutMultiplier <= 1) {
        return res.status(400).json({ message: 'Invalid cashout multiplier' });
      }
      
      if (!crashPoint || crashPoint <= 1) {
        return res.status(400).json({ message: 'Invalid crash point' });
      }
      
      // Get user
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Verify cashout is valid (less than crash point)
      if (cashoutMultiplier > crashPoint) {
        return res.status(400).json({ message: 'Invalid cashout: multiplier exceeds crash point' });
      }
      
      // Calculate winnings
      const winnings = betAmount * cashoutMultiplier;
      const profit = winnings - betAmount;
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(user.id, winnings);
      
      // Create game history record
      await storage.createGameHistory({
        userId: user.id,
        gameType: 'crash',
        betAmount,
        multiplier: cashoutMultiplier,
        outcome: profit,
        gameData: JSON.stringify({
          crashPoint,
          cashoutMultiplier
        })
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: user.id,
        type: 'win',
        amount: profit
      });
      
      // Broadcast player cashout to all clients
      broadcastGameEvent('player_cashout', {
        username: user.username,
        cashoutMultiplier,
        betAmount
      });
      
      // Return cashout result
      res.status(200).json({
        cashoutMultiplier,
        winnings,
        profit,
        balance: updatedUser!.balance
      });
    } catch (error) {
      res.status(500).json({ message: 'Error processing crash game cashout' });
    }
  });
  
  // Mines Game
  app.post('/api/games/mines/new', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { betAmount, minesCount, clientSeed } = req.body;
      
      if (!betAmount || betAmount <= 0) {
        return res.status(400).json({ message: 'Invalid bet amount' });
      }
      
      if (!minesCount || minesCount < 1 || minesCount > 24) {
        return res.status(400).json({ message: 'Mines count must be between 1 and 24' });
      }
      
      if (!clientSeed) {
        return res.status(400).json({ message: 'Client seed is required' });
      }
      
      // Get user
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user has sufficient balance
      if (user.balance < betAmount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }
      
      // Get server seed
      const serverSeedPair = await storage.getServerSeedPair(user.id);
      if (!serverSeedPair) {
        return res.status(500).json({ message: 'Error generating game result' });
      }
      
      // Deduct the bet amount
      await storage.updateUserBalance(user.id, -betAmount);
      
      // Generate mine positions
      const randomValue = calculateGameResult(serverSeedPair.seed, clientSeed, serverSeedPair.nonce, 'mines');
      
      // Create a shuffled array of 25 positions (0-24)
      const positions = Array.from({ length: 25 }, (_, i) => i);
      
      // Fisher-Yates shuffle algorithm
      const getShuffledPositions = (seed: number) => {
        const result = [...positions];
        for (let i = result.length - 1; i > 0; i--) {
          // Use the randomValue and position to determine the swap
          const j = Math.floor((randomValue * 10000 + i) % (i + 1));
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      };
      
      const shuffledPositions = getShuffledPositions(randomValue);
      const minePositions = shuffledPositions.slice(0, minesCount);
      
      // Return game info
      res.status(200).json({
        gameId: serverSeedPair.id, // Use server seed ID as game ID
        betAmount,
        minesCount,
        gameData: {
          serverSeedHash: serverSeedPair.hash,
          clientSeed,
          nonce: serverSeedPair.nonce,
          minePositions: minePositions
        }
      });
      
      // Update server seed nonce
      await storage.updateServerSeedNonce(serverSeedPair.id);
    } catch (error) {
      res.status(500).json({ message: 'Error creating mines game' });
    }
  });
  
  app.post('/api/games/mines/reveal', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { gameId, position, betAmount, minesCount, clientSeed, revealedPositions } = req.body;
      
      if (!gameId || !position || position < 0 || position > 24) {
        return res.status(400).json({ message: 'Invalid game parameters' });
      }
      
      // Get user
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if the revealed position is a mine
      const randomValue = calculateGameResult(req.body.serverSeed, clientSeed, req.body.nonce, 'mines');
      
      // Create shuffled positions
      const positions = Array.from({ length: 25 }, (_, i) => i);
      
      // Fisher-Yates shuffle
      const getShuffledPositions = (seed: number) => {
        const result = [...positions];
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor((randomValue * 10000 + i) % (i + 1));
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      };
      
      const shuffledPositions = getShuffledPositions(randomValue);
      const minePositions = shuffledPositions.slice(0, minesCount);
      
      const isHit = minePositions.includes(position);
      
      // Calculate multiplier based on revealed safe tiles
      const totalTiles = 25;
      const safeTiles = totalTiles - minesCount;
      const revealedSafeTiles = revealedPositions.length + (isHit ? 0 : 1);
      
      // Calculate odds and multiplier
      const calculateMultiplier = (revealed: number) => {
        let mul = 1;
        for (let i = 0; i < revealed; i++) {
          mul *= (totalTiles - minesCount - i) / (totalTiles - i);
        }
        return 0.99 / mul; // 1% house edge
      };
      
      const multiplier = calculateMultiplier(revealedSafeTiles);
      
      if (isHit) {
        // The player hit a mine, game over
        // Create game history record
        await storage.createGameHistory({
          userId: user.id,
          gameType: 'mines',
          betAmount,
          multiplier: 0,
          outcome: -betAmount,
          gameData: JSON.stringify({
            minesCount,
            revealedSafeTiles: revealedSafeTiles - 1,
            hitPosition: position,
            minePositions
          })
        });
        
        // Create transaction record
        await storage.createTransaction({
          userId: user.id,
          type: 'loss',
          amount: -betAmount
        });
        
        res.status(200).json({
          isHit: true,
          multiplier: 0,
          potentialMultiplier: multiplier,
          minePositions,
          gameOver: true,
          balance: user.balance
        });
      } else {
        // The player revealed a gem (safe tile)
        res.status(200).json({
          isHit: false,
          revealedSafeTiles,
          multiplier,
          potentialPayout: betAmount * multiplier,
          gameOver: false
        });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error revealing tile in mines game' });
    }
  });
  
  app.post('/api/games/mines/cashout', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { gameId, betAmount, multiplier, minesCount, revealedPositions } = req.body;
      
      if (!gameId || !betAmount || !multiplier) {
        return res.status(400).json({ message: 'Invalid game parameters' });
      }
      
      // Get user
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Calculate winnings
      const winnings = betAmount * multiplier;
      const profit = winnings - betAmount;
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(user.id, winnings);
      
      // Create game history record
      await storage.createGameHistory({
        userId: user.id,
        gameType: 'mines',
        betAmount,
        multiplier,
        outcome: profit,
        gameData: JSON.stringify({
          minesCount,
          revealedSafeTiles: revealedPositions.length,
          cashout: true
        })
      });
      
      // Create transaction record
      await storage.createTransaction({
        userId: user.id,
        type: 'win',
        amount: profit
      });
      
      // Return cashout result
      res.status(200).json({
        cashout: true,
        multiplier,
        winnings,
        profit,
        balance: updatedUser!.balance
      });
    } catch (error) {
      res.status(500).json({ message: 'Error processing mines game cashout' });
    }
  });
  
  // Game History Routes
  app.get('/api/games/history', authMiddleware, async (req: Request, res: Response) => {
    try {
      const gameHistory = await storage.getGameHistoryByUserId(req.session.userId!);
      res.status(200).json(gameHistory);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching game history' });
    }
  });
  
  // Provably Fair Routes
  app.get('/api/provably-fair/seed', authMiddleware, async (req: Request, res: Response) => {
    try {
      const serverSeedPair = await storage.getServerSeedPair(req.session.userId!);
      
      if (!serverSeedPair) {
        return res.status(404).json({ message: 'Server seed not found' });
      }
      
      res.status(200).json({
        hash: serverSeedPair.hash,
        nonce: serverSeedPair.nonce
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching server seed' });
    }
  });
  
  app.post('/api/provably-fair/verify', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { serverSeed, clientSeed, nonce, gameType } = req.body;
      
      if (!serverSeed || !clientSeed || nonce === undefined || !gameType) {
        return res.status(400).json({ message: 'Missing verification parameters' });
      }
      
      const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
      const result = calculateGameResult(serverSeed, clientSeed, nonce, gameType);
      
      res.status(200).json({
        serverSeedHash: hash,
        result,
        verified: true
      });
    } catch (error) {
      res.status(500).json({ message: 'Error verifying game result' });
    }
  });
  
  app.post('/api/provably-fair/rotate-seed', authMiddleware, async (req: Request, res: Response) => {
    try {
      const serverSeedPair = await storage.getServerSeedPair(req.session.userId!);
      
      if (!serverSeedPair) {
        return res.status(404).json({ message: 'Server seed not found' });
      }
      
      // Mark the current seed as used and create a new one
      const usedSeed = await storage.markServerSeedAsUsed(serverSeedPair.id);
      
      // Get the new seed pair
      const newSeedPair = await storage.getServerSeedPair(req.session.userId!);
      
      res.status(200).json({
        previousSeed: usedSeed?.seed,
        previousHash: usedSeed?.hash,
        newHash: newSeedPair?.hash
      });
    } catch (error) {
      res.status(500).json({ message: 'Error rotating server seed' });
    }
  });
  
  // Admin Routes
  app.get('/api/admin/users', adminMiddleware, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      
      // Remove passwords from the response
      const sanitizedUsers = users.map(({ password, ...user }) => user);
      
      res.status(200).json(sanitizedUsers);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users' });
    }
  });
  
  app.get('/api/admin/game-history', adminMiddleware, async (req: Request, res: Response) => {
    try {
      const gameHistory = await storage.getAllGameHistory();
      res.status(200).json(gameHistory);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching game history' });
    }
  });
  
  app.get('/api/admin/transactions', adminMiddleware, async (req: Request, res: Response) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching transactions' });
    }
  });
  
  app.post('/api/admin/reset-balance', adminMiddleware, async (req: Request, res: Response) => {
    try {
      const { userId, balance } = req.body;
      
      if (!userId || balance === undefined) {
        return res.status(400).json({ message: 'User ID and balance are required' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Calculate the adjustment needed
      const adjustment = balance - user.balance;
      
      // Update user balance
      const updatedUser = await storage.updateUserBalance(userId, adjustment);
      
      // Create transaction record
      await storage.createTransaction({
        userId,
        type: 'admin_adjustment',
        amount: adjustment
      });
      
      res.status(200).json({
        userId,
        previousBalance: user.balance,
        newBalance: updatedUser!.balance
      });
    } catch (error) {
      res.status(500).json({ message: 'Error resetting user balance' });
    }
  });
  
  return httpServer;
}
