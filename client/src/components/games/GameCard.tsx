import { Link } from "wouter";

interface GameCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  playersCount: number;
  rtp: number;
  route: string;
  accentColor: string;
  buttonColor: string;
}

export default function GameCard({
  title,
  description,
  icon,
  playersCount,
  rtp,
  route,
  accentColor,
  buttonColor,
}: GameCardProps) {
  return (
    <div className="game-card bg-secondary rounded-xl overflow-hidden border border-neutral-border transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg">
      <div 
        className={`h-40 relative p-4`}
        style={{ background: `linear-gradient(to bottom right, ${accentColor}20, ${accentColor}05)` }}
      >
        <div className="absolute top-4 right-4 bg-black/30 rounded-lg px-2 py-1 text-xs">
          <span className="text-green-500">{rtp}% RTP</span>
        </div>
        <div className="absolute bottom-4 left-4">
          <h4 className="font-bold">{title}</h4>
          <p className="text-xs text-neutral-400">{description}</p>
        </div>
        <div className="absolute bottom-0 right-0 w-24 h-24 text-8xl opacity-20" style={{ color: accentColor }}>
          {icon}
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-xs text-neutral-400">{new Intl.NumberFormat().format(playersCount)} playing</span>
          </div>
          <div className="text-xs text-neutral-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="inline mr-1"
            >
              <path d="M12 2v10.4" />
              <path d="M12 22v-1.6" />
              <path d="M4.93 4.93l7.37 7.37" />
              <path d="M19.07 19.07l-1.76-1.76" />
              <path d="M2 12h10.4" />
              <path d="M22 12h-1.6" />
              <path d="M4.93 19.07l7.37-7.37" />
              <path d="M19.07 4.93l-1.76 1.76" />
            </svg>
            <span>Provably Fair</span>
          </div>
        </div>
        <Link 
          href={route}
          className={`w-full block py-2 rounded-lg text-white text-sm text-center font-medium transition-colors`}
          style={{ backgroundColor: buttonColor, ":hover": { opacity: 0.9 } }}
        >
          Play Now
        </Link>
      </div>
    </div>
  );
}
