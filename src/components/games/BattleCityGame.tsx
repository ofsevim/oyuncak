'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

interface BattleCityGameProps {
    onActiveGameChange?: (active: boolean) => void;
}

/* Oyunun native canvas boyutu: UNIT_SIZE(32) × 16 = 512w, × 14 = 448h */
const NATIVE_W = 512;
const NATIVE_H = 448;

const BattleCityGame = ({ onActiveGameChange }: BattleCityGameProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        onActiveGameChange?.(true);
        return () => onActiveGameChange?.(false);
    }, [onActiveGameChange]);

    /* Responsive scale: container genişliğine göre oyunu ölçekle */
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const w = entry.contentRect.width;
            setScale(Math.min(1, w / NATIVE_W));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    /* Focus iframe */
    const focusIframe = useCallback(() => {
        iframeRef.current?.focus();
    }, []);

    /* postMessage → BattleCity.html'deki bridge listener'a ilet */
    const sendKey = useCallback((key: string, type: 'keydown' | 'keyup') => {
        const keyCode =
            key === ' ' ? 32 :
                key === 'Enter' ? 13 :
                    key === 'ArrowUp' ? 38 :
                        key === 'ArrowDown' ? 40 :
                            key === 'ArrowLeft' ? 37 :
                                key === 'ArrowRight' ? 39 : 0;
        if (!keyCode) return;

        const cw = iframeRef.current?.contentWindow;
        if (!cw) return;

        /* postMessage: same-origin olduğu için targetOrigin '*' yeterli */
        cw.postMessage({ type, keyCode }, '*');
    }, []);

    const pressKey = useCallback((key: string) => {
        sendKey(key, 'keydown');
        setTimeout(() => sendKey(key, 'keyup'), 100);
    }, [sendKey]);

    const holdTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

    const startHold = useCallback((key: string) => {
        sendKey(key, 'keydown');
        holdTimers.current[key] = setInterval(() => sendKey(key, 'keydown'), 80);
    }, [sendKey]);

    const stopHold = useCallback((key: string) => {
        clearInterval(holdTimers.current[key]);
        delete holdTimers.current[key];
        sendKey(key, 'keyup');
    }, [sendKey]);

    useEffect(() => {
        return () => { Object.values(holdTimers.current).forEach(clearInterval); };
    }, []);

    /* D-pad button */
    const DpadBtn = ({ arrow, label, keyName }: { arrow: string; label: string; keyName: string }) => (
        <motion.button
            aria-label={label}
            onTouchStart={() => startHold(keyName)}
            onTouchEnd={() => stopHold(keyName)}
            onMouseDown={() => startHold(keyName)}
            onMouseUp={() => stopHold(keyName)}
            onMouseLeave={() => stopHold(keyName)}
            whileTap={{ scale: 0.85 }}
            className="flex items-center justify-center select-none active:opacity-70 transition-opacity"
            style={{
                width: 'clamp(48px, 13vw, 64px)',
                height: 'clamp(48px, 13vw, 64px)',
                borderRadius: 14,
                background: 'hsl(224 28% 14%)',
                border: '1px solid hsl(220 20% 100% / 0.14)',
                boxShadow: '0 4px 12px hsl(224 28% 3% / 0.5), inset 0 1px 0 hsl(220 20% 100% / 0.06)',
                fontSize: 'clamp(18px, 5vw, 26px)',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'none',
            }}
        >
            {arrow}
        </motion.button>
    );

    const btnSize = 'clamp(48px, 13vw, 64px)';
    const gap = 'clamp(4px, 1.5vw, 8px)';

    return (
        <div className="flex flex-col items-center w-full max-w-xl mx-auto px-3 pb-6">
            {/* Title */}
            <motion.div
                className="text-center mb-3 pt-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-2xl font-black text-foreground">🕹️ Tank 1990</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Klasik atari oyunu</p>
            </motion.div>

            {/* Game canvas wrapper — ölçek için referans container */}
            <motion.div
                ref={containerRef}
                className="w-full"
                style={{
                    borderRadius: 16,
                    background: '#000',
                    border: '1px solid hsl(220 20% 100% / 0.08)',
                    boxShadow: '0 8px 32px hsl(224 28% 3% / 0.5)',
                    /* Scaled height: native oranını koru */
                    height: Math.round(NATIVE_H * scale),
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={focusIframe}
            >
                {/* iframe native boyutta açılıp scale ile küçültülüyor */}
                <iframe
                    ref={iframeRef}
                    src="/games/battlecity/BattleCity.html"
                    title="Battle City"
                    sandbox="allow-scripts allow-same-origin"
                    scrolling="no"
                    tabIndex={0}
                    onLoad={focusIframe}
                    style={{
                        width: NATIVE_W,
                        height: NATIVE_H,
                        border: 'none',
                        outline: 'none',
                        display: 'block',
                        transformOrigin: 'top left',
                        transform: `scale(${scale})`,
                        flexShrink: 0,
                    }}
                />
            </motion.div>

            {/* ── Mobile controls (md+'da gizli) ── */}
            <motion.div
                className="w-full mt-4 flex flex-col items-center gap-3 md:hidden"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                {/* BAŞLAT / PAUSE */}
                <motion.button
                    onTouchStart={() => pressKey('Enter')}
                    onClick={() => pressKey('Enter')}
                    whileTap={{ scale: 0.95 }}
                    className="w-full py-3 rounded-2xl font-bold text-sm select-none touch-manipulation"
                    style={{
                        background: 'hsl(158 65% 48% / 0.15)',
                        border: '1px solid hsl(158 65% 48% / 0.35)',
                        color: 'hsl(158 65% 55%)',
                        letterSpacing: '0.04em',
                        WebkitTapHighlightColor: 'transparent',
                    }}
                >
                    ▶ BAŞLAT / PAUSE
                </motion.button>

                {/* D-pad + Fire */}
                <div className="flex items-center justify-center gap-8 w-full">
                    <div
                        className="grid"
                        style={{
                            gridTemplateColumns: `repeat(3, ${btnSize})`,
                            gridTemplateRows: `repeat(3, ${btnSize})`,
                            gap,
                        }}
                    >
                        <div />
                        <DpadBtn arrow="▲" label="Yukarı" keyName="ArrowUp" />
                        <div />
                        <DpadBtn arrow="◀" label="Sol" keyName="ArrowLeft" />
                        <div style={{
                            borderRadius: 10,
                            background: 'hsl(224 28% 12%)',
                            border: '1px solid hsl(220 20% 100% / 0.06)',
                        }} />
                        <DpadBtn arrow="▶" label="Sağ" keyName="ArrowRight" />
                        <div />
                        <DpadBtn arrow="▼" label="Aşağı" keyName="ArrowDown" />
                        <div />
                    </div>

                    {/* Fire button */}
                    <motion.button
                        onTouchStart={() => startHold(' ')}
                        onTouchEnd={() => stopHold(' ')}
                        onMouseDown={() => startHold(' ')}
                        onMouseUp={() => stopHold(' ')}
                        onMouseLeave={() => stopHold(' ')}
                        whileTap={{ scale: 0.88 }}
                        className="flex items-center justify-center select-none flex-shrink-0"
                        style={{
                            width: 'clamp(68px, 18vw, 88px)',
                            height: 'clamp(68px, 18vw, 88px)',
                            borderRadius: '50%',
                            background: 'hsl(4 82% 58% / 0.15)',
                            border: '2px solid hsl(4 82% 58% / 0.5)',
                            boxShadow: '0 0 24px hsl(4 82% 58% / 0.3)',
                            fontSize: 'clamp(24px, 7vw, 36px)',
                            WebkitTapHighlightColor: 'transparent',
                            touchAction: 'none',
                        }}
                    >
                        💥
                    </motion.button>
                </div>
            </motion.div>

            {/* ── Klavye kısayolları — sadece desktop ── */}
            <motion.div
                className="w-full mt-3 hidden md:flex flex-wrap justify-center gap-x-5 gap-y-1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 }}
            >
                {[
                    { key: '↑ ↓ ← →', desc: 'Hareket' },
                    { key: 'Space', desc: 'Ateş Et' },
                    { key: 'Enter', desc: 'Başlat / Pause' },
                ].map(({ key, desc }) => (
                    <div key={key} className="flex items-center gap-1.5">
                        <kbd style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 8px',
                            borderRadius: 6,
                            background: 'hsl(224 28% 14%)',
                            border: '1px solid hsl(220 20% 100% / 0.15)',
                            boxShadow: '0 2px 0 hsl(224 28% 5%)',
                            fontSize: 11,
                            fontFamily: 'monospace',
                            color: 'hsl(220 20% 80%)',
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                        }}>
                            {key}
                        </kbd>
                        <span style={{ fontSize: 11, color: 'hsl(220 15% 50%)' }}>{desc}</span>
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

export default BattleCityGame;
