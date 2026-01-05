'use client';

import { motion } from 'framer-motion';
import { speak } from '@/utils/voiceFeedback';

const ANIMALS = [
    { name: 'Kedi', emoji: '🐱', sound: 'Miyav miyav!' },
    { name: 'Köpek', emoji: '🐶', sound: 'Hav hav!' },
    { name: 'İnek', emoji: '🐮', sound: 'Möööö!' },
    { name: 'Aslan', emoji: '🦁', sound: 'Rooaaarrr!' },
    { name: 'Ördek', emoji: '🦆', sound: 'Vak vak!' },
    { name: 'Koyun', emoji: '🐑', sound: 'Meeeee!' },
    { name: 'Maymun', emoji: '🐵', sound: 'Uu uu aa aa!' },
    { name: 'Fil', emoji: '🐘', sound: 'Paauuuu!' },
];

const AnimalSoundsGame = () => {
    const playAnimal = (animal: typeof ANIMALS[0]) => {
        speak(`${animal.name} diyor ki: ${animal.sound}`);
    };

    return (
        <motion.div
            className="flex flex-col items-center gap-6 p-4 max-w-4xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="text-center">
                <h2 className="text-3xl font-extrabold text-foreground mb-2">Hayvan Sesleri</h2>
                <p className="text-muted-foreground font-semibold">Hayvanlara dokun ve ne dediklerini dinle!</p>
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
