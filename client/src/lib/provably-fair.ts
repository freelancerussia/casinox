import * as crypto from 'crypto';

/**
 * Generates a random client seed
 * @returns A random string to use as a client seed
 */
export function generateClientSeed(): string {
  // In browser environment, we need to use crypto.getRandomValues
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback to a simpler method
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Verifies a game result with the provided server seed, client seed, and nonce
 * @param serverSeed The revealed server seed
 * @param clientSeed The client seed used for the game
 * @param nonce The nonce used for the game
 * @param gameType The type of game being verified
 * @returns The calculated result
 */
export function verifyGameResult(
  serverSeed: string, 
  clientSeed: string, 
  nonce: number, 
  gameType: string
): number {
  // Combine seeds and nonce
  const combinedSeed = `${serverSeed}-${clientSeed}-${nonce}`;
  
  // Create SHA-256 hash
  let hash: string;
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    const encoder = new TextEncoder();
    const data = encoder.encode(combinedSeed);
    
    // We're doing this synchronously in browsers
    const hashBuffer = crypto.subtle.digestSync('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    hash = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
  }
  
  // Convert first 8 characters of hash to a decimal number between 0-1
  const hexString = hash.slice(0, 8);
  const decimalValue = parseInt(hexString, 16) / 0xffffffff; // Normalize to 0-1
  
  return decimalValue;
}

/**
 * Verifies the hash of a server seed
 * @param serverSeed The revealed server seed
 * @param providedHash The hash that was provided before the game
 * @returns Whether the hash matches the provided server seed
 */
export function verifyServerSeedHash(serverSeed: string, providedHash: string): boolean {
  let calculatedHash: string;
  
  if (typeof window !== 'undefined' && window.crypto) {
    // Browser environment
    const encoder = new TextEncoder();
    const data = encoder.encode(serverSeed);
    
    // We're doing this synchronously in browsers
    const hashBuffer = crypto.subtle.digestSync('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    calculatedHash = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  } else {
    // Node.js environment
    calculatedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  }
  
  return calculatedHash === providedHash;
}

/**
 * Calculates the dice result
 * @param randomValue A value between 0-1
 * @returns A dice roll result between 1-100
 */
export function calculateDiceResult(randomValue: number): number {
  return Math.floor(randomValue * 100) + 1; // 1-100
}

/**
 * Calculates the crash point for a crash game
 * @param randomValue A value between 0-1
 * @returns The multiplier at which the game will crash
 */
export function calculateCrashPoint(randomValue: number): number {
  const houseEdge = 0.01; // 1%
  return Math.max(1, Math.floor(100 / (randomValue * 100 * houseEdge)) / 100);
}

/**
 * Generates mine positions for the mines game
 * @param randomValue A value between 0-1
 * @param minesCount The number of mines to place
 * @returns An array of mine positions (0-24)
 */
export function generateMinePositions(randomValue: number, minesCount: number): number[] {
  // Create a shuffled array of 25 positions (0-24)
  const positions = Array.from({ length: 25 }, (_, i) => i);
  
  // Fisher-Yates shuffle algorithm
  for (let i = positions.length - 1; i > 0; i--) {
    // Use the randomValue and position to determine the swap
    const j = Math.floor((randomValue * 10000 + i) % (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  
  return positions.slice(0, minesCount);
}
