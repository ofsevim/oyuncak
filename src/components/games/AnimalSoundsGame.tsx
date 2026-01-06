'use client';

import { motion } from 'framer-motion';
import { playPopSound } from '@/utils/soundEffects';

// Web Audio API context
let audioCtx: AudioContext | null = null;
const getAudioCtx = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
};

// Hayvan sesleri - Web Audio API ile sentezlenmiş
const playAnimalSound = (animalType: string) => {
    const ctx = getAudioCtx();

    switch (animalType) {
        case 'cat': {
            // Kedi miyavı - yüksek frekanslı, inen ses
            for (let i = 0; i < 2; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, ctx.currentTime + i * 0.3);
                osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + i * 0.3 + 0.25);
                gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.3);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.3 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.3);
                osc.stop(ctx.currentTime + i * 0.3 + 0.25);
            }
            break;
        }
        case 'dog': {
            // Köpek havlaması - keskin, kısa sesler
            for (let i = 0; i < 3; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(300, ctx.currentTime + i * 0.15);
                osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + i * 0.15 + 0.1);
                gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.1);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.15);
                osc.stop(ctx.currentTime + i * 0.15 + 0.1);
            }
            break;
        }
        case 'cow': {
            // İnek mölemesi - düşük, uzun ses
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.5);
            osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 1);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.5);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 1);
            break;
        }
        case 'lion': {
            // Aslan kükreyişi - güçlü, düşük frekanslı
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(80, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.8);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.8);
            break;
        }
        case 'duck': {
            // Ördek sesi - kısa, yüksek vaklama
            for (let i = 0; i < 2; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(500, ctx.currentTime + i * 0.2);
                osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + i * 0.2 + 0.1);
                gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.2);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.2 + 0.1);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.2);
                osc.stop(ctx.currentTime + i * 0.2 + 0.1);
            }
            break;
        }
        case 'sheep': {
            // Koyun sesi - titreşimli mee
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();

            lfo.frequency.value = 8; // Vibrato hızı
            lfoGain.gain.value = 30; // Vibrato miktarı
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(400, ctx.currentTime);
            gain.gain.setValueAtTime(0.25, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            lfo.start();
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
            lfo.stop(ctx.currentTime + 0.6);
            break;
        }
        case 'monkey': {
            // Maymun sesi - değişken, ritmik
            for (let i = 0; i < 4; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const baseFreq = i % 2 === 0 ? 600 : 800;
                osc.frequency.setValueAtTime(baseFreq, ctx.currentTime + i * 0.12);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, ctx.currentTime + i * 0.12 + 0.08);
                gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.08);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.12);
                osc.stop(ctx.currentTime + i * 0.12 + 0.08);
            }
            break;
        }
        case 'elephant': {
            // Fil trompeti - düşük başlayıp yükselen
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.6);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.3);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.6);
            break;
        }
    }
};

const ANIMALS = [
    { name: 'Kedi', emoji: '🐱', type: 'cat' },
    { name: 'Köpek', emoji: '🐶', type: 'dog' },
    { name: 'İnek', emoji: '🐮', type: 'cow' },
    { name: 'Aslan', emoji: '🦁', type: 'lion' },
    { name: 'Ördek', emoji: '🦆', type: 'duck' },
    { name: 'Koyun', emoji: '🐑', type: 'sheep' },
    { name: 'Maymun', emoji: '🐵', type: 'monkey' },
    { name: 'Fil', emoji: '🐘', type: 'elephant' },
];

const AnimalSoundsGame = () => {
    const playAnimal = (animal: typeof ANIMALS[0]) => {
        playPopSound();
        playAnimalSound(animal.type);
    };

    return (
        <motion.div
            className="flex flex-col items-center gap-6 p-4 max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-foreground mb-2">Hayvan Sesleri</h2>
                <p className="text-muted-foreground font-semibold">Hayvanlara dokun ve seslerini dinle!</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                {ANIMALS.map((animal, index) => (
                    <button
                        key={index}
                        onClick={() => playAnimal(animal)}
                        className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl shadow-playful hover:scale-105 active:scale-95 transition-all border-4 border-transparent hover:border-primary"
                    >
                        <span className="text-6xl md:text-7xl mb-2">{animal.emoji}</span>
                        <span className="text-lg font-bold text-foreground">{animal.name}</span>
                    </button>
                ))}
            </div>
        </motion.div>
    );
};

export default AnimalSoundsGame;

