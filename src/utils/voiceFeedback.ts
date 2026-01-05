// Voice feedback utility using Web Speech API
let voices: SpeechSynthesisVoice[] = [];

const loadVoices = () => {
  voices = window.speechSynthesis.getVoices();
};

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}

export const speak = (text: string, lang: string = 'tr-TR') => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    if (voices.length === 0) {
      loadVoices();
    }

    // Detailed search for female voices in Turkish
    const femaleVoice = voices.find(voice =>
      voice.lang.includes('tr') &&
      (voice.name.toLowerCase().includes('female') ||
        voice.name.toLowerCase().includes('seda') ||
        voice.name.toLowerCase().includes('zeynep') ||
        voice.name.toLowerCase().includes('yeşim') ||
        voice.name.toLowerCase().includes('yelda') ||
        voice.name.toLowerCase().includes('google') ||
        voice.name.toLowerCase().includes('soft'))
    );

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    // Fallback adjustments to make it sound more female/friendly
    utterance.rate = 1.1;
    utterance.pitch = 1.4;
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
