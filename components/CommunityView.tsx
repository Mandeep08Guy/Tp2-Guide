import React, { useState, useMemo, useEffect } from 'react';
import { CommunityPost, CommunityComment } from '../types';
import { askAIQuestion } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';

interface CommunityViewProps {
  onAskDoubt: (question: string) => void;
}

interface GuideRequestItem {
  id: string;
  software: string;
  topic: string;
  requestedBy: string;
  votes: number;
  category: string;
  icon: string;
}

const INITIAL_POSTS: CommunityPost[] = [
  {
    id: 'post-1',
    title: 'My Zero-Latency VS Code + WSL2 + Docker Dev Container Setup',
    content: 'By storing source code inside the native Linux ext4 filesystem (~/projects) instead of /mnt/c/ and attaching VS Code via the Dev Containers extension, hot-reload times in Vite and Next.js dropped from 4.2s to under 180ms.',
    author: 'Elena Vance',
    authorRole: 'Principal Cloud Architect',
    avatar: '👩‍💻',
    softwareTag: 'VS Code',
    tutorialId: 'vscode',
    category: 'Workflow',
    shortcut: 'Ctrl + Shift + P → Dev Containers: Reopen in Container',
    upvotes: 142,
    timestamp: '2 hours ago',
    comments: [
      {
        id: 'c-101',
        author: 'Marcus Chen',
        role: 'Senior DevOps Engineer',
        avatar: '🧑‍🔬',
        content: 'Moving off /mnt/c/ is the single biggest performance win on Windows 11. Adding .wslconfig memory limits also keeps Docker Desktop super lean!',
        timestamp: '1 hour ago'
      }
    ]
  },
  {
    id: 'post-2',
    title: 'How do you structure Figma Variable Modes for Multi-Brand Design Systems?',
    content: 'We are scaling our component library across 3 product themes (Light, Dark, High-Contrast) and 2 brand palettes. Should we separate primitive color tokens from semantic alias tokens in different collections?',
    author: 'Liam O’Connor',
    authorRole: 'Staff Product Designer',
    avatar: '🎨',
    softwareTag: 'Figma',
    tutorialId: 'figma',
    category: 'Question',
    upvotes: 89,
    timestamp: '5 hours ago',
    comments: [
      {
        id: 'c-102',
        author: 'Aria Patel',
        role: 'Design Systems Lead',
        avatar: '✨',
        content: 'Yes! Keep Collection 1 as Primitives (raw hex scales) with 1 mode, and Collection 2 as Semantic Tokens referencing Primitives with Light/Dark/Contrast modes.',
        timestamp: '3 hours ago'
      }
    ]
  },
  {
    id: 'post-3',
    title: 'macOS Sequoia Window Tiling + Raycast HyperKey Automation',
    content: 'Binding Caps Lock to HyperKey (Cmd+Ctrl+Opt+Shift) lets you snap windows, launch terminal sessions, and search clipboard history in a single keystroke without ever lifting your hands from the home row.',
    author: 'Devon Brooks',
    authorRole: 'Full-Stack Creator',
    avatar: '🍎',
    softwareTag: 'macOS',
    tutorialId: 'macos',
    category: 'Showcase',
    shortcut: 'Fn + Control + Arrow Keys',
    upvotes: 118,
    timestamp: '1 day ago',
    comments: []
  },
  {
    id: 'post-4',
    title: 'Automated Weekly Financial Reconciliation in Excel with LAMBDA',
    content: 'You no longer need VBA macros for reusable custom formulas. Using Name Manager with =LAMBDA(raw, TRIM(CLEAN(raw))), our finance team standardized messy CSV imports across 14 workbooks.',
    author: 'Sophia Martinez',
    authorRole: 'Financial Systems Analyst',
    avatar: '📊',
    softwareTag: 'Microsoft Excel',
    tutorialId: 'excel',
    category: 'Pro Tip',
    shortcut: '=LAMBDA(x, y, (y - x) / x)',
    upvotes: 74,
    timestamp: '2 days ago',
    comments: []
  }
];

