// Import React so JSX elements can be used
import * as React from "react";

/**
 * Formats a number as currency
 * @param value The number to format
 * @returns The formatted string
 */
export function formatCurrency(value: number): string {
  return value.toFixed(2);
}

/**
 * Formats a multiplier with appropriate color class
 * @param multiplier The multiplier value
 * @returns An object with text and class properties
 */
export function formatMultiplier(multiplier: number): { text: string, className: string } {
  const text = multiplier.toFixed(2) + 'x';
  
  if (multiplier === 0) {
    return { text, className: 'text-red-500' };
  } else if (multiplier < 2) {
    return { text, className: 'text-yellow-500' };
  } else if (multiplier < 5) {
    return { text, className: 'text-green-500' };
  } else {
    return { text, className: 'text-purple-500' };
  }
}

/**
 * Formats a profit amount with appropriate color class
 * @param profit The profit amount
 * @returns An object with text and class properties
 */
export function formatProfit(profit: number): { text: string, className: string } {
  if (profit > 0) {
    return { text: '+' + formatCurrency(profit), className: 'text-green-500' };
  } else if (profit < 0) {
    return { text: formatCurrency(profit), className: 'text-red-500' };
  } else {
    return { text: '0.00', className: 'text-neutral-400' };
  }
}

/**
 * Calculates the payout multiplier for dice game
 * @param winChance The win chance percentage (1-95)
 * @returns The payout multiplier
 */
export function calculateDicePayout(winChance: number): number {
  // 1% house edge
  return parseFloat((0.99 * (100 / winChance)).toFixed(2));
}

/**
 * Calculates the payout multiplier for mines game
 * @param minesCount The number of mines (1-24)
 * @param revealedCount The number of revealed gems
 * @returns The current payout multiplier
 */
export function calculateMinesPayout(minesCount: number, revealedCount: number): number {
  const totalTiles = 25;
  const safeTiles = totalTiles - minesCount;
  
  let multiplier = 1;
  for (let i = 0; i < revealedCount; i++) {
    multiplier *= (totalTiles - minesCount - i) / (totalTiles - i);
  }
  
  // 1% house edge
  return parseFloat((0.99 / multiplier).toFixed(2));
}

/**
 * Calculates the win chance for the mines game
 * @param minesCount The number of mines (1-24)
 * @param revealedCount The number of revealed gems
 * @returns The current win chance percentage
 */
export function calculateMinesWinChance(minesCount: number, revealedCount: number): number {
  const remainingTiles = 25 - revealedCount;
  const remainingMines = minesCount;
  
  const winChance = 100 * (remainingTiles - remainingMines) / remainingTiles;
  return parseFloat(winChance.toFixed(1));
}

/**
 * Formats a relative time (e.g., "2 min ago")
 * @param date The date to format
 * @returns A string representing the relative time
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} sec ago`;
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)} min ago`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)} hr ago`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)} day ago`;
  }
}

/**
 * Get a game icon component based on the game type
 * @param gameType The type of game
 * @returns JSX element with the appropriate icon
 */
export function getGameIcon(gameType: string): JSX.Element {
  switch (gameType) {
    case 'dice':
      return (
        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="text-purple-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="12" height="12" x="6" y="6" rx="2" />
            <path d="m10 10 4 4m0-4-4 4"/>
          </svg>
        </div>
      );
    case 'crash':
      return (
        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="text-red-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          </svg>
        </div>
      );
    case 'mines':
      return (
        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="text-green-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center mr-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
          </svg>
        </div>
      );
  }
}
