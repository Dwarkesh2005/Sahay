import React from 'react';
import { motion } from 'framer-motion';

export const LeafLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-nature">
      <div className="relative w-24 h-24 mb-6">
        {/* Ground Line */}
        <div className="absolute bottom-4 left-2 right-2 h-1 bg-primary/20 rounded-full" />
        
        {/* Seedling Stem */}
        <motion.div
          className="absolute bottom-4 left-1/2 w-1.5 bg-primary origin-bottom rounded-full"
          initial={{ height: 0 }}
          animate={{ height: 48 }}
          transition={{ duration: 1.5, ease: "easeOut", repeat: Infinity, repeatType: "reverse" }}
          style={{ translateX: "-50%" }}
        />

        {/* Left Leaf */}
        <motion.svg
          className="absolute text-secondary fill-current"
          style={{ bottom: 28, left: 6, width: 24, height: 24, originX: "100%", originY: "100%" }}
          viewBox="0 0 24 24"
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, duration: 1, repeat: Infinity, repeatType: "reverse" }}
        >
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34C5.71,20.09 9.38,18.66 14.18,17.86C18.98,17.06 21,13 21,13C21,13 20.35,10.23 17,8Z" />
        </motion.svg>

        {/* Right Leaf */}
        <motion.svg
          className="absolute text-secondary fill-current"
          style={{ bottom: 28, left: 24, width: 24, height: 24, originX: "0%", originY: "100%", scaleX: -1 }}
          viewBox="0 0 24 24"
          initial={{ scale: 0, rotate: 30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.5, duration: 1, repeat: Infinity, repeatType: "reverse" }}
        >
          <path d="M17,8C8,10 5.9,16.17 3.82,21.34C5.71,20.09 9.38,18.66 14.18,17.86C18.98,17.06 21,13 21,13C21,13 20.35,10.23 17,8Z" />
        </motion.svg>
      </div>

      <motion.h3 
        className="font-display font-medium text-forest-dark text-lg"
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Connecting with care...
      </motion.h3>
    </div>
  );
};
