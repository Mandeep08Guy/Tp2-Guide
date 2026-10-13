import React, { useState, useMemo, useEffect } from 'react';
import { ProTip } from '../types';
import { generateCustomTips } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';

interface TipsViewProps {
  onAskDoubt: (question: string) => void;
}

const INITIAL_TIPS: ProTip[] = [
  {
    id: 'tip-1',
    title: 'Multi-Item Clipboard History',
    software: 'Windows 11',
    category: 'OS & Shortcuts',
    shortcut: 'Win + V',
    description: 'Stop copying and pasting one item at a time. Enable Clipboard History to access your last 25 copied text snippets, images, and pinned items across any application.',
    impact: 'Saves 20m/day',
    difficulty: 'Beginner',
    icon: '🪟'
  },
  {
    id: 'tip-2',
    title: 'Instant Multi-Cursor Editing',
    software: 'VS Code',
    category: 'Developer & CLI',
    shortcut: 'Ctrl + D / Cmd + D',
    description: 'Select a word or variable and press Ctrl+D (or Cmd+D) repeatedly to select the next occurrences and refactor all of them simultaneously in real time.',
    impact: '10x Refactoring',
    difficulty: 'Beginner',
    icon: '🟦'
  },
  {
    id: 'tip-3',
    title: 'Instant Responsive Auto-Layout',
    software: 'Figma',
    category: 'Design & Creative',
    shortcut: 'Shift + A',
    description: 'Select any group of layers or elements and press Shift + A to wrap them in a dynamic Auto Layout frame that automatically adapts padding, spacing, and alignment.',
    impact: 'Pro UI Speed',
    difficulty: 'Intermediate',
    icon: '🎨'
  },
  {
    id: 'tip-4',
    title: 'Reverse Terminal Command Search',
    software: 'Ubuntu / macOS Terminal',
    category: 'Developer & CLI',
    shortcut: 'Ctrl + R',
    description: 'Instead of pressing the Up arrow 50 times, press Ctrl + R and type any fragment of a previous command to fuzzy-search your entire shell history instantly.',
    impact: 'Instant Recall',
    difficulty: 'Intermediate',
    icon: '🐧'
  },
  {
    id: 'tip-5',
    title: 'Reclaim Gigabytes of Disk Space',
    software: 'Docker',
    category: 'Developer & CLI',
    shortcut: 'docker system prune -a --volumes',
    description: 'Purge all stopped containers, unused networks, dangling build caches, and unreferenced images in a single command to free up 10GB–50GB+ of developer disk space.',
    impact: 'Frees 20GB+',
    difficulty: 'Intermediate',
    icon: '🐳'
  },
  {
    id: 'tip-6',
    title: 'Universal Channel & DM Jump',
    software: 'Slack & Discord',
    category: 'Productivity & Office',
    shortcut: 'Ctrl + K / Cmd + K',
    description: 'Jump to any unread channel, direct message, or workspace thread in under a second without touching your mouse.',
    impact: 'Zero Friction',
    difficulty: 'Beginner',
    icon: '💬'
  },
  {
    id: 'tip-7',
    title: 'Modern XLOOKUP Over VLOOKUP',
    software: 'Microsoft Excel',
    category: 'Productivity & Office',
    shortcut: '=XLOOKUP(val, lookup, return, "Not Found")',
    description: 'XLOOKUP searches in any direction (left, right, up, down), never breaks when columns are inserted, and includes built-in fallback handling without IFERROR.',
    impact: 'Bulletproof Sheets',
    difficulty: 'Intermediate',
    icon: '📊'
  },
  {
    id: 'tip-8',
    title: 'Interactive Commit Squashing',
    software: 'Git CLI',
    category: 'Developer & CLI',
    shortcut: 'git rebase -i HEAD~3',
    description: 'Clean up messy "WIP" and "fix typo" commits before opening a pull request by squashing, rewording, or reordering your recent commit history interactively.',
    impact: 'Clean Git History',
    difficulty: 'Advanced',
    icon: '🐙'
  },
  {
    id: 'tip-9',
    title: 'Deep Nested Layer Selection',
    software: 'Figma & Photoshop',
    category: 'Design & Creative',
    shortcut: 'Ctrl + Click / Cmd + Click',
    description: 'Hold Ctrl (or Cmd on Mac) while clicking on the canvas to bypass parent frames and groups, directly selecting the deepest nested text or vector element.',
    impact: 'Saves 100+ Clicks',
    difficulty: 'Beginner',
    icon: '🖌️'
  },
  {
    id: 'tip-10',
    title: 'Ed25519 Cryptographic SSH Keys',
    software: 'OpenSSH / Security',
    category: 'Security & Privacy',
    shortcut: 'ssh-keygen -t ed25519 -C "user@domain"',
    description: 'Generate compact, ultra-fast, and cryptographically hardened Ed25519 SSH keys instead of legacy RSA keys for GitHub, cloud servers, and remote tunnels.',
    impact: 'Elite Security',
    difficulty: 'Advanced',
    icon: '🛡️'
  },
  {
    id: 'tip-11',
    title: 'Rapid Toggle List Creation',
    software: 'Notion',
    category: 'Productivity & Office',
    shortcut: '> + Space',
    description: 'Type a greater-than sign (>) followed by Space at the start of any line to instantly create a collapsible toggle block for clean documentation and study notes.',
    impact: 'Clean Docs',
    difficulty: 'Beginner',
    icon: '📝'
  },
  {
    id: 'tip-12',
    title: 'macOS Instant Region Screenshot to Clipboard',
    software: 'macOS',
    category: 'OS & Shortcuts',
    shortcut: 'Cmd + Ctrl + Shift + 4',
    description: 'Capture a custom screen region directly to your system clipboard without cluttering your Desktop with PNG files, ready to paste straight into Slack, Figma, or Notion.',
    impact: 'Zero Desktop Clutter',
    difficulty: 'Beginner',
    icon: '🍎'
  }
];

