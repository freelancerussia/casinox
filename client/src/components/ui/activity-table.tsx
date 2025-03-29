import { GameHistory, Transaction } from "@shared/schema";
import { formatRelativeTime, getGameIcon, formatMultiplier, formatProfit } from "@/lib/game-utils.tsx";

interface ActivityTableProps {
  items: (GameHistory | Transaction)[];
  showUsername?: boolean;
}

export default function ActivityTable({ items, showUsername = false }: ActivityTableProps) {
  // Function to determine if item is a GameHistory
  const isGameHistory = (item: GameHistory | Transaction): item is GameHistory => {
    return 'gameType' in item;
  };

  // Function to get username from userId if needed
  const getUsernameForId = (userId: number): string => {
    return `User #${userId}`; // This is just a placeholder
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-neutral-400 border-b border-neutral-border">
          <tr>
            <th className="pb-3 font-medium">
              {showUsername ? "User" : "Game"}
            </th>
            <th className="pb-3 font-medium">Bet</th>
            <th className="pb-3 font-medium">Multiplier</th>
            <th className="pb-3 font-medium">Payout</th>
            <th className="pb-3 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-neutral-400">
                No activity to display
              </td>
            </tr>
          ) : (
            items.map((item, index) => {
              if (isGameHistory(item)) {
                // Render game history row
                const gameData = item.gameData ? JSON.parse(item.gameData) : null;
                const timestamp = new Date(item.timestamp);
                const { className } = formatMultiplier(item.multiplier);
                const { text: profitText, className: profitClass } = formatProfit(item.outcome);

                return (
                  <tr key={index} className="border-b border-neutral-border/30 hover:bg-primary/30">
                    <td className="py-3 flex items-center">
                      {showUsername ? (
                        <div className="flex items-center">
                          {getGameIcon(item.gameType)}
                          <span>{getUsernameForId(item.userId)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {getGameIcon(item.gameType)}
                          <span className="capitalize">{item.gameType}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 font-mono">{item.betAmount.toFixed(2)}</td>
                    <td className={`py-3 font-mono ${className}`}>{item.multiplier.toFixed(2)}x</td>
                    <td className={`py-3 font-mono ${profitClass}`}>{profitText}</td>
                    <td className="py-3 text-neutral-400">{formatRelativeTime(timestamp)}</td>
                  </tr>
                );
              } else {
                // Render transaction row
                const timestamp = new Date(item.timestamp);
                const isPositive = item.amount > 0;
                const { text: amountText, className: amountClass } = formatProfit(item.amount);

                return (
                  <tr key={index} className="border-b border-neutral-border/30 hover:bg-primary/30">
                    <td className="py-3 flex items-center">
                      {showUsername ? (
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                              <path d="M20 12v4H6a2 2 0 0 0-2 2c0 1.1.9 2 2 2h12v-4" />
                              <path d="M20 12h2v4h-2v-4Z" />
                              <path d="M20 12h2V8h-2v4Z" />
                            </svg>
                          </div>
                          <span>{getUsernameForId(item.userId)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center mr-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                              <path d="M20 12v4H6a2 2 0 0 0-2 2c0 1.1.9 2 2 2h12v-4" />
                              <path d="M20 12h2v4h-2v-4Z" />
                              <path d="M20 12h2V8h-2v4Z" />
                            </svg>
                          </div>
                          <span className="capitalize">{item.type}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 font-mono">-</td>
                    <td className="py-3 font-mono">-</td>
                    <td className={`py-3 font-mono ${amountClass}`}>{amountText}</td>
                    <td className="py-3 text-neutral-400">{formatRelativeTime(timestamp)}</td>
                  </tr>
                );
              }
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
