import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  MapPin,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Sparkles,
  Star,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { LanguageCode } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

interface MatchedProvider {
  id: string;
  name: string;
  title: string;
  town: string;
  district: string;
  startingPrice: number;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  isDemo: boolean;
  verified: boolean;
}

interface BookingDraft {
  categoryId: string;
  subcategoryId: string;
  title: string;
  description: string;
  town: string;
  preferredDate?: string;
  preferredTime?: string;
  targetProviderId?: string;
}

interface ChatEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  matchedProviders?: MatchedProvider[];
  bookingDraft?: BookingDraft | null;
  usedFallback?: boolean;
  error?: boolean;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const CUSTOMER_SUGGESTIONS = [
  'I need an electrician near Tirur.',
  'Find a plumber available tomorrow.',
  'Which providers offer washing machine repair?',
  'I need a mathematics tutor.',
];

const PROVIDER_SUGGESTIONS = [
  'Help me write a clear service description for AC repair.',
  'How do quotations and customer selection work?',
  'Show my current open requests and active bookings.',
  'Tips to build customer trust on LocalConnect.',
];

function getLocaleForSpeech(lang: LanguageCode): string {
  if (lang === 'ml') return 'ml-IN';
  if (lang === 'hi') return 'hi-IN';
  return 'en-IN';
}

