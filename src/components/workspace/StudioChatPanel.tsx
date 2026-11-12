import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Upload,
  Sparkles,
  Check,
  AlertTriangle,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Crosshair,
} from 'lucide-react';
import { Characteristic, DrawingSpec } from '../../types/metrology';

export interface ChatMessage {
  id: string;
  sender: 'agent' | 'user';
  text?: string;
  type?: 'text' | 'step' | 'summary' | 'review_card' | 'characteristic_card';
  timestamp: string;
  characteristic?: Characteristic;
  flaggedItems?: Characteristic[];
  stepData?: {
    balloonNumber: number;
    callout: string;
    zone: string;
  };
}

interface StudioChatPanelProps {
  currentDrawing: DrawingSpec;
  characteristics: Characteristic[];
  activeBalloon: Characteristic | null;
  isStreaming: boolean;
  streamingCount: number;
  totalStreamingCount: number;
  isPaused: boolean;
  onPauseResume: () => void;
  onUploadPdf: (file: File) => void;
  onLoadSample: () => void;
  onSendMessage: (query: string) => void;
  onSelectBalloon: (id: string) => void;
  onUpdateCharacteristic: (id: string, updates: Partial<Characteristic>) => void;
  onDeleteCharacteristic: (id: string) => void;
  onApproveAll: () => void;
  onExportExcel: () => void;
  messages: ChatMessage[];
  onClearChat: () => void;
  isSampleData: boolean;
  darkMode?: boolean;
}

