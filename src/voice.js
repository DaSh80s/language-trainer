/**
 * Voice: speech recognition for answers, speech synthesis for the tutor.
 *
 * Uses the browser's own Web Speech API — free, client-side, no API cost and no
 * new dependency. Support is real but uneven (Chrome and Safari yes, Firefox
 * effectively no), so everything here degrades to silence rather than throwing,
 * and the UI hides the controls when support is absent.
 */

const LANG_CODES = {
  German: 'de-DE',           // de-CH exists but is far more thinly supported;
  Spanish: 'es-ES',          // Swiss speakers of Standard German are well served by de-DE.
  Portuguese: 'pt-PT',
  French: 'fr-FR',
  Italian: 'it-IT',
  Hebrew: 'he-IL',
  Arabic: 'ar-SA',
  'Mandarin Chinese': 'zh-CN',
  Japanese: 'ja-JP',
  Korean: 'ko-KR',
  Russian: 'ru-RU',
  Dutch: 'nl-NL',
  Swedish: 'sv-SE',
  Turkish: 'tr-TR',
  Polish: 'pl-PL',
};

export const langCode = (language) => LANG_CODES[language] || 'en-GB';

const SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export const recognitionSupported = () => Boolean(SR);
export const synthesisSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Start dictation. Returns a stop() handle, or null if unsupported.
 *
 * onPartial fires as the learner speaks (interim results), onFinal once at the
 * end — the caller decides which to put in the input box.
 */
export function listen(language, { onPartial, onFinal, onError, onEnd } = {}) {
  if (!SR) return null;
  let rec;
  try {
    rec = new SR();
  } catch (e) {
    return null;
  }
  rec.lang = langCode(language);
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  let finalText = '';
  rec.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    if (interim && onPartial) onPartial((finalText + interim).trim());
  };
  rec.onerror = (ev) => { if (onError) onError(ev.error || 'speech error'); };
  rec.onend = () => {
    if (finalText.trim() && onFinal) onFinal(finalText.trim());
    if (onEnd) onEnd();
  };

  try {
    rec.start();
  } catch (e) {
    return null;
  }
  return () => { try { rec.stop(); } catch (e) { /* already stopped */ } };
}

/** Strip the markdown and the scaffolding so only the German gets spoken. */
export function speakableText(raw) {
  return String(raw || '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^[✅❌⚪⚠️💡]\s*/gm, '')
    .replace(/\[[^\]]*\]/g, '')       // drill attitude brackets
    .replace(/^#+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Speak text. Cancels anything already speaking so presses do not queue up. */
export function speak(text, language, { rate = 0.95, onEnd } = {}) {
  if (!synthesisSupported()) return false;
  const clean = speakableText(text);
  if (!clean) return false;

  const synth = window.speechSynthesis;
  const want = langCode(language).slice(0, 2);
  let spoken = false;

  const go = () => {
    if (spoken) return;
    spoken = true;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = langCode(language);
      u.rate = rate;
      const voice = synth.getVoices().find((v) => v.lang?.startsWith(want));
      if (voice) u.voice = voice;
      if (onEnd) u.onend = onEnd;
      synth.speak(u);
    } catch (e) { /* nothing sensible to do */ }
  };

  // getVoices() is empty until the browser has loaded them — on Chrome that is
  // after the first call. Speaking immediately would use whatever default voice
  // is loaded, which is usually English. Wait for them, with a timeout so a
  // browser that never fires the event still speaks.
  try {
    if (!synth.getVoices().length && typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', go, { once: true });
      setTimeout(go, 300);
      return true;
    }
  } catch (e) { /* fall through to speaking immediately */ }

  go();
  return true;
}

export function stopSpeaking() {
  if (synthesisSupported()) {
    try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }
}
