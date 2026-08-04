import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { BackgroundBlobs } from '../components/nature/BackgroundBlobs';
import { FloatingLeaves } from '../components/nature/FloatingLeaves';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="relative min-h-screen flex flex-col bg-bg-nature selection:bg-accent/30 overflow-x-hidden">
      {/* Background Ornaments */}
      <BackgroundBlobs />
      <FloatingLeaves />

      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className="flex-grow pt-24 pb-12 z-10 relative">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};
