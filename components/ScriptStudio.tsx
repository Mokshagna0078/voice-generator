/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Voice, AiRecommendation } from '../types';
import { GoogleGenAI, Modality } from '../genaiProxy';
import AudioVisualizer from './AudioVisualizer';
import { 
  Play, 
  Square, 
  Loader2, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  Train, 
  Sliders, 
  Volume2, 
  RefreshCw, 
  Share2, 
  FileText,
  AlertCircle,
  Clock,
  Briefcase,
  Calendar,
  GraduationCap,
  IndianRupee,
  ChevronRight,
  Gauge
} from 'lucide-react';

interface ScriptStudioProps {
  voices: Voice[];
  onOpenAiCastingWithPrompt?: (prompt: string) => void;
  onClose?: () => void;
}

export const RRB_TELUGU_SCRIPT = `రైల్వేస్ నుండి RRB Station Master 2026 నోటిఫికేషన్ వచ్చేసింది! మొత్తం 1,215 vacancies ఉన్నాయి. మీ దగ్గర ఒక Degree ఉంటే చాలు, దీనికి apply చేసుకోవచ్చు.

మీ Age 20 నుంచి 33 years మధ్యలో ఉండాలి. Starting salaryనే అన్ని allowances కలిపి నెలకు దాదాపు ₹65,000 పైగా వచ్చే అవకాశం ఉంది. Online applicationsకి last date November 25, 2026.

అయితే ఇక్కడ మీరు ముఖ్యంగా తెలుసుకోవాల్సిన విషయం ఏంటంటే… ఈ పోస్టుకి selection processలో ఎన్ని stages ఉంటాయి? ఒక్క CBT examతోనే job వస్తుందా, లేక ఇంకా tests ఉంటాయా?

మరి అసలు syllabus ఏంటి? Zone-wise ఎక్కడ ఎన్ని vacancies ఉన్నాయి? అనే పూర్తి వివరాలతో detailed long video చేశాను. కింద కనిపిస్తున్న Related Video link క్లిక్ చేసి ఇప్పుడే complete information చూసేయండి!`;

export const SCRIPT_PRESETS = [
  {
    id: 'rrb-telugu-short',
    title: 'RRB Station Master 2026 (తెలుగు YouTube Short)',
    badge: 'Trending Job Alert',
    language: 'Telugu / తెలుగు',
    category: 'YouTube Short / Reel',
    style: 'High Energy, Urgent, Engaging News Anchor',
    recommendedVoice: 'Puck',
    text: RRB_TELUGU_SCRIPT,
    translation: `The RRB Station Master 2026 notification from Railways is here! There are a total of 1,215 vacancies. Having any degree is enough to apply.

Your age must be between 20 and 33 years. Starting salary including all allowances is expected to be over ₹65,000 per month. The last date for online applications is November 25, 2026.

Crucial question: How many stages are in the selection process? Will one CBT exam secure the job, or are there further tests?

What about the syllabus and zone-wise vacancy breakdown? I've made a comprehensive video with all details. Click the Related Video link below to watch the complete guide right now!`
  },
  {
    id: 'rrb-english-alert',
    title: 'RRB Station Master 2026 (English Announcement)',
    badge: 'Official Alert',
    language: 'English',
    category: 'Announcement',
    style: 'Confident, Energetic, Clear Articulation',
    recommendedVoice: 'Fenrir',
    text: `Big news for job seekers! Indian Railways has officially released the RRB Station Master 2026 recruitment notification with 1,215 open vacancies across all zones.

If you hold any graduation degree and are between 20 to 33 years old, you are eligible to apply. Starting salary starts at over ₹65,000 per month with complete central government allowances.

The deadline to submit online applications is November 25, 2026. Don't miss this opportunity—check out our full step-by-step syllabus and preparation video linked below!`,
    translation: ''
  },
  {
    id: 'custom',
    title: 'Custom Script (మీ స్వంత స్క్రిప్ట్)',
    badge: 'Custom',
    language: 'Any Language',
    category: 'Freeform',
    style: 'Adaptable',
    recommendedVoice: 'Kore',
    text: '',
    translation: ''
  }
];

