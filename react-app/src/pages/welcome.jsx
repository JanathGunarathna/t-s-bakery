
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import backgroundImage from "../images/background.jpg";

export default function Welcome() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const navigate = useNavigate();

  // Professional: use useCallback for handlers
  const handleGetStarted = React.useCallback(() => {
    navigate("/selection");
  }, [navigate]);

  const toggleDarkMode = React.useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  return (
    <div
      className="min-h-screen relative transition-colors duration-300"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Gradient overlay for better content visibility */}
      <div
        className={`absolute inset-0 transition-colors duration-300 ${
          isDarkMode
            ? "bg-gradient-to-br from-gray-900/80 via-slate-900/85 to-gray-800/80"
            : "bg-gradient-to-br from-stone-50/85 via-amber-50/90 to-orange-50/85"
        }`}
      ></div>
      <div className={`relative z-10 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
        {/* Modern geometric background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Glassmorphism cards floating */}
        <div
          className={`absolute top-20 left-16 w-72 h-48 rounded-3xl opacity-40 blur-sm rotate-12 ${
            isDarkMode 
              ? "bg-gradient-to-br from-amber-900/30 to-orange-800/20 border border-amber-700/20" 
              : "bg-gradient-to-br from-white/60 to-amber-100/40 border border-amber-200/30"
          }`}
          style={{ 
            animation: "floatSlow 12s ease-in-out infinite",
            backdropFilter: "blur(40px)"
          }}
        ></div>
        
        <div
          className={`absolute top-1/3 right-20 w-80 h-56 rounded-3xl opacity-30 blur-sm -rotate-6 ${
            isDarkMode 
              ? "bg-gradient-to-br from-orange-900/25 to-yellow-800/15 border border-orange-700/20" 
              : "bg-gradient-to-br from-orange-100/70 to-yellow-100/50 border border-orange-200/40"
          }`}
          style={{ 
            animation: "floatSlow 15s ease-in-out infinite",
            animationDelay: "3s",
            backdropFilter: "blur(20px)"
          }}
        ></div>

        <div
          className={`absolute bottom-32 left-1/4 w-64 h-64 rounded-full opacity-20 ${
            isDarkMode ? "bg-gradient-to-r from-amber-600/30 to-orange-500/20" : "bg-gradient-to-r from-amber-400/40 to-orange-300/30"
          }`}
          style={{ 
            animation: "pulse 8s ease-in-out infinite",
            filter: "blur(40px)"
          }}
        ></div>

        {/* Modern grid pattern */}
        <div
          className={`absolute inset-0 opacity-10 ${isDarkMode ? "opacity-5" : ""}`}
          style={{
            backgroundImage: `linear-gradient(${isDarkMode ? "rgba(245,158,11,0.1)" : "rgba(180,83,9,0.1)"} 1px, transparent 1px), linear-gradient(90deg, ${isDarkMode ? "rgba(245,158,11,0.1)" : "rgba(180,83,9,0.1)"} 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        ></div>
      </div>

      {/* Header with modern navbar */}
  <header className="relative z-20 flex justify-between items-center p-8">
        <div className="flex items-center gap-4">
          <div
            className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 overflow-hidden ${
              isDarkMode
                ? "bg-gradient-to-r from-amber-600 to-orange-600"
                : "bg-gradient-to-r from-amber-500 to-orange-500"
            }`}
          >
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
            <span className="relative z-10 text-2xl font-bold text-white">T&S</span>
          </div>
          <div>
            <h2 className={`font-bold text-xl transition-colors duration-300 ${
              isDarkMode ? "text-white" : "text-gray-900"
            }`}>
              T&S Bakery
            </h2>
            <p className={`text-sm transition-colors duration-300 ${
              isDarkMode ? "text-amber-300" : "text-amber-700"
            }`}>
              Premium Chain
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Navigation pills */}
          {/* <nav className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-md transition-all duration-300 ${
            isDarkMode 
              ? "bg-white/5 border border-white/10" 
              : "bg-white/60 border border-white/40"
          }`}>
            <span className={`px-4 py-2 text-sm font-medium transition-colors ${
              isDarkMode ? "text-amber-300" : "text-amber-700"
            }`}>Menu</span>
            <span className={`px-4 py-2 text-sm font-medium transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}>About</span>
            <span className={`px-4 py-2 text-sm font-medium transition-colors ${
              isDarkMode ? "text-gray-400" : "text-gray-600"
            }`}>Contact</span>
          </nav> */}

          <button
            type="button"
            onClick={toggleDarkMode}
            className={`group flex items-center gap-2 px-5 py-3 rounded-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 ${
              isDarkMode
                ? "bg-white/10 hover:bg-white/15 text-amber-200 border border-white/20"
                : "bg-white/70 hover:bg-white/90 text-amber-700 border border-white/50 shadow-lg"
            }`}
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className={`text-lg transition-all duration-300 group-hover:scale-110 ${
              isDarkMode ? "text-yellow-400" : "text-amber-600"
            }`}>
              {isDarkMode ? "☀️" : "🌙"}
            </span>
            <span className="text-sm font-medium hidden sm:block">
              {isDarkMode ? "Light" : "Dark"}
            </span>
          </button>
        </div>
      </header>

      {/* Main hero content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 -mt-24">
        
        {/* Hero badge */}
        {/* <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium mb-8 backdrop-blur-md transition-all duration-300 hover:scale-105 ${
          isDarkMode
            ? "bg-white/10 text-amber-200 border border-amber-500/30"
            : "bg-white/80 text-amber-800 border border-amber-300/50 shadow-lg"
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            isDarkMode ? "bg-amber-400" : "bg-amber-600"
          }`}></div>
          <span>Est. 2010 • Award Winning • Artisan Crafted</span>
        </div> */}

        {/* Main title with modern typography */}
        <div className="text-center mb-12 max-w-5xl">
          <h1 className={`text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-tight tracking-tight ${
            isDarkMode
              ? "text-transparent bg-gradient-to-r from-white via-amber-200 to-orange-300 bg-clip-text"
              : "text-transparent bg-gradient-to-r from-gray-900 via-amber-800 to-orange-700 bg-clip-text"
          }`}>
            Premium
            <br />
            <span className={`${
              isDarkMode 
                ? "text-transparent bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text"
                : "text-transparent bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text"
            }`}>
              Bakery Experience
            </span>
          </h1>

          <p className={`text-xl md:text-2xl font-light leading-relaxed max-w-3xl mx-auto transition-colors duration-500 ${
            isDarkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            Where traditional craftsmanship meets modern innovation. 
            <br />
            Experience the finest baked goods in the city.
          </p>
        </div>

        {/* Modern CTA section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center mb-16">
          <button
            type="button"
            onClick={handleGetStarted}
            className={`group relative px-12 py-5 text-lg font-semibold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 focus:outline-none focus:ring-4 active:scale-95 overflow-hidden ${
              isDarkMode
                ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-2xl focus:ring-amber-500/50"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-2xl focus:ring-amber-400/50"
            }`}
            aria-label="Get started with T&S Bakery"
          >
            <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <span className="relative z-10 flex items-center gap-3">
              Let's Start
              <span className="transition-transform duration-300 group-hover:translate-x-2">
                ✨
              </span>
            </span>
          </button>

          {/* <button
            className={`px-8 py-5 text-lg font-medium rounded-2xl backdrop-blur-md transition-all duration-300 hover:scale-105 border-2 ${
              isDarkMode
                ? "text-amber-200 border-amber-500/50 hover:bg-amber-500/10 hover:border-amber-400"
                : "text-amber-700 border-amber-300 hover:bg-amber-50 hover:border-amber-400 bg-white/30"
            }`}
          >
            Our Story
          </button> */}
        </div>

        {/* Feature highlights */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {[
            { icon: "🥐", title: "Fresh Daily", desc: "Baked fresh every morning" },
            { icon: "🌾", title: "Local Ingredients", desc: "Sourced from local farms" },
            { icon: "👨‍🍳", title: "Master Bakers", desc: "Crafted by experts" }
          ].map((feature, index) => (
            <div
              key={index}
              className={`group p-6 rounded-3xl backdrop-blur-md transition-all duration-300 hover:scale-105 hover:-translate-y-2 ${
                isDarkMode
                  ? "bg-white/5 border border-white/10 hover:bg-white/10"
                  : "bg-white/60 border border-white/40 hover:bg-white/80 shadow-lg"
              }`}
            >
              <div className="text-4xl mb-4 transition-transform duration-300 group-hover:scale-110">
                {feature.icon}
              </div>
              <h3 className={`text-lg font-semibold mb-2 ${
                isDarkMode ? "text-white" : "text-gray-900"
              }`}>
                {feature.title}
              </h3>
              <p className={`text-sm ${
                isDarkMode ? "text-gray-300" : "text-gray-600"
              }`}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div> */}
      </div>

  <style>{`
        @keyframes floatSlow {
          0%, 100% {
            transform: translateY(0px) rotate(12deg);
          }
          50% {
            transform: translateY(-20px) rotate(15deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.3;
          }
        }
  `}</style>
      </div>
    </div>
  );
}