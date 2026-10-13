import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onHome: () => void;
  onGetStarted: () => void;
  onComingSoon: (feature: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onHome, onGetStarted }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isExplorerActive = location.pathname === '/' || location.pathname.startsWith('/tutorial');
  const isTipsActive = location.pathname.startsWith('/tips');
  const isCommunityActive = location.pathname.startsWith('/community');

  const handleHomeClick = () => {
    onHome();
    setIsMenuOpen(false);
  };

  const handleTipsClick = () => {
    navigate('/tips');
    setIsMenuOpen(false);
  };

  const handleCommunityClick = () => {
    navigate('/community');
    setIsMenuOpen(false);
  };

  const handleGetStartedClick = () => {
    onGetStarted();
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-amber-100/50 shadow-sm safe-top transition-all duration-300">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <button 
            onClick={handleHomeClick}
            className="flex items-center gap-3 font-black text-2xl text-stone-900 hover:scale-105 transition-transform"
          >
            <span className="bg-amber-500 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">🎓</span>
            <span className="tracking-tighter">Tp2 Guide</span>
          </button>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={handleHomeClick}
              className={`font-black text-[10px] uppercase tracking-[0.2em] transition-colors px-3 py-2 rounded-xl ${
                isExplorerActive
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-stone-500 hover:text-amber-600'
              }`}
            >
              Explorer
            </button>
            <button
              onClick={handleTipsClick}
              className={`font-black text-[10px] uppercase tracking-[0.2em] transition-colors px-3 py-2 rounded-xl flex items-center gap-1.5 ${
                isTipsActive
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-stone-500 hover:text-amber-600'
              }`}
            >
              <span>⚡</span> Tips
            </button>
            <button
              onClick={handleCommunityClick}
              className={`font-black text-[10px] uppercase tracking-[0.2em] transition-colors px-3 py-2 rounded-xl flex items-center gap-1.5 ${
                isCommunityActive
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-stone-500 hover:text-amber-600'
              }`}
            >
              <span>🌐</span> Community
            </button>
            <div className="h-4 w-[1px] bg-amber-100"></div>
            <button 
              onClick={handleGetStartedClick}
              className="bg-amber-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-stone-900 shadow-lg shadow-amber-100 transition-all active:scale-95"
            >
              Get Started
            </button>
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-12 h-12 flex items-center justify-center"
              aria-label="Toggle menu"
            >
              <div className="space-y-1.5">
                <span className={`block w-6 h-0.5 bg-stone-800 transition-transform duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-stone-800 transition-opacity duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`block w-6 h-0.5 bg-stone-800 transition-transform duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl md:hidden animate-in fade-in duration-300 safe-top">
          <div className="container mx-auto px-4 pt-28 flex flex-col items-center text-center gap-10 h-full overflow-y-auto pb-20">
            <button
              onClick={handleHomeClick}
              className={`font-black text-lg uppercase tracking-widest transition-colors ${
                isExplorerActive ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'
              }`}
            >
              Explorer
            </button>
            <button
              onClick={handleTipsClick}
              className={`font-black text-lg uppercase tracking-widest transition-colors ${
                isTipsActive ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'
              }`}
            >
              ⚡ Tips
            </button>
            <button
              onClick={handleCommunityClick}
              className={`font-black text-lg uppercase tracking-widest transition-colors ${
                isCommunityActive ? 'text-amber-600' : 'text-stone-600 hover:text-amber-600'
              }`}
            >
              🌐 Community
            </button>
            <div className="w-1/2 h-[1px] bg-amber-100 my-4"></div>
            <button 
              onClick={handleGetStartedClick}
              className="bg-amber-500 text-white w-full px-8 py-5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-stone-900 shadow-lg shadow-amber-100 transition-all active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;