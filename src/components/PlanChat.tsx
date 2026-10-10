/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  db,
  PlanningMessage,
  PlanningConfig,
  PLANNING_MESSAGES_COLLECTION,
  ADMIN_SETTINGS_COLLECTION
} from '../firebase';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  Send,
  Image as ImageIcon,
  Settings,
  Bot,
  Sparkles,
  Trash2,
  Check,
  CheckCheck,
  ExternalLink,
  X,
  Upload,
  User,
  HelpCircle,
  Eye,
  EyeOff,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  Paperclip
} from 'lucide-react';

interface PlanChatProps {
  onClose?: () => void;
}

// Compress images for fast multi-device Firestore real-time sync (<70KB)
function compressChatImage(file: File, maxWidth = 800, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve((e.target?.result as string) || '');
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve((e.target?.result as string) || '');
      img.src = (e.target?.result as string) || '';
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

// Extract any URLs in text for link preview
function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

const OPENROUTER_MODELS = [
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning • Top Pick)' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3 (Fast Chat)' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' }
];

const NVIDIA_MODELS = [
  { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct' },
  { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1 (NVIDIA NIM)' },
  { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2' },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'NVIDIA Nemotron 70B' },
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct' }
];

export default function PlanChat({ onClose }: PlanChatProps) {
  // Active partner identification saved in localStorage per device
  const [currentSenderId, setCurrentSenderId] = useState<string>(() => {
    return localStorage.getItem('kn_plan_sender_id') || 'partner_1';
  });
  const [currentSenderName, setCurrentSenderName] = useState<string>(() => {
    return localStorage.getItem('kn_plan_sender_name') || 'Admin (Me)';
  });

  const [messages, setMessages] = useState<PlanningMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Attachment state
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [settingsProvider, setSettingsProvider] = useState<'openrouter' | 'nvidia'>('openrouter');
  const [settingsApiKey, setSettingsApiKey] = useState('');
  const [settingsModel, setSettingsModel] = useState('deepseek/deepseek-r1');
  const [customModelInput, setCustomModelInput] = useState('');
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Clear chat confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save partner name/id to localStorage
  const handleSwitchSender = (id: string, name: string) => {
    setCurrentSenderId(id);
    setCurrentSenderName(name);
    localStorage.setItem('kn_plan_sender_id', id);
    localStorage.setItem('kn_plan_sender_name', name);
  };

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  // Real-time Firestore sync for messages
  useEffect(() => {
    const q = query(
      collection(db, PLANNING_MESSAGES_COLLECTION),
      orderBy('timestamp', 'asc'),
      limit(150)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs: PlanningMessage[] = [];
        snapshot.forEach((d) => {
          msgs.push({ id: d.id, ...(d.data() as Omit<PlanningMessage, 'id'>) });
        });
        setMessages(msgs);
      },
      (error) => {
        console.error('Error fetching planning messages:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch / Sync AI Settings from Firestore so both phones share the same API key!
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, ADMIN_SETTINGS_COLLECTION, 'plan_config'));
        if (snap.exists()) {
          const data = snap.data() as PlanningConfig;
          if (data.provider) setSettingsProvider(data.provider);
          if (data.apiKey) setSettingsApiKey(data.apiKey);
          if (data.model) {
            setSettingsModel(data.model);
            const isKnown = [...OPENROUTER_MODELS, ...NVIDIA_MODELS].some((m) => m.id === data.model);
            if (!isKnown) setCustomModelInput(data.model);
          }
        } else {
          // Check localStorage fallback
          const localKey = localStorage.getItem('kn_plan_api_key');
          if (localKey) setSettingsApiKey(localKey);
        }
      } catch (err) {
        console.error('Error loading plan config:', err);
      }
    };
    fetchConfig();
  }, []);

  // Save Settings to Firestore & localStorage
  const handleSaveSettings = async () => {
    const activeModel = customModelInput.trim() || settingsModel;
    const config: PlanningConfig = {
      provider: settingsProvider,
      apiKey: settingsApiKey.trim(),
      model: activeModel,
      systemPrompt:
        'You are the technical co-founder and software partner at KN Builders planning real apps and websites with your teammates. Talk like an intelligent, friendly human peer. Be concise, structured, practical, and solution-oriented.'
    };

    try {
      await setDoc(doc(db, ADMIN_SETTINGS_COLLECTION, 'plan_config'), config, { merge: true });
      localStorage.setItem('kn_plan_api_key', settingsApiKey.trim());
      setSettingsSavedToast(true);
      setTimeout(() => {
        setSettingsSavedToast(false);
        setShowSettings(false);
      }, 1000);
    } catch (err) {
      console.error('Error saving plan config:', err);
      alert('Could not save to cloud. Settings stored locally on this phone.');
      setShowSettings(false);
    }
  };

  // Image Upload handler
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressChatImage(file, 800, 0.75);
      setAttachedImage(compressed);
    } catch (err) {
      console.error('Image compression failed:', err);
    }
  };

  // Send Message Function
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed && !attachedImage) return;

    setIsSending(true);
    const urls = extractUrls(trimmed);
    const linkUrl = urls.length > 0 ? urls[0] : undefined;

    const userMessage: Omit<PlanningMessage, 'id'> = {
      senderId: currentSenderId,
      senderName: currentSenderName,
      text: trimmed,
      imageUrl: attachedImage || undefined,
      linkUrl,
      timestamp: Date.now(),
      isAi: false
    };

    setInputText('');
    setAttachedImage(null);

    try {
      await addDoc(collection(db, PLANNING_MESSAGES_COLLECTION), userMessage);
      setIsSending(false);

      // Check if message mentions @ai or @AI
      if (trimmed.toLowerCase().includes('@ai')) {
        await triggerAiResponse(trimmed);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setIsSending(false);
    }
  };

  // AI Response Generator via OpenRouter or NVIDIA
  const triggerAiResponse = async (userPrompt: string) => {
    setIsAiThinking(true);

    // Retrieve latest config
    let provider = settingsProvider;
    let apiKey = settingsApiKey.trim();
    let model = customModelInput.trim() || settingsModel;

    // Check cloud config if local is blank
    if (!apiKey) {
      try {
        const snap = await getDoc(doc(db, ADMIN_SETTINGS_COLLECTION, 'plan_config'));
        if (snap.exists()) {
          const cfg = snap.data() as PlanningConfig;
          if (cfg.apiKey) {
            apiKey = cfg.apiKey;
            provider = cfg.provider || 'openrouter';
            model = cfg.model || model;
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (!apiKey) {
      setIsAiThinking(false);
      // Post helpful prompt to configure key
      await addDoc(collection(db, PLANNING_MESSAGES_COLLECTION), {
        senderId: 'ai',
        senderName: 'AI Partner',
        text: '👋 Bhai, @ai use karne ke liye settings (⚙️ top right) me jaake apna OpenRouter ya NVIDIA API key add kar do. Uske baad me automatically reply karunga!',
        timestamp: Date.now(),
        isAi: true,
        aiProvider: provider,
        aiModel: 'Setup Required'
      });
      return;
    }

    try {
      // Build conversation context from last 10 messages
      const recentHistory = messages.slice(-10).map((m) => ({
        role: m.isAi ? ('assistant' as const) : ('user' as const),
        content: `${m.senderName}: ${m.text}`
      }));

      const cleanUserText = userPrompt.replace(/@ai/gi, '').trim();

      const apiEndpoint =
        provider === 'nvidia'
          ? 'https://integrate.api.nvidia.com/v1/chat/completions'
          : 'https://openrouter.ai/api/v1/chat/completions';

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      };

      if (provider === 'openrouter') {
        requestHeaders['HTTP-Referer'] = 'https://knbuilders.dev';
        requestHeaders['X-Title'] = 'KN Builders Team Planning';
      }

      const systemMessage = {
        role: 'system',
        content:
          'You are an expert technical co-founder and full-stack software partner at KN Builders. You are in a private WhatsApp-style planning room with your 2 co-founders. Speak naturally like a smart, proactive human teammate in friendly Hinglish/English. Help with technical decisions, architecture, project roadmaps, APK/web features, UI ideas, and task division. Keep answers clear, punchy, and actionable without robotic filler.'
      };

      const payload = {
        model,
        messages: [
          systemMessage,
          ...recentHistory,
          { role: 'user', content: `${currentSenderName}: ${cleanUserText || userPrompt}` }
        ],
        temperature: 0.7,
        max_tokens: 1200
      };

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API responded with ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      const replyText = data.choices?.[0]?.message?.content || 'No response generated.';

      const urls = extractUrls(replyText);

      await addDoc(collection(db, PLANNING_MESSAGES_COLLECTION), {
        senderId: 'ai',
        senderName: 'AI Partner',
        text: replyText,
        linkUrl: urls.length > 0 ? urls[0] : undefined,
        timestamp: Date.now(),
        isAi: true,
        aiProvider: provider,
        aiModel: model
      });
    } catch (err: any) {
      console.error('AI generation error:', err);
      await addDoc(collection(db, PLANNING_MESSAGES_COLLECTION), {
        senderId: 'ai',
        senderName: 'AI Partner',
        text: `⚠️ Error fetching AI response (${provider.toUpperCase()}): ${err.message || 'Network/Key error'}. Please verify your API Key and Model in ⚙️ Settings.`,
        timestamp: Date.now(),
        isAi: true,
        aiProvider: provider,
        aiModel: 'Error'
      });
    } finally {
      setIsAiThinking(false);
    }
  };

  // Clear all messages
  const handleClearChat = async () => {
    try {
      for (const m of messages) {
        await deleteDoc(doc(db, PLANNING_MESSAGES_COLLECTION, m.id));
      }
      setShowClearConfirm(false);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] max-w-5xl mx-auto rounded-3xl overflow-hidden border border-[#22303c] bg-[#0b141a] text-slate-100 shadow-2xl relative">
      
      {/* ===================== WHATSAPP-STYLE HEADER ===================== */}
      <div className="bg-[#1f2c34] border-b border-[#2b3942] px-4 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          {/* Avatar / Room Icon */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center font-black text-white shadow-md">
              KN
            </div>
            <span className="w-3 h-3 rounded-full bg-[#25d366] border-2 border-[#1f2c34] absolute bottom-0 right-0 shadow-[0_0_8px_#25d366]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                KN Builders <span className="text-emerald-400 font-semibold">• Project Plan Room</span>
              </h2>
            </div>
            <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
              <span>Admin & Partner Private Workspace</span>
              <span className="text-emerald-400 font-bold">• Live Sync</span>
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Identity Toggle Dropdown */}
          <div className="flex items-center bg-[#111b21] border border-[#2a3942] rounded-xl px-2.5 py-1 text-xs text-slate-200">
            <span className="text-[10px] text-slate-400 mr-1.5 hidden sm:inline">Speaking as:</span>
            <select
              value={currentSenderId}
              onChange={(e) => {
                const id = e.target.value;
                const name = id === 'partner_1' ? 'Admin 1 (Karan)' : id === 'partner_2' ? 'Admin 2 (Partner)' : 'KN Co-Founder';
                handleSwitchSender(id, name);
              }}
              className="bg-transparent text-emerald-400 font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="partner_1" className="bg-[#1f2c34] text-white">Admin 1 (Karan)</option>
              <option value="partner_2" className="bg-[#1f2c34] text-white">Admin 2 (Partner)</option>
              <option value="partner_guest" className="bg-[#1f2c34] text-white">KN Team</option>
            </select>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            title="AI API & Model Settings"
            className="p-2 rounded-xl bg-[#2a3942] hover:bg-[#374955] text-slate-200 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
          >
            <Settings className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">AI Settings</span>
          </button>

          {/* Clear Chat */}
          <button
            onClick={() => setShowClearConfirm(true)}
            title="Clear Chat History"
            className="p-2 rounded-xl bg-[#2a3942] hover:bg-red-950/60 text-slate-300 hover:text-red-400 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===================== CHAT MESSAGES CONTAINER ===================== */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5"
        style={{
          backgroundColor: '#0b141a',
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(37, 211, 102, 0.03) 0%, transparent 60%)'
        }}
      >
        {/* Intro Banner */}
        <div className="max-w-md mx-auto my-3 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-medium bg-[#182229] border border-[#233138] text-slate-300 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>End-to-end admin encrypted planning room</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Tip: Type <span className="text-emerald-400 font-bold px-1 py-0.5 rounded bg-[#182229]">@ai</span> anywhere in your message to have AI respond and plan with you & your partner!
          </p>
        </div>

        {/* Message List */}
        {messages.length === 0 && (
          <div className="text-center py-12 text-slate-400 space-y-2">
            <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No planning messages yet.</p>
            <p className="text-xs text-slate-500">
              Start chatting with your partner or send photos, ideas, links and @ai mentions!
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMine = msg.senderId === currentSenderId && !msg.isAi;
          const isAi = msg.isAi;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isAi ? 'items-start max-w-2xl' : isMine ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-3.5 py-2.5 max-w-[85%] sm:max-w-[75%] shadow-md text-sm transition-all relative ${
                  isAi
                    ? 'bg-[#182229] border border-[#2a3e4d] text-slate-100 rounded-tl-sm'
                    : isMine
                    ? 'bg-[#005c4b] text-white rounded-tr-sm'
                    : 'bg-[#202c33] text-slate-100 rounded-tl-sm'
                }`}
              >
                {/* Sender Name header */}
                {!isMine && (
                  <div className="flex items-center gap-1.5 pb-1 mb-1 border-b border-white/10 text-xs">
                    {isAi ? (
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Bot className="w-3.5 h-3.5" />
                        AI Planning Partner
                        {msg.aiModel && (
                          <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-black/30 text-slate-300">
                            {msg.aiModel}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="font-bold text-sky-400 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {msg.senderName}
                      </span>
                    )}
                  </div>
                )}

                {/* Attached Image */}
                {msg.imageUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden cursor-pointer group relative">
                    <img
                      src={msg.imageUrl}
                      alt="Shared media"
                      onClick={() => setPreviewZoomImage(msg.imageUrl || null)}
                      className="max-h-72 w-full object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-xs font-semibold text-white">
                      Click to view full size
                    </div>
                  </div>
                )}

                {/* Text Content */}
                {msg.text && (
                  <p className="whitespace-pre-wrap leading-relaxed select-text font-normal text-xs sm:text-sm">
                    {msg.text}
                  </p>
                )}

                {/* Extracted Clickable Link */}
                {msg.linkUrl && (
                  <div className="mt-2 pt-1.5 border-t border-white/10">
                    <a
                      href={msg.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 underline break-all font-medium"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span>{msg.linkUrl}</span>
                    </a>
                  </div>
                )}

                {/* Timestamp & Status */}
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-300/80 mt-1">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {isMine && <CheckCheck className="w-3.5 h-3.5 text-sky-300" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {isAiThinking && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#182229] border border-[#2a3e4d] text-xs text-emerald-400 max-w-xs animate-pulse">
            <Bot className="w-4 h-4 animate-bounce" />
            <span className="font-semibold">AI Planning Partner is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ===================== IMAGE ATTACHMENT PREVIEW TRAY ===================== */}
      {attachedImage && (
        <div className="bg-[#1f2c34] px-4 py-2 flex items-center justify-between border-t border-[#2b3942]">
          <div className="flex items-center gap-3">
            <img
              src={attachedImage}
              alt="Preview"
              className="w-12 h-12 rounded-lg object-cover border border-emerald-500/50"
            />
            <span className="text-xs text-slate-300 font-medium">Photo ready to send</span>
          </div>
          <button
            onClick={() => setAttachedImage(null)}
            className="p-1 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ===================== WHATSAPP-STYLE INPUT BAR ===================== */}
      <div className="bg-[#1f2c34] border-t border-[#2b3942] p-2.5 sm:p-3 shrink-0">
        {/* Quick @ai suggestion chip */}
        <div className="flex items-center gap-2 mb-2 px-1">
          <button
            type="button"
            onClick={() => setInputText((prev) => (prev.includes('@ai') ? prev : `@ai ${prev}`))}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#111b21] hover:bg-[#202c33] border border-emerald-500/40 text-emerald-400 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
          >
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span>Mention @ai</span>
          </button>
          <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
            Active Provider: <strong className="text-white capitalize">{settingsProvider}</strong>
          </span>
        </div>

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* File input for photos */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Photo attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Send Photo"
            className="w-10 h-10 rounded-full bg-[#2a3942] hover:bg-[#374955] text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
          >
            <ImageIcon className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message or use @ai to ask AI..."
            className="flex-1 bg-[#2a3942] border border-transparent focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none transition-all"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={isSending || (!inputText.trim() && !attachedImage)}
            className="w-11 h-11 rounded-full bg-[#00a884] hover:bg-[#02906f] disabled:opacity-40 disabled:hover:bg-[#00a884] text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shrink-0 active:scale-95"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </form>
      </div>

      {/* ===================== FULL SCREEN IMAGE ZOOM MODAL ===================== */}
      {previewZoomImage && (
        <div
          onClick={() => setPreviewZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in cursor-zoom-out"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewZoomImage}
              alt="Zoomed"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain mx-auto"
            />
            <button
              onClick={() => setPreviewZoomImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ===================== AI SETTINGS MODAL ===================== */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-[#111b21] border border-[#2a3942] rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#22303c]">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">AI Planning Partner Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-full hover:bg-[#202c33] text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Configure your AI API to enable human-like planning responses whenever you or your partner type <strong className="text-emerald-400">@ai</strong> in the chat.
            </p>

            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Select AI Provider</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSettingsProvider('openrouter');
                    setSettingsModel('deepseek/deepseek-r1');
                  }}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    settingsProvider === 'openrouter'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-lg'
                      : 'bg-[#182229] border-[#253238] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm">🌐 OpenRouter</span>
                  <span className="text-[10px] font-normal text-slate-400">openrouter.ai</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsProvider('nvidia');
                    setSettingsModel('meta/llama-3.1-70b-instruct');
                  }}
                  className={`p-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    settingsProvider === 'nvidia'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-lg'
                      : 'bg-[#182229] border-[#253238] text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm">⚡ NVIDIA NIM</span>
                  <span className="text-[10px] font-normal text-slate-400">integrate.api.nvidia.com</span>
                </button>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  {settingsProvider === 'openrouter' ? 'OpenRouter API Key' : 'NVIDIA API Key'} *
                </label>
                <a
                  href={settingsProvider === 'openrouter' ? 'https://openrouter.ai/keys' : 'https://build.nvidia.com/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  Get Key →
                </a>
              </div>

              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settingsApiKey}
                  onChange={(e) => setSettingsApiKey(e.target.value)}
                  placeholder={settingsProvider === 'openrouter' ? 'sk-or-v1-...' : 'nvapi-...'}
                  className="w-full bg-[#182229] border border-[#253238] rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Saved securely in your private Firestore database so both partners share it automatically.
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">AI Model</label>
              <select
                value={settingsModel}
                onChange={(e) => {
                  setSettingsModel(e.target.value);
                  setCustomModelInput('');
                }}
                className="w-full bg-[#182229] border border-[#253238] rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {(settingsProvider === 'openrouter' ? OPENROUTER_MODELS : NVIDIA_MODELS).map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#111b21]">
                    {m.name} ({m.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Model Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400">Or type custom model name (optional):</label>
              <input
                type="text"
                value={customModelInput}
                onChange={(e) => setCustomModelInput(e.target.value)}
                placeholder="e.g. deepseek/deepseek-r1 or meta/llama-3.1-70b-instruct"
                className="w-full bg-[#182229] border border-[#253238] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#22303c]">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-xl bg-[#1f2c34] hover:bg-[#2b3942] text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-5 py-2 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-xs font-bold text-white shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {settingsSavedToast ? <Check className="w-4 h-4" /> : null}
                <span>{settingsSavedToast ? 'Saved!' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== CLEAR CHAT CONFIRMATION MODAL ===================== */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#111b21] border border-[#2a3942] rounded-3xl p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Clear Planning Chat?</h3>
            <p className="text-xs text-slate-400">
              This will remove all chat messages and shared media for both admins.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="py-2.5 rounded-xl bg-[#1f2c34] text-xs font-semibold text-slate-300 hover:bg-[#2b3942]"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