export const AiAssistantView: React.FC<{ embedded?: boolean; voiceFocus?: boolean }> = ({
  embedded = false,
  voiceFocus = false,
}) => {
  const { user, language, setLanguage, accessibility, aiDrawerOpen, setAiDrawerOpen, navigate } =
    useApp();
  const [aiLang, setAiLang] = useState<LanguageCode>(accessibility.preferredVoiceLang || language);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(
    voiceFocus || accessibility.screenReaderHints
  );
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        user?.activeMode === 'provider'
          ? 'Namaskaram! I am LocalConnect AI. Ask me by typing or using the Voice mic to craft service descriptions, review matching requests, or inspect quotation tips.'
          : 'Namaskaram! I am LocalConnect AI. Speak or type in English, Malayalam, or Hindi (e.g., "I need an electrician near Tirur") to find real Kerala providers or prepare a service request draft.',
    },
  ]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/[*#]/g, ''));
      utterance.lang = getLocaleForSpeech(aiLang);
      utterance.rate = 0.96;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore speech synthesis issues
    }
  };

  const stopSpeaking = () => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
  };

  const sendMessage = async (textToSend: string, speakReply = voiceOutputEnabled) => {
    const clean = textToSend.trim();
    if (!clean || loading) return;

    const userMsg: ChatEntry = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: clean,
    };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput('');
    setLoading(true);

    try {
      const res = await apiFetch<{
        reply: string;
        matchedProviders?: MatchedProvider[];
        bookingDraft?: BookingDraft | null;
        usedFallback?: boolean;
      }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: clean,
          language: aiLang,
          mode: user?.activeMode || 'customer',
          history: nextMsgs
            .filter((m) => !m.error)
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: res.reply,
          matchedProviders: res.matchedProviders || [],
          bookingDraft: res.bookingDraft || null,
          usedFallback: Boolean(res.usedFallback),
        },
      ]);

      if (speakReply && res.reply) {
        speakText(res.reply);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text:
            err instanceof Error
              ? err.message
              : 'Unable to reach LocalConnect AI right now. You can retry or use Search.',
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoiceInput = () => {
    setVoiceError('');
    if (listening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstanceLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstanceLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRec) {
      setVoiceError(
        'Voice speech recognition is unavailable in this browser. Type your request below — all LocalConnect AI features work identically.'
      );
      inputRef.current?.focus();
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = getLocaleForSpeech(aiLang);
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        setListening(false);
        if (transcript) {
          setInput(transcript);
          sendMessage(transcript, true);
        }
      };
      recognition.onerror = (event) => {
        setListening(false);
        const reason = event.error || 'unknown';
        setVoiceError(
          reason === 'not-allowed'
            ? 'Microphone permission was declined. You can type your request below instead.'
            : 'Could not hear speech clearly. Please try again or type below.'
        );
      };
      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    } catch {
      setListening(false);
      setVoiceError('Could not start voice input. Please type your request below.');
    }
  };

  const clearChat = () => {
    stopSpeaking();
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: 'Conversation cleared. Speak or type how LocalConnect AI can assist you today.',
      },
    ]);
  };

  const retryLast = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      setMessages((prev) => prev.filter((m) => !m.error));
      sendMessage(lastUser.text);
    }
  };

  const suggestions = user?.activeMode === 'provider' ? PROVIDER_SUGGESTIONS : CUSTOMER_SUGGESTIONS;

  const content = (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[#E4E1D8] px-4 py-3.5 bg-[#134E3A] text-white">
        <div className="flex items-center gap-2.5 min-w-0">
          {voiceFocus ? (
            <Mic className="h-5 w-5 text-[#C99B2C] shrink-0" />
          ) : (
            <Sparkles className="h-5 w-5 text-[#C99B2C] shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold truncate">
              {voiceFocus ? 'LocalConnect AI Voice Assistant' : 'LocalConnect AI'}
            </h2>
            <p className="text-[11px] text-[#E6F2EC]/90 truncate">
              Voice + Text · English, Malayalam & Hindi · Real DB search
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-compact="true"
            onClick={() => {
              const next = !voiceOutputEnabled;
              setVoiceOutputEnabled(next);
              if (!next) stopSpeaking();
            }}
            title={voiceOutputEnabled ? 'Mute spoken AI replies' : 'Speak AI replies aloud'}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/15"
          >
            {voiceOutputEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <select
            aria-label="AI Language"
            value={aiLang}
            onChange={(e) => {
              const next = e.target.value as LanguageCode;
              setAiLang(next);
              setLanguage(next);
            }}
            className="rounded-md bg-white/15 px-2 py-1 text-xs font-medium text-white border border-white/20 focus:outline-none"
          >
            <option value="en" className="text-[#181A18]">EN</option>
            <option value="ml" className="text-[#181A18]">ML</option>
            <option value="hi" className="text-[#181A18]">HI</option>
          </select>
          <button
            type="button"
            data-compact="true"
            onClick={clearChat}
            title="Clear conversation"
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/15"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {!embedded && (
            <button
              type="button"
              data-compact="true"
              onClick={() => setAiDrawerOpen(false)}
              aria-label="Close AI Assistant"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Voice Controls Banner when in Voice Focus or Listening */}
      {(voiceFocus || listening || voiceError) && (
        <div className="border-b border-[#E4E1D8] bg-[#E6F2EC]/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-[#181A18]">
            {listening ? (
              <span className="font-semibold text-[#134E3A]">
                Listening ({getLocaleForSpeech(aiLang)})... Speak your service request clearly.
              </span>
            ) : voiceError ? (
              <span className="text-amber-900">{voiceError}</span>
            ) : (
              <span>
                Tap the microphone to ask hands-free in English, Malayalam, or Hindi. Mic permission is requested only when tapped.
              </span>
            )}
          </div>
          <button
            type="button"
            data-compact="true"
            onClick={toggleVoiceInput}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold text-xs ${
              listening
                ? 'bg-[#B91C1C] text-white'
                : 'bg-[#134E3A] text-white hover:bg-[#0D3B2B]'
            }`}
          >
            {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            <span>{listening ? 'Stop Listening' : 'Speak Now'}</span>
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8F7F4]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#134E3A] text-white'
                  : m.error
                    ? 'bg-red-50 border border-red-200 text-red-900'
                    : 'bg-white border border-[#E4E1D8] text-[#181A18]'
              }`}
            >
              {m.error && (
                <div className="flex items-center gap-1.5 font-semibold mb-1 text-xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Connection Issue</span>
                </div>
              )}
              {m.text}
              {m.role === 'assistant' && !m.error && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    data-compact="true"
                    onClick={() => speakText(m.text)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#134E3A] hover:underline"
                  >
                    <Volume2 className="h-3 w-3" />
                    <span>Listen</span>
                  </button>
                  {m.usedFallback && (
                    <span className="text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                      Local DB Matcher (Gemini key unconfigured)
                    </span>
                  )}
                </div>
              )}
              {m.error && (
                <button
                  type="button"
                  data-compact="true"
                  onClick={retryLast}
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>

            {/* Matched Providers returned from Database Tool Calls */}
            {m.matchedProviders && m.matchedProviders.length > 0 && (
              <div className="mt-2.5 w-full space-y-2">
                {m.matchedProviders.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-[#E4E1D8] bg-white p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#181A18] truncate">{p.name}</div>
                      <div className="text-xs text-[#5A605A] truncate">{p.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#5A605A]">
                        <span className="inline-flex items-center gap-0.5 font-medium text-[#181A18]">
                          <Star className="h-3 w-3 fill-[#C99B2C] text-[#C99B2C]" />
                          {p.rating.toFixed(1)}
                        </span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {p.town}
                        </span>
                        <span>·</span>
                        <span className="font-mono-nums font-semibold text-[#134E3A]">
                          Starts ₹{p.startingPrice}
                        </span>
                        {p.isDemo && <span>· Demo</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      data-compact="true"
                      onClick={() => {
                        if (!embedded) setAiDrawerOpen(false);
                        navigate({ page: 'provider-profile', id: p.id });
                      }}
                      className="shrink-0 rounded-lg bg-[#E6F2EC] px-3 py-1.5 text-xs font-semibold text-[#134E3A] hover:bg-[#d5eadf]"
                    >
                      Open
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Booking Draft Confirmation Card (never auto-books!) */}
            {m.bookingDraft && (
              <div className="mt-2.5 w-full rounded-xl border border-[#134E3A]/30 bg-[#E6F2EC]/60 p-4 space-y-2">
                <div className="text-xs font-semibold text-[#134E3A]">
                  Prepared Service Request Draft (Confirmation Required)
                </div>
                <div className="text-sm font-semibold text-[#181A18]">{m.bookingDraft.title}</div>
                <p className="text-xs text-[#5A605A]">{m.bookingDraft.description}</p>
                <div className="text-xs text-[#5A605A]">
                  Location: {m.bookingDraft.town}
                  {m.bookingDraft.preferredDate ? ` · Date: ${m.bookingDraft.preferredDate}` : ''}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!embedded) setAiDrawerOpen(false);
                    navigate({
                      page: 'request-service',
                      categoryId: m.bookingDraft!.categoryId,
                      subcategoryId: m.bookingDraft!.subcategoryId,
                      providerId: m.bookingDraft!.targetProviderId,
                      draftTitle: m.bookingDraft!.title,
                      draftDescription: m.bookingDraft!.description,
                      draftTown: m.bookingDraft!.town,
                      draftDate: m.bookingDraft!.preferredDate,
                      draftTime: m.bookingDraft!.preferredTime,
                    });
                  }}
                  className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#134E3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0D3B2B]"
                >
                  <span>Review & Confirm in Request Form</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#5A605A] bg-white border border-[#E4E1D8] rounded-xl px-4 py-3 w-fit">
            <span>Searching LocalConnect database...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompts */}
      <div className="border-t border-[#E4E1D8] bg-white px-4 py-2.5 flex gap-2 overflow-x-auto">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            data-compact="true"
            onClick={() => sendMessage(s)}
            className="shrink-0 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3 py-1.5 text-xs text-[#181A18] hover:border-[#134E3A] hover:text-[#134E3A] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input Form with Voice Mic Button */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="border-t border-[#E4E1D8] bg-white p-3 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={toggleVoiceInput}
          aria-label={listening ? 'Stop voice input' : 'Start voice input'}
          title="Speak in English, Malayalam, or Hindi"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            listening
              ? 'border-[#B91C1C] bg-[#B91C1C] text-white'
              : 'border-[#E4E1D8] bg-[#F8F7F4] text-[#134E3A] hover:bg-[#E6F2EC]'
          }`}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            aiLang === 'ml'
              ? 'നിങ്ങളുടെ ചോദ്യം ചോദിക്കൂ അല്ലെങ്കിൽ മൈക്ക് അമർത്തുക...'
              : aiLang === 'hi'
                ? 'अपना सवाल लिखें या माइक दबाएं...'
                : 'Type or tap mic (e.g. Electrician near Tirur)...'
          }
          className="flex-1 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3.5 py-2.5 text-sm text-[#181A18] focus:border-[#134E3A] focus:bg-white focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#134E3A] text-white hover:bg-[#0D3B2B] disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );

  if (embedded) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <div className="h-[680px] rounded-xl border border-[#E4E1D8] overflow-hidden shadow-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {aiDrawerOpen && (
        <motion.div
          key="ai-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[85] flex justify-end bg-black/40 backdrop-blur-[2px]"
        >
          <div
            className="fixed inset-0"
            onClick={() => setAiDrawerOpen(false)}
            aria-hidden="true"
          />
          <motion.div
            key="ai-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="relative z-10 w-full max-w-md h-full shadow-2xl border-l border-[#E4E1D8]"
          >
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
