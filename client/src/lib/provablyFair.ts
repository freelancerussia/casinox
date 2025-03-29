import * as crypto from 'crypto-js';

// Hash the server seed to verify later
export function hashServerSeed(serverSeed: string): string {
  return crypto.SHA256(serverSeed).toString();
}

// Verify the dice roll result
export function verifyDiceResult(
  serverSeed: string, 
  clientSeed: string, 
  nonce: number, 
  result: number
): boolean {
  const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.SHA256(combinedSeed).toString();
  
  // Use first 8 characters of hash as hex number
  const hexSubstring = hash.substring(0, 8);
  
  // Convert to decimal and normalize to 0-100 range
  const decimalValue = parseInt(hexSubstring, 16);
  const normalizedValue = decimalValue / 0xffffffff * 100;
  
  // Round to 2 decimal places
  const calculatedResult = parseFloat(normalizedValue.toFixed(2));
  
  // Check if the provided result matches the calculated result
  return Math.abs(calculatedResult - result) < 0.01; // Allow small floating point difference
}

// Verify crash game result
export function verifyCrashResult(
  serverSeed: string, 
  clientSeed: string, 
  nonce: number, 
  result: number
): boolean {
  const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.SHA256(combinedSeed).toString();
  
  // Use first 8 characters of hash as hex number
  const hexSubstring = hash.substring(0, 8);
  const decimalValue = parseInt(hexSubstring, 16);
  
  // Crash point formula
  const r = decimalValue / 0xffffffff;
  const cappedR = Math.min(r, 0.99);
  let crashPoint = (1 / (1 - cappedR)) * 0.99;
  crashPoint = Math.min(crashPoint, 100.0);
  
  // Round to 2 decimal places
  const calculatedResult = parseFloat(crashPoint.toFixed(2));
  
  // Check if the provided result matches the calculated result
  return Math.abs(calculatedResult - result) < 0.01; // Allow small floating point difference
}

// Verify mine positions
export function verifyMinePositions(
  serverSeed: string, 
  clientSeed: string, 
  nonce: number, 
  minePositions: number[],
  numMines: number
): boolean {
  const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.SHA256(combinedSeed).toString();
  
  // Create array of all positions (0-24)
  const positions = Array.from({ length: 25 }, (_, i) => i);
  
  // Shuffle using Fisher-Yates algorithm with hash as randomness source
  for (let i = positions.length - 1; i > 0; i--) {
    const hashPart = hash.substring((i * 2) % (hash.length - 8), (i * 2) % (hash.length - 8) + 8);
    const j = Math.floor((parseInt(hashPart, 16) / 0xffffffff) * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  // Get first n positions as expected mine locations
  const expectedMines = positions.slice(0, numMines).sort((a, b) => a - b);
  
  // Sort the provided mine positions for comparison
  const sortedMinePositions = [...minePositions].sort((a, b) => a - b);
  
  // Check if arrays are identical
  if (expectedMines.length !== sortedMinePositions.length) {
    return false;
  }
  
  for (let i = 0; i < expectedMines.length; i++) {
    if (expectedMines[i] !== sortedMinePositions[i]) {
      return false;
    }
  }
  
  return true;
}

// Generate a client seed for the player
export function generateClientSeed(): string {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
