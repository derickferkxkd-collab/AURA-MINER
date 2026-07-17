import React from 'react';

interface AuraLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function AuraLogo({ className = '', size = 100, showText = true }: AuraLogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`} style={{ width: size }}>
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto select-none"
      >
        <defs>
          {/* Metallic Red Gradient */}
          <linearGradient id="redMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff4d4d" />
            <stop offset="35%" stopColor="#ff1a1a" />
            <stop offset="70%" stopColor="#990000" />
            <stop offset="100%" stopColor="#4d0000" />
          </linearGradient>

          {/* Light Red Glow */}
          <linearGradient id="redGlow" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ff0000" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff6666" stopOpacity="0" />
          </linearGradient>

          {/* Dark Metal / Chrome */}
          <linearGradient id="darkMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2c2d30" />
            <stop offset="50%" stopColor="#121314" />
            <stop offset="100%" stopColor="#050506" />
          </linearGradient>

          {/* Crystal Gradient */}
          <linearGradient id="crystalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff6666" />
            <stop offset="40%" stopColor="#ff1a1a" />
            <stop offset="100%" stopColor="#660000" />
          </linearGradient>

          {/* Silver/White Metallic */}
          <linearGradient id="silverMetal" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9e9e9e" />
            <stop offset="50%" stopColor="#f5f5f7" />
            <stop offset="100%" stopColor="#7a7a7a" />
          </linearGradient>

          {/* Drop Shadows and Filters */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id="subtleGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ambient background glow */}
        <circle cx="200" cy="200" r="160" fill="url(#redGlow)" opacity="0.15" filter="url(#glow)" />

        {/* Outer Circular Ring with Pickaxe integration */}
        <path
          d="M 120 330 A 135 135 0 1 1 290 100"
          stroke="url(#redMetallic)"
          strokeWidth="14"
          strokeLinecap="round"
          filter="url(#subtleGlow)"
        />

        {/* Inner shadow/dark accent for ring depth */}
        <path
          d="M 123 325 A 132 132 0 1 1 285 105"
          stroke="#1a0202"
          strokeWidth="4"
          fill="none"
          opacity="0.6"
        />

        {/* Pickaxe Shaft (Crosses upper-right behind the main A) */}
        <path
          d="M 195 240 L 305 130"
          stroke="url(#darkMetal)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 195 240 L 305 130"
          stroke="url(#redMetallic)"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Pickaxe Blade */}
        <path
          d="M 285 150 C 310 145, 335 110, 330 80 C 320 110, 290 115, 265 110 Z"
          fill="url(#redMetallic)"
          filter="url(#subtleGlow)"
        />
        
        {/* Main Stylized "A" in the center */}
        <g id="central-A">
          <path
            d="M 200 60 L 290 240 L 255 240 L 200 130 L 145 240 L 110 240 Z"
            fill="url(#redMetallic)"
            filter="url(#subtleGlow)"
          />

          <path
            d="M 200 85 L 270 225 L 245 225 L 200 135 L 155 225 L 130 225 Z"
            fill="#121314"
            opacity="0.85"
          />

          <path
            d="M 200 60 L 200 130 L 255 240 L 290 240 Z"
            fill="white"
            opacity="0.1"
          />

          {/* Horizontal slash */}
          <path
            d="M 160 170 L 200 190 L 240 170 L 240 185 L 200 210 L 160 185 Z"
            fill="url(#redMetallic)"
            filter="url(#subtleGlow)"
          />
        </g>

        {/* Crystals Cluster at the base */}
        <g id="crystals" filter="url(#subtleGlow)">
          <polygon points="160,250 175,230 185,255 175,280 155,270" fill="url(#crystalGrad)" stroke="url(#redMetallic)" strokeWidth="1" />
          <polygon points="160,250 175,230 175,280" fill="white" opacity="0.15" />

          <polygon points="240,250 225,230 215,255 225,280 245,270" fill="url(#crystalGrad)" stroke="url(#redMetallic)" strokeWidth="1" />
          <polygon points="225,230 215,255 225,280" fill="white" opacity="0.15" />

          <polygon points="190,260 200,200 210,260 200,290" fill="url(#crystalGrad)" stroke="url(#redMetallic)" strokeWidth="1.5" />
          <polygon points="200,200 210,260 200,290" fill="white" opacity="0.25" />

          <polygon points="180,265 185,250 192,268 185,285" fill="url(#crystalGrad)" stroke="url(#redMetallic)" strokeWidth="1" />
          <polygon points="220,265 215,250 208,268 215,285" fill="url(#crystalGrad)" stroke="url(#redMetallic)" strokeWidth="1" />
        </g>

        {/* Dark Rock Facets */}
        <g id="rocks" opacity="0.95">
          <polygon points="130,265 155,255 170,275 145,285" fill="url(#darkMetal)" stroke="#1a1a1a" />
          <polygon points="145,285 170,275 185,295 150,300" fill="url(#darkMetal)" stroke="#1a1a1a" />
          <polygon points="270,265 245,255 230,275 255,285" fill="url(#darkMetal)" stroke="#1a1a1a" />
          <polygon points="255,285 230,275 215,295 250,300" fill="url(#darkMetal)" stroke="#1a1a1a" />
          <polygon points="160,290 200,275 240,290 200,310" fill="#0f0f10" stroke="#1c1c1e" />
        </g>
      </svg>

      {showText && (
        <div className="text-center mt-3 select-none">
          <div className="text-2xl font-black tracking-[0.18em] bg-gradient-to-r from-red-500 via-red-600 to-red-400 bg-clip-text text-transparent font-sans uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            AURA
          </div>
          
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <span className="h-px w-6 bg-red-600/60" />
            <span className="text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-400">
              MINING
            </span>
            <span className="h-px w-6 bg-red-600/60" />
          </div>
        </div>
      )}
    </div>
  );
}
