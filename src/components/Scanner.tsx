import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, onClose }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error) => {
        // console.warn(error);
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-3xl flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg relative">
        <button 
          onClick={onClose}
          className="absolute -top-16 right-0 p-3 bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all z-10"
        >
          <X size={24} />
        </button>
        
        <div className="relative bg-slate-900 rounded-[40px] overflow-hidden border-4 border-slate-800 shadow-2xl">
          <div id="reader" className="w-full aspect-square bg-slate-800"></div>
          
          {/* High-Tech Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-64 relative">
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand rounded-tl-xl"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand rounded-tr-xl"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand rounded-bl-xl"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand rounded-br-xl"></div>
              
              {/* Animated Scanning Line */}
              <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-1 bg-brand/50 shadow-[0_0_15px_rgba(249,115,22,0.8)] z-10"
              />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent text-center">
            <p className="text-white font-bold text-lg tracking-tight uppercase">Ready to Scan</p>
            <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-bold">Center QR Code within frame</p>
          </div>
        </div>
      </div>
    </div>
  );
};
