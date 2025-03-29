import { Link } from "wouter";

interface TopBarProps {
  title: string;
}

export default function TopBar({ title }: TopBarProps) {
  return (
    <div className="bg-secondary p-4 flex justify-between items-center border-b border-neutral-border sticky top-0 z-10">
      <div className="flex items-center">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="flex items-center space-x-4">
        <button className="relative text-neutral-400 hover:text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            3
          </span>
        </button>
        <div className="hidden md:flex items-center p-1 pl-3 bg-secondary border border-neutral-border rounded-full">
          <span className="text-xs font-mono mr-2 text-neutral-400">25% Bonus</span>
          <span className="bg-purple-500/20 text-purple-400 text-xs py-1 px-2 rounded-full">
            Claim
          </span>
        </div>
      </div>
    </div>
  );
}