const INITIAL_REQUESTS: GuideRequestItem[] = [
  {
    id: 'req-1',
    software: 'Blender 4.3',
    topic: 'Procedural Geometry Nodes & Real-Time EEVEE Next Rendering',
    requestedBy: '@render_wizard',
    votes: 96,
    category: 'Creative',
    icon: '🧡'
  },
  {
    id: 'req-2',
    software: 'Kubernetes',
    topic: 'Zero-Downtime Rolling Deployments & Helm Chart Templating',
    requestedBy: '@kube_master',
    votes: 84,
    category: 'DevOps',
    icon: '☸️'
  },
  {
    id: 'req-3',
    software: 'Obsidian',
    topic: 'Dataview Queries, Canvas Knowledge Graphs & Git Sync',
    requestedBy: '@second_brain',
    votes: 71,
    category: 'Productivity',
    icon: '💎'
  },
  {
    id: 'req-4',
    software: 'DaVinci Resolve 19',
    topic: 'Node-Based Color Grading & Fairlight Audio Mastering',
    requestedBy: '@cinema_pro',
    votes: 63,
    category: 'Creative',
    icon: '🎬'
  }
];

const CommunityView: React.FC<CommunityViewProps> = ({ onAskDoubt }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'discussions' | 'requests' | 'leaderboard'>('discussions');
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPostModalOpen, setIsPostModalOpen] = useState<boolean>(false);

  // New Post Form States
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSoftware, setNewSoftware] = useState('VS Code');
  const [newCategory, setNewCategory] = useState<'Workflow' | 'Question' | 'Showcase' | 'Pro Tip'>('Workflow');
  const [newShortcut, setNewShortcut] = useState('');
  const [newAuthor, setNewAuthor] = useState('');

  // Comment & AI Reply States
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [aiLoadingPostId, setAiLoadingPostId] = useState<string | null>(null);

  // New Guide Request Form
  const [reqSoftware, setReqSoftware] = useState('');
  const [reqTopic, setReqTopic] = useState('');

  const [posts, setPosts] = useState<CommunityPost[]>(() => {
    try {
      const saved = localStorage.getItem('TP2_COMMUNITY_POSTS');
      return saved ? JSON.parse(saved) : INITIAL_POSTS;
    } catch {
      return INITIAL_POSTS;
    }
  });

  const [upvotedPostIds, setUpvotedPostIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('TP2_UPVOTED_POSTS');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [guideRequests, setGuideRequests] = useState<GuideRequestItem[]>(() => {
    try {
      const saved = localStorage.getItem('TP2_GUIDE_REQUESTS');
      return saved ? JSON.parse(saved) : INITIAL_REQUESTS;
    } catch {
      return INITIAL_REQUESTS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('TP2_COMMUNITY_POSTS', JSON.stringify(posts));
    } catch (e) {
      console.warn('Could not save posts', e);
    }
  }, [posts]);

  useEffect(() => {
    try {
      localStorage.setItem('TP2_UPVOTED_POSTS', JSON.stringify(upvotedPostIds));
    } catch (e) {
      console.warn('Could not save upvotes', e);
    }
  }, [upvotedPostIds]);

  useEffect(() => {
    try {
      localStorage.setItem('TP2_GUIDE_REQUESTS', JSON.stringify(guideRequests));
    } catch (e) {
      console.warn('Could not save requests', e);
    }
  }, [guideRequests]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const matchesCat = selectedFilter === 'All' || p.category === selectedFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.softwareTag.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [posts, selectedFilter, searchQuery]);

  const handleToggleUpvote = (postId: string) => {
    const alreadyUpvoted = upvotedPostIds.includes(postId);
    setUpvotedPostIds((prev) =>
      alreadyUpvoted ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, upvotes: alreadyUpvoted ? post.upvotes - 1 : post.upvotes + 1 }
          : post
      )
    );
  };

  const handleAddComment = (postId: string) => {
    const text = (replyInputs[postId] || '').trim();
    if (!text) return;

    const newComment: CommunityComment = {
      id: `comment-${Date.now()}`,
      author: 'You (Community Member)',
      role: 'Verified Explorer',
      avatar: '🚀',
      content: text,
      timestamp: 'Just now'
    };

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments: [...post.comments, newComment] }
          : post
      )
    );
    setReplyInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleGetAIExpertReply = async (post: CommunityPost) => {
    if (aiLoadingPostId) return;
    setAiLoadingPostId(post.id);
    try {
      const response = await askAIQuestion(
        `${post.softwareTag} Community Discussion`,
        `A community member asked/shared: "${post.title} - ${post.content}". Provide a concise, high-value expert response with a practical tip or shortcut.`
      );
      const aiComment: CommunityComment = {
        id: `ai-comment-${Date.now()}`,
        author: 'Tp2 AI Concierge',
        role: 'Synthesized Expert',
        avatar: '🎓',
        content: response,
        timestamp: 'Just now',
        isAI: true
      };
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, comments: [...p.comments, aiComment] } : p
        )
      );
    } catch (e) {
      console.warn('AI reply error', e);
    } finally {
      setAiLoadingPostId(null);
    }
  };

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const created: CommunityPost = {
      id: `post-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      author: newAuthor.trim() || 'Community Architect',
      authorRole: 'Power User',
      avatar: '🌟',
      softwareTag: newSoftware.trim() || 'General Tech',
      tutorialId: newSoftware.trim().toLowerCase().replace(/\s+/g, '-'),
      category: newCategory,
      shortcut: newShortcut.trim() || undefined,
      upvotes: 1,
      timestamp: 'Just now',
      comments: []
    };

    setPosts((prev) => [created, ...prev]);
    setUpvotedPostIds((prev) => [...prev, created.id]);
    setNewTitle('');
    setNewContent('');
    setNewShortcut('');
    setIsPostModalOpen(false);
  };

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqSoftware.trim() || !reqTopic.trim()) return;

    const newReq: GuideRequestItem = {
      id: `req-${Date.now()}`,
      software: reqSoftware.trim(),
      topic: reqTopic.trim(),
      requestedBy: '@you',
      votes: 1,
      category: 'Community Request',
      icon: '⚡'
    };

    setGuideRequests((prev) => [newReq, ...prev]);
    setReqSoftware('');
    setReqTopic('');
  };

  const handleVoteRequest = (reqId: string) => {
    setGuideRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, votes: r.votes + 1 } : r))
    );
  };

  return (
    <div className="space-y-20 animate-in fade-in duration-700 pb-24">
      {/* Hero Banner */}
      <section className="text-center space-y-8 pt-8 md:pt-14">
        <div className="inline-flex items-center gap-3 px-6 py-2 bg-amber-50 rounded-full border border-amber-200">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black text-amber-700 uppercase tracking-[0.25em]">
            Global Collective Intelligence
          </span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-stone-900 tracking-tighter leading-[0.95]">
          The <span className="text-amber-500 italic font-serif">Community.</span>
        </h1>

        <p className="text-lg md:text-xl text-stone-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Exchange elite workflows, collaborate on complex configurations, and co-create the world’s most accurate software curricula.
        </p>

        {/* Live Stats Strip */}
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="bg-white p-6 rounded-3xl border-2 border-amber-50 shadow-sm">
            <div className="text-3xl font-black text-stone-900">12.4k</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-stone-400 mt-1">Active Architects</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border-2 border-amber-50 shadow-sm">
            <div className="text-3xl font-black text-amber-500">{posts.length}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-stone-400 mt-1">Shared Workflows</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border-2 border-amber-50 shadow-sm">
            <div className="text-3xl font-black text-stone-900">{guideRequests.length}</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-stone-400 mt-1">Open Bounties</div>
          </div>
          <div className="bg-white p-6 rounded-3xl border-2 border-amber-50 shadow-sm">
            <div className="text-3xl font-black text-emerald-600">99.4%</div>
            <div className="text-[9px] font-black uppercase tracking-widest text-stone-400 mt-1">Doubt Resolution</div>
          </div>
        </div>
      </section>

      {/* Main Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-amber-100 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('discussions')}
            className={`px-7 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${
              activeTab === 'discussions'
                ? 'bg-stone-900 text-white shadow-xl scale-105'
                : 'bg-white text-stone-500 hover:text-stone-900 border border-stone-100'
            }`}
          >
            <span>💬</span> Discussions & Workflows
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`px-7 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${
              activeTab === 'requests'
                ? 'bg-stone-900 text-white shadow-xl scale-105'
                : 'bg-white text-stone-500 hover:text-stone-900 border border-stone-100'
            }`}
          >
            <span>🚀</span> Guide Bounties
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-7 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2.5 ${
              activeTab === 'leaderboard'
                ? 'bg-stone-900 text-white shadow-xl scale-105'
                : 'bg-white text-stone-500 hover:text-stone-900 border border-stone-100'
            }`}
          >
            <span>🏆</span> Leaderboard
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsPostModalOpen(true)}
          className="w-full sm:w-auto bg-amber-500 hover:bg-stone-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-200 active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="text-base">+</span> Share Workflow or Question
        </button>
      </div>

      {/* TAB 1: DISCUSSIONS & WORKFLOWS */}
      {activeTab === 'discussions' && (
        <div className="space-y-10">
          {/* Category Filter & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {['All', 'Workflow', 'Question', 'Showcase', 'Pro Tip'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    selectedFilter === filter
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-white text-stone-500 hover:text-stone-900 border border-stone-100'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search threads, apps, or authors..."
                className="w-full h-12 bg-white border-2 border-amber-50 focus:border-amber-400 rounded-xl px-10 text-xs font-bold text-stone-900 outline-none shadow-sm"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 text-sm">🔍</span>
            </div>
          </div>

          {/* Posts Feed */}
          <div className="space-y-8">
            {filteredPosts.map((post) => {
              const isUpvoted = upvotedPostIds.includes(post.id);
              return (
                <article
                  key={post.id}
                  className="bg-white rounded-[3rem] p-8 sm:p-12 shadow-sm hover:shadow-xl transition-all border-4 border-amber-50/70 space-y-8"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-3xl">
                        {post.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-stone-900 text-base">{post.author}</h4>
                          <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 bg-stone-100 text-stone-500 rounded-md">
                            {post.authorRole}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">
                          {post.timestamp} • in <span className="text-amber-600">{post.softwareTag}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-4 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-black text-[9px] uppercase tracking-widest border border-amber-100">
                        {post.category}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/tutorial/${encodeURIComponent(post.tutorialId || post.softwareTag.toLowerCase())}`)
                        }
                        className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-amber-500 text-white font-black text-[9px] uppercase tracking-widest transition-colors"
                      >
                        Explore {post.softwareTag} →
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-stone-600 text-base leading-relaxed font-medium">
                      {post.content}
                    </p>
                    {post.shortcut && (
                      <div className="inline-flex items-center gap-3 bg-stone-900 text-amber-300 px-5 py-3 rounded-2xl font-mono text-xs">
                        <span>⌨️</span>
                        <span>{post.shortcut}</span>
                      </div>
                    )}
                  </div>

                  {/* Post Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-stone-100">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleUpvote(post.id)}
                        className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
                          isUpvoted
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-stone-100 text-stone-600 hover:bg-amber-50 hover:text-amber-700'
                        }`}
                      >
                        <span>▲</span>
                        <span>{post.upvotes}</span>
                      </button>

                      <span className="px-4 py-2.5 rounded-xl bg-stone-50 text-stone-500 font-black text-[10px] uppercase tracking-widest">
                        💬 {post.comments.length} {post.comments.length === 1 ? 'Reply' : 'Replies'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={aiLoadingPostId === post.id}
                        onClick={() => handleGetAIExpertReply(post)}
                        className="px-5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border border-amber-200 font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        {aiLoadingPostId === post.id ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                            Synthesizing Reply...
                          </>
                        ) : (
                          <>✨ Get AI Expert Reply</>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onAskDoubt(`Regarding the community post "${post.title}": How can I implement this in ${post.softwareTag}?`)}
                        className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-900 text-stone-600 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all"
                      >
                        Ask Concierge
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="space-y-4 pt-4 bg-stone-50/70 rounded-3xl p-6 border border-stone-100">
                    {post.comments.length > 0 && (
                      <div className="space-y-4 mb-6">
                        {post.comments.map((c) => (
                          <div
                            key={c.id}
                            className={`p-5 rounded-2xl border ${
                              c.isAI
                                ? 'bg-amber-50/70 border-amber-200'
                                : 'bg-white border-stone-100'
                            } space-y-2`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="text-xl">{c.avatar}</span>
                                <span className="font-black text-xs text-stone-900">{c.author}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                  c.isAI ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-500'
                                }`}>
                                  {c.role}
                                </span>
                              </div>
                              <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                                {c.timestamp}
                              </span>
                            </div>
                            <p className="text-stone-700 text-sm leading-relaxed font-medium pl-7">
                              {c.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Reply Input */}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={replyInputs[post.id] || ''}
                        onChange={(e) =>
                          setReplyInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        placeholder="Add your insight or solution to this thread..."
                        className="flex-1 h-12 bg-white border border-stone-200 focus:border-amber-400 rounded-xl px-4 text-xs font-semibold text-stone-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(post.id)}
                        className="px-6 h-12 bg-stone-900 hover:bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0"
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: GUIDE BOUNTIES & REQUESTS */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-3xl font-black text-stone-900 tracking-tight">
              Most Requested Software Curricula
            </h2>
            <p className="text-stone-400 text-sm font-medium">
              Upvote community requests or synthesize any guide immediately using our real-time AI curriculum engine.
            </p>

            <div className="space-y-4">
              {guideRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-[2.5rem] p-8 border-4 border-amber-50 shadow-sm hover:shadow-xl transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-3xl shrink-0">
                      {req.icon}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-black text-xl text-stone-900">{req.software}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg">
                          {req.category}
                        </span>
                      </div>
                      <p className="text-stone-600 text-sm font-semibold">{req.topic}</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                        Requested by {req.requestedBy}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => handleVoteRequest(req.id)}
                      className="px-5 py-3 rounded-2xl bg-stone-100 hover:bg-amber-50 text-stone-800 font-black text-xs flex items-center gap-2 transition-all"
                    >
                      <span>▲</span>
                      <span>{req.votes}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/tutorial/${encodeURIComponent(req.software)}`)}
                      className="px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-stone-900 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-md"
                    >
                      ⚡ Synthesize Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit New Guide Bounty */}
          <div className="bg-stone-900 text-white rounded-[3rem] p-8 sm:p-10 space-y-6 h-fit border-4 border-amber-500/20">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center text-2xl font-black">
              🚀
            </div>
            <h3 className="text-2xl font-black tracking-tight">Propose a Guide Bounty</h3>
            <p className="text-stone-400 text-xs leading-relaxed">
              Need a deep-dive guide on a specialized tool, framework, or enterprise platform? Post it to the bounty board.
            </p>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-2">
                  Target Software / OS
                </label>
                <input
                  type="text"
                  value={reqSoftware}
                  onChange={(e) => setReqSoftware(e.target.value)}
                  placeholder="e.g. Terraform, Unreal Engine 5, Neovim"
                  className="w-full h-12 bg-white/10 border border-white/15 focus:border-amber-400 rounded-xl px-4 text-xs font-bold text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-2">
                  Specific Topic or Workflow
                </label>
                <textarea
                  rows={3}
                  value={reqTopic}
                  onChange={(e) => setReqTopic(e.target.value)}
                  placeholder="What specific architecture or feature should be covered?"
                  className="w-full bg-white/10 border border-white/15 focus:border-amber-400 rounded-xl p-4 text-xs font-bold text-white outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-amber-500 hover:bg-white text-stone-950 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg"
              >
                Submit Guide Bounty
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: LEADERBOARD */}
      {activeTab === 'leaderboard' && (
        <div className="bg-white rounded-[3.5rem] p-8 sm:p-14 border-4 border-amber-50 shadow-sm space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-8">
            <div>
              <h2 className="text-3xl font-black text-stone-900 tracking-tight">
                Hall of Mastery Contributors
              </h2>
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">
                Top architects ranked by verified workflows and community upvotes
              </p>
            </div>
            <span className="px-5 py-2.5 rounded-2xl bg-amber-50 text-amber-700 font-black text-xs uppercase tracking-widest border border-amber-200">
              🏅 Your Reputation: {upvotedPostIds.length * 10 + posts.length * 25} XP
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { rank: '01', name: 'Elena Vance', role: 'Principal Cloud Architect', xp: '4,820 XP', badge: '👑 Grandmaster', icon: '👩‍💻', specialty: 'Docker & WSL2' },
              { rank: '02', name: 'Devon Brooks', role: 'Full-Stack Creator', xp: '3,940 XP', badge: '💎 Platinum Mentor', icon: '🍎', specialty: 'macOS & Raycast' },
              { rank: '03', name: 'Aria Patel', role: 'Design Systems Lead', xp: '3,410 XP', badge: '⚡ Gold Architect', icon: '✨', specialty: 'Figma & Tokens' }
            ].map((leader) => (
              <div
                key={leader.rank}
                className="p-8 rounded-[2.5rem] bg-stone-50 border-2 border-amber-100/60 flex flex-col justify-between space-y-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-3 py-1 rounded-lg bg-amber-500 text-white">
                    #{leader.rank}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                    {leader.badge}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-amber-100 flex items-center justify-center text-4xl shadow-sm">
                    {leader.icon}
                  </div>
                  <div>
                    <h4 className="font-black text-xl text-stone-900">{leader.name}</h4>
                    <p className="text-xs font-semibold text-stone-400">{leader.role}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-stone-200/60 flex items-center justify-between text-xs font-black">
                  <span className="text-stone-500">Specialty: {leader.specialty}</span>
                  <span className="text-amber-600">{leader.xp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE NEW POST MODAL */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl overflow-hidden shadow-2xl border-8 border-amber-50 p-8 sm:p-12 space-y-8 animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <span className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                  ✍️
                </span>
                <div>
                  <h2 className="text-3xl font-black text-stone-900 tracking-tight">Share with Community</h2>
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">
                    Publish a Workflow, Question, or Pro Tip
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPostModalOpen(false)}
                className="text-3xl text-stone-300 hover:text-stone-900"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">
                    Your Name / Handle
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full h-12 bg-stone-50 border-2 border-stone-100 focus:border-amber-500 rounded-xl px-4 text-xs font-bold text-stone-900 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">
                    Software / Platform
                  </label>
                  <input
                    type="text"
                    required
                    value={newSoftware}
                    onChange={(e) => setNewSoftware(e.target.value)}
                    placeholder="e.g. VS Code, Docker, macOS"
                    className="w-full h-12 bg-stone-50 border-2 border-stone-100 focus:border-amber-500 rounded-xl px-4 text-xs font-bold text-stone-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">
                    Post Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full h-12 bg-stone-50 border-2 border-stone-100 focus:border-amber-500 rounded-xl px-4 text-xs font-bold text-stone-900 outline-none"
                  >
                    <option value="Workflow">Workflow</option>
                    <option value="Question">Question</option>
                    <option value="Showcase">Showcase</option>
                    <option value="Pro Tip">Pro Tip</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">
                    Shortcut / CLI Command (Optional)
                  </label>
                  <input
                    type="text"
                    value={newShortcut}
                    onChange={(e) => setNewShortcut(e.target.value)}
                    placeholder="e.g. Ctrl + Shift + P"
                    className="w-full h-12 bg-stone-50 border-2 border-stone-100 focus:border-amber-500 rounded-xl px-4 text-xs font-mono font-bold text-stone-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">
                  Headline / Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Give your workflow or question a clear, punchy title..."
                  className="w-full h-14 bg-stone-50 border-2 border-stone-100 focus:border-amber-500 rounded-xl px-4 text-sm font-bold text-stone-900 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">
                  Details & Steps
                </label>
                <textarea
                  rows={4}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Explain how your setup works, why it saves time, or what you'd like help solving..."
                  className="w-full bg-stone-50 border-2 border-stone-100 focus:border-amber-500 rounded-xl p-4 text-sm font-medium text-stone-900 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-5 bg-stone-900 hover:bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl"
              >
                Publish to Community Hub
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityView;
