'use client';

import { useEffect, useRef, useCallback } from 'react';
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

    useEffect(() => {
        onActiveGameChange?.(true);
        return () => onActiveGameChange?.(false);
    }, [onActiveGameChange]);

    /* Responsive scale: React state kullanmadan doğrudan DOM güncelle → re-render yok */
    useEffect(() => {
        const container = containerRef.current;
        const iframe = iframeRef.current;
        if (!container || !iframe) return;

        const applyScale = (w: number) => {
            const s = Math.min(1, w / NATIVE_W);
            /* GPU layer: translate3d + will-change */
            iframe.style.transform = `translateX(-50%) translate3d(0,0,0) scale(${s})`;
            container.style.height = `${Math.round(NATIVE_H * s)}px`;
        };

        const ro = new ResizeObserver(([entry]) => {
            applyScale(entry.contentRect.width);
        });
        ro.observe(container);
        /* İlk render için hemen uygula */
        applyScale(container.getBoundingClientRect().width);
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
            onTouchStart={(e) => { e.preventDefault(); startHold(keyName); }}
            onTouchEnd={(e) => { e.preventDefault(); stopHold(keyName); }}
            onTouchCancel={() => stopHold(keyName)}
            onContextMenu={(e) => e.preventDefault()}
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
                userSelect: 'none',
                WebkitUserSelect: 'none',
                /* @ts-ignore */
                WebkitTouchCallout: 'none',
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

            {/* Game canvas wrapper */}
            <motion.div
                ref={containerRef}
                className="w-full"
                style={{
                    borderRadius: 16,
                    background: '#000',
                    border: '1px solid hsl(220 20% 100% / 0.08)',
                    boxShadow: '0 8px 32px hsl(224 28% 3% / 0.5)',
                    /* Yükseklik ResizeObserver tarafından doğrudan DOM'a yazılır */
                    height: NATIVE_H,
                    overflow: 'hidden',
                    position: 'relative',
                    /* GPU compositor katmanı yarat */
                    willChange: 'transform',
                }}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={focusIframe}
            >
                {/* iframe: GPU hızlandırmalı — transform doğrudan DOM'a yazılır */}
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
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                        transformOrigin: 'top center',
                        /* Başlangıç değeri — ResizeObserver override eder */
                        transform: 'translateX(-50%) translate3d(0,0,0) scale(1)',
                        willChange: 'transform',
                        /* Tarayıcıya GPU katmanı aç */
                        backfaceVisibility: 'hidden',
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
                    onTouchStart={(e) => { e.preventDefault(); pressKey('Enter'); }}
                    onContextMenu={(e) => e.preventDefault()}
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
                        onTouchStart={(e) => { e.preventDefault(); startHold(' '); }}
                        onTouchEnd={(e) => { e.preventDefault(); stopHold(' '); }}
                        onTouchCancel={() => stopHold(' ')}
                        onContextMenu={(e) => e.preventDefault()}
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
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            /* @ts-ignore */
                            WebkitTouchCallout: 'none',
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
