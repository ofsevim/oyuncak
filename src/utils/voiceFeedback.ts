// Voice feedback utility using Web Speech API
export const speak = (text: string, lang: string = 'tr-TR') => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Slightly slower for kids
    utterance.pitch = 1.2; // Slightly higher pitch for friendliness
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
  }
};

export const speakSuccess = () => {
  const messages = [
    'Harikasın!',
    'Çok güzel!',
    'Aferin sana!',
    'Bravo!',
    'Süpersin!',
  ];
  speak(messages[Math.floor(Math.random() * messages.length)]);
};

export const speakTryAgain = () => {
  const messages = [
    'Tekrar denemeye ne dersin?',
    'Bir daha dene!',
    'Neredeyse doğru, tekrar dene!',
  ];
  speak(messages[Math.floor(Math.random() * messages.length)]);
};

export const speakWelcome = () => {
  speak('Merhaba! Oynamaya hazır mısın?');
};

export const speakInstruction = (text: string) => {
  speak(text);
};
