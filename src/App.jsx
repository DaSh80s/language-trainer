import React, { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import * as nat from './naturalness/index.js';
import * as det from './naturalness/detector.js';
import * as voice from './voice.js';

// ── Theme tokens ──────────────────────────────────────────────────────────────
const LIGHT_VARS = {
  '--page': '#F4EDE1', '--panel': '#FAF6EF', '--panel-2': '#F0E8D8', '--panel-3': '#F6F0E6',
  '--border': '#E7DBC4', '--border-2': '#EADFCB', '--ink': '#211D18', '--soft': '#534B40',
  '--muted': '#9A8F7E', '--faint': '#B4A892',
  '--accent': '#C2603C', '--accent-bg': 'rgba(194,96,60,.12)', '--accent-ink': '#FFFFFF', '--accent-glow': 'rgba(194,96,60,.22)',
  '--green': '#5E7B53', '--green-ink': '#3D5234', '--green-bg': '#EAF0E2', '--green-border': '#CFDCC0',
  '--field': '#FBF7EF', '--input': '#FFFDF9', '--shadow': 'rgba(60,50,30,.09)',
};
const DARK_VARS = {
  '--page': '#161614', '--panel': '#26251F', '--panel-2': '#201F1A', '--panel-3': '#1C1B16',
  '--border': '#3A382F', '--border-2': '#2E2C25', '--ink': '#F2EDE2', '--soft': '#CBC5B7',
  '--muted': '#979085', '--faint': '#6E675B',
  '--accent': '#BCEE7A', '--accent-bg': 'rgba(188,238,122,.14)', '--accent-ink': '#17240B', '--accent-glow': 'rgba(188,238,122,.45)',
  '--green': '#8FB46E', '--green-ink': '#C8D3B4', '--green-bg': 'rgba(143,180,110,.15)', '--green-border': 'rgba(143,180,110,.32)',
  '--field': '#2A281F', '--input': '#242219', '--shadow': 'rgba(0,0,0,.45)',
};

const ARTICLES = new Set([
  'der', 'die', 'das', 'el', 'la', 'le', 'les', 'los', 'las', 'un', 'una', 'une',
  'il', 'lo', 'gli', 'de', 'het', 'ett', 'en',
]);

function splitArticle(word) {
  if (!word) return [null, word || ''];
  const parts = String(word).trim().split(/\s+/);
  if (parts.length > 1 && ARTICLES.has(parts[0].toLowerCase())) {
    return [parts[0], parts.slice(1).join(' ')];
  }
  return [null, word];
}

function parseVerbs(raw) {
  const seen = new Set();
  return String(raw || '')
    .split(/[,;\n]+/)
    .map((v) => v.trim())
    .filter((v) => {
      if (!v) return false;
      const k = v.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 40);
}

function dueStatus(v) {
  if (!v.nextReview) return { label: 'new', color: 'var(--muted)' };
  const diffDays = Math.ceil((new Date(v.nextReview).getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return { label: 'overdue', color: 'var(--accent)', due: true };
  if (diffDays === 0) return { label: 'due today', color: 'var(--accent)', due: true };
  return { label: `due in ${diffDays}d`, color: 'var(--muted)' };
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function weeklyMinutes(history) {
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - todayIdx);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d, min: 0 };
  });
  history.forEach((s) => {
    const sd = new Date(s.date);
    for (let i = 0; i < 7; i++) {
      const d = days[i].date;
      if (sd.getFullYear() === d.getFullYear() && sd.getMonth() === d.getMonth() && sd.getDate() === d.getDate()) {
        days[i].min += s.duration || 0;
      }
    }
  });
  return { days, todayIdx, total: days.reduce((a, b) => a + b.min, 0) };
}

// ── Small presentational helpers ──────────────────────────────────────────────
function Select({ label, value, onChange, options }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ font: "500 11px 'IBM Plex Sans'", color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={onChange}
          style={{
            appearance: 'none', WebkitAppearance: 'none', width: '100%',
            background: 'var(--field)', border: '1px solid var(--border)', borderRadius: 7,
            padding: '10px 28px 10px 12px', fontSize: 14, color: 'var(--ink)',
            fontFamily: "'IBM Plex Sans',sans-serif", cursor: 'pointer',
          }}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--faint)', pointerEvents: 'none', fontSize: 12 }}>⌄</span>
      </div>
    </div>
  );
}

function StatCard({ value, suffix, label, color }) {
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px var(--shadow)', padding: '20px 22px' }}>
      <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 34, lineHeight: 1, color }}>
        {value}{suffix && <span style={{ fontSize: 16, color: 'var(--muted)', fontWeight: 500 }}> {suffix}</span>}
      </div>
      <div style={{ font: "500 11px 'IBM Plex Sans'", color: 'var(--muted)', marginTop: 8 }}>{label}</div>
    </div>
  );
}

function Dots({ count, color }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < count ? color : 'var(--border)' }} />
      ))}
    </div>
  );
}

function Bounce() {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {[0, 0.12, 0.24].map((d, i) => (
        <div key={i} className="animate-bounce" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animationDelay: `${d}s` }} />
      ))}
    </div>
  );
}

