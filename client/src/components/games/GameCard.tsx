import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface GameCardProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  stats: {
    label: string;
    value: string;
  }[];
  gradient: string;
  path: string;
  extraContent?: React.ReactNode;
}

export default function GameCard({ 
  title, 
  icon, 
  description, 
  stats, 
  gradient, 
  path,
  extraContent
}: GameCardProps) {
  return (
    <Card className="game-card bg-primary rounded-xl overflow-hidden shadow-lg h-full transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className={cn("h-2", gradient)}></div>
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center mr-3">
            {icon}
          </div>
          <h3 className="font-heading font-semibold">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        
        <div className="bg-primary-dark rounded-lg p-4 mb-4">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className={cn(
                "flex justify-between", 
                index < stats.length - 1 ? "mb-2" : ""
              )}
            >
              <span className="text-xs text-gray-400">{stat.label}</span>
              <span className="text-xs text-white">{stat.value}</span>
            </div>
          ))}
        </div>
        
        {extraContent}
        
        <Link href={path}>
          <a className="block text-center bg-accent hover:bg-accent-light text-white py-2 rounded-lg transition duration-200">
            Play Now
          </a>
        </Link>
      </div>
    </Card>
  );
}
