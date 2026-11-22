// Hospital Chime and Natural Female Voice Text-To-Speech announcement utility using native Web APIs
// Mobile-optimized for Android Chrome, iOS Safari, and Desktop browsers

let audioContextInstance: AudioContext | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoadedPromise: Promise<SpeechSynthesisVoice[]> | null = null;
// Prevent mobile browser garbage collection of active speech utterance
let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Lazily creates or returns the shared AudioContext instance.
 * Automatically handles webkitAudioContext prefix and resumes suspended context on mobile.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  try {
    if (!audioContextInstance) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioContextInstance = new AudioContextClass();
      }
    }

    if (audioContextInstance && audioContextInstance.state === 'suspended') {
      audioContextInstance.resume().catch(() => {
        // Ignored if user hasn't interacted yet
      });
    }

    return audioContextInstance;
  } catch (e) {
    console.warn('AudioContext initialization error:', e);
    return null;
  }
}

/**
 * Mobile Audio & Speech Unlocker:
 * Mobile browsers require an explicit user gesture (tap/click) to unlock AudioContext
 * and SpeechSynthesis. Calling this synchronously in onClick handlers ensures voice
 * announcements play even after asynchronous fetch calls.
 */
export function unlockAudio() {
  if (typeof window === 'undefined') return;

  try {
    // 1. Unlock AudioContext
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // 2. Unlock SpeechSynthesis on mobile
    if ('speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      // Speak a zero-volume silent utterance to unlock speech synthesizer
      const silent = new SpeechSynthesisUtterance('');
      silent.volume = 0;
      silent.rate = 2.0;
      window.speechSynthesis.speak(silent);
    }
  } catch {
    // Silent fail if blocked
  }
}

/**
 * Initializes and retrieves available browser speech synthesis voices.
 * Handles asynchronous voice loading in Chrome, Android, Edge, and Windows.
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }

  if (cachedVoices.length > 0) {
    return Promise.resolve(cachedVoices);
  }

  if (voicesLoadedPromise) {
    return voicesLoadedPromise;
  }

  voicesLoadedPromise = new Promise((resolve) => {
    const immediate = window.speechSynthesis.getVoices();
    if (immediate.length > 0) {
      cachedVoices = immediate;
      resolve(immediate);
      return;
    }

    const onVoicesChanged = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) {
        cachedVoices = v;
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(v);
      }
    };

    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

    // Timeout safety fallback after 300ms
    setTimeout(() => {
      const v = window.speechSynthesis.getVoices();
      cachedVoices = v;
      resolve(v);
    }, 300);
  });

  return voicesLoadedPromise;
}

/**
 * Intelligent selector to choose the highest-quality realistic female voice.
 * Prioritizes Indian English / Neural / Natural online voices, Google high-definition female voices,
 * Apple Samantha/Victoria, and Android TTS female voices.
 */
