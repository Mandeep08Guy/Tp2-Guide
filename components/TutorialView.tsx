import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TUTORIALS } from '../constants';
import { getGuideContent, generateStepImage, verifyApplicationExistence, fetchOnlineContent, generateFallbackCurriculum } from '../services/geminiService';
import { AIResponse, Tutorial, GuideStep, ExploringMode, Category, OnlineMediaItem } from '../types';

interface TutorialViewProps {
  onAskDoubt: (question: string) => void;
}

const TutorialView: React.FC<TutorialViewProps> = ({ onAskDoubt }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState(false);
  const [customAppInfo, setCustomAppInfo] = useState<{ name: string; exists: boolean } | null>(null);

  const tutorial = useMemo(() => {
    const staticTut = TUTORIALS.find(t => t.id === id);
    if (staticTut) return staticTut;
    
    return {
      id: id || 'custom',
      name: customAppInfo?.name || decodeURIComponent(id || 'Custom Software'),
      category: Category.PRODUCTIVITY,
      description: `AI-Synthesized guide for ${customAppInfo?.name || decodeURIComponent(id || 'your custom application')}.`,
      icon: '⚙️',
      color: 'bg-stone-900',
      popularTopics: ['Installation Guide', 'Interface Basics', 'Updating Procedures'],
      advancedTopics: ['Technical Configuration', 'Performance Tuning'],
      versions: ['Current']
    } as Tutorial;
  }, [id, customAppInfo]);
  
  const [loading, setLoading] = useState(false);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [guide, setGuide] = useState<AIResponse | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>(tutorial?.versions[0] || '');
  const [exploringMode, setExploringMode] = useState<ExploringMode>(ExploringMode.STANDARD);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [stepImages, setStepImages] = useState<Record<number, string>>({});
  const [customDoubt, setCustomDoubt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLoadInstantCurriculum = (topicOverride?: string) => {
    const topicToLoad = topicOverride || selectedTopic;
    if (!tutorial || !topicToLoad) return;
    const content = generateFallbackCurriculum(tutorial.name, topicToLoad, selectedVersion, exploringMode);
    setGuide(content);
    setActiveStep(0);
    setCompletedSteps(new Set());
    setStepImages({});
    setLoading(false);
    setError(null);
  };

  useEffect(() => {
    let interval: any;
    if (loading) {
      setLoadingSeconds(0);
      interval = setInterval(() => {
        setLoadingSeconds(prev => {
          if (prev >= 9) {
            handleLoadInstantCurriculum();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setLoadingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [loading, selectedTopic, tutorial, selectedVersion, exploringMode]);
  
  // Visual Mode and Online Content States
  const [visualMode, setVisualMode] = useState<'ai' | 'online' | 'blueprint'>('ai');
  const [onlineMedia, setOnlineMedia] = useState<Record<number, OnlineMediaItem[]>>({});
  const [isLoadingOnline, setIsLoadingOnline] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('CUSTOM_LEONARDO_API_KEY') || '' : ''
  );
  const [keySavedMessage, setKeySavedMessage] = useState<string | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState<Record<number, boolean>>({});

  const doubtInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const isStatic = TUTORIALS.some(t => t.id === id);
    if (!isStatic && id) {
      const checkRealism = async () => {
        try {
          setIsVerifying(true);
          setVerificationError(null);
          setQuotaError(false);
          const result = await verifyApplicationExistence(decodeURIComponent(id));
          if (result.exists) {
            setCustomAppInfo({ name: result.correctedName || decodeURIComponent(id), exists: true });
          } else {
            setVerificationError(result.reason || "The target software could not be verified.");
          }
        } catch (err: any) {
          if (err?.message?.toLowerCase().includes('quota')) setQuotaError(true);
          else setError("Verification failed.");
        } finally {
          setIsVerifying(false);
        }
      };
      checkRealism();
    }
  }, [id]);

  const loadTopic = async (topic: string, versionOverride?: string, modeOverride?: ExploringMode) => {
    if (!tutorial || verificationError) return;
    const version = versionOverride || selectedVersion;
    const mode = modeOverride || exploringMode;
    try {
      setLoading(true);
      setError(null);
      setQuotaError(false);
      setSelectedTopic(topic);
      const content = await getGuideContent(tutorial.name, topic, version, mode);
      setGuide(content);
      setActiveStep(0);
      setCompletedSteps(new Set());
      setStepImages({});
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('quota')) {
        setQuotaError(true);
      } else {
        const fallback = generateFallbackCurriculum(tutorial.name, topic, version, mode);
        setGuide(fallback);
        setActiveStep(0);
        setCompletedSteps(new Set());
        setStepImages({});
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVersionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newVersion = e.target.value;
    setSelectedVersion(newVersion);
    if (selectedTopic) {
      loadTopic(selectedTopic, newVersion);
    }
  };

  const toggleExploringMode = () => {
    const newMode = exploringMode === ExploringMode.STANDARD ? ExploringMode.EXPERT : ExploringMode.STANDARD;
    setExploringMode(newMode);
    if (selectedTopic) {
      loadTopic(selectedTopic, selectedVersion, newMode);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      loadTopic(searchQuery.trim());
      setSearchQuery('');
    }
  };

  const handleBackNavigation = () => {
    if (selectedTopic) {
      setSelectedTopic(null);
      setGuide(null);
      setError(null);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (guide && guide.steps[activeStep] && !stepImages[activeStep]) {
      const step = guide.steps[activeStep];
      const fetchImage = async () => {
        try {
          const img = await generateStepImage(tutorial?.name || '', selectedVersion, step.title, step.visualCue || '');
          if (img) {
            setStepImages(prev => ({ ...prev, [activeStep]: img }));
          } else {
            setStepImages(prev => ({ ...prev, [activeStep]: 'FALLBACK_TRIGGERED' }));
          }
        } catch (e) {
          console.error("Image generation error:", e);
          setStepImages(prev => ({ ...prev, [activeStep]: 'FALLBACK_TRIGGERED' }));
        }
      };
      fetchImage();
    }
  }, [activeStep, guide, tutorial, selectedVersion]);

  useEffect(() => {
    if (guide && guide.steps[activeStep] && !onlineMedia[activeStep]) {
      const fetchMedia = async () => {
        try {
          setIsLoadingOnline(true);
          const results = await fetchOnlineContent(tutorial?.name || '', guide.steps[activeStep].title);
          setOnlineMedia(prev => ({ ...prev, [activeStep]: results }));
        } catch (e) {
          console.warn("Failed fetching online media:", e);
        } finally {
          setIsLoadingOnline(false);
        }
      };
      fetchMedia();
    }
  }, [activeStep, guide, tutorial]);

  const retryImageGeneration = async () => {
    if (!guide || !tutorial) return;
    
    setStepImages(prev => {
        const next = { ...prev };
        delete next[activeStep];
        return next;
    });
    setImageLoadFailed(prev => ({ ...prev, [activeStep]: false }));

    const step = guide.steps[activeStep];
    try {
        const img = await generateStepImage(tutorial.name, selectedVersion, step.title, step.visualCue || '');
        if (img) {
            setStepImages(prev => ({ ...prev, [activeStep]: img }));
        } else {
            setStepImages(prev => ({ ...prev, [activeStep]: 'FALLBACK_TRIGGERED' }));
        }
    } catch (e) {
        console.error("Retry generation failed:", e);
        setStepImages(prev => ({ ...prev, [activeStep]: 'FALLBACK_TRIGGERED' }));
    }
  };

  const handleSaveApiKey = () => {
    if (customKeyInput.trim()) {
      localStorage.setItem('CUSTOM_LEONARDO_API_KEY', customKeyInput.trim());
      setKeySavedMessage('API Key saved successfully!');
    } else {
      localStorage.removeItem('CUSTOM_LEONARDO_API_KEY');
      setKeySavedMessage('Reverted to Free Online Visual Engine!');
    }
    setTimeout(() => {
      setKeySavedMessage(null);
      setIsKeyModalOpen(false);
      retryImageGeneration();
    }, 1200);
  };

  const toggleStep = (idx: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleCustomDoubtSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!customDoubt.trim()) return;
    onAskDoubt(`Doubt about ${selectedTopic} in ${tutorial?.name}: ${customDoubt}`);
    setCustomDoubt('');
  };

  // QUOTA ERROR UI
  if (quotaError) {
    return (
      <div className="max-w-3xl mx-auto py-40 text-center space-y-12 animate-in zoom-in-95 duration-700 px-4">
        <div className="text-8xl">⏳</div>
        <h1 className="text-4xl sm:text-6xl font-black text-stone-900 tracking-tighter">Cooldown Required</h1>
        <div className="text-lg sm:text-2xl text-stone-400 font-medium leading-relaxed bg-white p-8 sm:p-12 rounded-[3rem] border-4 border-amber-200 shadow-xl">
          <p className="mb-6">The AI engine has hit its temporary <span className="text-amber-600 font-black">Rate Limit</span>.</p>
          <p className="text-xs sm:text-sm uppercase tracking-widest font-black text-stone-500">
            This happens on the free tier when requests are too frequent. Please wait 60 seconds before trying again.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button 
            onClick={() => { setQuotaError(false); if(selectedTopic) loadTopic(selectedTopic); }}
            className="bg-amber-500 text-white px-10 sm:px-14 py-5 sm:py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-stone-900 transition-all"
          >
            Retry Now
          </button>
          <button 
            onClick={() => navigate('/')}
            className="bg-stone-100 text-stone-500 px-10 sm:px-14 py-5 sm:py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all border border-stone-200"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (isVerifying) {
    return (
      <div className="flex flex-col items-center justify-center py-60 gap-10 animate-in fade-in duration-500 px-4">
        <div className="relative">
          <div className="w-24 h-24 border-[8px] border-amber-50 rounded-full"></div>
          <div className="absolute top-0 w-24 h-24 border-[8px] border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-black text-stone-900 tracking-tighter">Reality Verification Engaged</h2>
          <p className="text-amber-600 font-black text-[10px] uppercase tracking-[0.4em] mt-3 animate-pulse">Scanning Software Database</p>
        </div>
      </div>
    );
  }

  if (verificationError) {
    return (
      <div className="max-w-3xl mx-auto py-40 text-center space-y-12 animate-in zoom-in-95 duration-700 px-4">
        <div className="text-8xl">🚫</div>
        <h1 className="text-5xl sm:text-6xl font-black text-stone-900 tracking-tighter">Invalid Target</h1>
        <p className="text-xl sm:text-2xl text-stone-400 font-medium leading-relaxed bg-white p-8 sm:p-12 rounded-[3rem] border-4 border-amber-50">
          We could not verify <span className="text-stone-900 font-black">"{decodeURIComponent(id || '')}"</span> as a legitimate application. <br/><br/>
          <span className="text-xs sm:text-sm uppercase tracking-widest font-black text-amber-600">AI Logic: {verificationError}</span>
        </p>
        <button 
          onClick={() => navigate('/')}
          className="bg-stone-900 text-white px-14 py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-amber-500 transition-all"
        >
          Return to Library
        </button>
      </div>
    );
  }

  // GENERAL ERROR UI
  if (error) {
    return (
       <div className="max-w-3xl mx-auto py-40 text-center space-y-12 animate-in zoom-in-95 duration-700 px-4">
        <div className="text-8xl">⚠️</div>
        <h1 className="text-5xl font-black text-stone-900 tracking-tighter">Synthesis Interrupted</h1>
        <p className="text-xl text-stone-400 font-medium leading-relaxed bg-white p-10 rounded-[3rem] border-4 border-red-50">
          {error}
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <button 
            onClick={() => { setError(null); if(selectedTopic) loadTopic(selectedTopic); }}
            className="bg-amber-500 text-white px-12 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-stone-900 transition-all"
          >
            Retry Generation
          </button>
          <button 
             onClick={handleBackNavigation}
             className="bg-stone-100 text-stone-600 px-12 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-white transition-all border border-stone-200"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // LOADING UI
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-44 gap-8 px-4 max-w-lg mx-auto">
        <div className="relative">
          <div className="w-32 h-32 border-[12px] border-amber-50 rounded-full"></div>
          <div className={`absolute top-0 w-32 h-32 border-[12px] border-t-transparent rounded-full animate-spin shadow-2xl ${exploringMode === ExploringMode.EXPERT ? 'border-amber-950' : 'border-amber-500'}`}></div>
        </div>
        <div className="text-center space-y-4 w-full">
          <p className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tighter">Assembling Curriculum...</p>
          <p className={`font-black animate-pulse text-xs uppercase tracking-[0.4em] ${exploringMode === ExploringMode.EXPERT ? 'text-amber-600' : 'text-amber-500'}`}>
             Premium Intelligence Engaged
          </p>

          {loadingSeconds >= 3 && (
            <div className="pt-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-500 w-full">
              <p className="text-stone-400 text-xs font-semibold">
                {loadingSeconds >= 6 ? "Network is slow on mobile data." : "Synthesizing deep module data..."}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => handleLoadInstantCurriculum()}
                  className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl transition-all flex items-center gap-2"
                >
                  <span>⚡</span> Load Instant Curriculum
                </button>
                <button
                  type="button"
                  onClick={handleBackNavigation}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border border-stone-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Landing Page for Tutorial (Overview)
  if (!selectedTopic) {
    return (
      <div className="max-w-5xl mx-auto space-y-16 py-12 animate-in fade-in slide-in-from-top-4 duration-1000">
        <button 
          onClick={() => navigate('/')}
          className="md:hidden flex items-center gap-2 text-stone-400 font-black uppercase tracking-widest text-[10px] mb-4"
        >
           <span>←</span> Back to Library
        </button>

        <div className="text-center">
          <div className={`w-32 h-32 rounded-[3.5rem] bg-white mx-auto flex items-center justify-center text-7xl mb-10 shadow-[0_25px_60px_-15px_rgba(245,158,11,0.3)] rotate-3 border-8 border-amber-50 transition-all hover:scale-110 hover:-rotate-3`}>
            {tutorial.icon}
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-stone-900 mb-6 tracking-tighter">Inside {tutorial.name}</h1>
          <p className="text-lg sm:text-xl md:text-2xl text-stone-400 max-w-3xl mx-auto leading-relaxed font-medium mb-12">
            Select a specialized path or use our AI to analyze a specific feature for version {selectedVersion}.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-10 bg-white p-6 sm:p-10 rounded-[3rem] sm:rounded-[4rem] shadow-sm border-[6px] border-amber-50/30 max-w-3xl mx-auto">
             <div className="flex flex-col items-center gap-4">
               <label className="text-[10px] font-black text-amber-600/50 uppercase tracking-[0.3em]">Environment Version</label>
               <div className="relative group">
                 <select 
                   value={selectedVersion}
                   onChange={handleVersionChange}
                   className="appearance-none bg-amber-50/30 border-2 border-amber-100/50 px-10 py-4 rounded-3xl text-stone-900 font-black tracking-tight hover:border-amber-500 transition-all cursor-pointer outline-none min-w-[200px] text-center text-xs shadow-inner"
                 >
                   {tutorial.versions.map(v => (
                     <option key={v} value={v}>Version {v}</option>
                   ))}
                 </select>
               </div>
             </div>
             <div className="w-[1px] h-16 bg-amber-100/50 hidden sm:block"></div>
             <div className="flex flex-col items-center gap-4">
               <label className="text-[10px] font-black text-amber-600/50 uppercase tracking-[0.3em]">Mastery Level</label>
               <button 
                onClick={toggleExploringMode}
                className={`flex items-center gap-4 px-10 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-950 text-amber-400' : 'bg-amber-500 text-white shadow-amber-200'}`}
               >
                 <span className="text-xl">{exploringMode === ExploringMode.EXPERT ? '💎' : '🌱'}</span>
                 {exploringMode} View
               </button>
             </div>
          </div>
        </div>

        <div className="relative max-w-3xl mx-auto">
          <form onSubmit={handleSearchSubmit} className="relative group">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Analyze any ${exploringMode === ExploringMode.EXPERT ? 'deep technical ' : ''}feature...`}
              className={`w-full h-20 sm:h-24 bg-white rounded-3xl sm:rounded-[2.5rem] px-8 sm:px-12 text-lg sm:text-2xl font-bold text-stone-900 shadow-2xl focus:ring-[12px] outline-none transition-all pr-32 sm:pr-40 border-2 border-amber-50 ${exploringMode === ExploringMode.EXPERT ? 'focus:ring-amber-950/5' : 'focus:ring-amber-100/50'}`}
            />
            <button 
              type="submit"
              className={`absolute right-4 top-4 bottom-4 px-6 sm:px-10 text-white rounded-2xl sm:rounded-[1.8rem] font-black uppercase tracking-widest text-[10px] transition-all shadow-lg ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-950 hover:bg-stone-800' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              Consult AI
            </button>
          </form>
        </div>

        <div className="space-y-16">
           <div className="flex items-center gap-10">
              <h2 className="text-3xl font-black text-stone-900 uppercase tracking-tighter">
                {exploringMode === ExploringMode.EXPERT ? 'Expert Architectures' : 'Standard Curricula'}
              </h2>
              <div className="h-[2px] flex-1 bg-amber-100/50"></div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <button 
                onClick={() => loadTopic("Absolute Basics & Key Interface Items")}
                className={`group p-8 sm:p-12 rounded-3xl sm:rounded-[4rem] border-[6px] transition-all text-left relative overflow-hidden ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-950 text-white border-stone-800 hover:border-amber-400' : 'bg-white text-stone-900 border-amber-50 hover:border-amber-500 shadow-sm hover:shadow-2xl'}`}
              >
                <div className="text-6xl mb-8 group-hover:scale-125 transition-transform duration-500">🏁</div>
                <h3 className="text-3xl font-black mb-4">Core Essentials</h3>
                <p className={`${exploringMode === ExploringMode.EXPERT ? 'text-amber-100/40' : 'text-stone-400'} text-sm leading-relaxed font-medium`}>
                   The VIP foundation for {tutorial.name} {selectedVersion}.
                </p>
              </button>

              {(exploringMode === ExploringMode.EXPERT ? tutorial.advancedTopics : tutorial.popularTopics).map((topic, i) => (
                <button 
                  key={i}
                  onClick={() => loadTopic(topic)}
                  className={`group p-8 sm:p-12 rounded-3xl sm:rounded-[4rem] border-[6px] transition-all text-left relative overflow-hidden ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-900 text-white border-amber-800 hover:border-amber-400' : 'bg-white text-stone-900 border-amber-50 hover:border-amber-500 shadow-sm hover:shadow-2xl'}`}
                >
                  <div className="text-6xl mb-8 group-hover:scale-125 transition-transform duration-500">{exploringMode === ExploringMode.EXPERT ? '🧪' : '✨'}</div>
                  <h3 className="text-2xl font-black mb-4 leading-tight">{topic}</h3>
                  <p className={`${exploringMode === ExploringMode.EXPERT ? 'text-amber-100/40' : 'text-stone-400'} text-sm leading-relaxed font-medium`}>
                     {exploringMode === ExploringMode.EXPERT ? 'Deep architectural dissection.' : 'The golden path to feature mastery.'}
                  </p>
                </button>
              ))}
           </div>
        </div>
      </div>
    );
  }

  // Safety check for guide content
  if (!guide) {
      return (
        <div className="text-center py-20">
            <h2 className="text-2xl font-black mb-4">Content unavailable</h2>
            <button onClick={() => window.location.reload()} className="underline text-amber-500">Reload</button>
        </div>
      )
  }

  const progress = (completedSteps.size / guide.steps.length) * 100;
  const currentStep = guide.steps[activeStep];
  const imageSrc = stepImages[activeStep];
  const isFallback = imageSrc?.startsWith('SEARCH_FALLBACK:');

  const searchQueryUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${tutorial.name} ${selectedVersion} ${currentStep.title} screenshot`)}`;

  return (
    <div className="flex flex-col lg:flex-row gap-16 pb-40 animate-in slide-in-from-bottom-12 duration-700">
      <aside className="lg:w-96 flex-shrink-0">
        <div className="sticky top-28 space-y-10">
          <button 
            onClick={handleBackNavigation}
            className="text-stone-400 font-black uppercase tracking-[0.2em] text-[10px] hover:text-amber-600 transition-all flex items-center gap-4 group"
          >
            <span className="bg-white w-10 h-10 rounded-2xl flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">←</span> 
            {selectedTopic ? 'Topic Overview' : 'The Library'}
          </button>

          <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border-[4px] border-amber-50/50 overflow-hidden relative">
            <h2 className="text-3xl font-black text-stone-900 leading-tight mb-4">{tutorial.name}</h2>
            <div className="flex flex-col gap-3">
               <div className={`inline-block px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border w-fit shadow-sm ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-950 text-amber-400 border-amber-900' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                 {selectedTopic}
               </div>
               <div className="flex gap-2">
                 <div className="inline-block px-4 py-2 bg-stone-50 rounded-2xl text-[10px] font-black text-stone-400 uppercase tracking-widest w-fit border border-stone-100">
                   v{selectedVersion}
                 </div>
                 <button 
                  onClick={toggleExploringMode}
                  className={`inline-block px-4 py-2 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest w-fit transition-transform hover:scale-110 shadow-lg ${exploringMode === ExploringMode.EXPERT ? 'bg-stone-900' : 'bg-amber-500'}`}
                 >
                   {exploringMode}
                 </button>
               </div>
            </div>
            
            <div className="mt-12">
               <div className="flex justify-between items-end mb-4">
                  <span className="text-[10px] font-black text-stone-300 uppercase tracking-[0.3em]">Mastery Progress</span>
                  <span className={`text-sm font-black ${exploringMode === ExploringMode.EXPERT ? 'text-amber-600' : 'text-amber-500'}`}>{Math.round(progress)}%</span>
               </div>
               <div className="h-4 w-full bg-stone-50 rounded-full overflow-hidden shadow-inner border border-stone-100">
                  <div className={`h-full transition-all duration-1000 ease-out ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-950 shadow-[0_0_20px_rgba(120,53,15,0.4)]' : 'bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]'}`} style={{ width: `${progress}%` }}></div>
               </div>
            </div>
          </div>

          <nav className="bg-white rounded-[3.5rem] shadow-sm border-[4px] border-amber-50/50 overflow-hidden">
             <div className="p-8 bg-amber-50/30 border-b border-amber-50 font-black text-stone-900 text-[10px] uppercase tracking-[0.3em] flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full animate-pulse ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-950' : 'bg-amber-500'}`}></span>
                Elite Curriculum
             </div>
             <div className="max-h-[400px] overflow-y-auto">
                {guide.steps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`w-full p-8 text-left transition-all flex gap-5 border-b border-amber-50/30 last:border-0 ${activeStep === idx ? (exploringMode === ExploringMode.EXPERT ? 'bg-amber-950 text-white scale-[1.02] shadow-2xl z-10' : 'bg-amber-500 text-white scale-[1.02] shadow-2xl z-10') : 'hover:bg-amber-50/50 text-stone-500'}`}
                  >
                    <span className={`w-8 h-8 flex-shrink-0 rounded-xl flex items-center justify-center text-[10px] font-black ${activeStep === idx ? 'bg-white text-stone-900' : 'bg-stone-100 text-stone-400 border border-stone-200'}`}>
                      {completedSteps.has(idx) ? '✓' : idx + 1}
                    </span>
                    <span className="text-xs font-black leading-tight uppercase tracking-wider">{step.title}</span>
                  </button>
                ))}
             </div>
          </nav>
        </div>
      </aside>

      <div className="flex-1 space-y-16">
        <section className={`bg-white rounded-[3rem] sm:rounded-[4rem] p-6 sm:p-10 md:p-16 lg:p-20 shadow-sm border-[6px] relative overflow-hidden group/main transition-colors ${exploringMode === ExploringMode.EXPERT ? 'border-amber-950/10' : 'border-amber-50/50'}`}>
           <div className="flex flex-wrap justify-between items-center gap-6 mb-16">
              <div className="flex gap-4">
                <span className={`px-8 py-3 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-950' : 'bg-amber-500'}`}>
                  Module {activeStep + 1}
                </span>
              </div>
           </div>

           <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-stone-900 mb-10 tracking-tighter leading-none">{currentStep.title}</h1>
           <p className="text-lg sm:text-xl text-stone-500 leading-relaxed mb-16 font-medium">{currentStep.description}</p>

           {/* Visual View Mode Tabs & API Settings Bar - Single Unified Responsive Bar */}
           <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-4 bg-amber-50/70 p-1.5 rounded-2xl border border-amber-100">
             <div className="flex items-center gap-1 flex-1 min-w-0">
               <button
                 type="button"
                 onClick={() => setVisualMode('ai')}
                 className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex-1 whitespace-nowrap ${
                   visualMode === 'ai'
                     ? 'bg-white text-stone-900 shadow-sm'
                     : 'text-stone-500 hover:text-stone-900'
                 }`}
               >
                 <span>🖼️</span> <span className="truncate">AI Visual</span>
               </button>
               <button
                 type="button"
                 onClick={() => setVisualMode('online')}
                 className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex-1 whitespace-nowrap ${
                   visualMode === 'online'
                     ? 'bg-white text-stone-900 shadow-sm'
                     : 'text-stone-500 hover:text-stone-900'
                 }`}
               >
                 <span>🌐</span> <span className="truncate">Online</span>
                 {onlineMedia[activeStep] && onlineMedia[activeStep].length > 0 && (
                   <span className="w-4 h-4 bg-amber-500 text-white rounded-full flex items-center justify-center text-[9px] shrink-0 font-black">
                     {onlineMedia[activeStep].length}
                   </span>
                 )}
               </button>
               <button
                 type="button"
                 onClick={() => setVisualMode('blueprint')}
                 className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all flex-1 whitespace-nowrap ${
                   visualMode === 'blueprint'
                     ? 'bg-white text-stone-900 shadow-sm'
                     : 'text-stone-500 hover:text-stone-900'
                 }`}
               >
                 <span>📐</span> <span className="truncate">Blueprint</span>
               </button>
             </div>

             <button
               type="button"
               onClick={() => setIsKeyModalOpen(true)}
               title="Configure API Keys"
               className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shrink-0 active:scale-95 border border-amber-200/50"
             >
               <span>🔑</span> <span className="hidden sm:inline">API</span>
             </button>
           </div>

           <div className="relative mb-16">
             <div className={`bg-stone-950 rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden border-4 sm:border-8 shadow-2xl flex flex-col items-center justify-center relative group/img transition-all min-h-[300px] sm:min-h-[360px] md:aspect-[16/9] w-full ${exploringMode === ExploringMode.EXPERT ? 'border-stone-900' : 'border-stone-100'}`}>
               
               {/* 1. AI VISUAL MODE */}
               {visualMode === 'ai' && (
                 <>
                   {imageSrc && imageSrc !== 'FALLBACK_TRIGGERED' && !imageLoadFailed[activeStep] ? (
                     <div className="relative w-full h-full">
                       <img 
                         src={imageSrc} 
                         alt={currentStep.title} 
                         onError={() => setImageLoadFailed(prev => ({ ...prev, [activeStep]: true }))}
                         className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-[2s] ease-out opacity-90 group-hover/img:opacity-100"
                       />
                       <div className="absolute bottom-4 right-4 bg-stone-900/80 backdrop-blur-md text-amber-300 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-white/10 shadow-lg pointer-events-none">
                         ✨ Visual Synthesis • {tutorial.name} {selectedVersion}
                       </div>
                     </div>
                   ) : imageSrc === 'FALLBACK_TRIGGERED' || imageLoadFailed[activeStep] ? (
                     <div className="flex flex-col items-center justify-center gap-4 p-6 sm:p-8 text-center animate-in zoom-in-95 duration-500 w-full max-w-md my-auto">
                        <div className="text-4xl sm:text-5xl animate-pulse text-amber-400">🌐</div>
                        <div className="space-y-1.5">
                          <h3 className="text-white text-lg sm:text-xl font-bold tracking-tight">Online Visual Mode Ready</h3>
                          <p className="text-stone-400 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
                            Live AI generation is on standby. You can view verified online screenshots or launch the interactive blueprint.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2.5 justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => setVisualMode('online')}
                            className="bg-amber-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-600 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                          >
                            <span>🌐</span> View Online
                          </button>
                          <button
                            type="button"
                            onClick={() => setVisualMode('blueprint')}
                            className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                          >
                            <span>📐</span> Blueprint
                          </button>
                        </div>
                      </div>
                   ) : (
                     <div className="flex flex-col items-center gap-6 text-stone-500">
                       <div className={`w-20 h-20 border-[6px] border-stone-800 rounded-full animate-spin ${exploringMode === ExploringMode.EXPERT ? 'border-t-amber-400' : 'border-t-amber-500'}`}></div>
                       <p className="text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Synthesizing Visual Intelligence...</p>
                     </div>
                   )}
                 </>
               )}

               {/* 2. ONLINE CONTENT MODE */}
               {visualMode === 'online' && (
                 <div className="w-full h-full p-6 sm:p-8 flex flex-col justify-between overflow-y-auto custom-scrollbar bg-gradient-to-b from-stone-900 to-stone-950">
                   {isLoadingOnline ? (
                     <div className="flex flex-col items-center justify-center my-auto gap-4 text-stone-400">
                       <div className="w-12 h-12 border-4 border-stone-700 border-t-amber-500 rounded-full animate-spin"></div>
                       <p className="text-xs font-black uppercase tracking-widest">Searching Online Media...</p>
                     </div>
                   ) : onlineMedia[activeStep] && onlineMedia[activeStep].length > 0 ? (
                     <div className="space-y-4 my-auto">
                       <div className="flex items-center justify-between text-white/70 text-xs font-black uppercase tracking-widest px-2">
                         <span>Verified Online Screenshots ({onlineMedia[activeStep].length})</span>
                         <span className="text-amber-400">Wikimedia Commons</span>
                       </div>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                         {onlineMedia[activeStep].slice(0, 3).map((item, idx) => (
                           <a
                             key={idx}
                             href={item.url}
                             target="_blank"
                             rel="noreferrer"
                             className="group/thumb relative rounded-2xl overflow-hidden bg-stone-800 border-2 border-stone-700 hover:border-amber-400 transition-all aspect-video flex flex-col justify-end"
                           >
                             <img
                               src={item.url}
                               alt={item.title}
                               className="absolute inset-0 w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-500"
                             />
                             <div className="relative z-10 bg-stone-950/80 backdrop-blur-sm p-2 text-white">
                               <p className="text-[10px] font-bold line-clamp-1">{item.title}</p>
                               <span className="text-[8px] text-amber-300 uppercase tracking-widest">View Full Image ↗</span>
                             </div>
                           </a>
                         ))}
                       </div>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center justify-center my-auto gap-4 text-center p-6">
                       <div className="text-4xl text-amber-400">🌐</div>
                       <h3 className="text-white text-lg font-black">Online Curated References</h3>
                       <p className="text-stone-400 text-xs max-w-md">
                         Search verified web repositories and image archives directly for {tutorial.name} {selectedVersion}.
                       </p>
                       <a
                         href={searchQueryUrl}
                         target="_blank"
                         rel="noreferrer"
                         className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg"
                       >
                         Open Web Image Gallery ↗
                       </a>
                     </div>
                   )}
                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/50 pt-3 border-t border-white/10">
                     <span>Topic: {currentStep.title}</span>
                     <span>{tutorial.name} {selectedVersion}</span>
                   </div>
                 </div>
               )}

               {/* 3. BLUEPRINT MODE */}
               {visualMode === 'blueprint' && (
                 <div className="w-full h-full p-8 sm:p-12 flex flex-col justify-between bg-stone-950 text-white">
                   <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                     <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full bg-red-500"></span>
                       <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                       <span className="w-3 h-3 rounded-full bg-green-500"></span>
                       <span className="ml-3 text-xs font-mono text-stone-400 uppercase tracking-wider">
                         {tutorial.name} // {selectedVersion} // Module {activeStep + 1}
                       </span>
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30">
                       {currentStep.difficulty || 'Essential'}
                     </span>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-auto">
                     <div className="space-y-4">
                       <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Target Interaction</span>
                       <h3 className="text-2xl font-black text-white">{currentStep.title}</h3>
                       <p className="text-stone-400 text-sm leading-relaxed">{currentStep.description}</p>
                     </div>
                     <div className="bg-stone-900/90 rounded-2xl p-6 border border-stone-800 space-y-4">
                       <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Visual Cue Radar</span>
                       <div className="flex items-start gap-3">
                         <span className="text-2xl text-amber-400">🎯</span>
                         <p className="text-amber-200 text-sm font-semibold leading-relaxed">
                           {currentStep.visualCue || "Locate the primary action interface element on your screen."}
                         </p>
                       </div>
                       {currentStep.tips && currentStep.tips.length > 0 && (
                         <div className="pt-2 border-t border-stone-800">
                           <span className="text-[9px] font-black uppercase tracking-widest text-stone-500">Pro Tip: </span>
                           <span className="text-xs text-stone-300">{currentStep.tips[0]}</span>
                         </div>
                       )}
                     </div>
                   </div>

                   <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-stone-500 border-t border-stone-800 pt-4">
                     <span>Step {activeStep + 1} of {guide.steps.length}</span>
                     <span>Interactive Blueprint</span>
                   </div>
                 </div>
               )}

             </div>

             <div className="flex flex-wrap justify-center items-center gap-3 mt-4">
                  <a 
                    href={searchQueryUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="bg-white text-stone-600 px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-[11px] hover:bg-stone-900 hover:text-white transition-all shadow-sm border border-stone-200 flex items-center gap-2 active:scale-95"
                  >
                     <span>🔍</span> Search Web Images ↗
                  </a>
                  {visualMode === 'ai' && (
                    <button
                       type="button"
                       onClick={retryImageGeneration}
                       className="bg-white text-stone-600 px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-[11px] hover:bg-stone-900 hover:text-white transition-all shadow-sm border border-stone-200 flex items-center gap-2 active:scale-95"
                    >
                       <span>↻</span> Regenerate Visual
                    </button>
                  )}
              </div>
            </div>

            {currentStep.actionLabel && (
             <div className={`p-8 sm:p-14 rounded-[3rem] sm:rounded-[4rem] text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-[0_40px_80px_-20px_rgba(245,158,11,0.2)] mb-16 animate-in zoom-in-95 duration-700 ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-950' : 'bg-amber-500 shadow-amber-100'}`}>
                <div className="flex items-center gap-10">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/10 rounded-2xl sm:rounded-[3rem] flex-shrink-0 flex items-center justify-center text-4xl sm:text-6xl backdrop-blur-xl shadow-2xl border border-white/10 rotate-3">🏁</div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40 mb-2">Mastery Certification Task</p>
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter leading-tight">{currentStep.actionLabel}</h3>
                  </div>
                </div>
                <button 
                  onClick={() => toggleStep(activeStep)}
                  className={`px-10 sm:px-16 py-6 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl active:scale-95 flex-shrink-0 ${completedSteps.has(activeStep) ? 'bg-emerald-500 text-white scale-105' : 'bg-white text-stone-900 hover:bg-stone-50 hover:-translate-y-2'}`}
                >
                  {completedSteps.has(activeStep) ? '✓ Skill Unlocked' : 'Execute Step'}
                </button>
             </div>
           )}

           <div className="flex items-center justify-between pt-16 border-t-2 border-amber-50">
             <button
                disabled={activeStep === 0}
                onClick={() => setActiveStep(prev => prev - 1)}
                className="flex items-center gap-4 text-stone-300 font-black uppercase tracking-[0.3em] text-[10px] hover:text-amber-600 disabled:opacity-0 transition-colors"
             >
                <span className="w-12 h-12 rounded-2xl border-2 border-amber-50 flex items-center justify-center text-lg transition-all group-hover:border-amber-500">←</span> Previous Module
             </button>
             <button
                disabled={activeStep === guide.steps.length - 1}
                onClick={() => setActiveStep(prev => prev + 1)}
                className={`text-white px-10 sm:px-20 py-5 sm:py-7 rounded-3xl font-black uppercase tracking-widest text-[10px] transition-all shadow-2xl active:scale-95 disabled:opacity-0 ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-950 hover:bg-black shadow-stone-200' : 'bg-amber-500 hover:bg-stone-900 shadow-amber-200'}`}
             >
                Next Architecture →
             </button>
           </div>
        </section>

        <section id="doubt-hub" className={`bg-white rounded-[3rem] sm:rounded-[5rem] shadow-2xl border-[8px] overflow-hidden transition-all ${exploringMode === ExploringMode.EXPERT ? 'border-amber-950/5' : 'border-amber-50'}`}>
           <div className={`p-8 sm:p-16 text-white relative ${exploringMode === ExploringMode.EXPERT ? 'bg-amber-950' : 'bg-stone-900'}`}>
              <div className="max-w-3xl relative z-10">
                 <h2 className="text-5xl sm:text-6xl font-black mb-8 tracking-tighter">Feature Doubt?</h2>
                 <form onSubmit={handleCustomDoubtSubmit} className="relative group">
                    <input 
                      ref={doubtInputRef}
                      type="text" 
                      value={customDoubt}
                      onChange={(e) => setCustomDoubt(e.target.value)}
                      placeholder="e.g. How do I optimize this specific workflow?"
                      className="w-full h-24 sm:h-28 bg-white rounded-3xl sm:rounded-[3rem] px-8 sm:px-12 text-lg sm:text-xl text-stone-900 font-bold shadow-2xl outline-none pr-32 sm:pr-48 border-4 border-transparent focus:border-amber-500 transition-all"
                    />
                    <button type="submit" className="absolute right-4 sm:right-5 top-4 sm:top-5 bottom-4 sm:bottom-5 px-8 sm:px-12 text-white bg-amber-500 rounded-2xl sm:rounded-[2rem] font-black uppercase tracking-widest text-[10px] transition-all">Consult AI</button>
                 </form>
              </div>
           </div>
        </section>
      </div>

      {/* API Key Settings Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl border-4 border-amber-100 p-8 sm:p-12 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <span className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg">🔑</span>
                <div>
                  <h3 className="text-2xl font-black text-stone-900 tracking-tight">Image API Configuration</h3>
                  <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1">Leonardo AI / Custom Key</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsKeyModalOpen(false)}
                className="text-2xl text-stone-400 hover:text-stone-900"
              >
                ×
              </button>
            </div>

            <p className="text-stone-600 text-sm leading-relaxed">
              If your current Leonardo AI API key has run out of tokens, enter your new API key below. If left blank, the application automatically uses the free online visual generator and live online screenshot archives.
            </p>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                Leonardo AI API Key (Bearer Token)
              </label>
              <input
                type="password"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="e.g. 2565d640-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full h-16 bg-stone-50 border-2 border-stone-200 focus:border-amber-500 rounded-2xl px-6 text-sm font-mono outline-none transition-all shadow-inner"
              />
            </div>

            {keySavedMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-2xl text-center">
                {keySavedMessage}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="flex-1 bg-amber-500 hover:bg-stone-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                Save & Apply Key
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomKeyInput('');
                  localStorage.removeItem('CUSTOM_LEONARDO_API_KEY');
                  setKeySavedMessage('Reverted to Free Online Visual Engine!');
                  setTimeout(() => {
                    setKeySavedMessage(null);
                    setIsKeyModalOpen(false);
                    retryImageGeneration();
                  }, 1200);
                }}
                className="bg-stone-100 hover:bg-stone-200 text-stone-700 py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
              >
                Use Free Engine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TutorialView;