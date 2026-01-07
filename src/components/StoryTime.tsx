'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ArrowRight, RotateCcw, Volume2 } from 'lucide-react';
import { speak, speakInstruction } from '@/utils/voiceFeedback';

interface StoryStep {
    id: number;
    text: string;
    emoji: string;
    options: {
        text: string;
        nextStep: number;
        action?: () => void;
    }[];
}

const STORY: Record<number, StoryStep> = {
    1: {
        id: 1,
        text: 'Bir varmış bir yokmuş, uzak diyarlarda küçük bir tavşan yaşarmış. Bugün çok açmış! Ne yemek ister dersin?',
        emoji: '🐰',
        options: [
            { text: 'Turuncu Havuç 🥕', nextStep: 2 },
            { text: 'Kırmızı Elma 🍎', nextStep: 3 },
        ],
    },
    2: {
        id: 2,
        text: 'Tavşan havucu iştahla yemiş. Karnı doyduktan sonra uykusu gelmiş. Nerede uyumalı?',
        emoji: '🥕',
        options: [
            { text: 'Yumuşak Yatağında 🛏️', nextStep: 4 },
            { text: 'Ağaç Gölgesinde 🌳', nextStep: 5 },
        ],
    },
    3: {
        id: 3,
        text: 'Tavşan elmayı çok sevmiş! Ama elma biraz yüksekteymiş. Nasıl almalı?',
        emoji: '🍎',
        options: [
            { text: 'Zıplayarak 🦘', nextStep: 6 },
            { text: 'Arkadaşından yardım isteyerek 🦒', nextStep: 7 },
        ],
    },
    4: {
        id: 4,
        text: 'Tavşan yatağında mışıl mışıl uyumuş ve rüyasında dev bir havuç dağı görmüş! Mutlu son.',
        emoji: '😴',
        options: [{ text: 'Tekrar Oyna', nextStep: 1 }],
    },
    5: {
        id: 5,
        text: 'Ağaç gölgesinde esen rüzgar tavşanı biraz üşütmüş ama kuşların şarkısıyla çok güzel bir uyku çekmiş. Mutlu son.',
        emoji: '🐦',
        options: [{ text: 'Tekrar Oyna', nextStep: 1 }],
    },
    6: {
        id: 6,
        text: 'Tavşan o kadar yükseğe zıplamış ki elmayı kapmış! Zıplamak onu çok eğlendirmiş. Mutlu son.',
        emoji: '✨',
        options: [{ text: 'Tekrar Oyna', nextStep: 1 }],
    },
    7: {
        id: 7,
        text: 'Zürafa arkadaşı ona elmayı vermiş. Beraber elma partisi yapmışlar! Mutlu son.',
        emoji: '🥳',
        options: [{ text: 'Tekrar Oyna', nextStep: 1 }],
    },
};

const StoryTime = () => {
    const [currentStepId, setCurrentStepId] = useState(1);
    const currentStep = STORY[currentStepId];

    // İlk açılışta hikayeyi oku
    useEffect(() => {
        speakInstruction(STORY[1].text);
    }, []);

    const handleOptionClick = (nextStep: number) => {
        setCurrentStepId(nextStep);
        const nextText = STORY[nextStep].text;
        // Küçük bir gecikme ile oku ki geçiş tamamlanmış olsun
        setTimeout(() => speak(nextText), 100);
    };

    const readStory = () => {
        speak(currentStep.text);
    };

    const handleRestart = () => {
        setCurrentStepId(1);
        speak(STORY[1].text);
    };

    return (
        <motion.div
            className="flex flex-col items-center gap-8 p-6 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-purple-500" />
                <h2 className="text-3xl font-extrabold text-foreground">Hikaye Zamanı</h2>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStepId}
                    className="card-playful p-8 w-full flex flex-col items-center text-center gap-6 border-4 border-purple-200"
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -50, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                >
                    <motion.span
                        className="text-8xl"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        {currentStep.emoji}
                    </motion.span>

                    <p className="text-xl md:text-2xl font-bold leading-relaxed text-foreground">
                        {currentStep.text}
                    </p>

                    <button
                        onClick={readStory}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-600 rounded-full font-bold hover:bg-purple-200 transition-colors"
                    >
                        <Volume2 className="w-5 h-5" />
                        Dinle
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
                        {currentStep.options.map((option, index) => (
                            <button
                                key={index}
                                onClick={() => handleOptionClick(option.nextStep)}
                                className="flex items-center justify-between p-4 bg-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:scale-105 active:scale-95 transition-all group"
                            >
                                <span>{option.text}</span>
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>

            {currentStepId !== 1 && (
                <button
                    onClick={handleRestart}
                    className="flex items-center gap-2 text-muted-foreground font-bold hover:text-foreground transition-colors"
                >
                    <RotateCcw className="w-5 h-5" />
                    Baştan Başla
                </button>
            )}
        </motion.div>
    );
};

export default StoryTime;