export function findBestFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. Top Tier: Indian English Female / Natural voices (ideal for hospital OPDs in India)
  const inEnVoices = voices.filter(v => v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in'));
  const inFemale = inEnVoices.find(v => 
    v.name.toLowerCase().includes('female') || 
    v.name.toLowerCase().includes('neerja') || 
    v.name.toLowerCase().includes('heera') || 
    v.name.toLowerCase().includes('veena') ||
    v.name.toLowerCase().includes('google')
  );
  if (inFemale) return inFemale;
  if (inEnVoices.length > 0) return inEnVoices[0];

  // 2. High-quality natural / neural female voices (Windows Edge, Chrome, Safari, Android)
  const topTierFemaleKeywords = [
    'microsoft aria online (natural)',
    'microsoft jenny online (natural)',
    'microsoft neerja online (natural)',
    'microsoft sonia online (natural)',
    'google uk english female',
    'google us english',
    'samantha',
    'victoria',
    'karen',
    'tessa',
    'zira',
    'microsoft aria',
    'microsoft jenny',
    'microsoft zira',
    'microsoft sonia'
  ];

  for (const keyword of topTierFemaleKeywords) {
    const found = voices.find(v => v.name.toLowerCase().includes(keyword));
    if (found) return found;
  }

  // 3. Any English voice with "female", "woman", or "natural" in the name
  const explicitFemaleEn = voices.find(
    v => v.lang.startsWith('en') && (
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('woman') ||
      v.name.toLowerCase().includes('natural')
    )
  );
  if (explicitFemaleEn) return explicitFemaleEn;

  // 4. Known feminine first names across global TTS engines
  const femaleNames = [
    'jenny', 'aria', 'zira', 'samantha', 'victoria', 'karen', 
    'sonia', 'libby', 'neerja', 'heera', 'fiona', 'tessa', 
    'moira', 'alice', 'veena', 'catherine', 'hazel', 'susan'
  ];
  const femaleEn = voices.find(
    v => v.lang.startsWith('en') && femaleNames.some(fn => v.name.toLowerCase().includes(fn))
  );
  if (femaleEn) return femaleEn;

  // 5. Any English voice
  const anyEn = voices.find(v => v.lang.startsWith('en'));
  if (anyEn) return anyEn;

  return voices[0] || null;
}

/**
 * Synthesizes a soothing 3-tone acoustic hospital chime (E5 -> G#5 -> B5) with warm reverb
 */
export function playHospitalChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Pleasant 3-note harmonic hospital announcement chime
    // Note 1: E5 (659.25 Hz), Note 2: G#5 (830.61 Hz), Note 3: B5 (987.77 Hz)
    const tones = [
      { freq: 659.25, time: 0.00, duration: 0.45, gain: 0.22 },
      { freq: 830.61, time: 0.14, duration: 0.50, gain: 0.26 },
      { freq: 987.77, time: 0.30, duration: 0.70, gain: 0.28 }
    ];

    tones.forEach(({ freq, time, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gainNode.gain.setValueAtTime(0.001, now + time);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + time + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration);
    });
  } catch (err) {
    console.warn('AudioContext chime error:', err);
  }
}

/**
 * Formats a ticket token into spaced phonetics so the TTS pronounces every letter and number clearly.
 * Example: "GEN-101" becomes "G E N, 1 0 1"
 */
function formatTokenForSpeech(token: string): string {
  if (!token) return '';
  return token.replace(/([A-Za-z]+)-?(\d+)/, (_, letters: string, digits: string) => {
    const spelledLetters = letters.toUpperCase().split('').join(' ');
    const spacedDigits = digits.split('').join(' ');
    return `${spelledLetters}, ${spacedDigits}`;
  });
}

/**
 * Formats room number for clear natural speech.
 * Example: "Room 101" -> "Room 1 0 1"
 */
function formatRoomForSpeech(room: string): string {
  if (!room) return 'Consultation Room';
  return room.replace(/(\d+)/g, (digits) => digits.split('').join(' '));
}

/**
 * Plays the hospital chime and announces the patient's token number and name
 * using a high-quality, realistic female receptionist voice.
 * Mobile-resilient with direct utterance invocation and garbage-collection shield.
 */