// ── Password Gate ─────────────────────────────────────────────────────────────
function PasswordGate({ children }) {
  const required = import.meta.env.VITE_APP_PASSWORD;
  const [authed, setAuthed] = useState(() => !required || localStorage.getItem('lt_auth') === required);
  const [input, setInput] = useState('');
  const [err, setErr] = useState(false);

  if (authed) return children;

  function attempt() {
    if (input === required) {
      localStorage.setItem('lt_auth', required);
      setAuthed(true);
    } else {
      setErr(true);
      setInput('');
    }
  }

  return (
    <div style={{ ...LIGHT_VARS, minHeight: '100vh', background: 'var(--page)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Sans',sans-serif", padding: 24 }}>
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 8px 30px var(--shadow)', padding: 32, width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ width: 52, height: 52, margin: '0 auto 14px', borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', fontFamily: "'Spectral',serif", fontWeight: 600, fontStyle: 'italic', fontSize: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 18px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.28)', letterSpacing: '-0.02em' }}>F</div>
          <h1 style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 24, color: 'var(--ink)', margin: 0 }}>Fluo</h1>
          <p style={{ font: "400 13px 'IBM Plex Sans'", color: 'var(--muted)', marginTop: 4 }}>AI-powered language practice</p>
        </div>
        <input
          type="password"
          value={input}
          onChange={(e) => { setInput(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === 'Enter' && attempt()}
          placeholder="Password"
          autoFocus
          style={{ width: '100%', background: 'var(--input)', border: '1.5px solid var(--border)', borderRadius: 9, padding: '12px 14px', fontSize: 15, color: 'var(--ink)', marginBottom: 12, outline: 'none' }}
        />
        {err && <p style={{ color: 'var(--accent)', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>Incorrect password</p>}
        <button
          onClick={attempt}
          style={{ width: '100%', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', fontWeight: 600, fontSize: 14, padding: '12px', borderRadius: 9, cursor: 'pointer', fontFamily: "'IBM Plex Sans',sans-serif" }}
        >
          Enter
        </button>
      </div>
    </div>
  );
}

export default function LanguagePracticeApp() {
  // Core state
  const [selectedLanguage, setSelectedLanguage] = useState('German');
  const [proficiencyLevel, setProficiencyLevel] = useState('C2');
  const [practiceMode, setPracticeMode] = useState('grammar');
  const [topicFilter, setTopicFilter] = useState('general');
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('practice');
  const [theme, setTheme] = useState(() => {
    try {
      const s = localStorage.getItem('lt_theme');
      if (s === 'light' || s === 'dark') return s;
    } catch (e) { /* ignore */ }
    return 'light';
  });

  // Data state
  const [vocabularyList, setVocabularyList] = useState([]);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [commonErrors, setCommonErrors] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalPracticeMinutes, setTotalPracticeMinutes] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  // Verb drill state
  const [verbInput, setVerbInput] = useState('');
  const [verbCursor, setVerbCursor] = useState(0);

  // Naturalness layer state. Findings are kept separate from the grammar error
  // store at the data layer, even though both surface near each other in the UI.
  const [natModule, setNatModule] = useState(null);
  const [natCategories, setNatCategories] = useState(['particles']);
  const [natItem, setNatItem] = useState(null);
  const [natFindings, setNatFindings] = useState([]);
  const [natProgress, setNatProgress] = useState({});
  const [natServed, setNatServed] = useState([]);
  const [natItemShownAt, setNatItemShownAt] = useState(null);
  const [natHintLevel, setNatHintLevel] = useState(0);
  const [natElapsed, setNatElapsed] = useState(0);
  // The ride-along pass: on by default, but it costs a call per turn, so it is
  // switchable and the choice is remembered.
  const [natDetect, setNatDetect] = useState(() => {
    try { return localStorage.getItem('lt_nat_detect') !== 'off'; } catch (e) { return true; }
  });
  const [isListening, setIsListening] = useState(false);
  const stopListenRef = useRef(null);

  // Vocabulary view state
  const [vocabFilter, setVocabFilter] = useState('all');
  const [vocabSearch, setVocabSearch] = useState('');

  const conversationEndRef = useRef(null);
  const selectedLanguageRef = useRef(selectedLanguage);
  useEffect(() => { selectedLanguageRef.current = selectedLanguage; }, [selectedLanguage]);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadAllData();
  }, [selectedLanguage]);

  // Countdown for time-pressured items (repair). Only runs when one is on screen.
  useEffect(() => {
    if (!natItemShownAt || !natItem?.timeLimitSec) { setNatElapsed(0); return undefined; }
    const iv = setInterval(() => {
      setNatElapsed(Math.floor((Date.now() - natItemShownAt) / 1000));
    }, 500);
    return () => clearInterval(iv);
  }, [natItemShownAt, natItem]);

  const toggleDetect = () => {
    setNatDetect((on) => {
      const next = !on;
      try { localStorage.setItem('lt_nat_detect', next ? 'on' : 'off'); } catch (e) { /* ignore */ }
      return next;
    });
  };

  // ── Voice ───────────────────────────────────────────────────────────────────
  const toggleListen = () => {
    if (isListening) {
      if (stopListenRef.current) stopListenRef.current();
      setIsListening(false);
      return;
    }
    const stop = voice.listen(selectedLanguage, {
      onPartial: (t) => setUserInput(t),
      onFinal: (t) => setUserInput(t),
      onEnd: () => setIsListening(false),
      onError: () => setIsListening(false),
    });
    if (stop) { stopListenRef.current = stop; setIsListening(true); }
  };

  // Content modules load on demand so they never reach first paint.
  useEffect(() => {
    let live = true;
    nat.loadModule(selectedLanguage).then((m) => { if (live) setNatModule(m); });
    return () => { live = false; };
  }, [selectedLanguage]);

  const toggleTheme = () => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('lt_theme', next); } catch (e) { /* ignore */ }
      return next;
    });
  };

  // Track session time
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [showErrorForm, setShowErrorForm] = useState(false);
  const [newErrorData, setNewErrorData] = useState({ original: '', correct: '', explanation: '' });
  const [usedSentences, setUsedSentences] = useState([]);
  const [isDrilling, setIsDrilling] = useState(false);
  const [drillingContext, setDrillingContext] = useState('');

  useEffect(() => {
    if (sessionStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 60000);
        setCurrentSessionTime(elapsed);
      }, 10000);
      return () => clearInterval(interval);
    }
    setCurrentSessionTime(0);
  }, [sessionStartTime]);

  const getCurrentSessionMinutes = () => currentSessionTime;

  // Simple markdown renderer
  const renderMarkdown = (text) => {
    if (!text) return '';
    let rendered = text;
    rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    rendered = rendered.replace(/^### (.+)$/gm, '<div style="font-size: 1.1em; font-weight: bold; margin: 8px 0 4px 0;">$1</div>');
    rendered = rendered.replace(/^## (.+)$/gm, '<div style="font-size: 1.2em; font-weight: bold; margin: 10px 0 5px 0;">$1</div>');
    rendered = rendered.replace(/^# (.+)$/gm, '<div style="font-size: 1.3em; font-weight: bold; margin: 12px 0 6px 0;">$1</div>');
    rendered = rendered.replace(/^[•-]\s+(.+)$/gm, '<div style="margin-left: 18px; margin-top: 2px;">• $1</div>');
    rendered = rendered.replace(/^\d+\.\s+(.+)$/gm, '<div style="margin-left: 18px; margin-top: 2px;">$&</div>');
    rendered = rendered.replace(/\n/g, '<br>');
    return rendered;
  };

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (conversation.length > 0 && !isLoading) {
      inputRef.current?.focus();
    }
  }, [conversation, isLoading]);

  const loadAllData = () => {
    try {
      const vocab = localStorage.getItem(`vocab-${selectedLanguage}`);
      if (vocab) setVocabularyList(JSON.parse(vocab)); else setVocabularyList([]);

      const history = localStorage.getItem(`history-${selectedLanguage}`);
      if (history) setPracticeHistory(JSON.parse(history)); else setPracticeHistory([]);

      const errors = localStorage.getItem(`errors-${selectedLanguage}`);
      if (errors) setCommonErrors(JSON.parse(errors)); else setCommonErrors([]);

      const verbs = localStorage.getItem(`verbs-${selectedLanguage}`);
      setVerbInput(verbs || '');
      setVerbCursor(0);

      const natF = localStorage.getItem(`naturalness-${selectedLanguage}`);
      setNatFindings(natF ? JSON.parse(natF) : []);
      const natP = localStorage.getItem(`naturalness-progress-${selectedLanguage}`);
      setNatProgress(natP ? JSON.parse(natP) : {});
      setNatItem(null);
      setNatServed([]);

      const ach = localStorage.getItem('achievements');
      if (ach) setAchievements(JSON.parse(ach));

      const streakRaw = localStorage.getItem('streak-data');
      if (streakRaw) {
        const data = JSON.parse(streakRaw);
        setCurrentStreak(data.streak || 0);
      }

      const time = localStorage.getItem('total-practice-time');
      if (time) setTotalPracticeMinutes(parseInt(time));
    } catch (error) {
      console.log('Loading data:', error);
    }
  };

  const saveVocabulary = (vocab) => localStorage.setItem(`vocab-${selectedLanguage}`, JSON.stringify(vocab));
  const updateVerbInput = (raw) => {
    setVerbInput(raw);
    try { localStorage.setItem(`verbs-${selectedLanguage}`, raw); } catch (e) { /* ignore */ }
  };
  const savePracticeHistory = (history) => localStorage.setItem(`history-${selectedLanguage}`, JSON.stringify(history));

  const updateStreak = () => {
    try {
      const raw = localStorage.getItem('streak-data');
      const today = new Date().toDateString();
      let streakData = { streak: 1, lastPracticeDate: today };
      if (raw) {
        const data = JSON.parse(raw);
        const lastPractice = new Date(data.lastPracticeDate).toDateString();
        if (today === lastPractice) return;
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        streakData.streak = lastPractice === yesterday ? data.streak + 1 : 1;
        streakData.lastPracticeDate = today;
      }
      localStorage.setItem('streak-data', JSON.stringify(streakData));
      setCurrentStreak(streakData.streak);
    } catch (error) {
      console.error('Streak error:', error);
      setCurrentStreak(1);
    }
  };

  const getSystemPrompt = (verbCursorOverride) => {
    const verbs = parseVerbs(verbInput);
    const cursor = typeof verbCursorOverride === 'number' ? verbCursorOverride : verbCursor;
    const focusVerb = verbs.length ? verbs[cursor % verbs.length] : null;
    const levels = {
      A1: 'complete beginner', A2: 'elementary', B1: 'intermediate',
      B2: 'upper intermediate', C1: 'advanced', C2: 'mastery/native-like',
    };
    const topicContext = topicFilter !== 'general' ? `Topic: ${topicFilter}.` : '';
    const modes = {
      conversation: `Chat in ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext} Keep responses SHORT. After each exchange: ✓ corrections ✓ 1-2 new words. Use emojis 👍
Do NOT suggest more natural phrasings or stylistic alternatives — a separate naturalness layer handles that, and duplicating it contradicts itself on screen. Correct actual errors only.`,
      grammar: `Grammar practice for ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext}

${usedSentences.length > 0 ? `IMPORTANT: Do NOT repeat these English sentences you already gave:\n${usedSentences.slice(-10).join('\n')}\n\n` : ''}

${isDrilling ? `DRILLING MODE 🎯: Focus ONLY on this grammar point:\n${drillingContext}\nGive similar practice sentences targeting this same concept.\n\n` : ''}

ONE question at a time. Format:
1. Explain concept (1-2 sentences) 📚
2. Give ONE English sentence to translate to ${selectedLanguage}
3. Wait for answer
4. Give: ✓ correct translation ✓ brief explanation ✓ 1 example

${isDrilling ? 'After feedback on a MISTAKE, ask: "Another drill on this? (Y/N)"' : 'ONLY if user makes a MISTAKE/ERROR, ask: "Drill this more? (Y/N)". If answer is CORRECT, do NOT ask - just give next exercise.'}

Keep it SHORT and snappy. Use emojis.`,
      verbs: `Verb drill for ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext}

${verbs.length
  ? `The learner is committing these verbs to memory:\n${verbs.map((v, i) => `${i + 1}. ${v}`).join('\n')}\n\nFOCUS VERB for your next exercise: **${focusVerb}**. The sentence you give MUST require exactly this verb — do not drift to another verb on the list.`
  : `The learner has not named any verbs yet. Pick the 8 most useful ${levels[proficiencyLevel]} verbs in ${selectedLanguage}, tell them which you picked in your first message, then drill those in rotation.`}

${usedSentences.length > 0 ? `Do NOT repeat these English sentences you already gave:\n${usedSentences.slice(-10).join('\n')}\n\n` : ''}

${isDrilling ? `DRILLING MODE 🎯: stay on the same verb, but change the tense and the person.\n\n` : ''}

ONE exercise per message. Format:
1. ONE short English sentence to translate into ${selectedLanguage} — put it in "quotes".
2. In square brackets, name the tense and person you want, e.g. [past · du-form]. Vary these every turn so the whole conjugation gets covered over the session.
3. Stop and wait for the answer.
4. Then give: ✓ the correct translation ✓ the verb spelled out as infinitive → the form used ✓ ONE short note on why. If the verb is irregular, separable, reflexive, or governs a particular case or preposition, say so in one line.
5. Only if the answer was WRONG, ask: "Drill this verb again? (Y/N)". If it was right, move straight on.

Every 5 exercises, give a one-line score and name the verbs still looking shaky.
Keep it SHORT and snappy. Use emojis 🔁`,
      vocabulary: `Teach ${selectedLanguage} vocabulary (${levels[proficiencyLevel]}). ${topicContext} Give 5 words with: word, IPA, example. Then ask user to make sentences. Keep feedback SHORT. Use emojis 📖`,
      translation: `Translation drills for ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext} Give 3-5 sentences. Alternate directions. SHORT feedback with emojis ✓`,
      listening: `Listening practice for ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext} Describe a scenario, ask 2-3 questions. Keep it SHORT. Use emojis 👂`,
      pronunciation: `Pronunciation for ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext} Give words with IPA, explain sounds BRIEFLY, practice. Use emojis 🗣️`,
      articles: `Article gender trainer for ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext}

Rules for this game:
- Give ONE noun (NO article, just the bare noun) per turn
- Wait for the user to type only the article (e.g. "der", "die", "das", "el", "la", "le", "la", "un", "une", etc.)
- If CORRECT: ✅ confirm, then give a SHORT memory tip or rule explaining WHY (e.g. "💡 Tip: Nouns ending in -chen are always neuter in German → das")
- If WRONG: ❌ show the correct article, explain the rule, give 1-2 similar example nouns that follow the same pattern
- Keep a running score (X correct out of Y) shown after each answer
- After every 5 nouns, give a summary of any patterns/rules covered
- Choose nouns that illustrate useful, learnable rules — not purely random. Mix easy patterns with harder exceptions.
- Language-specific tips to use:
  German: -chen/-lein=das, -ung/-heit/-keit/-schaft/-ion=die, -er/-ling/-ismus (most)=der, compound nouns take the article of the last word
  Spanish: -a/-ión/-dad/-tad/-umbre=la, -o/-or/-aje=el, exceptions like el agua/la mano
  French: -tion/-sion/-té/-ée=féminine, -eau/-isme/-age (most)=masculin
  Italian: -a=la, -o=il, -ione=la, -ore=il
  Hebrew: most nouns ending in ה or ת are feminine

Use emojis. Keep it snappy and encouraging. ONE noun per message.`,
      weakAreas: `Target weak areas in ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext} Focus on errors. SHORT exercises. Use emojis 🎯`,
    };
    return modes[practiceMode] || '';
  };

  const callClaudeAPI = async (messages, verbCursorOverride) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages,
        system: getSystemPrompt(verbCursorOverride),
      }),
    });
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    return data.content.filter((item) => item.type === 'text').map((item) => item.text).join('\n');
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !practiceMode) return;

    // Naturalness drills are item-driven, not chat-driven: the answer is judged
    // against the item rather than continued as a conversation.
    if (practiceMode === 'naturalness') {
      await natJudge();
      return;
    }

    const input = userInput.trim().toLowerCase();
    if (input === 'y' || input === 'yes') {
      setIsDrilling(true);
      setUserInput('');
      setIsLoading(true);
      try {
        const drillPrompt = {
          role: 'user',
          content: practiceMode === 'verbs'
            ? 'Another sentence with the same verb, but a different tense and person.'
            : 'Give me another practice sentence on this same concept.',
        };
        const apiMessages = [...conversation.map((msg) => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content })), drillPrompt];
        const response = await callClaudeAPI(apiMessages, verbCursor);
        setConversation([...conversation, drillPrompt, { role: 'assistant', content: response }]);
        if (response.toLowerCase().includes('translate')) {
          const match = response.match(/"([^"]+)"/);
          if (match && match[1]) setUsedSentences((prev) => [...prev, match[1]].slice(-20));
        }
      } catch (error) {
        console.error('Drill error:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    if (input === 'n' || input === 'no') {
      setIsDrilling(false);
      setDrillingContext('');
      setUserInput('');
      setIsLoading(true);
      try {
        const nextPrompt = {
          role: 'user',
          content: practiceMode === 'verbs'
            ? 'Move on to the next verb.'
            : 'Give me the next grammar exercise (different concept).',
        };
        const nextCursor = verbCursor + 1;
        if (practiceMode === 'verbs') setVerbCursor(nextCursor);
        const apiMessages = [...conversation.map((msg) => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content })), nextPrompt];
        const response = await callClaudeAPI(apiMessages, nextCursor);
        setConversation([...conversation, nextPrompt, { role: 'assistant', content: response }]);
        if (response.toLowerCase().includes('translate')) {
          const match = response.match(/"([^"]+)"/);
          if (match && match[1]) setUsedSentences((prev) => [...prev, match[1]].slice(-20));
        }
      } catch (error) {
        console.error('Next error:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const newMsg = { role: 'user', content: userInput };
    const updated = [...conversation, newMsg];
    setConversation(updated);
    setUserInput('');
    setIsLoading(true);

    // Ride-along naturalness pass, in parallel with the tutor so it costs no
    // waiting. Deliberately not awaited.
    void runDetector(userInput.trim());

    try {
      const apiMessages = updated.map((msg) => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content }));
      // Verb drill: every answered exercise moves the rotation on. Repeating the
      // same verb is driven by the 'Y' branch above, which re-sends the current
      // cursor, so freezing it here on isDrilling would strand the focus verb.
      const nextCursor = verbCursor + 1;
      if (practiceMode === 'verbs') {
        setVerbCursor(nextCursor);
        setIsDrilling(false);
      }
      const response = await callClaudeAPI(apiMessages, nextCursor);
      setConversation([...updated, { role: 'assistant', content: response }]);

      if (practiceMode === 'grammar' && !isDrilling && (response.toLowerCase().includes('correct') || response.toLowerCase().includes('mistake'))) {
        const conceptMatch = response.match(/(?:concept|rule|point).*?:\s*([^.]+)/i);
        if (conceptMatch) {
          setDrillingContext(conceptMatch[1]);
        } else {
          const lines = response.split('\n').filter((l) => l.trim());
          if (lines.length > 0) setDrillingContext(lines[0].substring(0, 100));
        }
      }

      if ((practiceMode === 'grammar' || practiceMode === 'verbs') && response.toLowerCase().includes('translate')) {
        const match = response.match(/"([^"]+)"/);
        if (match && match[1]) setUsedSentences((prev) => [...prev, match[1]].slice(-20));
      }
    } catch (error) {
      console.error('API error:', error);
      setConversation([...updated, { role: 'assistant', content: 'Error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Naturalness layer ───────────────────────────────────────────────────────
  const natItems = React.useMemo(() => nat.itemsFor(natModule, natCategories), [natModule, natCategories]);
  const natBuilt = React.useMemo(() => nat.builtCategories(natModule), [natModule]);

  const saveNatFindings = (list) => {
    try { localStorage.setItem(`naturalness-${selectedLanguage}`, JSON.stringify(list.slice(-600))); } catch (e) { /* ignore */ }
  };
  const saveNatProgress = (map) => {
    try { localStorage.setItem(`naturalness-progress-${selectedLanguage}`, JSON.stringify(map)); } catch (e) { /* ignore */ }
  };

  /** Render a drill item into a chat message. Built locally — no API call. */
  const natRender = (item) => {
    const p = nat.present(item);
    // With several categories selected it is not otherwise obvious what is
    // being drilled, which makes the feedback harder to learn from.
    const cat = natCategories.length > 1
      ? `*${nat.CATEGORY_BY_ID[item.categoryId]?.label || item.categoryId}*\n\n`
      : '';
    let out = `${cat}**${p.instruction}**\n\n${p.stimulus}`;
    if (p.extra) out += `\n\n${p.extra}`;
    return out;
  };

  /**
   * The ride-along pass. Fires alongside the tutor reply rather than instead of
   * it, so the learner never waits on it. Free text has no known opening, so
   * these findings never count toward reach.
   */
  const runDetector = async (text) => {
    if (!natDetect || !natModule) return;
    if (!det.worthAnalysing(text)) return;
    const lang = selectedLanguage;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(det.buildDetectorRequest(text, natModule, lang)),
      });
      if (!res.ok) return;
      const data = await res.json();
      const body = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      const parsed = det.parseDetection(body);
      const found = det.toFindings(parsed, text);
      if (!found.length) return;
      if (lang !== selectedLanguageRef.current) return; // language switched mid-flight

      setNatFindings((prev) => {
        const next = [...prev, ...found];
        try { localStorage.setItem(`naturalness-${lang}`, JSON.stringify(next.slice(-600))); } catch (e) { /* ignore */ }
        return next;
      });

      const lines = [];
      parsed.positives.forEach((pos) => {
        lines.push(`✅ **${pos.learnerText}** — ${pos.note}`);
      });
      parsed.findings.forEach((f) => {
        lines.push(`↑ You said: *${f.learnerText}*\n**${f.naturalText}**\n${f.explanation}`);
      });
      if (!lines.length) return;
      setConversation((prev) => [...prev, { role: 'assistant', polish: true, content: `**Naturalness**\n\n${lines.join('\n\n')}` }]);
    } catch (error) {
      console.error('Detector error:', error);
    }
  };

  /** Advance without judging. Used by skip, and after a judged answer. */
  const natAdvance = (progress, msgs) => {
    const next = nat.pickNext(natItems, progress, natServed);
    if (next) {
      setNatItem(next);
      setNatItemShownAt(Date.now());
      setNatServed((prevServed) => [...prevServed, next.id]);
      return [...msgs, { role: 'assistant', content: natRender(next) }];
    }
    setNatItem(null);
    return [...msgs, { role: 'assistant', content: 'Nothing left in this selection — pick another category on the left.' }];
  };

  const natJudge = async () => {
    const item = natItem;
    const answer = userInput.trim();
    if (!item || !answer) return;

    const control = answer.toLowerCase();

    // A nudge. Local, free, and it does not consume the item or log anything.
    if (control === 'hint') {
      setUserInput('');
      const level = natHintLevel + 1;
      const text = nat.hintFor(item, level);
      // Some formats only have one level of nudge. Repeating it verbatim looks
      // broken, so say plainly that there is no more.
      const exhausted = level > 1 && text === nat.hintFor(item, level - 1);
      setNatHintLevel(level);
      setConversation([...conversation, {
        role: 'assistant',
        content: exhausted
          ? '💡 That is as much of a nudge as there is. Have a go, or type **skip**.'
          : `💡 ${text}`,
      }]);
      return;
    }

    // Skipping IS declining the opening, so it is logged as one. Otherwise the
    // reach score could be inflated simply by skipping everything difficult —
    // the exact avoidance this metric exists to catch.
    if (control === 'skip') {
      setUserInput('');
      const probed = nat.probesReach(item);
      if (probed) {
        const skipped = {
          id: `${item.id}-${Date.now()}`,
          categoryId: item.categoryId,
          itemId: item.id,
          particle: item.particle,
          probedReach: true,
          reached: false,
          landed: false,
          severity: null,
          learnerText: '(skipped)',
          naturalText: item.target,
          explanation: 'Skipped.',
          timestamp: new Date().toISOString(),
        };
        setNatFindings((prev) => {
          const nextF = [...prev, skipped];
          try { localStorage.setItem(`naturalness-${selectedLanguage}`, JSON.stringify(nextF.slice(-600))); } catch (e) { /* ignore */ }
          return nextF;
        });
      }
      const prevP = natProgress[item.id] || { seen: 0, missed: 0 };
      const progress = { ...natProgress, [item.id]: { seen: prevP.seen + 1, missed: prevP.missed, lastSeen: new Date().toISOString() } };
      setNatProgress(progress);
      saveNatProgress(progress);
      setNatHintLevel(0);
      setConversation(natAdvance(progress, [
        ...conversation,
        { role: 'assistant', content: `⏭ Skipped. It wanted: **${item.target}**${probed ? '\n\nSkips count as an opening not taken — otherwise the score could be improved just by avoiding the hard ones.' : ''}` },
      ]));
      return;
    }

    const elapsedSec = natItemShownAt ? (Date.now() - natItemShownAt) / 1000 : 0;
    const withAnswer = [...conversation, { role: 'user', content: answer }];
    setConversation(withAnswer);
    setUserInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nat.buildJudgeRequest(item, answer, elapsedSec)),
      });
      if (!res.ok) throw new Error(`request failed (${res.status})`);
      const data = await res.json();
      const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
      const j = nat.parseJudgement(text);

      const probed = nat.probesReach(item);
      const finding = {
        id: `${item.id}-${Date.now()}`,
        categoryId: item.categoryId,
        itemId: item.id,
        particle: item.particle,
        probedReach: probed,
        reached: probed ? j.reached : true,
        landed: j.landed,
        severity: j.severity,
        learnerText: answer,
        naturalText: j.naturalText,
        explanation: j.explanation,
        hinted: natHintLevel > 0,
        timestamp: new Date().toISOString(),
      };
      const findings = [...natFindings, finding];
      setNatFindings(findings);
      saveNatFindings(findings);

      const prev = natProgress[item.id] || { seen: 0, missed: 0 };
      const progress = {
        ...natProgress,
        [item.id]: {
          seen: prev.seen + 1,
          missed: prev.missed + (j.landed ? 0 : 1),
          lastSeen: new Date().toISOString(),
        },
      };
      setNatProgress(progress);
      saveNatProgress(progress);

      const missedOpening = probed && !j.reached;
      const mark = j.landed ? '✅' : missedOpening ? '⚪' : '❌';
      const head = j.landed
        ? 'Landed.'
        : missedOpening
          ? `The opening was there for ${item.particle} and you did not take it.`
          : 'Not quite.';

      let body = `${mark} **${head}**\n\n`;
      if (j.naturalText) body += `**${j.naturalText}**\n\n`;
      if (j.explanation) body += `${j.explanation}\n`;
      if (item.note) body += `\n💡 ${item.note}`;
      if (item.confidence === 'review') {
        body += `\n\n⚠️ This one is genuinely contested among native speakers — worth checking against what you actually hear in Zurich.`;
      }
      if (item.timeLimitSec) {
        const over = elapsedSec > item.timeLimitSec;
        body += `\n\n⏱ ${Math.round(elapsedSec)}s of ${item.timeLimitSec}s${over ? ' — over. Repair only counts if it is fast.' : ''}`;
      }

      setNatHintLevel(0);
      setConversation(natAdvance(progress, [...withAnswer, { role: 'assistant', content: body }]));
    } catch (error) {
      console.error('Naturalness judge error:', error);
      setConversation([...withAnswer, { role: 'assistant', content: `Could not judge that answer — ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPractice = async () => {
    if (!practiceMode) return;
    setConversation([]);
    setIsLoading(true);
    setSessionStartTime(Date.now());
    setUsedSentences([]);
    setIsDrilling(false);
    setDrillingContext('');
    setVerbCursor(0);
    await updateStreak();

    const newSession = {
      id: Date.now(),
      date: new Date().toISOString(),
      mode: practiceMode,
      topic: topicFilter,
      level: proficiencyLevel,
      duration: 0,
    };
    const updatedHistory = [newSession, ...practiceHistory].slice(0, 100);
    setPracticeHistory(updatedHistory);
    savePracticeHistory(updatedHistory);

    if (practiceMode === 'naturalness') {
      const mod = natModule || (await nat.loadModule(selectedLanguage));
      if (mod && mod !== natModule) setNatModule(mod);
      const items = nat.itemsFor(mod, natCategories);
      if (!items.length) {
        setConversation([{
          role: 'assistant',
          content: `**Nothing to drill yet.**\n\nThere is no naturalness content for ${selectedLanguage}. German is the only module built so far — switch language, or pick a category that has content.`,
        }]);
        setIsLoading(false);
        return;
      }
      const first = nat.pickNext(items, natProgress, []);
      setNatItem(first);
      setNatServed([first.id]);
      setNatItemShownAt(Date.now());
      setConversation([{ role: 'assistant', content: natRender(first) }]);
      setIsLoading(false);
      return;
    }

    try {
      const prompts = {
        conversation: topicFilter === 'general' ? 'Start a conversation.' : `Talk about ${topicFilter}.`,
        grammar: 'Give me a grammar exercise.',
        vocabulary: 'Teach me new vocabulary.',
        translation: 'Give me translation exercises.',
        listening: 'Give me a listening exercise.',
        pronunciation: 'Help me with pronunciation.',
        articles: 'Start the article gender game. Give me the first noun.',
        verbs: 'Start the verb drill. Give me the first sentence to translate.',
        weakAreas: 'Focus on my weak areas.',
      };
      const response = await callClaudeAPI([{ role: 'user', content: prompts[practiceMode] }], 0);
      setConversation([{ role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Start error:', error);
      let errorMsg = 'Error starting session.';
      if (error.message.includes('rate')) errorMsg = 'Rate limit reached. Please wait a minute and try again.';
      else if (error.message.includes('network')) errorMsg = 'Network error. Please check your connection and try again.';
      setConversation([{ role: 'assistant', content: `${errorMsg} (Error: ${error.message})` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionStartTime) {
      setConversation([]);
      return;
    }
    const minutes = Math.floor((Date.now() - sessionStartTime) / 60000);
    const newTotal = totalPracticeMinutes + minutes;
    setTotalPracticeMinutes(newTotal);
    localStorage.setItem('total-practice-time', newTotal.toString());

    if (practiceHistory.length > 0) {
      const updated = [...practiceHistory];
      updated[0].duration = minutes;
      setPracticeHistory(updated);
      savePracticeHistory(updated);
    }

    if (conversation.length > 2) {
      setIsLoading(true);
      try {
        const gradePrompt = `Grade this ${selectedLanguage} session (${proficiencyLevel} level). Be BRIEF.

Give:
1. Score: X.XX/6.00
2. ALTE: A1/A2/B1/B2/C1/C2
3. 1-2 sentences feedback with emojis

Format:
**Grade** 📊
• Score: X.XX/6.00
• ALTE: XX
• Feedback: [brief comment with emoji]`;
        const gradeResponse = await callClaudeAPI([
          ...conversation.map((msg) => ({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content })),
          { role: 'user', content: gradePrompt },
        ]);
        setConversation([...conversation, { role: 'assistant', content: gradeResponse }]);
        setIsLoading(false);
        setSessionStartTime(null);
      } catch (error) {
        console.error('Grading error:', error);
        setConversation([...conversation, { role: 'assistant', content: '⚠️ Could not generate grade. Session ended.' }]);
        setIsLoading(false);
        setSessionStartTime(null);
      }
    } else {
      setConversation([]);
      setSessionStartTime(null);
    }
  };

  const handleAddVocab = () => {
    const word = prompt('Word:');
    if (!word) return;
    const translation = prompt('Translation:') || '';
    const example = prompt('Example (optional):') || '';
    const newVocab = {
      id: Date.now(), word, translation, example,
      dateAdded: new Date().toISOString(), nextReview: new Date().toISOString(), reviewCount: 0,
    };
    const updated = [...vocabularyList, newVocab];
    setVocabularyList(updated);
    saveVocabulary(updated);
  };

  const handleDeleteVocab = (id) => {
    const updated = vocabularyList.filter((v) => v.id !== id);
    setVocabularyList(updated);
    saveVocabulary(updated);
  };

  const handleExportVocab = () => {
    const csv = 'Word,Translation,Example,Date\n' +
      vocabularyList.map((v) => `"${v.word}","${v.translation}","${v.example}","${new Date(v.dateAdded).toLocaleDateString()}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLanguage}-vocabulary.csv`;
    a.click();
  };

  // Full backup/restore of ALL app data (localStorage). Used to migrate data
  // between domains, since localStorage is scoped per-origin.
  const handleBackup = () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      data[k] = localStorage.getItem(k);
    }
    const payload = { _fluoBackup: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const data = parsed && parsed._fluoBackup ? parsed.data : parsed;
        if (!data || typeof data !== 'object') throw new Error('bad format');
        const keys = Object.keys(data);
        if (!keys.length) throw new Error('empty');
        if (!window.confirm(`Restore ${keys.length} data entries from this backup? This overwrites the data currently saved on this site.`)) return;
        keys.forEach((k) => localStorage.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k])));
        window.alert('Backup restored. Reloading…');
        window.location.reload();
      } catch (err) {
        window.alert('Could not read that file — make sure it is a Fluo backup (.json).');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const languages = ['German', 'Spanish', 'Portuguese', 'French', 'Italian', 'Hebrew', 'Arabic', 'Mandarin Chinese', 'Japanese', 'Korean', 'Russian', 'Dutch', 'Swedish', 'Turkish', 'Polish'];
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const modes = [
    { id: 'conversation', name: 'Conversation' },
    { id: 'grammar', name: 'Grammar' },
    { id: 'verbs', name: 'Verb Drill' },
    { id: 'naturalness', name: 'Naturalness' },
    { id: 'vocabulary', name: 'Vocabulary' },
    { id: 'translation', name: 'Translation' },
    { id: 'articles', name: 'Article Gender' },
    { id: 'listening', name: 'Listening' },
    { id: 'pronunciation', name: 'Pronunciation' },
    { id: 'weakAreas', name: 'Weak Areas' },
  ];
  const topics = ['general', 'business', 'travel', 'culture', 'technology', 'food', 'sports', 'health', 'education', 'entertainment'];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const modeName = (modes.find((m) => m.id === practiceMode) || {}).name || 'Practice';

  const vars = theme === 'dark' ? DARK_VARS : LIGHT_VARS;

  // ── Practice derived data ──
  const answersLogged = conversation.filter((m) => m.role === 'user').length;
  // Openings taken so far this session — the number that actually matters,
  // visible while drilling rather than only afterwards on the dashboard.
  const natSessionProbes = sessionStartTime
    ? natFindings.filter((f) => f.probedReach && new Date(f.timestamp).getTime() >= sessionStartTime)
    : [];
  const natSessionTaken = natSessionProbes.filter((f) => f.reached).length;
  const liveMin = getCurrentSessionMinutes();
  const liveTime = `${String(Math.floor(liveMin / 60)).padStart(2, '0')}:${String(liveMin % 60).padStart(2, '0')}`;

  // ── Verb drill derived data ──
  const verbListParsed = parseVerbs(verbInput);
  const nextVerb = verbListParsed.length ? verbListParsed[verbCursor % verbListParsed.length] : null;
  const removeVerb = (verb) => updateVerbInput(verbListParsed.filter((v) => v !== verb).join(', '));

  // ── Vocabulary derived data ──
  const masteredCount = vocabularyList.filter((v) => (v.reviewCount || 0) >= 5).length;
  const dueCount = vocabularyList.filter((v) => dueStatus(v).due).length;
  const filteredVocab = vocabularyList.filter((v) => {
    if (vocabSearch) {
      const q = vocabSearch.toLowerCase();
      if (!`${v.word} ${v.translation}`.toLowerCase().includes(q)) return false;
    }
    if (vocabFilter === 'mastered') return (v.reviewCount || 0) >= 5;
    if (vocabFilter === 'due') return dueStatus(v).due;
    return true;
  });

  // ── Progress derived data ──
  const wk = weeklyMinutes(practiceHistory);
  const maxMin = Math.max(...wk.days.map((d) => d.min), 1);
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const labelStyle = { font: "500 11px 'IBM Plex Sans'", color: 'var(--muted)', marginBottom: 6 };

  // Voice support is real but uneven (Chrome and Safari yes, Firefox no), so the
  // controls are hidden rather than shown broken.
  const micOn = voice.recognitionSupported();
  const voiceOn = voice.synthesisSupported();

  return (
    <PasswordGate>
      <div
        className="fluo-page"
        style={{ ...vars, minHeight: '100vh', background: 'var(--page)', fontFamily: "'IBM Plex Sans',sans-serif", color: 'var(--ink)', padding: '30px 28px 60px', transition: 'background .25s' }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* ===== HEADER ===== */}
          <div className="fluo-header" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 1px 3px var(--shadow)', padding: '24px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', fontFamily: "'Spectral',serif", fontWeight: 600, fontStyle: 'italic', fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 5px 18px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,.28)', letterSpacing: '-0.02em' }}>F</div>
              <div>
                <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 23, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Fluo</div>
                <div style={{ font: "400 13px 'IBM Plex Sans'", color: 'var(--muted)', marginTop: 2 }}>AI-powered learning · {selectedLanguage} {proficiencyLevel} {modeName}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 20, color: 'var(--accent)' }}>{currentStreak}</div>
                <div style={{ font: "500 10px/1 'IBM Plex Mono'", letterSpacing: '.1em', color: 'var(--muted)', textTransform: 'uppercase', marginTop: 4 }}>day streak</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 20, color: 'var(--ink)' }}>{totalPracticeMinutes + getCurrentSessionMinutes()}</div>
                <div style={{ font: "500 10px/1 'IBM Plex Mono'", letterSpacing: '.1em', color: 'var(--muted)', textTransform: 'uppercase', marginTop: 4 }}>{sessionStartTime ? 'min · live' : 'minutes'}</div>
              </div>
              <button onClick={toggleTheme} title="Toggle theme" style={{ width: 44, height: 44, borderRadius: 11, border: '1px solid var(--border)', background: 'var(--field)', color: 'var(--accent)', fontSize: 19, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {theme === 'dark' ? '☾' : '☀'}
              </button>
            </div>
          </div>

          {/* ===== TABS ===== */}
          <div style={{ display: 'flex', gap: 6, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, padding: 8 }}>
            {[['practice', 'Practice'], ['vocabulary', 'Vocabulary'], ['progress', 'Progress']].map(([id, label]) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  className="fluo-tab"
                  onClick={() => setActiveTab(id)}
                  style={{ position: 'relative', flex: '0 0 auto', border: 'none', borderRadius: 8, padding: '11px 22px', cursor: 'pointer', font: "600 14px 'IBM Plex Sans',sans-serif", background: active ? 'var(--accent)' : 'transparent', color: active ? 'var(--accent-ink)' : 'var(--muted)' }}
                >
                  <span>{label}</span>
                </button>
              );
            })}
          </div>

          {/* ===== PRACTICE TAB ===== */}
          {activeTab === 'practice' && (
            <div className="fluo-practice" style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 2px 10px var(--shadow)', overflow: 'hidden', minHeight: 600 }}>
              {/* setup rail */}
              <div className="fluo-rail" style={{ flex: '0 0 252px', background: 'var(--panel-2)', borderRight: '1px solid var(--border)', padding: '24px 22px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ font: "500 11px/1 'IBM Plex Mono'", letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 20 }}>Session setup</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <Select label="Language" value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} options={languages.map((l) => ({ value: l, label: l }))} />
                  <div style={{ display: 'flex', gap: 11 }}>
                    <Select label="Level" value={proficiencyLevel} onChange={(e) => setProficiencyLevel(e.target.value)} options={levels.map((l) => ({ value: l, label: l }))} />
                    <Select label="Mode" value={practiceMode} onChange={(e) => setPracticeMode(e.target.value)} options={modes.map((m) => ({ value: m.id, label: m.name }))} />
                  </div>
                  <Select label="Topic" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} options={topics.map((t) => ({ value: t, label: cap(t) }))} />

                  {practiceMode !== 'naturalness' && nat.hasModule(selectedLanguage) && (
                    <div
                      onClick={toggleDetect}
                      title="Analyses your answers for what is correct but not native. One extra call per turn."
                      style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: '9px 11px', borderRadius: 8, background: 'var(--field)', border: '1px solid var(--border)' }}
                    >
                      <span style={{
                        width: 32, height: 18, borderRadius: 999, flex: '0 0 auto', position: 'relative',
                        background: natDetect ? 'var(--accent)' : 'var(--border)', transition: 'background .2s',
                      }}>
                        <span style={{
                          position: 'absolute', top: 2, left: natDetect ? 16 : 2, width: 14, height: 14,
                          borderRadius: '50%', background: 'var(--panel)', transition: 'left .2s',
                        }} />
                      </span>
                      <span style={{ font: "500 12px 'IBM Plex Sans'", color: natDetect ? 'var(--ink)' : 'var(--muted)' }}>Naturalness pass</span>
                    </div>
                  )}

                  {practiceMode === 'naturalness' && (
                    <div>
                      <div style={labelStyle}>Categories</div>
                      {!nat.hasModule(selectedLanguage) ? (
                        <div style={{ font: "400 11.5px 'IBM Plex Sans'", color: 'var(--faint)' }}>
                          No content for {selectedLanguage} yet. German is the only module built so far.
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {nat.CATEGORIES.map((c) => {
                              const built = natBuilt.includes(c.id);
                              const on = built && natCategories.includes(c.id);
                              return (
                                <span
                                  key={c.id}
                                  title={built ? c.blurb : 'Not built yet'}
                                  onClick={() => {
                                    if (!built) return;
                                    setNatCategories((prev) => (prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id]));
                                  }}
                                  style={{
                                    borderRadius: 999, padding: '3px 9px', font: "500 11.5px 'IBM Plex Sans'",
                                    cursor: built ? 'pointer' : 'default',
                                    background: on ? 'var(--accent-bg)' : 'var(--field)',
                                    border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                                    color: built ? (on ? 'var(--accent)' : 'var(--soft)') : 'var(--faint)',
                                    opacity: built ? 1 : 0.45,
                                  }}
                                >
                                  {c.label}
                                </span>
                              );
                            })}
                          </div>
                          <div style={{ font: "400 11px 'IBM Plex Sans'", color: 'var(--faint)', marginTop: 8 }}>
                            {natItems.length} item{natItems.length === 1 ? '' : 's'} ready · {natBuilt.length} of {nat.CATEGORIES.length} categories built
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {practiceMode === 'verbs' && (
                    <div>
                      <div style={labelStyle}>Verbs to drill</div>
                      <textarea
                        value={verbInput}
                        onChange={(e) => updateVerbInput(e.target.value)}
                        rows={3}
                        placeholder={'e.g. gehen, nehmen,\nsich freuen auf'}
                        style={{
                          width: '100%', background: 'var(--input)', border: '1px solid var(--border)', borderRadius: 7,
                          padding: '10px 12px', fontSize: 13.5, color: 'var(--ink)', fontFamily: "'IBM Plex Sans',sans-serif",
                          resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ font: "400 11px 'IBM Plex Sans'", color: 'var(--faint)', marginTop: 6 }}>
                        {verbListParsed.length
                          ? `${verbListParsed.length} verb${verbListParsed.length === 1 ? '' : 's'} · saved for ${selectedLanguage}`
                          : 'Separate with commas or new lines. Leave empty and Fluo picks useful ones.'}
                      </div>
                      {verbListParsed.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9 }}>
                          {verbListParsed.map((v) => {
                            const isNext = v === nextVerb && conversation.length > 0;
                            return (
                              <span
                                key={v}
                                title={isNext ? 'Up next' : 'Click × to remove'}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5, borderRadius: 999,
                                  padding: '3px 7px 3px 9px', font: "500 11.5px 'IBM Plex Sans'",
                                  background: isNext ? 'var(--accent-bg)' : 'var(--field)',
                                  border: `1px solid ${isNext ? 'var(--accent)' : 'var(--border)'}`,
                                  color: isNext ? 'var(--accent)' : 'var(--soft)',
                                }}
                              >
                                {v}
                                <button
                                  onClick={() => removeVerb(v)}
                                  aria-label={`Remove ${v}`}
                                  style={{ border: 'none', background: 'none', color: 'var(--faint)', cursor: 'pointer', font: "500 13px 'IBM Plex Sans'", lineHeight: 1, padding: 0 }}
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleStartPractice}
                    disabled={!practiceMode || isLoading}
                    style={{ width: '100%', background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', font: "600 14px 'IBM Plex Sans'", padding: '12px', borderRadius: 8, cursor: 'pointer', boxShadow: '0 4px 14px var(--accent-glow)' }}
                  >
                    {isLoading && conversation.length === 0 ? 'Starting…' : conversation.length > 0 ? 'Restart session' : 'Start session'}
                  </button>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: 22 }}>
                  {sessionStartTime && (
                    <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 9, padding: '13px 14px', marginBottom: 13 }}>
                      <div style={{ font: "500 10px/1 'IBM Plex Mono'", letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 6 }}>● Live · {liveTime}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--green-ink)' }}>{answersLogged} answer{answersLogged === 1 ? '' : 's'} · {cap(modeName.toLowerCase())}</div>
                      {practiceMode === 'naturalness' && natSessionProbes.length > 0 && (
                        <div style={{ fontSize: 12.5, color: 'var(--green-ink)', marginTop: 4 }}>
                          {natSessionTaken}/{natSessionProbes.length} openings taken
                        </div>
                      )}
                    </div>
                  )}
                  {conversation.length > 0 && (
                    <div onClick={handleEndSession} style={{ textAlign: 'center', font: "500 13.5px 'IBM Plex Sans'", color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 7, padding: 11, cursor: 'pointer' }}>End session</div>
                  )}
                </div>
              </div>

              {/* session column */}
              <div className="fluo-session" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--panel-3)' }}>
                {/* session context strip (thin, non-pinned) */}
                {conversation.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 26px', borderBottom: '1px solid var(--border)', flex: '0 0 auto' }}>
                    <div style={{ font: "500 11px/1 'IBM Plex Mono'", letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                      {isDrilling ? 'Drilling · ' : ''}{modeName} · {proficiencyLevel}{topicFilter !== 'general' ? ` · ${cap(topicFilter)}` : ''}
                      {natItem?.timeLimitSec && practiceMode === 'naturalness' && (
                        <span style={{ marginLeft: 10, color: natElapsed > natItem.timeLimitSec ? 'var(--accent)' : 'var(--muted)' }}>
                          ⏱ {Math.max(0, natItem.timeLimitSec - natElapsed)}s
                        </span>
                      )}
                    </div>
                    {sessionStartTime && <div style={{ font: "500 10px/1 'IBM Plex Mono'", color: 'var(--muted)' }}>● {liveTime}</div>}
                  </div>
                )}

                {/* chat (chronological: oldest → newest, scrolls to bottom) */}
                <div style={{ flex: 1, padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: 'calc(100vh - 300px)', minHeight: 340 }}>
                  {conversation.length === 0 && !isLoading ? (
                    <div style={{ margin: 'auto', textAlign: 'center', maxWidth: 360 }}>
                      <div style={{ fontFamily: "'Spectral',serif", fontWeight: 500, fontSize: 22, color: 'var(--soft)', lineHeight: 1.34 }}>Ready when you are.</div>
                      <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 8 }}>Pick a mode on the left, then press Start session.</div>
                    </div>
                  ) : conversation.length === 0 && isLoading ? (
                    <div style={{ margin: 'auto', display: 'flex', alignItems: 'center', gap: 12, color: 'var(--muted)' }}><Bounce /> Preparing your first exercise…</div>
                  ) : (
                    <>
                      {conversation.map((msg, idx) => (
                        msg.role === 'assistant' ? (
                          <div key={idx} style={{ display: 'flex', gap: 12 }}>
                            <div style={{ flex: '0 0 30px', height: 30, borderRadius: '50%', background: msg.polish ? 'var(--green)' : 'var(--accent)', color: msg.polish ? 'var(--panel)' : 'var(--accent-ink)', font: "600 12px/30px 'IBM Plex Sans'", textAlign: 'center' }}>{msg.polish ? '↑' : 'T'}</div>
                            <div style={{ position: 'relative', maxWidth: 620 }}>
                              <div
                                style={{
                                  background: msg.polish ? 'var(--green-bg)' : 'var(--panel)',
                                  border: `1px solid ${msg.polish ? 'var(--green-border)' : 'var(--border)'}`,
                                  borderRadius: '4px 14px 14px 14px', padding: '14px 17px', fontSize: 14.5,
                                  lineHeight: 1.6, color: msg.polish ? 'var(--green-ink)' : 'var(--soft)',
                                }}
                                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                              />
                              {voiceOn && (
                                <button
                                  onClick={() => voice.speak(msg.content, selectedLanguage)}
                                  title="Hear it"
                                  style={{ position: 'absolute', top: 6, right: -34, width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--field)', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0 }}
                                >
                                  ♪
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: '14px 14px 4px 14px', padding: '12px 16px', fontSize: 14.5, lineHeight: 1.5, maxWidth: 520, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                          </div>
                        )
                      ))}
                      {isLoading && (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ flex: '0 0 30px', height: 30, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', font: "600 12px/30px 'IBM Plex Sans'", textAlign: 'center' }}>T</div>
                          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', padding: '14px 17px' }}><Bounce /></div>
                        </div>
                      )}
                      <div ref={conversationEndRef} />
                    </>
                  )}
                </div>

                {/* docked answer bar */}
                <div style={{ padding: '16px 26px 22px', borderTop: '1px solid var(--border)', background: 'var(--panel)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={conversation.length === 0 ? 'Start a session first…' : 'Type your answer…'}
                      disabled={conversation.length === 0 || isLoading}
                      style={{ flex: 1, background: 'var(--input)', border: '1.5px solid var(--border)', borderRadius: 9, padding: '14px 16px', minHeight: 50, color: 'var(--ink)', fontSize: 15, fontFamily: "'Spectral',serif", fontStyle: 'italic', outline: 'none' }}
                    />
                    {micOn && (
                      <button
                        onClick={toggleListen}
                        disabled={conversation.length === 0 || isLoading}
                        title={isListening ? 'Stop dictating' : 'Answer out loud'}
                        style={{
                          flex: '0 0 auto', width: 50, minHeight: 50, borderRadius: 9, cursor: 'pointer',
                          border: `1.5px solid ${isListening ? 'var(--accent)' : 'var(--border)'}`,
                          background: isListening ? 'var(--accent-bg)' : 'var(--field)',
                          color: isListening ? 'var(--accent)' : 'var(--muted)', fontSize: 17,
                        }}
                      >
                        {isListening ? '◉' : '🎙'}
                      </button>
                    )}
                    <button
                      onClick={handleSendMessage}
                      disabled={!userInput.trim() || conversation.length === 0 || isLoading}
                      style={{ flex: '0 0 auto', background: 'var(--accent)', border: 'none', color: 'var(--accent-ink)', font: "600 14px 'IBM Plex Sans'", padding: '14px 26px', borderRadius: 9, cursor: 'pointer', boxShadow: '0 4px 14px var(--accent-glow)' }}
                    >
                      Send
                    </button>
                  </div>
                  <div style={{ font: "400 11px 'IBM Plex Mono'", color: 'var(--faint)', marginTop: 10 }}>
                    ↵ send
                    {practiceMode === 'naturalness' && ' · "hint" for a nudge · "skip" to pass'}
                    {(practiceMode === 'grammar' || practiceMode === 'verbs') && ' · Y/N to drill'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== VOCABULARY TAB ===== */}
          {activeTab === 'vocabulary' && (
            <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 2px 10px var(--shadow)', padding: '28px 30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 24, color: 'var(--ink)' }}>{selectedLanguage} Vocabulary</span>
                  <span style={{ font: "500 12px 'IBM Plex Mono'", color: 'var(--muted)' }}>{vocabularyList.length} words</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ background: 'var(--field)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
                    <span style={{ color: 'var(--faint)' }}>⌕</span>
                    <input
                      value={vocabSearch}
                      onChange={(e) => setVocabSearch(e.target.value)}
                      placeholder="Search words…"
                      style={{ border: 'none', background: 'transparent', padding: '9px 0', fontSize: 13, color: 'var(--ink)', outline: 'none', width: '100%', fontFamily: "'IBM Plex Sans',sans-serif" }}
                    />
                  </div>
                  <button onClick={handleExportVocab} style={{ background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--soft)', font: "500 13.5px 'IBM Plex Sans'", padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>Export</button>
                  <button onClick={handleAddVocab} style={{ background: 'var(--accent)', border: 'none', color: 'var(--accent-ink)', font: "600 13.5px 'IBM Plex Sans'", padding: '9px 18px', borderRadius: 8, cursor: 'pointer' }}>+ Add word</button>
                </div>
              </div>

              {/* filter chips */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
                {[['all', `All ${vocabularyList.length}`], ['due', `Due today · ${dueCount}`], ['mastered', `Mastered · ${masteredCount}`]].map(([id, label]) => {
                  const active = vocabFilter === id;
                  return (
                    <span
                      key={id}
                      className="fluo-chip"
                      onClick={() => setVocabFilter(id)}
                      style={{ font: "500 12.5px 'IBM Plex Sans'", borderRadius: 20, padding: '7px 15px', background: active ? 'var(--accent)' : 'var(--field)', color: active ? 'var(--accent-ink)' : 'var(--soft)', border: active ? '1px solid var(--accent)' : '1px solid var(--border)' }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>

              {/* word grid */}
              {filteredVocab.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--muted)', fontSize: 14 }}>
                  {vocabularyList.length === 0 ? 'No vocabulary yet. Start a session to begin collecting words.' : 'No words match this filter.'}
                </div>
              ) : (
                <div className="fluo-vocab-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {filteredVocab.map((v) => {
                    const [article, base] = splitArticle(v.word);
                    const mastery = Math.max(0, Math.min(5, v.reviewCount || 0));
                    const mastered = mastery >= 5;
                    const ds = dueStatus(v);
                    return (
                      <div key={v.id} className="fluo-vocab-card" style={{ position: 'relative', background: 'var(--panel-3)', border: '1px solid var(--border)', borderRadius: 11, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, gap: 10 }}>
                          <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 21, color: 'var(--ink)' }}>
                            {article && <span style={{ color: 'var(--accent)' }}>{article} </span>}{base}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
                            {mastered && <span style={{ font: "500 10px/1 'IBM Plex Mono'", letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--green)', border: '1px solid var(--green-border)', background: 'var(--green-bg)', borderRadius: 4, padding: '5px 7px' }}>Mastered</span>}
                            <button className="fluo-card-del" onClick={() => handleDeleteVocab(v.id)} title="Delete" style={{ background: 'transparent', border: 'none', color: 'var(--faint)', cursor: 'pointer', padding: 2, display: 'flex' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        {v.translation && <div style={{ fontSize: 14, color: 'var(--soft)', marginBottom: 10 }}>{v.translation}</div>}
                        {v.example && <div style={{ fontFamily: "'Spectral',serif", fontStyle: 'italic', fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 14 }}>"{v.example}"</div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: v.example || v.translation ? 0 : 12 }}>
                          <Dots count={mastery} color={mastered ? 'var(--green)' : 'var(--accent)'} />
                          <span style={{ font: "500 11px 'IBM Plex Mono'", color: mastered ? 'var(--green)' : ds.color }}>{mastered ? 'solid' : ds.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== PROGRESS TAB ===== */}
          {activeTab === 'progress' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* stat row */}
              <div className="fluo-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                <StatCard value={practiceHistory.length} label="Total sessions" color="var(--accent)" />
                <StatCard value={currentStreak} label="Day streak" color="var(--green)" />
                <StatCard value={totalPracticeMinutes} suffix="min" label="Practice time" color="var(--ink)" />
                <StatCard value={vocabularyList.length} label="Words learned" color="var(--ink)" />
              </div>

              {/* weekly activity */}
              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px var(--shadow)', padding: '16px 26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>This week</div>
                  <div style={{ font: "500 11px 'IBM Plex Mono'", color: 'var(--muted)' }}>{wk.total} min total</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 64 }}>
                  {wk.days.map((d, i) => {
                    const isToday = i === wk.todayIdx;
                    const has = d.min > 0;
                    const h = has ? Math.max(12, Math.round((d.min / maxMin) * 100)) : 8;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: '100%', maxWidth: 46, height: `${h}%`, borderRadius: '6px 6px 0 0',
                          background: isToday && has ? 'var(--accent)' : has ? 'var(--accent-bg)' : 'var(--border-2)',
                          border: has && !isToday ? '1px solid var(--accent)' : 'none',
                        }} />
                        <span style={{ font: `${isToday ? 600 : 500} 11px 'IBM Plex Mono'`, color: isToday ? 'var(--accent)' : 'var(--muted)' }}>{dayLabels[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* two columns */}
              <div className="fluo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                {/* recent sessions */}
                <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px var(--shadow)', padding: '22px 24px' }}>
                  <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 17, color: 'var(--ink)', marginBottom: 16 }}>Recent sessions</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                    {practiceHistory.length === 0 ? (
                      <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>No sessions yet.</div>
                    ) : practiceHistory.slice(0, 12).map((s) => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--panel-3)', border: '1px solid var(--border)', borderRadius: 9, padding: '13px 16px' }}>
                        <div>
                          <div style={{ font: "600 14px 'IBM Plex Sans'", color: 'var(--ink)', textTransform: 'capitalize' }}>{(modes.find((m) => m.id === s.mode) || { name: s.mode }).name}</div>
                          <div style={{ font: "400 12px 'IBM Plex Sans'", color: 'var(--muted)', marginTop: 2 }}>{s.topic} · {s.level}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 16, color: s.duration ? 'var(--green)' : 'var(--muted)' }}>{s.duration || 0} min</div>
                          <div style={{ font: "500 11px 'IBM Plex Mono'", color: 'var(--muted)', marginTop: 2 }}>{fmtDate(s.date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* weak areas */}
                <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px var(--shadow)', padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>Weak areas</div>
                    <button onClick={() => setShowErrorForm(true)} style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)', color: 'var(--accent)', font: "500 12px 'IBM Plex Sans'", padding: '6px 12px', borderRadius: 7, cursor: 'pointer' }}>+ Add error</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                    {commonErrors.length === 0 ? (
                      <div style={{ color: 'var(--muted)', fontSize: 13, padding: '8px 0' }}>No mistakes logged yet. Grammar mode saves corrections automatically.</div>
                    ) : commonErrors.slice(0, 12).map((err, idx) => (
                      <div key={err.id || idx} style={{ background: 'var(--panel-3)', border: '1px solid var(--border)', borderRadius: 9, padding: '13px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 10 }}>
                          <span style={{ font: "600 14px 'IBM Plex Sans'", color: 'var(--ink)' }}>{err.explanation || `${err.mode || 'Mistake'} · ${err.level || ''}`}</span>
                          <span style={{ font: "500 11px 'IBM Plex Mono'", color: 'var(--accent)', background: 'var(--accent-bg)', borderRadius: 5, padding: '3px 8px', flex: '0 0 auto', textTransform: 'capitalize' }}>{err.mode || 'manual'}</span>
                        </div>
                        <div style={{ font: "400 12.5px 'IBM Plex Sans'", color: 'var(--muted)' }}>
                          <span style={{ textDecoration: 'line-through' }}>{err.original}</span>
                          {' → '}
                          <span style={{ color: 'var(--green)', fontStyle: 'italic', fontFamily: "'Spectral',serif" }}>{err.correct}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* data backup / restore */}
              {/* Naturalness — deliberately its own section, not folded into accuracy.
                  Reach leads: a score that only counts mistakes rewards avoidance. */}
              {natFindings.length > 0 && (() => {
                const rows = nat.scoring.byCategory(natFindings);
                const all = nat.scoring.overall(natFindings);
                return (
                  <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px var(--shadow)', padding: '22px 24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>Naturalness</div>
                      <div style={{ font: "400 11.5px 'IBM Plex Sans'", color: 'var(--faint)' }}>separate from grammar accuracy</div>
                    </div>
                    <div style={{ font: "400 12px 'IBM Plex Sans'", color: 'var(--muted)', marginBottom: 18 }}>
                      Reach is the number that matters: of the openings that were there, how many you took.
                    </div>

                    <div style={{ display: 'flex', gap: 34, marginBottom: 22, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 34, lineHeight: 1, color: 'var(--accent)' }}>
                          {all.reachPct === null ? '—' : `${all.reachPct}%`}
                        </div>
                        <div style={{ font: "500 11px 'IBM Plex Sans'", color: 'var(--muted)', marginTop: 8 }}>Openings taken</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 34, lineHeight: 1, color: 'var(--ink)' }}>
                          {all.hitScore === null ? '—' : all.hitScore}
                        </div>
                        <div style={{ font: "500 11px 'IBM Plex Sans'", color: 'var(--muted)', marginTop: 8 }}>Hit rate when you tried</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 34, lineHeight: 1, color: 'var(--ink)' }}>{natFindings.length}</div>
                        <div style={{ font: "500 11px 'IBM Plex Sans'", color: 'var(--muted)', marginTop: 8 }}>Answers logged</div>
                      </div>
                    </div>

                    {rows.sort((a, b) => (a.reach.pct ?? 101) - (b.reach.pct ?? 101)).map((r) => (
                      <div key={r.categoryId} style={{ padding: '11px 0', borderTop: '1px solid var(--border-2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 7 }}>
                          <span style={{ font: "600 13.5px 'IBM Plex Sans'", color: 'var(--ink)' }}>{r.label}</span>
                          <span style={{ font: "400 11.5px 'IBM Plex Mono'", color: 'var(--faint)' }}>
                            {r.reach.openings > 0 ? `${r.reach.taken}/${r.reach.openings} openings` : `${r.total} answers`}
                            {' · '}
                            {r.hit.enough ? `hit ${r.hit.score}` : `hit: ${r.hit.observations}/${nat.scoring.MIN_OBSERVATIONS} needed`}
                          </span>
                        </div>
                        <div style={{ height: 7, borderRadius: 999, background: 'var(--field)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${r.reach.pct ?? 0}%`, height: '100%', borderRadius: 999,
                            background: 'var(--accent)', transition: 'width .3s',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 1px 3px var(--shadow)', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div>
                  <div style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 17, color: 'var(--ink)' }}>Data backup</div>
                  <div style={{ font: "400 12.5px 'IBM Plex Sans'", color: 'var(--muted)', marginTop: 4, maxWidth: 540, lineHeight: 1.5 }}>
                    Save or restore a full backup of your vocabulary, streak, history, weak areas and settings. Your data lives in this browser — use this to keep a copy or to move everything if the app's web address changes.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flex: '0 0 auto' }}>
                  <button onClick={handleBackup} style={{ background: 'var(--accent)', border: 'none', color: 'var(--accent-ink)', font: "600 13.5px 'IBM Plex Sans'", padding: '9px 18px', borderRadius: 8, cursor: 'pointer' }}>Back up</button>
                  <button onClick={() => fileInputRef.current?.click()} style={{ background: 'var(--field)', border: '1px solid var(--border)', color: 'var(--soft)', font: "500 13.5px 'IBM Plex Sans'", padding: '9px 18px', borderRadius: 8, cursor: 'pointer' }}>Restore</button>
                  <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleRestoreFile} style={{ display: 'none' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error form modal */}
        {showErrorForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setShowErrorForm(false)}>
            <div style={{ ...vars, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, maxWidth: 420, width: '100%' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontFamily: "'Spectral',serif", fontWeight: 600, fontSize: 19, color: 'var(--ink)', margin: '0 0 18px' }}>Add error manually</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[['original', 'Your mistake', 'What did you write incorrectly?'], ['correct', 'Correct version', "What's the correct way to say it?"], ['explanation', 'Explanation', 'Why was it wrong?']].map(([key, label, ph]) => (
                  <div key={key}>
                    <div style={labelStyle}>{label}</div>
                    <input
                      type="text"
                      value={newErrorData[key]}
                      onChange={(e) => setNewErrorData({ ...newErrorData, [key]: e.target.value })}
                      placeholder={ph}
                      style={{ width: '100%', background: 'var(--input)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '11px 13px', fontSize: 14, color: 'var(--ink)', outline: 'none', fontFamily: "'IBM Plex Sans',sans-serif" }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
                <button
                  onClick={() => {
                    if (!newErrorData.original || !newErrorData.correct || !newErrorData.explanation) {
                      alert('Please fill in all fields');
                      return;
                    }
                    const newError = {
                      id: Date.now(), date: new Date().toISOString(), language: selectedLanguage,
                      level: proficiencyLevel, mode: practiceMode || 'manual', ...newErrorData,
                    };
                    const updatedErrors = [newError, ...commonErrors].slice(0, 50);
                    setCommonErrors(updatedErrors);
                    localStorage.setItem(`errors-${selectedLanguage}`, JSON.stringify(updatedErrors));
                    setNewErrorData({ original: '', correct: '', explanation: '' });
                    setShowErrorForm(false);
                  }}
                  style={{ flex: 1, background: 'var(--accent)', color: 'var(--accent-ink)', border: 'none', font: "600 14px 'IBM Plex Sans'", padding: '11px', borderRadius: 8, cursor: 'pointer' }}
                >
                  Add error
                </button>
                <button
                  onClick={() => { setNewErrorData({ original: '', correct: '', explanation: '' }); setShowErrorForm(false); }}
                  style={{ flex: 1, background: 'var(--field)', color: 'var(--soft)', border: '1px solid var(--border)', font: "500 14px 'IBM Plex Sans'", padding: '11px', borderRadius: 8, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PasswordGate>
  );
}
