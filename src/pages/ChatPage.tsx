import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCheck,
  ImagePlus,
  Languages,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';
import type { ChatMessage, Conversation, LanguageCode } from '../../shared/types.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch } from '../lib/api.ts';

export const ChatPage: React.FC = () => {
  const { user, language, accessibility, updateAccessibility, route, navigate, showToast, realtimeTick } =
    useApp();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(route.id || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);

  // Automatic Translator state
  const [targetLang, setTargetLang] = useState<LanguageCode>(
    accessibility.chatAutoTranslateTo !== 'off' ? accessibility.chatAutoTranslateTo : language
  );
  const [autoTranslate, setAutoTranslate] = useState<boolean>(
    accessibility.chatAutoTranslateTo !== 'off'
  );
  const [translatedMap, setTranslatedMap] = useState<Record<string, string>>({});
  const [showOriginalIds, setShowOriginalIds] = useState<Record<string, boolean>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch<{ conversations: Conversation[] }>('/api/conversations');
      setConversations(res.conversations);
      if (!activeId && res.conversations.length > 0) {
        setActiveId(route.id || res.conversations[0].id);
      }
    } catch {
      setConversations([]);
    }
  }, [user, activeId, route.id]);

  const loadMessages = useCallback(async () => {
    if (!user || !activeId) return;
    try {
      const res = await apiFetch<{ messages: ChatMessage[] }>(
        `/api/conversations/${activeId}/messages`
      );
      setMessages(res.messages);
    } catch {
      setMessages([]);
    }
  }, [user, activeId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations, realtimeTick]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages, realtimeTick]);

  const translateSingle = useCallback(
    async (msg: ChatMessage, lang: LanguageCode) => {
      if (!msg.text.trim()) return;
      const cacheKey = `${msg.id}:${lang}`;
      if (msg.translations?.[lang]) {
        setTranslatedMap((prev) => ({ ...prev, [cacheKey]: msg.translations![lang]! }));
        return;
      }
      setTranslatingId(msg.id);
      try {
        const res = await apiFetch<{ translatedText: string }>('/api/chat/translate', {
          method: 'POST',
          body: JSON.stringify({ messageId: msg.id, text: msg.text, targetLanguage: lang }),
        });
        setTranslatedMap((prev) => ({ ...prev, [cacheKey]: res.translatedText }));
        setShowOriginalIds((prev) => ({ ...prev, [msg.id]: false }));
      } catch {
        // fail gracefully keeping original text
      } finally {
        setTranslatingId(null);
      }
    },
    []
  );

  // Auto-translate incoming messages when enabled
  useEffect(() => {
    if (!autoTranslate || !user) return;
    messages.forEach((m) => {
      const key = `${m.id}:${targetLang}`;
      if (m.senderId !== user.id && m.text.trim() && !translatedMap[key] && !m.translations?.[targetLang]) {
        translateSingle(m, targetLang);
      }
    });
  }, [autoTranslate, messages, targetLang, translatedMap, translateSingle, user]);

  const activeConv = conversations.find((c) => c.id === activeId) || null;

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_200_000) {
      showToast('Image must be smaller than 1.2 MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setImageUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || (!text.trim() && !imageUrl)) return;
    setSending(true);
    try {
      const res = await apiFetch<{ message: ChatMessage }>(
        `/api/conversations/${activeId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ text, imageUrl }),
        }
      );
      setMessages((prev) => [...prev, res.message]);
      setText('');
      setImageUrl(undefined);
      loadConversations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Messages</h1>
        <p className="text-sm text-[#5A605A]">
          Sign in to view your real-time customer and provider conversations with automatic Malayalam, English, and Hindi translation.
        </p>
        <button
          type="button"
          onClick={() => navigate({ page: 'login' })}
          className="rounded-lg bg-[#134E3A] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In / Try Demo Account
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#181A18]">Real-Time Messages</h1>
          <p className="text-xs text-[#5A605A]">
            Includes bidirectional Malayalam ↔ English ↔ Hindi translation while preserving ₹ prices, PINs, and addresses.
          </p>
        </div>

        {/* Malayalam Automatic Translator Toolbar */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#E4E1D8] bg-white px-3 py-2 text-xs">
          <Languages className="h-4 w-4 text-[#134E3A]" />
          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-[#181A18]">
            <input
              type="checkbox"
              checked={autoTranslate}
              onChange={(e) => {
                const next = e.target.checked;
                setAutoTranslate(next);
                updateAccessibility({ chatAutoTranslateTo: next ? targetLang : 'off' });
              }}
              className="h-3.5 w-3.5 accent-[#134E3A]"
            />
            <span>Auto-Translate</span>
          </label>
          <select
            aria-label="Translate messages into"
            value={targetLang}
            onChange={(e) => {
              const nextLang = e.target.value as LanguageCode;
              setTargetLang(nextLang);
              if (autoTranslate) {
                updateAccessibility({ chatAutoTranslateTo: nextLang });
              }
            }}
            className="rounded border border-[#E4E1D8] bg-[#F8F7F4] px-2 py-1 text-xs font-semibold text-[#134E3A]"
          >
            <option value="en">Into English</option>
            <option value="ml">മലയാളത്തിലേക്ക്</option>
            <option value="hi">हिन्दी में</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-[#E4E1D8] bg-white overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
        {/* Conversations List */}
        <aside className="md:col-span-4 border-b md:border-b-0 md:border-r border-[#E4E1D8] bg-[#F8F7F4]">
          <div className="p-4 border-b border-[#E4E1D8] text-xs font-semibold text-[#5A605A]">
            Conversations ({conversations.length})
          </div>
          {conversations.length === 0 ? (
            <div className="p-6 text-xs text-[#5A605A]">
              No conversations yet. Open any provider profile and click <strong>Chat</strong> to
              start messaging.
            </div>
          ) : (
            <div className="divide-y divide-[#E4E1D8]">
              {conversations.map((c) => {
                const unread =
                  user.activeMode === 'provider' ? c.unreadProvider : c.unreadCustomer;
                const peerName =
                  user.activeMode === 'provider' ? c.customerName : c.providerName;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left p-4 transition-colors ${
                      c.id === activeId ? 'bg-white' : 'hover:bg-white/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#181A18] truncate">
                        {peerName}
                      </span>
                      {unread > 0 && (
                        <span className="font-mono-nums text-[11px] font-bold text-[#134E3A]">
                          {unread} new
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A605A] truncate mt-1">{c.lastMessage}</p>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* Active Chat Thread */}
        <section className="md:col-span-8 flex flex-col justify-between">
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#5A605A]">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="border-b border-[#E4E1D8] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-display text-base font-bold text-[#181A18]">
                    {user.activeMode === 'provider'
                      ? activeConv.customerName
                      : activeConv.providerName}
                  </div>
                  <div className="text-xs text-[#5A605A]">Direct zero-commission chat</div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`tel:${activeConv.providerPhone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-xs font-medium hover:bg-[#F1EFE9]"
                  >
                    <Phone className="h-3.5 w-3.5 text-[#134E3A]" />
                    <span>Call</span>
                  </a>
                  <a
                    href={`https://wa.me/${activeConv.providerPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E1D8] px-3 py-1.5 text-xs font-medium hover:bg-[#F1EFE9]"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-[#134E3A]" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F8F7F4]/60 max-h-[420px]">
                {messages.map((m) => {
                  const mine = m.senderId === user.id;
                  const cacheKey = `${m.id}:${targetLang}`;
                  const translatedText = translatedMap[cacheKey] || m.translations?.[targetLang];
                  const showingOriginal = Boolean(showOriginalIds[m.id]);
                  const displayedText =
                    translatedText && !showingOriginal ? translatedText : m.text;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-xl px-4 py-2.5 text-sm space-y-2 ${
                          mine
                            ? 'bg-[#134E3A] text-white'
                            : 'bg-white border border-[#E4E1D8] text-[#181A18]'
                        }`}
                      >
                        {m.imageUrl && (
                          <img
                            src={m.imageUrl}
                            alt="Chat attachment"
                            className="max-h-48 rounded-lg object-cover"
                          />
                        )}
                        {displayedText && <p className="leading-relaxed">{displayedText}</p>}

                        {translatedText && !showingOriginal && (
                          <div
                            className={`text-[10px] pt-1 border-t ${
                              mine ? 'border-white/20 text-white/80' : 'border-[#E4E1D8] text-[#5A605A]'
                            }`}
                          >
                            Translated to {targetLang.toUpperCase()} · Original preserved
                          </div>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[10px] text-[#5A605A]">
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {mine &&
                          (m.readByRecipient ? (
                            <CheckCheck className="h-3 w-3 text-[#134E3A]" />
                          ) : (
                            <Check className="h-3 w-3" />
                          ))}
                        {m.text.trim() && (
                          <button
                            type="button"
                            data-compact="true"
                            disabled={translatingId === m.id}
                            onClick={() => {
                              if (translatedText) {
                                setShowOriginalIds((prev) => ({
                                  ...prev,
                                  [m.id]: !showingOriginal,
                                }));
                              } else {
                                translateSingle(m, targetLang);
                              }
                            }}
                            className="font-semibold text-[#134E3A] hover:underline"
                          >
                            {translatingId === m.id
                              ? 'Translating...'
                              : translatedText
                                ? showingOriginal
                                  ? `View ${targetLang.toUpperCase()}`
                                  : 'Show Original'
                                : `Translate (${targetLang.toUpperCase()})`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Composer */}
              <form
                onSubmit={handleSend}
                className="border-t border-[#E4E1D8] bg-white p-3.5 space-y-2"
              >
                {imageUrl && (
                  <div className="flex items-center gap-2 text-xs text-[#134E3A]">
                    <span>Image attached</span>
                    <button
                      type="button"
                      onClick={() => setImageUrl(undefined)}
                      className="underline text-[#B91C1C]"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label
                    title="Attach image"
                    className="cursor-pointer flex h-10 w-10 items-center justify-center rounded-lg border border-[#E4E1D8] text-[#5A605A] hover:text-[#134E3A]"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagePick}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type in English, മലയാളം, or हिन्दी..."
                    className="flex-1 rounded-lg border border-[#E4E1D8] bg-[#F8F7F4] px-3.5 py-2 text-sm focus:border-[#134E3A] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || (!text.trim() && !imageUrl)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#134E3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0D3B2B] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
};
