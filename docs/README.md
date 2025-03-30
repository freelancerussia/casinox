
# Casino Platform Documentation

## Server Architecture

### Overview
The server is built using Express.js and provides:
- RESTful API endpoints
- WebSocket server for real-time game updates
- Session-based authentication
- Provably fair game mechanics

### Key Components

#### 1. Server Setup (`server/index.ts`)
- Express application configuration
- Request logging middleware
- Error handling
- Static file serving
- Port configuration (5000)

#### 2. Routes (`server/routes.ts`)
Main routes include:

##### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout
- GET `/api/auth/me` - Get current user

##### Wallet
- GET `/api/wallet` - Get wallet balance
- GET `/api/wallet/transactions` - Get transaction history
- POST `/api/wallet/deposit` - Make deposit
- POST `/api/wallet/withdraw` - Make withdrawal

##### Games
###### Crash Game
- POST `/api/games/crash/bet` - Place bet
- POST `/api/games/crash/cashout` - Cash out

###### Dice Game
- POST `/api/games/dice/play` - Play dice game

###### Mines Game
- POST `/api/games/mines/new` - Start new game
- POST `/api/games/mines/reveal` - Reveal tile
- POST `/api/games/mines/cashout` - Cash out

##### Admin
- GET `/api/admin/users` - Get all users
- GET `/api/admin/game-history` - Get all game history
- GET `/api/admin/transactions` - Get all transactions
- POST `/api/admin/reset-balance` - Reset user balance

### WebSocket Integration
- Real-time game updates
- Player bet broadcasting
- Game result notifications

## Client Architecture

### Overview
The client is built using:
- React
- TypeScript
- Tailwind CSS
- Radix UI components
- React Query for data fetching

### Key Components

#### 1. App Structure (`client/src/App.tsx`)
- React Router setup
- Global state management
- WebSocket initialization
- Query client configuration

#### 2. Main Features
- Real-time multiplier display
- Automatic cash-out options
- Game history graphs
- Live player bets display
- Provably fair verification

#### 3. Admin Panel
- User management
- Game control settings
- Analytics dashboard
- Transaction monitoring

### Authentication Flow
1. User registers/logs in
2. Server creates session
3. Client stores authentication token
4. Protected routes check authentication status

### Game Integration
Each game follows a similar pattern:
1. Place bet
2. Receive real-time updates
3. Process game outcome
4. Update user balance

## Development Setup

### Prerequisites
- Node.js
- npm/yarn

### Running the Application
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Access application at `http://localhost:5000`