export const StudioChatPanel: React.FC<StudioChatPanelProps> = ({
  currentDrawing: _currentDrawing,
  characteristics,
  activeBalloon: _activeBalloon,
  isStreaming,
  streamingCount,
  totalStreamingCount,
  isPaused,
  onPauseResume,
  onUploadPdf,
  onLoadSample,
  onSendMessage,
  onSelectBalloon,
  onUpdateCharacteristic,
  onDeleteCharacteristic,
  onApproveAll,
  onExportExcel,
  messages,
  onClearChat,
  isSampleData: _isSampleData,
  darkMode = true,
}) => {
  const [inputText, setInputText] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming, streamingCount]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const hasDrawing = characteristics.length > 0 || isStreaming;

  return (
    <div
      className={`w-[380px] min-w-[340px] max-w-[420px] h-full flex flex-col border-r font-sans text-xs select-none transition-colors ${
        darkMode
          ? 'border-slate-800 bg-slate-950 text-slate-200'
          : 'border-slate-200 bg-white text-slate-800'
      }`}
    >
      {/* 1. Agent Header */}
      <div
        className={`h-12 px-4 border-b flex items-center justify-between shrink-0 ${
          darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-7 h-7 rounded-lg bg-[#0047AB] flex items-center justify-center text-white font-mono text-xs font-bold">
              SB
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 animate-pulse ${
                darkMode ? 'ring-slate-950' : 'ring-white'
              }`}
            />
          </div>
          <div>
            <div
              className={`font-semibold flex items-center gap-1.5 ${
                darkMode ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              <span>SpecBalloon Agent</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[9.5px] font-mono ${
                  darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                }`}
              >
                v2.5 Vision
              </span>
            </div>
            <div
              className={`text-[10px] font-mono truncate max-w-[190px] ${
                darkMode ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Gemini Flash + Metrology Core
            </div>
          </div>
        </div>

        <button
          onClick={onClearChat}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            darkMode
              ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              : 'hover:bg-slate-200 text-slate-500 hover:text-slate-800'
          }`}
          title="Reset conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Scrollable Message Feed */}
      <div
        ref={chatScrollRef}
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${
          darkMode ? 'text-slate-200 bg-slate-950' : 'text-slate-800 bg-white'
        }`}
      >
        {/* Empty Drop Zone inside Chat (shown when no drawing is loaded) */}
        {!hasDrawing && (
          <div className="space-y-4">
            <div
              className={`p-3.5 rounded-xl border leading-relaxed ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <p
                className={`font-semibold mb-1.5 flex items-center gap-1.5 ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0047AB] dark:text-[#38BDF8]" />
                <span>Autonomous Metrology Agent</span>
              </p>
              <p
                className={`text-xs leading-relaxed ${
                  darkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                SpecBalloon Autonomous Metrology Agent ready. Drop a drawing or pick a sample above to begin auto-ballooning.
              </p>
            </div>

            {/* Drag & Drop Area */}
            <div
              className={`p-4 rounded-xl border border-dashed transition-colors text-center space-y-2.5 ${
                darkMode
                  ? 'border-slate-800 hover:border-[#0047AB] bg-slate-900/60'
                  : 'border-slate-300 hover:border-[#0047AB] bg-slate-50'
              }`}
            >
              <div className="w-9 h-9 mx-auto rounded-lg bg-[#0047AB]/15 text-[#0047AB] dark:text-[#38BDF8] flex items-center justify-center border border-[#0047AB]/30">
                <Upload className="w-4 h-4" />
              </div>
              <div>
                <div
                  className={`font-semibold text-xs ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Drop a 2D CAD PDF here
                </div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  Vector PDF up to 5 sheets, 10MB
                </div>
              </div>

              <div className="pt-1">
                <label className="inline-block px-3.5 py-1.5 rounded-lg bg-[#0047AB] hover:bg-[#003887] text-white font-mono text-xs font-semibold cursor-pointer transition-colors shadow-sm">
                  <span>Browse File</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onUploadPdf(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              <div
                className={`pt-2 border-t ${
                  darkMode ? 'border-slate-800/80' : 'border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={onLoadSample}
                  className="text-xs font-mono font-medium text-[#0047AB] dark:text-[#38BDF8] hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <span>⚡ Try Aerospace Sample (AS-4092-C)</span>
                </button>
              </div>
            </div>

            {/* Suggested Prompts */}
            <div className="space-y-1.5 pt-1">
              <div
                className={`text-[10px] font-mono uppercase tracking-wider ${
                  darkMode ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Suggested Prompts
              </div>
              <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                {[
                  'How does auto-ballooning work?',
                  'Supported GD&T standards',
                  'AS9102 export specs',
                ].map((promptText, i) => (
                  <button
                    key={i}
                    onClick={() => onSendMessage(promptText)}
                    className={`text-left px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                      darkMode
                        ? 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Streaming Active Progress Bar */}
        {isStreaming && (
          <div
            className={`p-3.5 rounded-xl border shadow-lg space-y-2.5 ${
              darkMode
                ? 'border-[#0047AB]/50 bg-slate-900/90'
                : 'border-[#0047AB]/40 bg-slate-50 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0047AB] dark:bg-[#38BDF8] animate-ping" />
                <span
                  className={`font-semibold text-xs ${
                    darkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {isPaused ? 'Streaming Paused' : 'Auto-Ballooning Drawing…'}
                </span>
              </div>
              <button
                onClick={onPauseResume}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-mono cursor-pointer ${
                  darkMode
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>
            </div>

            <div
              className={`flex items-center justify-between text-[11px] font-mono ${
                darkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <span>Balloons Placed</span>
              <span className="text-[#0047AB] dark:text-[#38BDF8] font-bold">
                {streamingCount} / {totalStreamingCount} found
              </span>
            </div>

            <div
              className={`h-1.5 w-full rounded-full overflow-hidden ${
                darkMode ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            >
              <div
                className="h-full bg-[#0047AB] transition-all duration-150"
                style={{
                  width: `${
                    totalStreamingCount > 0
                      ? Math.min(100, Math.round((streamingCount / totalStreamingCount) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Dynamic Chat Messages */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          if (isUser) {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#0047AB] text-white px-3.5 py-2.5 shadow-sm text-xs leading-relaxed">
                  {msg.text}
                </div>
              </div>
            );
          }

          // Step Narration (placed balloon)
          if (msg.type === 'step' && msg.stepData) {
            return (
              <div
                key={msg.id}
                className={`flex items-center gap-2 font-mono text-[11px] p-2 rounded-lg border ${
                  darkMode
                    ? 'text-slate-300 bg-slate-900/60 border-slate-800/80'
                    : 'text-slate-800 bg-slate-50 border-slate-200'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-[#0047AB] dark:text-[#38BDF8] font-bold">
                  #{msg.stepData.balloonNumber < 10 ? `0${msg.stepData.balloonNumber}` : msg.stepData.balloonNumber}:
                </span>
                <span
                  className={`truncate ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}
                >
                  {msg.stepData.callout}
                </span>
                <span
                  className={`text-[10px] shrink-0 ${
                    darkMode ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  [{msg.stepData.zone}]
                </span>
              </div>
            );
          }

          // Summary Card
          if (msg.type === 'summary') {
            return (
              <div
                key={msg.id}
                className={`p-4 rounded-xl border space-y-3 ${
                  darkMode
                    ? 'border-emerald-500/40 bg-slate-900'
                    : 'border-emerald-500/30 bg-emerald-50/40 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Auto-Ballooning Complete</span>
                </div>
                <div
                  className={`text-xs leading-relaxed font-sans ${
                    darkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {msg.text || '17 dimensions extracted across Sheet 1.'}
                </div>

                <button
                  onClick={onApproveAll}
                  className="w-full py-2.5 rounded-lg bg-[#0047AB] hover:bg-[#003887] text-white text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve All & Export AS9102</span>
                </button>
              </div>
            );
          }

          // Flagged Review Card
          if (msg.type === 'review_card' && msg.flaggedItems) {
            return (
              <div
                key={msg.id}
                className={`p-3.5 rounded-xl border space-y-3 ${
                  darkMode
                    ? 'border-amber-500/40 bg-slate-900'
                    : 'border-amber-500/30 bg-amber-50/30 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between text-amber-500 dark:text-amber-400 font-semibold text-xs">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Low-Confidence Review Queue</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300">
                    {msg.flaggedItems.length} Need Review
                  </span>
                </div>

                <div className="space-y-2">
                  {msg.flaggedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-lg border font-mono text-[11px] space-y-1.5 ${
                        darkMode
                          ? 'border-slate-800 bg-slate-950'
                          : 'border-slate-200 bg-white shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0047AB] dark:text-[#38BDF8]">
                          Tag #{item.balloonNumber} ({item.zone})
                        </span>
                        <span className="text-amber-500 dark:text-amber-400 font-semibold text-[10px]">
                          {Math.round(item.confidence)}% confidence
                        </span>
                      </div>
                      <div
                        className={`font-bold ${
                          darkMode ? 'text-slate-200' : 'text-slate-900'
                        }`}
                      >
                        {item.rawCallout}
                      </div>
                      <div
                        className={`text-[10px] ${
                          darkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {item.featureDescription}
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => {
                            onUpdateCharacteristic(item.id, {
                              reviewed: true,
                              confidence: 95,
                            });
                          }}
                          className="flex-1 py-1 rounded bg-[#0047AB] hover:bg-[#003887] text-white text-[10.5px] font-semibold cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => onSelectBalloon(item.id)}
                          className={`px-2 py-1 rounded text-[10.5px] cursor-pointer ${
                            darkMode
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          }`}
                        >
                          Locate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Characteristic Detail Card (Injected on canvas click or search)
          if (msg.type === 'characteristic_card' && msg.characteristic) {
            const char = msg.characteristic;
            const inSpec = char.status === 'in_spec';

            return (
              <div
                key={msg.id}
                className={`p-3.5 rounded-xl border shadow-md space-y-3 font-mono text-xs ${
                  darkMode
                    ? 'border-[#0047AB]/40 bg-slate-900'
                    : 'border-[#0047AB]/30 bg-white shadow-sm'
                }`}
              >
                <div
                  className={`flex items-center justify-between pb-2 border-b ${
                    darkMode ? 'border-slate-800' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-[#0047AB] text-white font-bold text-[11px]">
                      BALLOON #{char.balloonNumber}
                    </span>
                    <span
                      className={`font-bold text-[10px] ${
                        darkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      ZONE {char.zone}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      inSpec
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                    }`}
                  >
                    {inSpec ? 'IN-SPEC PASS' : 'OUT-OF-SPEC'}
                  </span>
                </div>

                <div>
                  <div
                    className={`text-[10px] uppercase tracking-wider ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    RAW CALLOUT &amp; GD&amp;T
                  </div>
                  <div
                    className={`text-sm font-bold mt-0.5 ${
                      darkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {char.rawCallout}
                  </div>
                  <div
                    className={`text-[11px] font-sans mt-0.5 ${
                      darkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {char.featureDescription}
                  </div>
                </div>

                <div
                  className={`grid grid-cols-2 gap-2 text-[11px] p-2 rounded-lg border ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>
                      Nominal:{' '}
                    </span>
                    <span
                      className={`font-bold ${
                        darkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {char.nominal_text || (char.nominal_value ?? char.nominal)?.toFixed(3)} mm
                    </span>
                  </div>
                  <div>
                    <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>
                      Limits:{' '}
                    </span>
                    <span
                      className={`font-bold ${
                        darkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {(char.lower_limit ?? char.lsl).toFixed(3)} ..{' '}
                      {(char.upper_limit ?? char.usl).toFixed(3)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>
                      Assigned Gage:{' '}
                    </span>
                    <span
                      className={`font-semibold ${
                        darkMode ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      {char.instrument}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => onSelectBalloon(char.id)}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                      darkMode
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <Crosshair className="w-3 h-3 text-[#0047AB] dark:text-[#38BDF8]" />
                    <span>Focus on Canvas</span>
                  </button>
                  <button
                    onClick={() => onDeleteCharacteristic(char.id)}
                    className={`p-1.5 rounded cursor-pointer ${
                      darkMode
                        ? 'bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400'
                        : 'bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200'
                    }`}
                    title="Delete Balloon"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          }

          // Default Text Agent Message
          return (
            <div key={msg.id} className="flex justify-start">
              <div
                className={`max-w-[90%] rounded-2xl rounded-tl-xs border px-3.5 py-2.5 text-xs leading-relaxed space-y-1 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-200'
                    : 'bg-slate-100 border-slate-200 text-slate-800 shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Bottom Chat Control Surface */}
      <div
        className={`p-3 border-t space-y-2 shrink-0 ${
          darkMode ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'
        }`}
      >
        {/* Quick Action Chips */}
        {hasDrawing && (
          <div
            className={`flex items-center gap-1.5 overflow-x-auto pb-1 text-[10.5px] font-mono no-scrollbar ${
              darkMode ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            <button
              onClick={onApproveAll}
              className={`px-2 py-1 rounded border whitespace-nowrap cursor-pointer transition-colors ${
                darkMode
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
              }`}
            >
              ✓ Approve All
            </button>
            <button
              onClick={() => onSendMessage('show flagged')}
              className={`px-2 py-1 rounded border whitespace-nowrap cursor-pointer transition-colors ${
                darkMode
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
              }`}
            >
              🎯 Show Flagged
            </button>
            <button
              onClick={() => onSendMessage("what's the tightest tolerance?")}
              className={`px-2 py-1 rounded border whitespace-nowrap cursor-pointer transition-colors ${
                darkMode
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
              }`}
            >
              📐 Tightest Tol
            </button>
            <button
              onClick={onExportExcel}
              className="px-2 py-1 rounded bg-[#0047AB]/15 hover:bg-[#0047AB]/25 border border-[#0047AB]/30 text-[#0047AB] dark:text-[#38BDF8] whitespace-nowrap cursor-pointer transition-colors"
            >
              📊 Export .XLSX
            </button>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask agent, request a correction, or type a command…"
            className={`w-full py-2.5 pl-3 pr-10 rounded-lg border focus:border-[#0047AB] focus:ring-1 focus:ring-[#0047AB] text-xs outline-none font-sans transition-colors ${
              darkMode
                ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500'
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
            }`}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`absolute right-1.5 p-1.5 rounded-md transition-colors ${
              inputText.trim()
                ? 'bg-[#0047AB] hover:bg-[#003887] text-white cursor-pointer'
                : darkMode
                ? 'text-slate-600 cursor-not-allowed'
                : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