function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const ScriptStudio: React.FC<ScriptStudioProps> = ({ voices, onOpenAiCastingWithPrompt }) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('rrb-telugu-short');
  const [scriptText, setScriptText] = useState<string>(RRB_TELUGU_SCRIPT);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('Puck');
  const [deliveryStyle, setDeliveryStyle] = useState<string>('High Energy YouTube Reel Host with urgent breaking news pacing');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Audio State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(-1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Top recommended voices for energetic announcements
  const recommendedVoiceNames = ['Puck', 'Fenrir', 'Kore', 'Charon', 'Aoede', 'Zephyr'];
  const featuredVoices = useMemo(() => {
    return recommendedVoiceNames
      .map(name => voices.find(v => v.name === name))
      .filter((v): v is Voice => !!v);
  }, [voices]);

  const currentVoice = useMemo(() => {
    return voices.find(v => v.name === selectedVoiceName) || voices[0];
  }, [voices, selectedVoiceName]);

  // Breakdown script into sentences
  const sentences = useMemo(() => {
    return scriptText
      .split(/(?<=[.?!।\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }, [scriptText]);

  // Estimated reading duration (Telugu/English ~ 140 words per minute)
  const estimatedDuration = useMemo(() => {
    const wordCount = scriptText.trim().split(/\s+/).filter(Boolean).length;
    const seconds = Math.round((wordCount / 140) * 60);
    return seconds > 0 ? `${seconds} sec` : '0 sec';
  }, [scriptText]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  // Update speed when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = SCRIPT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      if (preset.id !== 'custom') {
        setScriptText(preset.text);
        if (preset.recommendedVoice) {
          setSelectedVoiceName(preset.recommendedVoice);
        }
        setDeliveryStyle(preset.style);
      }
      setAudioUrl(null);
      setIsPlaying(false);
      setActiveSentenceIndex(-1);
    }
  };

  const handleGenerateAndPlay = async () => {
    if (!scriptText.trim()) return;

    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // If audio already generated and paused, resume playback
    if (audioUrl && audioRef.current && !isLoading) {
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Playback resume failed:", err));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: "server-side" });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash-lite-tts",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: scriptText,
                speechMetadata: {
                  style: deliveryStyle,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoiceName },
            },
          },
        },
      });

      if (!isMountedRef.current) return;

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("No speech audio returned from Gemini TTS.");
      }

      const rawBytes = decodeBase64(base64Audio);
      const blob = new Blob([rawBytes], { type: "audio/wav" });
      const newUrl = URL.createObjectURL(blob);

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(newUrl);

      // Initialize native audio element
      if (audioRef.current) {
        audioRef.current.src = newUrl;
        audioRef.current.playbackRate = playbackSpeed;
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err: any) {
      console.error("Speech Generation Error:", err);
      if (isMountedRef.current) {
        setError(err.message || "Failed to generate speech. Please try again.");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current || sentences.length === 0) return;
    const { currentTime, duration } = audioRef.current;
    if (duration > 0) {
      const progress = currentTime / duration;
      const index = Math.min(
        Math.floor(progress * sentences.length),
        sentences.length - 1
      );
      setActiveSentenceIndex(index);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setActiveSentenceIndex(-1);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `RRB_Station_Master_2026_${selectedVoiceName}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAiCastScript = () => {
    if (onOpenAiCastingWithPrompt) {
      const prompt = `Find the ideal energetic Indian voice actor for an Indian Railways RRB Station Master 2026 YouTube Short announcement in Telugu. The persona should be an engaging, enthusiastic, and confident young educator / YouTuber delivering urgent breaking recruitment news: "${scriptText.slice(0, 150)}..."`;
      onOpenAiCastingWithPrompt(prompt);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6 animate-fade-in overflow-y-auto">
      
      {/* Top Banner: RRB Station Master Notification Highlights */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-blue-500/10 border border-amber-500/20 dark:border-amber-400/20 p-5 sm:p-6 backdrop-blur-sm shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                <Train size={13} className="animate-pulse" />
                రైల్వేస్ RRB 2026 Recruitment
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Telugu Voice-Over Studio
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-900 dark:text-white tracking-tight">
              RRB Station Master 2026 Voiceover Studio
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 max-w-2xl font-light">
              Audition, customize, and generate high-fidelity Telugu or English speech audio using Gemini 3.8 Flash TTS for your YouTube Shorts, Reels, and announcement videos.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleAiCastScript}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles size={16} className="text-yellow-300" />
              <span>AI Cast For This Script</span>
            </button>
          </div>
        </div>

        {/* Quick Recruitment Key Facts Card */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mt-5 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 dark:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-700/60">
            <Briefcase size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Vacancies</div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white">1,215 Posts</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 dark:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-700/60">
            <GraduationCap size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Eligibility</div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white">Any Degree</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 dark:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-700/60">
            <Clock size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Age Limit</div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white">20 - 33 Years</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 dark:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-700/60">
            <IndianRupee size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Starting Pay</div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white">₹65,000+ / mo</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-xl bg-white/70 dark:bg-zinc-800/70 border border-zinc-200/60 dark:border-zinc-700/60 col-span-2 sm:col-span-1">
            <Calendar size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Last Date</div>
              <div className="text-xs font-bold text-rose-600 dark:text-rose-400">Nov 25, 2026</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Studio Workspace: 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (7 cols): Script Editor, Presets & Teleprompter */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Preset Selector Bar */}
          <div className="flex items-center justify-between gap-2 bg-white dark:bg-zinc-800/80 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
              {SCRIPT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    selectedPresetId === preset.id
                      ? 'bg-zinc-900 dark:bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  {preset.title}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors ${
                  showTranslation 
                    ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' 
                    : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-white'
                }`}
                title="Toggle English Translation"
              >
                {showTranslation ? 'Hide English' : 'English Meaning'}
              </button>
            </div>
          </div>

          {/* Script Textarea & Teleprompter */}
          <div className="bg-white dark:bg-zinc-800/90 rounded-3xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-sm flex flex-col gap-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Script Content ({sentences.length} sentences • Est. ~{estimatedDuration})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyScript}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy Script'}</span>
                </button>
              </div>
            </div>

            {/* Editable Telugu Script Textarea */}
            <textarea
              value={scriptText}
              onChange={(e) => {
                setScriptText(e.target.value);
                setAudioUrl(null);
                setIsPlaying(false);
              }}
              rows={8}
              placeholder="ఇక్కడ మీ తెలుగు లేదా ఇంగ్లీష్ స్క్రిప్ట్‌ను నమోదు చేయండి..."
              className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl p-4 text-base sm:text-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans leading-relaxed resize-y"
            />

            {/* Sentence Breakdown & Teleprompter View */}
            {isPlaying && (
              <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                  Teleprompter Live Reader
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {sentences.map((sent, idx) => (
                    <div 
                      key={idx}
                      className={`text-sm px-2.5 py-1.5 rounded-lg transition-all ${
                        activeSentenceIndex === idx 
                          ? 'bg-indigo-600 text-white font-medium shadow-sm scale-[1.01]' 
                          : 'text-zinc-600 dark:text-zinc-400 opacity-70'
                      }`}
                    >
                      {sent}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* English Translation View */}
            {showTranslation && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans">
                <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5">
                  English Reference & Key Takeaways
                </div>
                <p className="whitespace-pre-line text-xs sm:text-sm">
                  {SCRIPT_PRESETS.find(p => p.id === selectedPresetId)?.translation ||
                    "This script announces the official Indian Railways RRB Station Master 2026 recruitment for 1,215 positions, highlighting qualification (Any Degree), age criteria (20-33), pay scale (~₹65,000+), online application deadline (Nov 25, 2026), and directing viewers to the full detailed video."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Voice Selection, Style & Live Audio Player */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Voice Selector Card */}
          <div className="bg-white dark:bg-zinc-800/90 rounded-3xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                <Volume2 size={15} />
                Selected Voice Persona
              </span>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                Gemini 3.8 Flash Lite TTS
              </span>
            </div>

            {/* Recommended Voices Quick Selector */}
            <div className="grid grid-cols-3 gap-2">
              {featuredVoices.map((voice) => {
                const isSelected = selectedVoiceName === voice.name;
                return (
                  <button
                    key={voice.name}
                    onClick={() => {
                      setSelectedVoiceName(voice.name);
                      setAudioUrl(null);
                      setIsPlaying(false);
                    }}
                    className={`flex flex-col items-center p-2.5 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden mb-1.5 bg-zinc-200 dark:bg-zinc-700 relative">
                      <img 
                        src={voice.imageUrl} 
                        alt={voice.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to initials if image fails
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }} 
                      />
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-zinc-600 dark:text-zinc-300">
                        {voice.name[0]}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                      {voice.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {voice.analysis.gender} • {voice.pitch}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Full Voice Dropdown for all 30 voices */}
            <div className="relative">
              <label className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1 block">
                Or Browse All 30 Library Voices
              </label>
              <select
                value={selectedVoiceName}
                onChange={(e) => {
                  setSelectedVoiceName(e.target.value);
                  setAudioUrl(null);
                  setIsPlaying(false);
                }}
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 py-2.5 px-3 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {voices.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} — {voice.analysis.gender} ({voice.characteristics.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Delivery Tone Preset */}
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5 block flex items-center justify-between">
                <span>Speech Delivery & Tone</span>
                <Sliders size={13} />
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: '🔥 Urgent Reel Host', style: 'High Energy YouTube Reel Host with urgent breaking news pacing' },
                  { label: '📢 Official Alert', style: 'Clear, authoritative Indian Railways official recruitment announcement' },
                  { label: '🎓 Friendly Educator', style: 'Warm, engaging teacher explaining exam syllabus and eligibility' },
                  { label: '⚡ Fast & Punchy', style: 'Fast-paced, dynamic voice with sharp articulation for 30s short' }
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setDeliveryStyle(item.style)}
                    className={`p-2 rounded-xl text-xs text-left transition-all border ${
                      deliveryStyle === item.style
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold border-zinc-900 dark:border-white shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Playback Speed Controller */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5">
                <Gauge size={14} />
                Playback Speed:
              </span>
              <div className="flex items-center gap-1">
                {[0.8, 1.0, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      playbackSpeed === spd
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Player & Visualizer Card */}
          <div className="bg-white dark:bg-zinc-800/90 rounded-3xl border border-zinc-200 dark:border-zinc-700 p-5 shadow-lg flex flex-col gap-4">
            
            {/* Visualizer Waveform Screen */}
            <div className="h-28 w-full bg-zinc-900 rounded-2xl relative overflow-hidden flex items-center justify-center border border-zinc-800">
              <div 
                className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '12px 12px' }}
              ></div>

              <div className="relative z-10 w-full h-full flex items-center justify-center px-4">
                {isPlaying ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <AudioVisualizer isPlaying={true} color="#818cf8" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-zinc-500">
                    <Volume2 size={24} className="text-zinc-600 animate-pulse" />
                    <span className="text-xs font-medium tracking-wide">
                      {audioUrl ? 'Ready to play' : 'Click "Generate Voiceover" below'}
                    </span>
                  </div>
                )}
              </div>

              {/* Status pill overlay */}
              <div className="absolute top-2.5 left-3 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-ping' : 'bg-zinc-600'}`}></span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                  {currentVoice.name} • {deliveryStyle.split(' ')[0]}
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Main Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateAndPlay}
                disabled={isLoading || !scriptText.trim()}
                className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-md ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-zinc-900 dark:bg-indigo-600 hover:bg-zinc-800 dark:hover:bg-indigo-500 text-white'
                } ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin text-white" />
                    <span>Gemini TTS Generating...</span>
                  </>
                ) : isPlaying ? (
                  <>
                    <Square size={18} className="fill-current" />
                    <span>Pause Speech</span>
                  </>
                ) : (
                  <>
                    <Play size={18} className="fill-current" />
                    <span>{audioUrl ? 'Play Voiceover' : 'Generate & Play Speech'}</span>
                  </>
                )}
              </button>

              {/* Download .WAV Button */}
              {audioUrl && (
                <button
                  onClick={handleDownload}
                  className="p-3.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white transition-all shadow-sm"
                  title="Download .WAV audio for your video"
                >
                  <Download size={20} />
                </button>
              )}
            </div>

            {/* Info footer */}
            <div className="flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-1">
              <span>Model: <strong className="text-zinc-600 dark:text-zinc-400">gemini-3.8-flash-lite-tts</strong></span>
              <span>24kHz 16-bit Mono WAV</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Native Audio Element for playback synchronization */}
      <audio 
        ref={audioRef}
        onTimeUpdate={handleAudioTimeUpdate}
        onEnded={handleAudioEnded}
        onError={() => setIsPlaying(false)}
      />
    </div>
  );
};

export default ScriptStudio;
