// Queue to manage speech announcements
const speechQueue: string[] = [];
let isSpeaking = false;

// Mute setting
const MUTE_KEY = 'pickleq_mute';

export function isMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === 'true';
}

export function setMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, muted ? 'true' : 'false');
  // Cancel any ongoing speech when muting
  if (muted && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    speechQueue.length = 0;
    isSpeaking = false;
  }
}

function processQueue(): void {
  if (isSpeaking || speechQueue.length === 0) return;

  const text = speechQueue.shift()!;
  isSpeaking = true;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9; // Slightly slower for clarity
  utterance.pitch = 1;
  utterance.volume = 1;

  // Try to use a clear voice
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(
    v => v.lang.startsWith('en') && v.name.includes('Samantha')
  ) || voices.find(v => v.lang.startsWith('en-US'));

  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  utterance.onend = () => {
    isSpeaking = false;
    // Small pause between announcements
    setTimeout(processQueue, 300);
  };

  utterance.onerror = () => {
    isSpeaking = false;
    processQueue();
  };

  window.speechSynthesis.speak(utterance);
}

export function announce(text: string): void {
  if (isMuted()) return;

  if (!('speechSynthesis' in window)) {
    console.warn('Text-to-speech not supported in this browser');
    return;
  }

  speechQueue.push(text);
  processQueue();
}

export function announceNextMatch(
  court: number,
  team1Names: string[],
  team2Names: string[]
): void {
  const team1 = team1Names.join(' and ');
  const team2 = team2Names.join(' and ');
  const message = `Next match. Court ${court}: ${team1} versus ${team2}`;
  announce(message);
}

export function announceWinner(
  court: number,
  winnerNames: string[]
): void {
  const winners = winnerNames.join(' and ');
  const message = `Court ${court}. Match completed. ${winners} win!`;
  announce(message);
}

export function announceLeaderboard(
  topPlayers: { name: string; winPct: number }[]
): void {
  if (topPlayers.length === 0) {
    announce('Session complete. No games were played.');
    return;
  }

  announce('Session complete! Here are today\'s top players.');

  const places = ['First place', 'Second place', 'Third place'];

  topPlayers.slice(0, 3).forEach((player, index) => {
    const place = places[index];
    announce(`${place}: ${player.name}, with ${player.winPct} percent wins.`);
  });

  announce('Great games everyone!');
}
