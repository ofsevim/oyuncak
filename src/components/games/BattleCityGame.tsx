'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface BattleCityGameProps {
    onActiveGameChange?: (active: boolean) => void;
}

const BattleCityGame = ({ onActiveGameChange }: BattleCityGameProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        onActiveGameChange?.(true);
        if (iframeRef.current) {
            iframeRef.current.focus();
        }
        return () => onActiveGameChange?.(false);
    }, [onActiveGameChange]);

    // Send keyboard events to iframe
    const sendKey = (key: string, type: 'keydown' | 'keyup') => {
        if (iframeRef.current?.contentWindow) {
            const event = new KeyboardEvent(type, {
                key: key,
                code: key === ' ' ? 'Space' : key === 'Enter' ? 'Enter' : `Arrow${key}`,
                keyCode: key === ' ' ? 32 : key === 'Enter' ? 13 : 
                         key === 'Up' ? 38 : key === 'Down' ? 40 : 
                         key === 'Left' ? 37 : key === 'Right' ? 39 : 0,
                bubbles: true,
                cancelable: true
            });
            iframeRef.current.contentWindow.document.dispatchEvent(event);
        }
    };

    const handleButtonPress = (key: string) => {
        sendKey(key, 'keydown');
        setTimeout(() => sendKey(key, 'keyup'), 100);
    };

    return (
        <motion.div className="flex flex-col items-center gap-4 p-4 pb-32" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-3xl md:text-4xl font-black text-gradient">🚜 Tank 1990</h2>
            <p className="text-muted-foreground font-medium text-center text-sm">Klasik atari oyunu (Battle City)</p>

            <div className="w-full max-w-2xl glass-card neon-border rounded-[32px] overflow-hidden aspect-square flex items-center justify-center bg-black shadow-2xl relative" style={{ minHeight: '520px' }}>
                {/* Overlay to catch clicks and focus the iframe */}
                <div
                    className="absolute inset-0 z-10 cursor-pointer"
                    onClick={(e) => {
                        e.currentTarget.style.display = 'none';
                        iframeRef.current?.focus();
                    }}
                >
                    <div className="w-full h-full flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <span className="px-6 py-3 glass-card text-white font-bold rounded-xl animate-pulse">Oyuna Başlamak İçin Tıkla</span>
                    </div>
                </div>

                <iframe
                    ref={iframeRef}
                    src="/games/battlecity/BattleCity.html"
                    className="w-full h-full border-none outline-none transform scale-95 origin-center"
                    title="Battle City HTML5"
                    sandbox="allow-scripts allow-same-origin"
                    scrolling="no"
                />
            </div>

            <div className="glass-card px-6 py-4 rounded-2xl flex flex-col items-center gap-2 mt-2 border border-white/10">
                <p className="font-bold text-foreground">🎮 Kontroller</p>
                <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    <span><kbd className="px-2 py-1 bg-white/10 rounded font-mono font-bold">Yön Tuşları</kbd> Hareket</span>
                    <span><kbd className="px-2 py-1 bg-white/10 rounded font-mono font-bold">Space</kbd> Ateş Et</span>
                    <span><kbd className="px-2 py-1 bg-white/10 rounded font-mono font-bold">Enter</kbd> Oyuna Başla</span>
                </div>
            </div>

            {/* Mobile Controls */}
            <div className="md:hidden w-full max-w-sm space-y-3">
                {/* Start Button */}
                <motion.button
                    onClick={() => handleButtonPress('Enter')}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-3 glass-card border border-green-500/30 rounded-xl font-bold text-green-400 touch-manipulation">
                    ▶️ BAŞLA / PAUSE
                </motion.button>

                {/* D-Pad and Fire */}
                <div className="flex gap-3 items-center justify-center">
                    {/* D-Pad */}
                    <div className="grid grid-cols-3 gap-1.5 w-36">
                        <div />
                        <motion.button
                            onTouchStart={() => sendKey('Up', 'keydown')}
                            onTouchEnd={() => sendKey('Up', 'keyup')}
                            onClick={() => handleButtonPress('Up')}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 glass-card border border-white/20 rounded-lg text-xl touch-manipulation">
                            ⬆️
                        </motion.button>
                        <div />
                        <motion.button
                            onTouchStart={() => sendKey('Left', 'keydown')}
                            onTouchEnd={() => sendKey('Left', 'keyup')}
                            onClick={() => handleButtonPress('Left')}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 glass-card border border-white/20 rounded-lg text-xl touch-manipulation">
                            ⬅️
                        </motion.button>
                        <motion.button
                            onTouchStart={() => sendKey('Down', 'keydown')}
                            onTouchEnd={() => sendKey('Down', 'keyup')}
                            onClick={() => handleButtonPress('Down')}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 glass-card border border-white/20 rounded-lg text-xl touch-manipulation">
                            ⬇️
                        </motion.button>
                        <motion.button
                            onTouchStart={() => sendKey('Right', 'keydown')}
                            onTouchEnd={() => sendKey('Right', 'keyup')}
                            onClick={() => handleButtonPress('Right')}
                            whileTap={{ scale: 0.9 }}
                            className="p-3 glass-card border border-white/20 rounded-lg text-xl touch-manipulation">
                            ➡️
                        </motion.button>
                    </div>

                    {/* Fire Button */}
                    <motion.button
                        onTouchStart={() => sendKey(' ', 'keydown')}
                        onTouchEnd={() => sendKey(' ', 'keyup')}
                        onClick={() => handleButtonPress(' ')}
                        whileTap={{ scale: 0.9 }}
                        className="w-20 h-20 glass-card border-2 border-red-500/50 rounded-full text-2xl font-black text-red-400 touch-manipulation flex items-center justify-center"
                        style={{ boxShadow: '0 0 20px rgba(239,68,68,0.3)' }}>
                        🔥
                    </motion.button>
                </div>
            </div>
        </motion.div>
    );
};

export default BattleCityGame;
