import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Leaf {
  id: number;
  x: number; // percentage width
  y: number; // percentage height
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  drift: number;
}

export const FloatingLeaves: React.FC = () => {
  const [leaves, setLeaves] = useState<Leaf[]>([]);

  useEffect(() => {
    // Generate 12 leaves
    const newLeaves = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 20 + 15, // 15px to 35px
      rotation: Math.random() * 360,
      delay: Math.random() * -20, // start immediately in their cycle
      duration: Math.random() * 25 + 20, // 20s to 45s
      drift: Math.random() * 100 - 50, // drift left or right
    }));
    setLeaves(newLeaves);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {leaves.map((leaf) => (
        <motion.svg
          key={leaf.id}
          className="absolute text-accent/20 fill-current"
          style={{
            left: `${leaf.x}%`,
            top: `${leaf.y}%`,
            width: leaf.size,
            height: leaf.size,
          }}
          viewBox="0 0 24 24"
          initial={{ y: -50, x: 0, rotate: leaf.rotation, opacity: 0 }}
          animate={{
            y: ['-10vh', '110vh'],
            x: [0, leaf.drift, 0],
            rotate: [leaf.rotation, leaf.rotation + 360],
            opacity: [0, 0.6, 0.6, 0],
          }}
          transition={{
            duration: leaf.duration,
            repeat: Infinity,
            delay: leaf.delay,
            ease: "linear",
          }}
        >
          {/* Nature Leaf Shape SVG path */}
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34C5.71,20.09 9.38,18.66 14.18,17.86C18.98,17.06 21,13 21,13C21,13 20.35,10.23 17,8Z" />
        </motion.svg>
      ))}
    </div>
  );
};
