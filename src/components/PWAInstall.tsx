
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare } from 'lucide-react';

const PWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Standalone kontrolü
        const isApp = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
        setIsStandalone(isApp);

        // iOS Kontrolü
        const isIPhone = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIPhone);

        // beforeinstallprompt olayını yakala (Android/Chrome)
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Uygulama yüklü değilse ve standalone değilse göster
            if (!isApp) {
                setShowBanner(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // iOS için manuel gösterim (Engagement sonrası veya süre bazlı)
        if (isIPhone && !isApp) {
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('beforeinstallprompt', handler);
            };
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [isStandalone]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    if (isStandalone || !showBanner) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-24 left-4 right-4 z-[9999] md:left-auto md:right-8 md:bottom-8 md:w-80"
            >
                <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/30">
                        <img src="/favicon.png" alt="App Icon" className="w-8 h-8 rounded-lg" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">Uygulamayı Yükle</h4>
                        <p className="text-[11px] text-muted-foreground leading-tight">Oyuncak'ı ana ekranına ekle, daha hızlı ulaş!</p>
                    </div>

                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => setShowBanner(false)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center hover:bg-slate-700 transition-all"
                        >
                            <X className="w-3 h-3 text-white" />
                        </button>

                        {isIOS ? (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse bg-primary/10 px-2 py-1 rounded-lg">
                                <Share className="w-3 h-3" />
                                <span>Paylaş & Ekle</span>
                            </div>
                        ) : (
                            <button
                                onClick={handleInstallClick}
                                className="bg-primary text-primary-foreground text-xs font-black px-3 py-2 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
                            >
                                <Download className="w-3 h-3 inline-block mr-1" />
                                YÜKLE
                            </button>
                        )}
                    </div>
                </div>

                {/* iOS Instruction Helper */}
                {isIOS && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2 bg-slate-800/90 border border-white/5 rounded-xl p-3 text-[10px] text-muted-foreground flex items-center gap-2"
                    >
                        <PlusSquare className="w-4 h-4 text-white" />
                        <span>Alttaki <span className="text-white font-bold">Paylaş</span> butonuna tıkla ve <span className="text-white font-bold">Ana Ekrona Ekle</span> de.</span>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default PWAInstall;
