import React from 'react';

export const BackgroundBlobs: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Top Left Blob - Fresh Mint */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/15 blur-[120px] animate-pulse-slow" />
      
      {/* Top Right Blob - Soft Sunlight Yellow */}
      <div className="absolute top-[10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-warm-yellow/20 blur-[100px] animate-pulse-slow" style={{ animationDelay: '-4s' }} />

      {/* Center Left Blob - Pale Green */}
      <div className="absolute top-[45%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-secondary/10 blur-[150px] animate-pulse-slow" style={{ animationDelay: '-8s' }} />

      {/* Bottom Right Blob - Warm Orange Sunrise */}
      <div className="absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-warm-orange/10 blur-[130px] animate-pulse-slow" style={{ animationDelay: '-2s' }} />
    </div>
  );
};
