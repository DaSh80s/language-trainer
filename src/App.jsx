import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, MessageSquare, GraduationCap, Trash2, RotateCcw, TrendingUp, Award, Volume2, Download, Brain, Zap, Target, Calendar, RefreshCw, AlertCircle } from 'lucide-react';

export default function LanguagePracticeApp() {
  // Core state
  const [selectedLanguage, setSelectedLanguage] = useState('German');
  const [proficiencyLevel, setProficiencyLevel] = useState('C2');
  const [practiceMode, setPracticeMode] = useState('grammar'); // Grammar mode by default
  const [topicFilter, setTopicFilter] = useState('general');
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('practice');
  const [darkMode, setDarkMode] = useState(true); // Dark mode by default
  
  // Data state
  const [vocabularyList, setVocabularyList] = useState([]);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [commonErrors, setCommonErrors] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [totalPracticeMinutes, setTotalPracticeMinutes] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  const conversationEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load all data on mount
  useEffect(() => {
    loadAllData();
  }, [selectedLanguage]);

  // Track session time every minute
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
      }, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    } else {
      setCurrentSessionTime(0);
    }
  }, [sessionStartTime]);

  const getCurrentSessionMinutes = () => {
    return currentSessionTime;
  };

  // Simple markdown renderer
  const renderMarkdown = (text) => {
    if (!text) return '';
    
    let rendered = text;
    
    // Convert **bold** to <strong> (must come before single asterisks)
    rendered = rendered.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert headers
    rendered = rendered.replace(/^### (.+)$/gm, '<div style="font-size: 1.1em; font-weight: bold; margin: 8px 0 4px 0;">$1</div>');
    rendered = rendered.replace(/^## (.+)$/gm, '<div style="font-size: 1.2em; font-weight: bold; margin: 10px 0 5px 0;">$1</div>');
    rendered = rendered.replace(/^# (.+)$/gm, '<div style="font-size: 1.3em; font-weight: bold; margin: 12px 0 6px 0;">$1</div>');
    
    // Convert bullet points (- or • at start of line)
    rendered = rendered.replace(/^[•-]\s+(.+)$/gm, '<div style="margin-left: 20px; margin-top: 2px;">• $1</div>');
    
    // Convert numbered lists
    rendered = rendered.replace(/^\d+\.\s+(.+)$/gm, '<div style="margin-left: 20px; margin-top: 2px;">$&</div>');
    
    // Convert line breaks to <br>
    rendered = rendered.replace(/\n/g, '<br>');
    
    return rendered;
  };

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Auto-focus input after conversation updates
    if (conversation.length > 0 && !isLoading) {
      inputRef.current?.focus();
    }
  }, [conversation, isLoading]);

  const loadAllData = () => {
    try {
      const vocab = localStorage.getItem(`vocab-${selectedLanguage}`);
      if (vocab) setVocabularyList(JSON.parse(vocab));

      const history = localStorage.getItem(`history-${selectedLanguage}`);
      if (history) setPracticeHistory(JSON.parse(history));

      const errors = localStorage.getItem(`errors-${selectedLanguage}`);
      if (errors) setCommonErrors(JSON.parse(errors));

      const achievements = localStorage.getItem('achievements');
      if (achievements) setAchievements(JSON.parse(achievements));

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

  const saveVocabulary = (vocab) => {
    localStorage.setItem(`vocab-${selectedLanguage}`, JSON.stringify(vocab));
  };

  const savePracticeHistory = (history) => {
    localStorage.setItem(`history-${selectedLanguage}`, JSON.stringify(history));
  };

  const saveCommonErrors = (errors) => {
    localStorage.setItem(`errors-${selectedLanguage}`, JSON.stringify(errors));
  };

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

  const getSystemPrompt = () => {
    const levels = {
      'A1': 'complete beginner', 'A2': 'elementary', 'B1': 'intermediate',
      'B2': 'upper intermediate', 'C1': 'advanced', 'C2': 'mastery/native-like'
    };
    
    const topicContext = topicFilter !== 'general' ? `Topic: ${topicFilter}.` : '';
    
    const modes = {
      'conversation': `Chat in ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext} Keep responses SHORT. After each exchange: ✓ corrections ✓ 1-2 alternatives ✓ 1-2 new words. Use emojis 👍`,
      
      'grammar': `Grammar practice for ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext}

${usedSentences.length > 0 ? `IMPORTANT: Do NOT repeat these English sentences you already gave:\n${usedSentences.slice(-10).join('\n')}\n\n` : ''}

${isDrilling ? `DRILLING MODE 🎯: Focus ONLY on this grammar point:\n${drillingContext}\nGive similar practice sentences targeting this same concept.\n\n` : ''}

ONE question at a time. Format:
1. Explain concept (1-2 sentences) 📚
2. Give ONE English sentence to translate to ${selectedLanguage}
3. Wait for answer
4. Give: ✓ correct translation ✓ brief explanation ✓ 1 example

${isDrilling ? 'After feedback on a MISTAKE, ask: "Another drill on this? (Y/N)"' : 'ONLY if user makes a MISTAKE/ERROR, ask: "Drill this more? (Y/N)". If answer is CORRECT, do NOT ask - just give next exercise.'}

Keep it SHORT and snappy. Use emojis.`,
      
      'vocabulary': `Teach ${selectedLanguage} vocabulary (${levels[proficiencyLevel]}). ${topicContext} Give 5 words with: word, IPA, example. Then ask user to make sentences. Keep feedback SHORT. Use emojis 📖`,
      
      'translation': `Translation drills for ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext} Give 3-5 sentences. Alternate directions. SHORT feedback with emojis ✓`,
      
      'listening': `Listening practice for ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext} Describe a scenario, ask 2-3 questions. Keep it SHORT. Use emojis 👂`,
      
      'pronunciation': `Pronunciation for ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext} Give words with IPA, explain sounds BRIEFLY, practice. Use emojis 🗣️`,
      
      'weakAreas': `Target weak areas in ${selectedLanguage} (${levels[proficiencyLevel]}). ${topicContext} Focus on errors. SHORT exercises. Use emojis 🎯`
    };
    
    return modes[practiceMode] || '';
  };

  const callClaudeAPI = async (messages) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        messages: messages,
        system: getSystemPrompt()
      })
    });

    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();
    return data.content.filter(item => item.type === 'text').map(item => item.text).join('\n');
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !practiceMode) return;

    // Check for drill mode commands (Y/N)
    const input = userInput.trim().toLowerCase();
    if (input === 'y' || input === 'yes') {
      setIsDrilling(true);
      setUserInput('');
      
      // Automatically trigger next drill question
      setIsLoading(true);
      try {
        const drillPrompt = { 
          role: 'user', 
          content: 'Give me another practice sentence on this same concept.' 
        };
        const apiMessages = [...conversation.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })), drillPrompt];
        
        const response = await callClaudeAPI(apiMessages);
        setConversation([...conversation, drillPrompt, { role: 'assistant', content: response }]);
        
        // Extract sentence
        if (response.toLowerCase().includes('translate')) {
          const match = response.match(/"([^"]+)"/);
          if (match && match[1]) {
            setUsedSentences(prev => [...prev, match[1]].slice(-20));
          }
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
      
      // Automatically trigger next normal question
      setIsLoading(true);
      try {
        const nextPrompt = { 
          role: 'user', 
          content: 'Give me the next grammar exercise (different concept).' 
        };
        const apiMessages = [...conversation.map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        })), nextPrompt];
        
        const response = await callClaudeAPI(apiMessages);
        setConversation([...conversation, nextPrompt, { role: 'assistant', content: response }]);
        
        // Extract sentence
        if (response.toLowerCase().includes('translate')) {
          const match = response.match(/"([^"]+)"/);
          if (match && match[1]) {
            setUsedSentences(prev => [...prev, match[1]].slice(-20));
          }
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

    try {
      const apiMessages = updated.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));
      
      const response = await callClaudeAPI(apiMessages);
      setConversation([...updated, { role: 'assistant', content: response }]);
      
      // Extract drilling context if error detected
      if (practiceMode === 'grammar' && !isDrilling && (response.toLowerCase().includes('correct') || response.toLowerCase().includes('mistake'))) {
        // Extract the grammar concept from the response
        const conceptMatch = response.match(/(?:concept|rule|point).*?:\s*([^\.]+)/i);
        if (conceptMatch) {
          setDrillingContext(conceptMatch[1]);
        } else {
          // Fallback: use first sentence of explanation
          const lines = response.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            setDrillingContext(lines[0].substring(0, 100));
          }
        }
      }
      
      // Extract and track English sentences to avoid repetition
      if (practiceMode === 'grammar' && response.toLowerCase().includes('translate')) {
        const match = response.match(/"([^"]+)"/);
        if (match && match[1]) {
          setUsedSentences(prev => [...prev, match[1]].slice(-20)); // Keep last 20
        }
      }
    } catch (error) {
      console.error('API error:', error);
      setConversation([...updated, { role: 'assistant', content: 'Error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPractice = async () => {
    if (!practiceMode) return;

    setConversation([]);
    setIsLoading(true);
    setSessionStartTime(Date.now());
    setUsedSentences([]); // Clear used sentences for new session
    setIsDrilling(false); // Reset drilling mode
    setDrillingContext('');
    
    // Update streak at start of session
    await updateStreak();

    const newSession = {
      id: Date.now(),
      date: new Date().toISOString(),
      mode: practiceMode,
      topic: topicFilter,
      level: proficiencyLevel,
      duration: 0
    };

    const updatedHistory = [newSession, ...practiceHistory].slice(0, 100);
    setPracticeHistory(updatedHistory);
    savePracticeHistory(updatedHistory);

    try {
      const prompts = {
        'conversation': topicFilter === 'general' ? 'Start a conversation.' : `Talk about ${topicFilter}.`,
        'grammar': 'Give me a grammar exercise.',
        'vocabulary': 'Teach me new vocabulary.',
        'translation': 'Give me translation exercises.',
        'listening': 'Give me a listening exercise.',
        'pronunciation': 'Help me with pronunciation.',
        'weakAreas': 'Focus on my weak areas.'
      };
      
      const response = await callClaudeAPI([{ role: 'user', content: prompts[practiceMode] }]);
      setConversation([{ role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Start error:', error);
      let errorMsg = 'Error starting session.';
      if (error.message.includes('rate')) {
        errorMsg = 'Rate limit reached. Please wait a minute and try again.';
      } else if (error.message.includes('network')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      }
      setConversation([{ role: 'assistant', content: errorMsg + ' (Error: ' + error.message + ')' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionStartTime) {
      setConversation([]);
      return;
    }

    // Calculate session duration
    const minutes = Math.floor((Date.now() - sessionStartTime) / 60000);
    const newTotal = totalPracticeMinutes + minutes;
    setTotalPracticeMinutes(newTotal);
    localStorage.setItem('total-practice-time', newTotal.toString());

    // Update session duration in history
    if (practiceHistory.length > 0) {
      const updated = [...practiceHistory];
      updated[0].duration = minutes;
      setPracticeHistory(updated);
      savePracticeHistory(updated);
    }

    // Get grade from Claude
    if (conversation.length > 2) { // Only grade if there was actual practice
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
          ...conversation.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
          })),
          { role: 'user', content: gradePrompt }
        ]);

        setConversation([...conversation, { role: 'assistant', content: gradeResponse }]);
        setIsLoading(false);
        
        // DON'T clear immediately - let user read the grade
        // Session will stay active with grade visible
        // User can start a new session when ready
        setSessionStartTime(null);
      } catch (error) {
        console.error('Grading error:', error);
        setConversation([...conversation, { role: 'assistant', content: '⚠️ Could not generate grade. Session ended.' }]);
        setIsLoading(false);
        setSessionStartTime(null);
      }
    } else {
      // No grade needed, just clear immediately
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
      id: Date.now(),
      word,
      translation,
      example,
      dateAdded: new Date().toISOString(),
      nextReview: new Date().toISOString(),
      reviewCount: 0
    };
    
    const updated = [...vocabularyList, newVocab];
    setVocabularyList(updated);
    saveVocabulary(updated);
  };

  const handleDeleteVocab = (id) => {
    const updated = vocabularyList.filter(v => v.id !== id);
    setVocabularyList(updated);
    saveVocabulary(updated);
  };

  const handleExportVocab = () => {
    const csv = 'Word,Translation,Example,Date\n' +
      vocabularyList.map(v => `"${v.word}","${v.translation}","${v.example}","${new Date(v.dateAdded).toLocaleDateString()}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedLanguage}-vocabulary.csv`;
    a.click();
  };

  const languages = ['German', 'Spanish', 'Portuguese', 'French', 'Italian', 'Hebrew', 'Arabic', 'Mandarin Chinese', 'Japanese', 'Korean', 'Russian', 'Dutch', 'Swedish', 'Turkish', 'Polish'];
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const modes = [
    { id: 'conversation', name: 'Conversation', icon: MessageSquare },
    { id: 'grammar', name: 'Grammar', icon: GraduationCap },
    { id: 'vocabulary', name: 'Vocabulary', icon: BookOpen },
    { id: 'translation', name: 'Translation', icon: RefreshCw },
    { id: 'listening', name: 'Listening', icon: Volume2 },
    { id: 'pronunciation', name: 'Pronunciation', icon: Volume2 },
    { id: 'weakAreas', name: 'Weak Areas', icon: Target }
  ];
  const topics = ['general', 'business', 'travel', 'culture', 'technology', 'food', 'sports', 'health', 'education', 'entertainment'];

  return (
    <div className={`min-h-screen p-4 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`rounded-lg shadow-lg p-6 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>D's Language Trainer v. 1.3 🧠🏋️</h1>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>AI-powered learning • Defaults to German C2 Grammar</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`px-4 py-2 rounded-md font-medium ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-200 text-gray-700'}`}
                title="Toggle dark mode"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <div className="text-center">
                <div className={`flex items-center gap-2 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                  <Zap className="w-5 h-5" />
                  <span className="text-2xl font-bold">{currentStreak}</span>
                </div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>day streak</p>
              </div>
              <div className="text-center">
                <div className={`flex items-center gap-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                  <Calendar className="w-5 h-5" />
                  <span className="text-2xl font-bold">{totalPracticeMinutes + getCurrentSessionMinutes()}</span>
                </div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>minutes{sessionStartTime ? ' (live)' : ''}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`rounded-lg shadow-lg p-4 mb-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex gap-2 flex-wrap">
            {['practice', 'vocabulary', 'progress'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-md font-medium ${
                  activeTab === tab 
                    ? 'bg-blue-600 text-white' 
                    : darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Practice Tab */}
        {activeTab === 'practice' && (
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-6">
            {/* Sidebar - Setup Controls */}
            <div className={`sm:col-span-1 rounded-lg shadow-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ height: 'fit-content' }}>
              <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : ''}`}>Setup</h2>
              
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : ''}`}>Language</label>
                  <select value={selectedLanguage} onChange={(e) => setSelectedLanguage(e.target.value)} className={`w-full px-3 py-2 border rounded-md text-sm ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}>
                    {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : ''}`}>Level</label>
                  <select value={proficiencyLevel} onChange={(e) => setProficiencyLevel(e.target.value)} className={`w-full px-3 py-2 border rounded-md text-sm ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}>
                    {levels.map(level => <option key={level} value={level}>{level}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : ''}`}>Topic</label>
                  <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className={`w-full px-3 py-2 border rounded-md text-sm ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}>
                    {topics.map(topic => <option key={topic} value={topic}>{topic.charAt(0).toUpperCase() + topic.slice(1)}</option>)}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-300' : ''}`}>Mode</label>
                  <select value={practiceMode} onChange={(e) => setPracticeMode(e.target.value)} className={`w-full px-3 py-2 border rounded-md text-sm ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}>
                    <option value="">Select...</option>
                    {modes.map(mode => <option key={mode.id} value={mode.id}>{mode.name}</option>)}
                  </select>
                </div>

                <button
                  onClick={handleStartPractice}
                  disabled={!practiceMode || isLoading}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-green-500 hover:scale-105 active:scale-95 active:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-150 text-sm shadow-md hover:shadow-lg"
                >
                  {isLoading ? 'Starting...' : 'Start Session'}
                </button>
                
                {conversation.length > 0 && (
                  <button 
                    onClick={handleEndSession} 
                    className={`w-full text-sm flex items-center justify-center gap-2 px-4 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} transition-colors`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    End Session
                  </button>
                )}
              </div>
            </div>

            {/* Main Practice Area */}
            <div className={`sm:col-span-5 rounded-lg shadow-lg p-4 flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ maxHeight: 'calc(100vh - 220px)', minHeight: '500px' }}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : ''}`}>Practice Session</h2>
                  {isDrilling && (
                    <span className={`text-sm ${darkMode ? 'text-orange-400' : 'text-orange-600'} font-medium`}>
                      🎯 DRILLING MODE - Focused practice
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mb-2 space-y-2">
                {conversation.length === 0 && !isLoading ? (
                  <div className={`py-8 flex items-center justify-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <p>Select mode and start a session</p>
                  </div>
                ) : conversation.length === 0 && isLoading ? (
                  <div className={`py-8 flex items-center justify-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-2">
                        <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-600'}`}></div>
                        <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-600'}`} style={{ animationDelay: '0.1s' }}></div>
                        <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-600'}`} style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span>Starting session...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {conversation.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`w-full px-4 py-2 rounded-lg ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : darkMode 
                              ? 'bg-gray-700 text-gray-100' 
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          <div 
                            className="whitespace-pre-wrap text-sm"
                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                          />
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className="flex space-x-2">
                            <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-400'}`}></div>
                            <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-400'}`} style={{ animationDelay: '0.1s' }}></div>
                            <div className={`w-2 h-2 rounded-full animate-bounce ${darkMode ? 'bg-gray-400' : 'bg-gray-400'}`} style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={conversationEndRef} />
                  </>
                )}
              </div>

              <div className="flex gap-2 mt-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={conversation.length === 0 ? "Start a session first..." : "Type your response..."}
                  disabled={conversation.length === 0 || isLoading}
                  className={`flex-1 px-4 py-2 border rounded-md ${darkMode ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400' : ''}`}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!userInput.trim() || conversation.length === 0 || isLoading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vocabulary Tab */}
        {activeTab === 'vocabulary' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{selectedLanguage} Vocabulary ({vocabularyList.length})</h2>
              <div className="flex gap-2">
                <button onClick={handleExportVocab} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm flex items-center">
                  <Download className="w-4 h-4 mr-1" />
                  Export
                </button>
                <button onClick={handleAddVocab} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm">
                  + Add Word
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {vocabularyList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No vocabulary yet. Start learning!</p>
              ) : (
                vocabularyList.map(v => (
                  <div key={v.id} className="p-4 bg-gray-50 rounded-md flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-bold text-lg">{v.word}</div>
                      {v.translation && <div className="text-gray-700">{v.translation}</div>}
                      {v.example && <div className="text-sm text-gray-600 italic mt-1">"{v.example}"</div>}
                      <div className="text-xs text-gray-500 mt-2">Added: {new Date(v.dateAdded).toLocaleDateString()}</div>
                    </div>
                    <button onClick={() => handleDeleteVocab(v.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`rounded-lg shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold mb-4 flex items-center ${darkMode ? 'text-white' : ''}`}>
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Statistics
                </h2>
                <div className="space-y-4">
                  <div className={`flex justify-between p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                    <span className={darkMode ? 'text-gray-300' : ''}>Total Sessions</span>
                    <span className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{practiceHistory.length}</span>
                  </div>
                  <div className={`flex justify-between p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
                    <span className={darkMode ? 'text-gray-300' : ''}>Current Streak</span>
                    <span className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{currentStreak} days</span>
                  </div>
                  <div className={`flex justify-between p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-purple-50'}`}>
                    <span className={darkMode ? 'text-gray-300' : ''}>Practice Time</span>
                    <span className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{totalPracticeMinutes} min</span>
                  </div>
                  <div className={`flex justify-between p-4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-yellow-50'}`}>
                    <span className={darkMode ? 'text-gray-300' : ''}>Vocabulary</span>
                    <span className={`text-2xl font-bold ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{vocabularyList.length}</span>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : ''}`}>Recent Sessions</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {practiceHistory.slice(0, 20).map(session => (
                    <div key={session.id} className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <div className="flex justify-between">
                        <div>
                          <p className={`font-semibold capitalize ${darkMode ? 'text-white' : ''}`}>{session.mode}</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{session.topic} • {session.level}</p>
                        </div>
                        <div className={`text-right text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          {new Date(session.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weak Areas Flashcard Review */}
            <div className={`rounded-lg shadow-lg p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-xl font-semibold flex items-center ${darkMode ? 'text-white' : ''}`}>
                  <AlertCircle className="w-5 h-5 mr-2 text-orange-500" />
                  Weak Areas - Review Your Mistakes 🎯
                </h2>
                <button
                  onClick={() => setShowErrorForm(true)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${darkMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-500 hover:bg-orange-600'} text-white transition-colors`}
                >
                  + Add Error Manually
                </button>
              </div>

              {/* Error Form Modal */}
              {showErrorForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowErrorForm(false)}>
                  <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={(e) => e.stopPropagation()}>
                    <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : ''}`}>Add Error Manually</h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : ''}`}>Your mistake:</label>
                        <input
                          type="text"
                          value={newErrorData.original}
                          onChange={(e) => setNewErrorData({...newErrorData, original: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-md ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                          placeholder="What did you write incorrectly?"
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : ''}`}>Correct version:</label>
                        <input
                          type="text"
                          value={newErrorData.correct}
                          onChange={(e) => setNewErrorData({...newErrorData, correct: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-md ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                          placeholder="What's the correct way to say it?"
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : ''}`}>Explanation:</label>
                        <input
                          type="text"
                          value={newErrorData.explanation}
                          onChange={(e) => setNewErrorData({...newErrorData, explanation: e.target.value})}
                          className={`w-full px-3 py-2 border rounded-md ${darkMode ? 'bg-gray-700 text-white border-gray-600' : ''}`}
                          placeholder="Why was it wrong?"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => {
                          if (!newErrorData.original || !newErrorData.correct || !newErrorData.explanation) {
                            alert('Please fill in all fields');
                            return;
                          }
                          
                          const newError = {
                            id: Date.now(),
                            date: new Date().toISOString(),
                            language: selectedLanguage,
                            level: proficiencyLevel,
                            mode: practiceMode || 'manual',
                            ...newErrorData
                          };
                          
                          const updatedErrors = [newError, ...commonErrors].slice(0, 50);
                          setCommonErrors(updatedErrors);
                          
                          localStorage.setItem(`errors-${selectedLanguage}`, JSON.stringify(updatedErrors));
                          
                          setNewErrorData({ original: '', correct: '', explanation: '' });
                          setShowErrorForm(false);
                        }}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium"
                      >
                        Add Error
                      </button>
                      <button
                        onClick={() => {
                          setNewErrorData({ original: '', correct: '', explanation: '' });
                          setShowErrorForm(false);
                        }}
                        className={`flex-1 px-4 py-2 rounded-md font-medium ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Grammar mode saves corrections automatically. Or add errors manually for review!
              </p>
              
              {commonErrors.length === 0 ? (
                <div className={`text-center py-12 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No errors logged yet. Start practicing or add errors manually!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {commonErrors.slice(0, 12).map((error, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-red-50 border-red-200'}`}>
                      <div className="mb-2">
                        <span className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {error.mode} • {new Date(error.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className={`text-xs font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>❌ Your mistake:</p>
                          <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{error.original}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>✓ Correct:</p>
                          <p className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{error.correct}</p>
                        </div>
                        <div>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} italic`}>💡 {error.explanation}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
