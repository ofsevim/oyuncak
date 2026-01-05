// Voice feedback utility using Web Speech API
export const speak = (text: string, lang: string = 'tr-TR') => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Get available voices
    const voices = window.speechSynthesis.getVoices();

    // Try to find a Turkish female voice (commonly names like 'Tolga' are male, but Google/Microsoft often have female options)
    // In many browsers, specific names or "female" in the voice name can identify them.
    // For TR, we'll try to prioritize voices that are often female or just use the system default if not found.
    const femaleVoice = voices.find(voice =>
      (voice.lang === lang || voice.lang.startsWith('tr')) &&
      (voice.name.includes('Female') || voice.name.includes('Seda') || voice.name.includes('Zeynep') || voice.name.includes('Google') || voice.name.includes('Premium'))
    );

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.3; // Higher pitch for a more cheerful/female tone
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
