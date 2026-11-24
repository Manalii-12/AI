import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  X,
  RotateCcw,
  Bot,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  Play,
  MessageSquare,
  Radio,
  HelpCircle,
  ChevronRight,
  Maximize2,
  Minimize2,
  Square,
  CreditCard,
  Truck,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { sendVoiceChat, confirmVoiceAction, getVoiceGreeting } from '../api';

export default function VoiceAssistantOverlay({ isOpen, onToggleOpen, onNavigateTo }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micError, setMicError] = useState(null);
  const [showChatAside, setShowChatAside] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [latestTurn, setLatestTurn] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [suggestedPrompts, setSuggestedPrompts] = useState([
    "Run proactive AI scan",
    "Make dispatch for ready orders",
    "Why is overdue balance pending?",
    "Why are orders getting delayed?",
    "Why do we have complaints and how to solve them?",
    "Give me today's business report",
    "Which products need restocking?",
    "What should I focus on today?"
  ]);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const transcriptAccumulatorRef = useRef('');
  const handleSendMessageRef = useRef(null);
  const inputTextRef = useRef('');

  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  // Voice speech synthesis
  const speakText = (text) => {
    if (!('speechSynthesis' in window) || !ttsEnabled || !text) return;

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      // Clean speech text
      let clean = text
        .replace(/₹\s*([0-9.,]+)/g, '$1 Rupees')
        .replace(/₹/g, ' Rupees ')
        .replace(/PO-(\d+)/g, 'Purchase Order $1')
        .replace(/HUG-(\d+)/g, 'Hugg Order $1')
        .replace(/[#*`_~>\-•]/g, ' ')
        .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!clean) return;

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const preferred = voices.find(
          (v) =>
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Jenny') ||
              v.name.includes('Guy') ||
              v.name.includes('Samantha') ||
              (v.lang.startsWith('en') && !v.name.includes('Bad')))
        );
        if (preferred) utterance.voice = preferred;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.warn('TTS error:', e);
        setIsSpeaking(false);
      };

      // Fix Chromium speech pause bug
      const resumeInterval = setInterval(() => {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        } else {
          clearInterval(resumeInterval);
        }
      }, 10000);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis exception:', err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Pre-load voices on mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Main chat/voice submission handler
  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputTextRef.current).trim();
    if (!query) return;

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
      setIsListening(false);
    }

    stopSpeaking();

    // User message
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    transcriptAccumulatorRef.current = '';
    setIsProcessing(true);

    try {
      const res = await sendVoiceChat(query, 'default_owner', true);
      const data = res.data;

      const spoken = data.spoken_response || data.speech_text || data.display_response || data.display_text;
      const display = data.display_response || data.display_text || spoken;

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: display,
        spokenText: spoken,
        intent: data.intent,
        pendingAction: data.pending_action,
        actionExecuted: data.action_executed,
        visualCard: data.visual_card,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLatestTurn({
        userQuery: query,
        aiResponse: spoken,
        displayResponse: display,
        pendingAction: data.pending_action || null,
        actionExecuted: data.action_executed || null,
        visualCard: data.visual_card || null
      });

      setPendingAction(data.pending_action || null);

      if (data.suggested_voice_prompts && data.suggested_voice_prompts.length > 0) {
        setSuggestedPrompts(data.suggested_voice_prompts);
      }

      // Voice output
      if (ttsEnabled && spoken) {
        speakText(spoken);
      }
    } catch (err) {
      console.error('Voice chat error:', err);
      const errMsg = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: "I encountered an error querying the Hugg database. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  // Action confirmation
  const handleConfirmAction = async (confirmed) => {
    setIsProcessing(true);
    stopSpeaking();

    try {
      const res = await confirmVoiceAction('default_owner', confirmed);
      const data = res.data;

      const spoken = data.spoken_response || data.speech_text || data.display_response || data.display_text;
      const display = data.display_response || data.display_text || spoken;

      const aiMsg = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: display,
        spokenText: spoken,
        actionExecuted: data.action_executed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, aiMsg]);
      setLatestTurn({
        userQuery: confirmed ? "Yes, submit it" : "Cancel action",
        aiResponse: spoken,
        displayResponse: display,
        actionExecuted: data.action_executed || null,
        visualCard: data.card || data.visual_card || null
      });

      setPendingAction(null);

      if (data.suggested_voice_prompts && data.suggested_voice_prompts.length > 0) {
        setSuggestedPrompts(data.suggested_voice_prompts);
      }

      if (ttsEnabled && spoken) {
        speakText(spoken);
      }
    } catch (err) {
      console.error('Action confirmation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Initialize Speech Recognition with Auto-Submission
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        setIsListening(true);
        transcriptAccumulatorRef.current = '';
      };

      recognition.onresult = (event) => {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
        }
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            transcriptAccumulatorRef.current += transcript + ' ';
          } else {
            interim += transcript;
          }
        }
        const combined = (transcriptAccumulatorRef.current + interim).trim();
        setInputText(combined);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError('Microphone permission blocked. Please allow mic access in your browser address bar.');
        } else if (event.error === 'no-speech') {
          setMicError('No speech was detected. Tap the mic to try again.');
        } else if (event.error === 'audio-capture') {
          setMicError('No microphone detected. Please check your PC microphone.');
        }
      };

      // When the user stops talking, automatically send!
      recognition.onend = () => {
        setIsListening(false);
        const textToSend = (transcriptAccumulatorRef.current || inputTextRef.current).trim();
        if (textToSend && textToSend.length > 1) {
          transcriptAccumulatorRef.current = '';
          setInputText('');
          if (handleSendMessageRef.current) {
            handleSendMessageRef.current(textToSend);
          }
        }
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    fetchProactiveGreeting();
  }, []);

  // Fetch proactive greeting on load
  const fetchProactiveGreeting = async () => {
    try {
      const res = await getVoiceGreeting();
      if (res.data) {
        const greetingText = res.data.spoken_greeting;
        if (res.data.suggested_prompts && res.data.suggested_prompts.length > 0) {
          setSuggestedPrompts(res.data.suggested_prompts);
        }
        const initialMsg = {
          id: 'init-1',
          sender: 'ai',
          text: greetingText,
          spokenText: greetingText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([initialMsg]);
        setLatestTurn({
          userQuery: null,
          aiResponse: greetingText,
          displayResponse: greetingText
        });
      }
    } catch (err) {
      console.warn('Failed to fetch proactive greeting:', err);
      const fallback = "Hello Aarav. I am your Hugg AI Business Assistant. How can I help you today?";
      setMessages([
        {
          id: 'init-1',
          sender: 'ai',
          text: fallback,
          spokenText: fallback,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setLatestTurn({
        userQuery: null,
        aiResponse: fallback,
        displayResponse: fallback
      });
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);

  // Mic click handler
  const toggleListening = () => {
    if (!speechSupported) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (err) {
        // Ignore
      }
      setIsListening(false);
    } else {
      setMicError(null);
      stopSpeaking();
      transcriptAccumulatorRef.current = '';
      setInputText('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  const testAudio = () => {
    speakText("Hugg voice audio system is operational and ready to answer your questions.");
  };

  return (
    <>
      {/* Floating Microphone Trigger (Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {!isOpen && (
          <div
            onClick={() => {
              if ('speechSynthesis' in window) window.speechSynthesis.resume();
              onToggleOpen();
            }}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FFFFFF] border border-[#E5ECE7] text-[#111827] text-xs font-semibold shadow-md backdrop-blur-md cursor-pointer hover:border-[#83B89A] hover:scale-105 transition-all animate-pulse"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#347A59]" />
            <span>Voice Copilot Active</span>
          </div>
        )}

        <button
          onClick={() => {
            if ('speechSynthesis' in window) window.speechSynthesis.resume();
            onToggleOpen();
          }}
          aria-label="Voice Copilot"
          className={`relative p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center ${
            isOpen
              ? 'bg-[#FFFFFF] text-[#111827] hover:bg-[#F4F8F5] border border-[#E5ECE7]'
              : 'bg-[#347A59] text-white hover:scale-110 shadow-lg shadow-[#347A59]/25 ring-4 ring-[#DCEFE3]'
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-[#111827]" />
          ) : (
            <>
              <Mic className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#347A59] border-2 border-white rounded-full animate-ping" />
            </>
          )}
        </button>
      </div>

      {/* Voice Assistant Window */}
      {isOpen && (
        <div
          className={
            isFullscreen
              ? 'fixed inset-0 z-50 bg-[#F4F8F5] flex flex-col overflow-hidden animate-fade-in'
              : `fixed bottom-24 right-6 max-w-[calc(100vw-2rem)] bg-[#F4F8F5] border border-[#E5ECE7] rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-fade-in ring-1 ring-[#347A59]/10 transition-all duration-300 ${
                  showChatAside
                    ? 'w-[860px] h-[660px] max-h-[calc(100vh-8rem)]'
                    : 'w-[480px] h-[640px] max-h-[calc(100vh-8rem)]'
                }`
          }
        >
          {/* Top Bar */}
          <div className="px-5 py-3.5 bg-[#FFFFFF] border-b border-[#E5ECE7] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-xl bg-[#347A59] flex items-center justify-center text-white shadow-sm">
                  <Bot className="w-4 h-4 text-[#DCEFE3]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#83B89A] border-2 border-white rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-[#111827] tracking-wide">Hugg Voice Agent</h3>
                </div>
                <p className="text-[11px] text-[#111827]">Autonomous spoken business copilot</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Interruption Button */}
              <button
                onClick={() => {
                  stopSpeaking();
                  if (isListening && recognitionRef.current) {
                    try { recognitionRef.current.stop(); } catch (e) {}
                    setIsListening(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isSpeaking
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-2 ring-rose-300 animate-pulse'
                    : 'bg-[#FDF0F1] hover:bg-[#FBE2E5] text-[#8B2E37] border border-[#F2C1C5]'
                }`}
                title="Interrupt AI speaking immediately"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{isSpeaking ? '⏹ Interrupt Speaking' : '⏹ Interrupt'}</span>
              </button>

              {/* TTS Mute */}
              <button
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setTtsEnabled(!ttsEnabled);
                }}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  ttsEnabled
                    ? 'bg-[#FFFFFF] border-[#E5ECE7] text-[#347A59] hover:bg-[#EBF4EE]'
                    : 'bg-[#F4F8F5] border-[#E5ECE7] text-[#111827]'
                }`}
                title={ttsEnabled ? 'Mute AI Voice' : 'Unmute AI Voice'}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4 text-[#347A59]" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Toggle Chat Aside */}
              <button
                onClick={() => setShowChatAside(!showChatAside)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  showChatAside
                    ? 'bg-[#347A59] text-white border-[#244B39]'
                    : 'bg-[#FFFFFF] hover:bg-[#EBF4EE] border-[#E5ECE7] text-[#111827]'
                }`}
                title="Toggle text chat and conversation history aside"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="text-[10px]">{showChatAside ? 'Hide Chat' : 'Chat Aside'}</span>
              </button>

              {/* Fullscreen Toggle (Only AI Assistant Mode) */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className={`p-1.5 rounded-lg border text-xs transition-colors ${
                  isFullscreen
                    ? 'bg-[#347A59] border-[#347A59] text-white'
                    : 'bg-[#FFFFFF] border-[#E5ECE7] text-[#111827] hover:bg-[#EBF4EE]'
                }`}
                title={isFullscreen ? 'Exit Fullscreen' : 'Pure AI Assistant Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close */}
              <button
                onClick={onToggleOpen}
                className="p-1.5 rounded-lg bg-[#FFFFFF] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 border border-[#E5ECE7] text-[#111827] transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Body: Voice Center Stage + Optional Chat Aside */}
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT / CENTER: Dedicated Voice Stage */}
            <div className="flex-1 flex flex-col items-center justify-between p-6 overflow-y-auto">
              {/* Status Header Badge */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#E5ECE7] text-xs shadow-sm">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isListening
                      ? 'bg-rose-500 animate-ping'
                      : isSpeaking
                      ? 'bg-[#347A59] animate-pulse'
                      : isProcessing
                      ? 'bg-amber-500 animate-spin'
                      : 'bg-[#347A59]'
                  }`}
                />
                <span className="font-semibold text-[#111827] text-[11px]">
                  {isListening
                    ? 'Listening... (Speak now, auto-sends when done)'
                    : isSpeaking
                    ? 'Speaking response aloud...'
                    : isProcessing
                    ? 'Analyzing operational database...'
                    : 'Voice Assistant Ready'}
                </span>
              </div>

              {/* PROMINENT CENTRAL MICROPHONE ORB */}
              <div className="my-auto flex flex-col items-center py-2">
                <div className="relative flex items-center justify-center">
                  {/* Outer Ripple Rings */}
                  {(isListening || isSpeaking) && (
                    <>
                      <div
                        className={`absolute w-36 h-36 rounded-full border-2 ${
                          isListening
                            ? 'border-rose-500/30 animate-ping'
                            : 'border-[#347A59]/30 animate-ping'
                        }`}
                        style={{ animationDuration: '2s' }}
                      />
                      <div
                        className={`absolute w-28 h-28 rounded-full border ${
                          isListening
                            ? 'border-rose-400/40 animate-pulse'
                            : 'border-[#83B89A]/40 animate-pulse'
                        }`}
                      />
                    </>
                  )}

                  {/* Central Glowing Mic Button */}
                  <button
                    onClick={toggleListening}
                    disabled={isProcessing}
                    aria-label="Tap to speak"
                    className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 transform active:scale-95 ${
                      isListening
                        ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white ring-8 ring-rose-500/30 scale-105 shadow-rose-500/40'
                        : isSpeaking
                        ? 'bg-[#244B39] text-white ring-8 ring-[#DCEFE3] shadow-lg animate-pulse'
                        : isProcessing
                        ? 'bg-[#DCEFE3] text-[#111827] ring-4 ring-[#83B89A]'
                        : 'bg-[#347A59] hover:bg-[#244B39] text-white ring-8 ring-[#DCEFE3] hover:scale-105 shadow-md shadow-[#347A59]/30'
                    }`}
                  >
                    {isListening ? (
                      <MicOff className="w-10 h-10 animate-bounce text-white" />
                    ) : isProcessing ? (
                      <Loader2 className="w-10 h-10 animate-spin text-[#111827]" />
                    ) : (
                      <Mic className="w-10 h-10 text-white" />
                    )}
                  </button>
                </div>

                {/* Subtitle / Interaction Instruction */}
                {micError ? (
                  <p className="mt-3 text-xs font-semibold text-rose-600 text-center px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 max-w-sm">
                    {micError}
                  </p>
                ) : (
                  <p className="mt-3 text-xs font-semibold text-[#111827] text-center max-w-sm truncate px-2">
                    {isListening
                      ? inputText
                        ? `🎙️ "${inputText}..."`
                        : 'Listening to you... Speak now'
                      : isSpeaking
                      ? 'Speaking response...'
                      : isProcessing
                      ? 'Consulting business intelligence...'
                      : 'Tap microphone to speak'}
                  </p>
                )}

                {/* Barge-in Voice Interruption Controls */}
                {isSpeaking ? (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => stopSpeaking()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-lg shadow-rose-600/30 ring-4 ring-rose-200 animate-pulse cursor-pointer transition-all"
                      title="Stop speaking immediately"
                    >
                      <Square className="w-3.5 h-3.5 fill-white text-white" />
                      <span>⏹ Interrupt / Stop Speaking</span>
                    </button>
                    <button
                      onClick={() => {
                        stopSpeaking();
                        toggleListening();
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-xs shadow-sm cursor-pointer transition-all"
                      title="Interrupt and speak now"
                    >
                      <Mic className="w-3.5 h-3.5 text-white" />
                      <span>Interrupt & Speak</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      stopSpeaking();
                      if (isListening) {
                        try { recognitionRef.current?.stop(); } catch(e) {}
                        setIsListening(false);
                      }
                    }}
                    className="mt-2.5 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FDF0F1] hover:bg-[#FBE2E5] border border-[#F2C1C5] text-[#8B2E37] font-bold text-[11px] cursor-pointer transition-all shadow-xs"
                    title="Interrupt or stop any active audio or listening"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>⏹ Interrupt Audio</span>
                  </button>
                )}

                {/* Animated Audio Waveform */}
                <div className="flex items-center gap-1.5 h-6 mt-2">
                  {[0.4, 0.9, 0.6, 1.0, 0.5, 0.8, 0.7, 0.3].map((heightRatio, i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        isListening
                          ? 'bg-rose-500 animate-pulse'
                          : isSpeaking
                          ? 'bg-[#347A59] animate-pulse'
                          : 'bg-[#DCEFE3]'
                      }`}
                      style={{
                        height: isListening || isSpeaking ? `${heightRatio * 24}px` : '4px',
                        animationDelay: `${i * 90}ms`
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* LIVE SPOKEN RESPONSE & DIALOGUE CARD */}
              {latestTurn && (
                <div className="w-full bg-[#FFFFFF] border border-[#E5ECE7] rounded-2xl p-4 shadow-sm mb-3">
                  {latestTurn.userQuery && (
                    <div className="flex items-start gap-2 mb-2 pb-2 border-b border-[#E5ECE7]">
                      <User className="w-3.5 h-3.5 text-[#111827] mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-[#111827] font-medium italic">
                        "{latestTurn.userQuery}"
                      </p>
                    </div>
                  )}

                  <div className="flex items-start gap-2.5">
                    <Bot className="w-4 h-4 text-[#347A59] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-[#111827] leading-relaxed font-sans">
                        {latestTurn.aiResponse}
                      </p>

                      {/* 2-Way Action Proposal */}
                      {pendingAction && (
                        <div className="mt-3 p-3 rounded-xl bg-[#F4F8F5] border border-[#E5ECE7] text-left shadow-sm animate-fade-in">
                          <div className="flex items-center gap-1.5 text-[#111827] font-bold mb-1 text-[11px]">
                            <Sparkles className="w-3.5 h-3.5 text-[#347A59]" />
                            <span>Recommended System Implementation</span>
                          </div>
                          <div className="text-[11px] text-[#111827] mb-2.5 leading-relaxed">
                            {pendingAction.action_type === 'RESOLVE_COMPLAINT_REPLACEMENT' ? (
                              <span>
                                Authorize free priority replacement delivery and resolve urgent complaint{' '}
                                <strong>{pendingAction.params?.complaint_number || 'ticket'}</strong> for{' '}
                                <strong>{pendingAction.params?.customer_name || 'Customer'}</strong>.
                              </span>
                            ) : pendingAction.action_type === 'SEND_PAYMENT_REMINDERS' || pendingAction.action_type === 'SEND_PAYMENT_REMINDER' ? (
                              <span>
                                Issue 1-click WhatsApp and Email payment recovery links to unsettled wholesale accounts (Amount: ${pendingAction.params?.uncollected_amount?.toLocaleString() || pendingAction.params?.amount?.toLocaleString()}).
                              </span>
                            ) : pendingAction.action_type === 'UPDATE_ORDER_STATUS' ? (
                              <span>
                                Update Order <strong>{pendingAction.params?.order_number}</strong> status to{' '}
                                <strong>{pendingAction.params?.new_status}</strong>.
                              </span>
                            ) : (
                              <span>
                                Purchase Order for{' '}
                                <strong>{pendingAction.params?.quantity || pendingAction.units || 250} units</strong> of{' '}
                                <strong>{pendingAction.params?.product_name || pendingAction.product_name || 'Product'}</strong> from{' '}
                                <strong>{pendingAction.params?.supplier_name || pendingAction.supplier_name || 'Supplier'}</strong>
                                {pendingAction.action_type === 'CREATE_PO_AND_ESCALATE_DELAYS' && ' + Escalate Courier Dispatches'}.
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[#111827] mb-2 italic">
                            👉 Speak "Yes" or "Do that way" into the mic, or tap below to execute:
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfirmAction(true)}
                              disabled={isProcessing}
                              className="flex-1 py-1.5 rounded-lg bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1 shadow-md shadow-[#347A59]/20"
                            >
                              <CheckCircle className="w-3 h-3 text-[#DCEFE3]" />
                              <span>Yes, Implement Solution</span>
                            </button>
                            <button
                              onClick={() => handleConfirmAction(false)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F8F5] border border-[#E5ECE7] text-[#111827] font-medium text-[11px] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {latestTurn.actionExecuted && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#347A59] bg-[#EBF4EE] px-2.5 py-1 rounded border border-[#B8DFCA]">
                          <CheckCircle className="w-3.5 h-3.5 text-[#347A59]" />
                          <span>{latestTurn.actionExecuted.description}</span>
                        </div>
                      )}

                      {/* PAYMENT RECEIVABLES CARD */}
                      {latestTurn.visualCard?.type === 'PAYMENT_RECEIVABLES_CARD' && (
                        <div className="mt-3 p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] text-left space-y-2.5 shadow-sm">
                          <div className="flex items-center justify-between pb-2 border-b border-[#E5ECE7]">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                              <CreditCard className="w-4 h-4 text-[#347A59]" />
                              <span>Pending Receivables & Collection Strategy</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px]">
                              <span className="px-2 py-0.5 rounded bg-[#F4F8F5] text-[#111827] font-bold border border-[#E5ECE7]">
                                ${latestTurn.visualCard.pending_amount?.toLocaleString()} Total
                              </span>
                            </div>
                          </div>

                          {latestTurn.visualCard.unpaid_orders?.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-[#111827] uppercase tracking-wider">
                                Primary Unsettled Accounts:
                              </p>
                              {latestTurn.visualCard.unpaid_orders.map((u, idx) => (
                                <div key={idx} className="text-[11px] p-2 rounded-lg bg-[#F4F8F5] border border-[#E5ECE7] text-[#111827] flex items-center justify-between">
                                  <div>
                                    <span className="font-mono font-bold text-[#347A59]">{u.order_number}</span>
                                    <span className="ml-1 text-[#111827]">({u.customer_name})</span>
                                  </div>
                                  <span className="font-mono font-bold text-[#111827]">${u.amount?.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Root Causes Behind Pending Money */}
                          <div className="p-2.5 rounded-lg bg-[#F4F8F5] border border-[#E5ECE7] space-y-1">
                            <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>Exact Reasons Behind Pending Money:</span>
                            </p>
                            <ul className="text-[10px] text-[#111827] space-y-1 list-disc list-inside leading-relaxed">
                              <li><strong>Wholesale Credit Overrun:</strong> Net-15/Net-30 terms matured without automated dunning recovery.</li>
                              <li><strong>Dispatch Gate Bypass:</strong> Consignments progressed to delivery before payment verification.</li>
                            </ul>
                          </div>

                          {/* How We Can Collect It */}
                          <div className="p-2.5 rounded-lg bg-[#EBF4EE] border border-[#B8DFCA] space-y-1">
                            <p className="text-[10px] font-bold text-[#347A59] uppercase tracking-wider flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#347A59]" />
                              <span>Concrete 3-Step Solution to Collect:</span>
                            </p>
                            <ul className="text-[10px] text-[#111827] space-y-1 list-disc list-inside leading-relaxed">
                              <li><strong>1-Click Settlement Links:</strong> Dispatch instant WhatsApp & UPI checkout links.</li>
                              <li><strong>Dispatch Freeze Gate:</strong> Enforce delivery freeze on overdue balance &gt; ₹40,000.</li>
                              <li><strong>Prompt Settlement Incentive:</strong> 2% discount incentive for 24h settlement.</li>
                            </ul>
                          </div>

                          {onNavigateTo && (
                            <button
                              onClick={() => {
                                onNavigateTo('payments');
                                onToggleOpen();
                              }}
                              className="w-full mt-2 py-2.5 px-3 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#347A59]/20 transition-all transform active:scale-95"
                            >
                              <CreditCard className="w-4 h-4 text-[#DCEFE3]" />
                              <span>Open Payments & Invoices Ledger</span>
                              <ChevronRight className="w-4 h-4 text-[#DCEFE3]" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* DISPATCH EXECUTION & DIAGNOSTIC REPORT CARD */}
                      {latestTurn.visualCard?.type === 'DISPATCH_EXECUTION_CARD' && (
                        <div className="mt-3 p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] text-left space-y-2.5 shadow-sm">
                          <div className="flex items-center justify-between pb-2 border-b border-[#E5ECE7]">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                              <Truck className="w-4 h-4 text-[#347A59]" />
                              <span>Dispatch Execution & Diagnostic Report</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="px-2 py-0.5 rounded bg-[#EBF4EE] text-[#347A59] font-bold border border-[#B8DFCA]">
                                {latestTurn.visualCard.successful_count || latestTurn.visualCard.successful?.length || 0} Succeeded
                              </span>
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                {latestTurn.visualCard.failed_count || latestTurn.visualCard.failed?.length || 0} Failed
                              </span>
                            </div>
                          </div>

                          {latestTurn.visualCard.successful?.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-[#347A59] uppercase tracking-wider flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-[#347A59]" />
                                <span>Dispatched Successfully:</span>
                              </p>
                              {latestTurn.visualCard.successful.map((s, idx) => (
                                <div key={idx} className="text-[11px] p-2 rounded-lg bg-[#F4F8F5] border border-[#E5ECE7] text-[#111827] flex items-center justify-between">
                                  <div>
                                    <span className="font-mono font-bold text-[#347A59]">{s.order_number}</span> ({s.customer_name})
                                    <span className="block text-[10px] text-[#111827]">Carrier: {s.carrier} | Trk: {s.tracking_number}</span>
                                  </div>
                                  <span className="font-mono text-[#111827] font-bold">${s.total_amount?.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {latestTurn.visualCard.failed?.length > 0 && (
                            <div className="space-y-2 pt-1 border-t border-[#E5ECE7]">
                              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                <span>Failed Dispatches — Reason Behind Failure & Solutions:</span>
                              </p>
                              {latestTurn.visualCard.failed.map((f, i) => (
                                <div key={i} className="text-[11px] p-2.5 rounded-lg bg-[#F4F8F5] border border-[#E5ECE7] text-[#111827] space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-[#111827]">{f.order_number}</span>
                                    <span className="text-[10px] text-[#111827]">({f.customer_name})</span>
                                  </div>
                                  <div className="text-[10px] text-[#111827] bg-[#FFFFFF] p-2 rounded border border-[#E5ECE7] leading-relaxed">
                                    <strong className="text-rose-700 font-bold">Reason Behind Failure:</strong> {f.reason}
                                  </div>
                                  <div className="text-[10px] text-[#111827] bg-[#EBF4EE] p-2 rounded border border-[#B8DFCA] leading-relaxed">
                                    <strong className="text-[#347A59] font-bold">💡 Recommended Solution:</strong> {f.recommended_solution}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {onNavigateTo && (
                            <button
                              onClick={() => {
                                onNavigateTo('dispatch');
                                onToggleOpen();
                              }}
                              className="w-full mt-2 py-2 px-3 rounded-xl bg-[#FFFFFF] hover:bg-[#F4F8F5] border border-[#E5ECE7] text-[#111827] font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Truck className="w-3.5 h-3.5 text-[#347A59]" />
                              <span>Open Dispatch Management Dashboard</span>
                              <ChevronRight className="w-3.5 h-3.5 text-[#347A59]" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* PROACTIVE AI SCAN RESULT CARD */}
                      {latestTurn.visualCard?.type === 'AI_SCAN_RESULT_CARD' && (
                        <div className="mt-3 p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E5ECE7] text-left space-y-2.5 shadow-md">
                          <div className="flex items-center justify-between pb-2 border-b border-[#E5ECE7]">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                              <Sparkles className="w-4 h-4 text-[#347A59] animate-pulse" />
                              <span>{latestTurn.visualCard.title || 'Proactive Business Scan Results'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="px-2 py-0.5 rounded bg-[#F4F8F5] text-[#111827] font-bold border border-[#E5ECE7]">
                                {latestTurn.visualCard.total_bottlenecks || 0} Bottlenecks
                              </span>
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                {latestTurn.visualCard.critical_count || 0} Critical
                              </span>
                            </div>
                          </div>

                          {latestTurn.visualCard.top_issues?.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                              {latestTurn.visualCard.top_issues.map((issue, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg bg-[#F4F8F5] border border-[#E5ECE7] space-y-1.5 text-[11px]">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-[#111827] flex items-center gap-1.5">
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#111827] border border-[#E5ECE7] font-mono font-bold">
                                        {issue.module}
                                      </span>
                                      <span className="truncate max-w-[200px]">{issue.title}</span>
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      issue.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}>
                                      {issue.severity}
                                    </span>
                                  </div>
                                  {issue.root_cause && (
                                    <div className="text-[10px] text-[#111827] bg-[#FFFFFF] p-1.5 rounded border border-[#E5ECE7] leading-relaxed">
                                      <strong className="text-rose-700 font-bold">🔍 Root Cause:</strong> {issue.root_cause}
                                    </div>
                                  )}
                                  {issue.solution && (
                                    <div className="text-[10px] text-[#111827] bg-[#EBF4EE] p-1.5 rounded border border-[#B8DFCA] leading-relaxed">
                                      <strong className="text-[#347A59] font-bold">💡 Recommended Solution:</strong> {issue.solution}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Step-by-Step Action Center Redirect Button */}
                          <button
                            onClick={() => {
                              if (onNavigateTo) {
                                onNavigateTo(latestTurn.visualCard.redirect_page || 'action-center');
                              }
                              onToggleOpen();
                            }}
                            className="w-full mt-2 py-2.5 px-3 rounded-xl bg-[#347A59] hover:bg-[#244B39] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#347A59]/25 transition-all transform active:scale-95"
                          >
                            <Sparkles className="w-4 h-4 text-[#DCEFE3]" />
                            <span className="text-white">{latestTurn.visualCard.button_text || 'Open Step-by-Step Action Center'}</span>
                            <ChevronRight className="w-4 h-4 text-[#DCEFE3]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-end gap-2 text-[10px] text-[#111827]">
                    <button
                      onClick={() => speakText(latestTurn.aiResponse)}
                      className="hover:text-[#347A59] transition-colors flex items-center gap-1"
                      title="Replay spoken response"
                    >
                      <RotateCcw className="w-3 h-3 text-[#347A59]" />
                      <span>Replay Voice</span>
                    </button>
                  </div>
                </div>
              )}

              {/* QUICK VOICE PROMPTS */}
              <div className="w-full">
                <p className="text-[10px] font-bold text-[#111827] uppercase tracking-wider mb-2 text-center">
                  Suggested Spoken Inquiries (Tap or Speak)
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                  {suggestedPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isProcessing}
                      className="text-left px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#EBF4EE] border border-[#E5ECE7] hover:border-[#83B89A] text-[11px] text-[#111827] transition-all font-medium flex items-center justify-between group shadow-sm"
                    >
                      <span className="truncate">{prompt}</span>
                      <ChevronRight className="w-3 h-3 text-[#347A59] flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: CHAT ASIDE (Collapsible Panel) */}
            {showChatAside && (
              <div className="w-[380px] border-l border-[#E5ECE7] flex flex-col bg-[#F4F8F5] animate-fade-in">
                {/* Chat Aside Header */}
                <div className="px-4 py-2.5 bg-[#FFFFFF] border-b border-[#E5ECE7] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#111827]">
                    <MessageSquare className="w-3.5 h-3.5 text-[#347A59]" />
                    <span>Conversation Transcript & Typing</span>
                  </div>
                  <span className="text-[10px] text-[#111827]">{messages.length} messages</span>
                </div>

                {/* Messages Log */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 scrollbar-thin scrollbar-thumb-[#E5ECE7]">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="w-6 h-6 rounded-lg bg-[#FFFFFF] border border-[#E5ECE7] flex items-center justify-center text-[#347A59] flex-shrink-0 mt-0.5">
                          <Bot className="w-3 h-3 text-[#347A59]" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-[#347A59] text-white rounded-br-none font-medium shadow-sm'
                            : 'bg-[#FFFFFF] text-[#111827] border border-[#E5ECE7] rounded-bl-none shadow-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        {msg.visualCard?.type === 'AI_SCAN_RESULT_CARD' && (
                          <div className="mt-2 p-2 rounded-lg bg-[#F4F8F5] border border-[#E5ECE7] text-[10px]">
                            <div className="font-bold text-[#111827] mb-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-[#347A59]" />
                              <span>{msg.visualCard.total_bottlenecks} Bottlenecks Identified</span>
                            </div>
                            {onNavigateTo && (
                              <button
                                onClick={() => {
                                  onNavigateTo(msg.visualCard.redirect_page || 'action-center');
                                  onToggleOpen();
                                }}
                                className="w-full mt-1.5 py-1.5 px-2 rounded-lg bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-[10px] flex items-center justify-center gap-1"
                              >
                                <span>Open Step-by-Step Action Center</span>
                                <ChevronRight className="w-3 h-3 text-[#DCEFE3]" />
                              </button>
                            )}
                          </div>
                        )}
                        {msg.visualCard?.type === 'DISPATCH_EXECUTION_CARD' && (
                          <div className="mt-2 p-2 rounded-lg bg-[#F4F8F5] border border-[#E5ECE7] text-[10px]">
                            <div className="font-bold text-[#111827] mb-1 flex items-center justify-between">
                              <span>Dispatch Run:</span>
                              <span className="text-[#347A59] font-bold">{msg.visualCard.successful?.length || 0} Success / {msg.visualCard.failed?.length || 0} Failed</span>
                            </div>
                            {onNavigateTo && (
                              <button
                                onClick={() => {
                                  onNavigateTo('dispatch');
                                  onToggleOpen();
                                }}
                                className="w-full mt-1.5 py-1.5 px-2 rounded-lg bg-[#FFFFFF] hover:bg-[#F4F8F5] border border-[#E5ECE7] text-[#111827] font-bold text-[10px] flex items-center justify-center gap-1"
                              >
                                <span>View Dispatch Dashboard</span>
                                <ChevronRight className="w-3 h-3 text-[#347A59]" />
                              </button>
                            )}
                          </div>
                        )}
                        {msg.visualCard?.type === 'PAYMENT_RECEIVABLES_CARD' && (
                          <div className="mt-2 p-2 rounded-lg bg-[#F4F8F5] border border-[#E5ECE7] text-[10px]">
                            <div className="font-bold text-[#111827] mb-1 flex items-center justify-between">
                              <span>Pending Money:</span>
                              <span className="text-[#347A59] font-bold">${msg.visualCard.pending_amount?.toLocaleString()}</span>
                            </div>
                            {onNavigateTo && (
                              <button
                                onClick={() => {
                                  onNavigateTo('payments');
                                  onToggleOpen();
                                }}
                                className="w-full mt-1.5 py-1.5 px-2 rounded-lg bg-[#347A59] hover:bg-[#244B39] text-white font-bold text-[10px] flex items-center justify-center gap-1"
                              >
                                <span>Open Payments Ledger</span>
                                <ChevronRight className="w-3 h-3 text-[#DCEFE3]" />
                              </button>
                            )}
                          </div>
                        )}
                        <div
                          className={`text-[9px] mt-1 flex items-center gap-1.5 ${
                            msg.sender === 'user' ? 'text-[#DCEFE3] justify-end' : 'text-[#111827] justify-start'
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {msg.sender === 'ai' && (
                            <button
                              onClick={() => speakText(msg.spokenText || msg.text)}
                              className="hover:text-[#347A59] transition-colors"
                              title="Replay Voice"
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-[#347A59]" />
                            </button>
                          )}
                        </div>
                      </div>

                      {msg.sender === 'user' && (
                        <div className="w-6 h-6 rounded-lg bg-[#347A59] flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isProcessing && (
                    <div className="flex gap-2 items-center text-[#111827] text-xs py-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#347A59]" />
                      <span>Consulting operational database...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Text Input Fallback */}
                <div className="p-3 bg-[#FFFFFF] border-t border-[#E5ECE7]">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Type a doubt or query..."
                      className="flex-1 bg-[#F4F8F5] border border-[#E5ECE7] rounded-xl px-3 py-2 text-xs text-[#111827] placeholder-[#647568] focus:outline-none focus:border-[#347A59] transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || isProcessing}
                      className="p-2 rounded-xl bg-[#347A59] hover:bg-[#244B39] disabled:opacity-40 text-white transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