export async function announcePatientCall(
  ticketNumber: string, 
  roomNumber: string, 
  patientName?: string
) {
  // 1. Play realistic hospital chime
  playHospitalChime();

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    // Resume speech synthesis if paused (common mobile Chromium quirk)
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    // Cancel previous speech
    window.speechSynthesis.cancel();

    // Pre-fetch voices
    const voices = await getAvailableVoices();
    const femaleVoice = findBestFemaleVoice(voices);

    const phoneticToken = formatTokenForSpeech(ticketNumber);
    const phoneticRoom = formatRoomForSpeech(roomNumber);

    // Natural, polite hospital receptionist announcement phrasing
    const announcementText = patientName && patientName.trim()
      ? `Attention please. Token number ${phoneticToken}, ${patientName.trim()}, please proceed to ${phoneticRoom}.`
      : `Attention please. Token number ${phoneticToken}, please proceed to ${phoneticRoom}.`;

    const utterance = new SpeechSynthesisUtterance(announcementText);
    activeUtterance = utterance;

    if (femaleVoice) {
      utterance.voice = femaleVoice;
      utterance.lang = femaleVoice.lang || 'en-US';
    } else {
      utterance.lang = 'en-US';
    }

    // Tuned for natural, clear, professional female delivery
    utterance.rate = 0.90;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    utterance.onend = () => {
      activeUtterance = null;
    };
    utterance.onerror = () => {
      activeUtterance = null;
    };

    // On mobile, short delay (250ms) to allow chime note attack while retaining user gesture validity
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak error:', err);
      }
    }, 250);
  } catch (err) {
    console.warn('Speech synthesis announcement error:', err);
  }
}

/**
 * Announces doctor room status change (Active vs Break) using a natural, clear female voice.
 */
export function announceDoctorStatus(status: 'ACTIVE' | 'BREAK') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    unlockAudio();
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const announcementText = status === 'ACTIVE'
      ? 'Doctor is now Active. The doctor is available for consultation.'
      : 'The doctor is currently on a break and is temporarily unavailable.';

    const utterance = new SpeechSynthesisUtterance(announcementText);
    activeUtterance = utterance;

    const applyVoiceAndSpeak = (voices: SpeechSynthesisVoice[]) => {
      const femaleVoice = findBestFemaleVoice(voices);
      if (femaleVoice) {
        utterance.voice = femaleVoice;
        utterance.lang = femaleVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      utterance.onend = () => { activeUtterance = null; };
      utterance.onerror = () => { activeUtterance = null; };

      window.speechSynthesis.speak(utterance);
    };

    const immediateVoices = window.speechSynthesis.getVoices();
    if (immediateVoices && immediateVoices.length > 0) {
      applyVoiceAndSpeak(immediateVoices);
    } else {
      getAvailableVoices()
        .then(voices => applyVoiceAndSpeak(voices))
        .catch(() => {
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        });
    }
  } catch (err) {
    console.warn('Doctor status announcement error:', err);
  }
}

/**
 * Announces doctor delay status using a natural, clear female voice.
 */
export function announceDoctorDelay(minutes: number, reason?: string) {
  // Play attention chime
  playHospitalChime();

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    unlockAudio();
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    let announcementText: string;
    const cleanReason = reason ? reason.trim() : '';

    if (minutes > 0) {
      if (cleanReason) {
        announcementText = `The doctor is currently delayed by ${minutes} minutes due to ${cleanReason}. Please wait for your consultation.`;
      } else {
        announcementText = `The doctor is currently delayed by ${minutes} minutes. Please wait for your consultation.`;
      }
    } else {
      announcementText = 'Doctor is now Active and on schedule. The doctor is available for consultation.';
    }

    const utterance = new SpeechSynthesisUtterance(announcementText);
    activeUtterance = utterance;

    const applyVoiceAndSpeak = (voices: SpeechSynthesisVoice[]) => {
      const femaleVoice = findBestFemaleVoice(voices);
      if (femaleVoice) {
        utterance.voice = femaleVoice;
        utterance.lang = femaleVoice.lang || 'en-US';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      utterance.onend = () => { activeUtterance = null; };
      utterance.onerror = () => { activeUtterance = null; };

      window.speechSynthesis.speak(utterance);
    };

    const immediateVoices = window.speechSynthesis.getVoices();
    if (immediateVoices && immediateVoices.length > 0) {
      applyVoiceAndSpeak(immediateVoices);
    } else {
      getAvailableVoices()
        .then(voices => applyVoiceAndSpeak(voices))
        .catch(() => {
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        });
    }
  } catch (err) {
    console.warn('Doctor delay announcement error:', err);
  }
}