const CATEGORIES = [
  'All Tips',
  'Saved Vault',
  'OS & Shortcuts',
  'Developer & CLI',
  'Design & Creative',
  'Productivity & Office',
  'Security & Privacy'
];

const TipsView: React.FC<TipsViewProps> = ({ onAskDoubt }) => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All Tips');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [aiTopicInput, setAiTopicInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [customTips, setCustomTips] = useState<ProTip[]>(() => {
    try {
      const saved = localStorage.getItem('TP2_CUSTOM_TIPS');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('TP2_BOOKMARKED_TIPS');
      return saved ? JSON.parse(saved) : ['tip-1', 'tip-2'];
    } catch {
      return ['tip-1', 'tip-2'];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('TP2_CUSTOM_TIPS', JSON.stringify(customTips));
    } catch (e) {
      console.warn('Could not persist custom tips', e);
    }
  }, [customTips]);

  useEffect(() => {
    try {
      localStorage.setItem('TP2_BOOKMARKED_TIPS', JSON.stringify(bookmarkedIds));
    } catch (e) {
      console.warn('Could not persist bookmarked tips', e);
    }
  }, [bookmarkedIds]);

  const allTips = useMemo(() => [...customTips, ...INITIAL_TIPS], [customTips]);

  const filteredTips = useMemo(() => {
    return allTips.filter((tip) => {
      const matchesCategory =
        selectedCategory === 'All Tips' ||
        (selectedCategory === 'Saved Vault' && bookmarkedIds.includes(tip.id)) ||
        tip.category.toLowerCase() === selectedCategory.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tip.title.toLowerCase().includes(q) ||
        tip.software.toLowerCase().includes(q) ||
        tip.description.toLowerCase().includes(q) ||
        (tip.shortcut && tip.shortcut.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [allTips, selectedCategory, searchQuery, bookmarkedIds]);

  const toggleBookmark = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyShortcut = (id: string, text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSynthesizeTips = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = aiTopicInput.trim();
    if (!target || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const generated = await generateCustomTips(target);
      if (generated && generated.length > 0) {
        setCustomTips((prev) => [...generated, ...prev]);
        setSelectedCategory('All Tips');
        setAiTopicInput('');
      } else {
        setErrorMsg('Could not synthesize tips for that topic. Please try another term.');
      }
    } catch (err) {
      setErrorMsg('AI synthesis temporarily busy. Please try again in a moment.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-20 animate-in fade-in duration-700 pb-24">
      {/* Hero Header */}
      <section className="text-center space-y-8 pt-8 md:pt-14 relative">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-amber-50 rounded-full border border-amber-200">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
          <span className="text-[10px] font-black text-amber-700 uppercase tracking-[0.25em]">
            Elite Efficiency Vault
          </span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-stone-900 tracking-tighter leading-[0.95]">
          Mastery <span className="text-amber-500 italic font-serif">Tips.</span>
        </h1>

        <p className="text-lg md:text-xl text-stone-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Battle-tested keyboard shortcuts, hidden CLI flags, and architectural micro-workflows that save hours every week.
        </p>

        {/* AI Custom Tip Synthesizer Bar */}
        <div className="max-w-3xl mx-auto pt-4">
          <form
            onSubmit={handleSynthesizeTips}
            className="bg-white p-3 sm:p-4 rounded-[2.5rem] shadow-2xl border-4 border-amber-50 flex flex-col sm:flex-row gap-3 items-center focus-within:border-amber-300 transition-all"
          >
            <div className="flex items-center gap-3 flex-1 w-full px-4">
              <span className="text-2xl">⚡</span>
              <input
                type="text"
                value={aiTopicInput}
                onChange={(e) => setAiTopicInput(e.target.value)}
                placeholder="Synthesize custom pro tips for any software (e.g. Blender, Kubernetes, Vim)..."
                className="w-full h-14 bg-transparent text-stone-900 font-bold text-base sm:text-lg outline-none placeholder:text-stone-300"
              />
            </div>
            <button
              type="submit"
              disabled={isGenerating || !aiTopicInput.trim()}
              className="w-full sm:w-auto px-8 py-5 rounded-3xl bg-stone-900 hover:bg-amber-500 disabled:bg-stone-200 text-white font-black uppercase tracking-widest text-[10px] transition-all shadow-xl active:scale-95 shrink-0 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Synthesizing...
                </>
              ) : (
                <>✨ Synthesize Tips</>
              )}
            </button>
          </form>
          {errorMsg && (
            <p className="text-red-500 text-xs font-bold mt-3">{errorMsg}</p>
          )}
        </div>
      </section>

      {/* Spotlight Tip of the Day */}
      <section className="bg-stone-900 text-white rounded-[3.5rem] p-8 sm:p-14 md:p-16 shadow-2xl border-8 border-amber-500/20 relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-10 items-center">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-4 py-1.5 rounded-full bg-amber-500 text-stone-950 font-black text-[10px] uppercase tracking-widest">
                🔥 Spotlight Tip of the Day
              </span>
              <span className="px-4 py-1.5 rounded-full bg-white/10 text-amber-300 font-bold text-[10px] uppercase tracking-widest">
                VS Code & JetBrains IDEs
              </span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
               zen Mode + Centered Editor Layout
            </h2>
            <p className="text-stone-300 text-base sm:text-lg leading-relaxed max-w-2xl">
              Eliminate all sidebars, terminal panels, and status bars instantly to enter pure flow state. Combine with centered layout to keep your code aligned with your natural line of sight.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => handleCopyShortcut('spotlight', 'Ctrl + K Z')}
                className="bg-white/10 hover:bg-white/20 border border-white/15 px-6 py-3.5 rounded-2xl font-mono text-sm text-amber-300 font-bold flex items-center gap-3 transition-all"
              >
                <span>⌨️ Ctrl + K Z (or Cmd + K Z)</span>
                <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 bg-amber-500 text-stone-950 rounded-lg font-black">
                  {copiedId === 'spotlight' ? '✓ Copied' : 'Copy'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/tutorial/vscode')}
                className="bg-amber-500 hover:bg-white text-stone-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg"
              >
                Open VS Code Curriculum →
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Your Vault Stats</span>
              <span className="text-2xl">🏆</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                <div className="text-3xl font-black text-white">{allTips.length}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-1">Available Tips</div>
              </div>
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                <div className="text-3xl font-black text-amber-400">{bookmarkedIds.length}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-1">Saved in Vault</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === 'Saved Vault' ? 'All Tips' : 'Saved Vault')}
              className="w-full py-4 rounded-2xl bg-white/10 hover:bg-amber-500 hover:text-stone-950 text-white font-black uppercase tracking-widest text-[10px] transition-all"
            >
              {selectedCategory === 'Saved Vault' ? 'View All Tips' : 'Open My Saved Vault'}
            </button>
          </div>
        </div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      </section>

      {/* Filter & Search Controls */}
      <section className="space-y-10">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 border-b border-amber-100 pb-8">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 scale-105'
                      : 'bg-white text-stone-500 hover:text-stone-900 border border-stone-100'
                  }`}
                >
                  {cat === 'Saved Vault' && <span>🔖</span>}
                  <span>{cat}</span>
                  {cat === 'Saved Vault' && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-stone-900 text-white' : 'bg-amber-100 text-amber-800'}`}>
                      {bookmarkedIds.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tips by app or keyword..."
              className="w-full h-14 bg-white border-2 border-amber-100 focus:border-amber-400 rounded-2xl px-11 text-sm font-bold text-stone-900 outline-none shadow-sm transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200 flex items-center justify-center text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Tips Grid */}
        {filteredTips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTips.map((tip) => {
              const isBookmarked = bookmarkedIds.includes(tip.id);
              const isAiGenerated = tip.id.startsWith('ai-tip-') || tip.id.startsWith('or-tip-');
              return (
                <div
                  key={tip.id}
                  className="bg-white rounded-[2.8rem] p-8 sm:p-10 shadow-sm hover:shadow-2xl transition-all border-4 border-amber-50/80 hover:border-amber-200 flex flex-col justify-between group"
                >
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                          {tip.icon}
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">
                            {tip.software}
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">
                            {tip.category}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleBookmark(tip.id)}
                        title={isBookmarked ? 'Remove from Saved Vault' : 'Save to Vault'}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border transition-all ${
                          isBookmarked
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                            : 'bg-stone-50 text-stone-400 border-stone-100 hover:text-amber-600'
                        }`}
                      >
                        {isBookmarked ? '🔖' : '☆'}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-black text-[9px] uppercase tracking-widest border border-emerald-100">
                          ⚡ {tip.impact}
                        </span>
                        <span className="px-3 py-1 rounded-lg bg-stone-100 text-stone-600 font-black text-[9px] uppercase tracking-widest">
                          {tip.difficulty}
                        </span>
                        {isAiGenerated && (
                          <span className="px-3 py-1 rounded-lg bg-amber-100 text-amber-800 font-black text-[9px] uppercase tracking-widest">
                            ✨ AI Synthesized
                          </span>
                        )}
                      </div>

                      <h3 className="text-2xl font-black text-stone-900 tracking-tight leading-snug">
                        {tip.title}
                      </h3>

                      <p className="text-stone-500 text-sm leading-relaxed font-medium">
                        {tip.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-8 mt-8 border-t border-stone-100 space-y-4">
                    {tip.shortcut && (
                      <div className="flex items-center justify-between bg-stone-900 text-amber-300 px-4 py-3 rounded-2xl font-mono text-xs">
                        <span className="truncate pr-2">{tip.shortcut}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyShortcut(tip.id, tip.shortcut)}
                          className="px-3 py-1 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-stone-950 text-white font-sans font-black text-[9px] uppercase tracking-widest transition-all shrink-0"
                        >
                          {copiedId === tip.id ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onAskDoubt(`Can you explain how to use "${tip.title}" (${tip.shortcut || ''}) in ${tip.software} step-by-step?`)
                        }
                        className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-amber-600 transition-colors flex items-center gap-1.5"
                      >
                        <span>💬</span> Ask Concierge
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(`/tutorial/${encodeURIComponent(tip.software.toLowerCase().split(' ')[0])}`)}
                        className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-stone-900 transition-colors"
                      >
                        Full Guide →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[3.5rem] p-16 text-center space-y-6 border-4 border-dashed border-amber-100">
            <div className="text-6xl">🔍</div>
            <h3 className="text-3xl font-black text-stone-900">No Matching Tips Found</h3>
            <p className="text-stone-400 max-w-md mx-auto text-sm font-medium">
              {selectedCategory === 'Saved Vault'
                ? 'You have not bookmarked any tips in your vault yet. Click the bookmark icon on any tip card to save it here!'
                : `No curated tips matched "${searchQuery}". Use the AI Synthesizer bar above to generate custom tips for "${searchQuery}"!`}
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All Tips');
                  setSearchQuery('');
                }}
                className="bg-stone-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default TipsView;
