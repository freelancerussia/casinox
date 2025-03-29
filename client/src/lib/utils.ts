import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()} CR`;
}

export function formatTime(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  const now = new Date();
  const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffSeconds < 3600) {
    const mins = Math.floor(diffSeconds / 60);
    return `${mins} min${mins === 1 ? '' : 's'} ago`;
  } else if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else {
    const days = Math.floor(diffSeconds / 86400);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
}

export function getAvatarInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function calculateMultiplier(target: number, mode: 'under' | 'over'): number {
  if (mode === 'under') {
    // For "under" mode, multiplier = 99 / target
    return parseFloat((99 / target).toFixed(2));
  } else {
    // For "over" mode, multiplier = 99 / (100 - target)
    return parseFloat((99 / (100 - target)).toFixed(2));
  }
}

export function calculatePotentialWin(betAmount: number, multiplier: number): number {
  return Math.floor(betAmount * multiplier);
}

export function getWinChance(target: number, mode: 'under' | 'over'): number {
  return mode === 'under' ? target : 100 - target;
}

export function generateClientSeed(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
