import { Card } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  trend,
  className = "",
}: StatsCardProps) {
  return (
    <Card className={`bg-secondary rounded-xl p-4 border border-neutral-border ${className}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-neutral-400">{title}</p>
          <p className="text-xl font-mono font-medium mt-1">{value}</p>
        </div>
        <div className="bg-purple-500/20 p-2 rounded-lg">
          {icon}
        </div>
      </div>
      {trend && (
        <div
          className={`mt-2 text-xs ${
            trend.isPositive ? "text-green-500" : "text-red-500"
          } flex items-center`}
        >
          {trend.isPositive ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
          <span>{trend.value}</span>
        </div>
      )}
    </Card>
  );
}
