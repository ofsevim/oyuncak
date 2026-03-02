'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface BattleCityGameProps {
    onActiveGameChange?: (active: boolean) => void;
}

const BattleCityGame = ({ onActiveGameChange }: BattleCityGameProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onActiveGameChange?.(true);
        return () => onActiveGameChange?.(false);
    }, [onActiveGameChange]);

    /* ── Focus iframe so keyboard works on desktop ── */
    const focusIframe = useCallback(() => {
        iframeRef.current?.focus();
    }, []);

    /* ── Send key event into iframe (works when same-origin allowed) ── */
    const sendKey = useCallback((key: string, type: 'keydown' | 'keyup') => {
        const cw = iframeRef.current?.contentWindow;
        if (!cw) return;
        const keyCode =
            key === ' ' ? 32 :
                key === 'Enter' ? 13 :
                    key === 'ArrowUp' ? 38 :
                        key === 'ArrowDown' ? 40 :
                            key === 'ArrowLeft' ? 37 :
                                key === 'ArrowRight' ? 39 : 0;

        try {
            const ev = new KeyboardEvent(type, {
                key,
                code: key === ' ' ? 'Space' : key,
                keyCode,
                which: keyCode,
                bubbles: true,
                cancelable: true,
            });
            /* Try dispatching to both document and body of iframe */
            cw.document?.dispatchEvent(ev);
            cw.document?.body?.dispatchEvent(ev);
        } catch (_) {
            /* Cross-origin blocked — fallback: focus iframe & let native key pass */
            iframeRef.current?.focus();
        }
    }, []);

    /* Single press (for Enter / start) */
    const pressKey = useCallback((key: string) => {
        sendKey(key, 'keydown');
        setTimeout(() => sendKey(key, 'keyup'), 80);
    }, [sendKey]);

    /* Touch handlers: send repeated keydown while finger is held */
    const holdTimers = useRef<Record<string, ReturnType<typeof setInterval>>>({});

    const onTouchStart = useCallback((key: string) => {
        sendKey(key, 'keydown');
        holdTimers.current[key] = setInterval(() => sendKey(key, 'keydown'), 80);
    }, [sendKey]);

    const onTouchEnd = useCallback((key: string) => {
        clearInterval(holdTimers.current[key]);
        delete holdTimers.current[key];
        sendKey(key, 'keyup');
    }, [sendKey]);

    /* Cleanup on unmount */
    useEffect(() => {
        return () => {
            Object.values(holdTimers.current).forEach(clearInterval);
        };
    }, []);

    const DpadBtn = ({
        arrow, label, keyName,
        style,
    }: {
        arrow: string;
        label: string;
        keyName: string;
        style?: React.CSSProperties;
    }) => (
        <motion.button
            aria-label={label}
            onTouchStart={(e) => { e.preventDefault(); onTouchStart(keyName); }}
            onTouchEnd={(e) => { e.preventDefault(); onTouchEnd(keyName); }}
            onMouseDown={() => onTouchStart(keyName)}
            onMouseUp={() => onTouchEnd(keyName)}
            onMouseLeave={() => onTouchEnd(keyName)}
            whileTap={{ scale: 0.88 }}
            className="flex items-center justify-center select-none touch-manipulation active:opacity-70 transition-opacity"
            style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'hsl(224 28% 14%)',
                border: '1px solid hsl(220 20% 100% / 0.12)',
                boxShadow: '0 4px 12px hsl(224 28% 3% / 0.5), inset 0 1px 0 hsl(220 20% 100% / 0.06)',
                fontSize: 22,
                WebkitTapHighlightColor: 'transparent',
                ...style,
            }}
        >
            {arrow}
        </motion.button>
    );

    return (
        <div ref={containerRef} className="flex flex-col items-center w-full max-w-lg mx-auto px-3 pb-36">
            {/* Title */}
            <motion.div
                className="text-center mb-3 pt-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h2 className="text-2xl font-black text-foreground">🕹️ Tank 1990</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Klasik atari oyunu</p>
            </motion.div>

            {/* Game canvas — click to focus */}
            <motion.div
                className="w-full relative overflow-hidden"
                style={{
                    borderRadius: 16,
                    background: '#000',
                    border: '1px solid hsl(220 20% 100% / 0.08)',
                    boxShadow: '0 8px 32px hsl(224 28% 3% / 0.5)',
                    aspectRatio: '1 / 1',
                    maxHeight: '45vh',
                }}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={focusIframe}
            >
                <iframe
                    ref={iframeRef}
                    src="https://newagebegins.github.io/BattleCity/BattleCity.html"
                    className="absolute inset-0 w-full h-full border-none outline-none"
                    title="Battle City HTML5"
                    sandbox="allow-scripts allow-same-origin"
                    scrolling="no"
                    tabIndex={0}
                    onLoad={focusIframe}
                />
            </motion.div>

            {/* ── Controls — tight to canvas ── */}
            <motion.div
                className="w-full mt-3 flex flex-col items-center gap-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
            >
                {/* START / PAUSE row */}
                <div className="flex gap-2 w-full">
                    <motion.button
                        onTouchStart={(e) => { e.preventDefault(); pressKey('Enter'); }}
                        onClick={() => pressKey('Enter')}
                        whileTap={{ scale: 0.95 }}
                        className="flex-1 py-2.5 rounded-xl font-bold text-sm select-none touch-manipulation"
                        style={{
                            background: 'hsl(158 65% 48% / 0.15)',
                            border: '1px solid hsl(158 65% 48% / 0.35)',
                            color: 'hsl(158 65% 55%)',
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        ▶ BAŞLAT / PAUSE
                    </motion.button>
                </div>

                {/* D-pad + fire — always visible (not md:hidden) */}
                <div className="flex items-center gap-6 mt-1">
                    {/* D-pad cross */}
                    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(3, 52px)', gridTemplateRows: 'repeat(3, 52px)' }}>
                        {/* row 1 */}
                        <div />
                        <DpadBtn arrow="▲" label="Yukarı" keyName="ArrowUp" />
                        <div />
                        {/* row 2 */}
                        <DpadBtn arrow="◀" label="Sol" keyName="ArrowLeft" />
                        <div
                            style={{
                                borderRadius: 10,
                                background: 'hsl(224 28% 12%)',
                                border: '1px solid hsl(220 20% 100% / 0.06)',
                            }}
                        />
                        <DpadBtn arrow="▶" label="Sağ" keyName="ArrowRight" />
                        {/* row 3 */}
                        <div />
                        <DpadBtn arrow="▼" label="Aşağı" keyName="ArrowDown" />
                        <div />
                    </div>

                    {/* Fire button */}
                    <motion.button
                        onTouchStart={(e) => { e.preventDefault(); onTouchStart(' '); }}
                        onTouchEnd={(e) => { e.preventDefault(); onTouchEnd(' '); }}
                        onMouseDown={() => onTouchStart(' ')}
                        onMouseUp={() => onTouchEnd(' ')}
                        onMouseLeave={() => onTouchEnd(' ')}
                        whileTap={{ scale: 0.88 }}
                        className="flex items-center justify-center select-none touch-manipulation"
                        style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: 'hsl(4 82% 58% / 0.15)',
                            border: '2px solid hsl(4 82% 58% / 0.5)',
                            boxShadow: '0 0 20px hsl(4 82% 58% / 0.25)',
                            fontSize: 28,
                            WebkitTapHighlightColor: 'transparent',
                        }}
                    >
                        💥
                    </motion.button>
                </div>

                {/* Desktop hint */}
                <p className="text-[11px] text-muted-foreground/50 mt-1 hidden md:block">
                    ⌨️ Yön tuşları + Space ile de oynayabilirsiniz
                </p>
            </motion.div>
        </div>
    );
};

export default BattleCityGame;
