import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LandingPage() {
  const { user } = useAuth();
  const [demoInput, setDemoInput] = useState("");
  const [demoMessages, setDemoMessages] = useState([
    {
      id: 1,
      sender: "chloe.vibes",
      time: "10:07 AM",
      text: "Wait were you at the quiz night yesterday? Your team got robbed",
      type: "incoming",
    },
    {
      id: 2,
      sender: "You",
      time: "10:08 AM",
      text: "Haha yeah that tie-breaker question was completely rigged",
      type: "outgoing",
    },
    {
      id: 3,
      sender: "You",
      time: "10:08 AM",
      text: "Pretty sure your table was bribing the host though 👀",
      type: "outgoing",
    },
    {
      id: 4,
      sender: "You",
      time: "10:27 AM",
      text: "Rematch this Friday? Loser buys the first round",
      type: "outgoing",
    },
    {
      id: 5,
      sender: "chloe.vibes",
      time: "10:33 AM",
      text: "Excuse me we won fair and square 😂",
      type: "incoming",
    },
    {
      id: 6,
      sender: "chloe.vibes",
      time: "10:34 AM",
      text: "Deal. Hope you're ready to lose twice 😭",
      type: "incoming",
    },
  ]);
  const [activeFaq, setActiveFaq] = useState(null);
  const [orbitStep, setOrbitStep] = useState(0);
  const [isOrbitHovered, setIsOrbitHovered] = useState(false);

  // Auto-advance orbit carousel every 4.5s unless hovered
  useEffect(() => {
    if (isOrbitHovered) return;
    const timer = setInterval(() => {
      setOrbitStep((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, [isOrbitHovered]);

  const howToSteps = [
    {
      step: 1,
      pill: "Connect IG",
      title: "Connect IG Safely",
      desc: "Authenticate in one tap through official Instagram OAuth. Hooop never asks for or stores your Instagram login credentials.",
    },
    {
      step: 2,
      pill: "Magic Link",
      title: "Share the Magic Link",
      desc: "Pick only the specific DM thread you want help with and generate a disposable, encrypted invite. Drop it to your best friend on iMessage, WhatsApp, or Telegram.",
    },
    {
      step: 3,
      pill: "Tag Out",
      title: "Tag Out & Conquer",
      desc: "Your friend enters wingman mode directly in their browser. They can ghostwrite text, suggest zingers, or press send on your behalf while you spectate keystrokes in real time.",
    },
  ];

  const handleSendDemoMessage = (e) => {
    e?.preventDefault();
    const text = demoInput.trim();
    if (!text) return;
    setDemoMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: "You",
        time: "Just now",
        text,
        type: "outgoing",
      },
    ]);
    setDemoInput("");
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const displayName =
    user?.active_ig_username
      ? `@${user.active_ig_username}`
      : user?.name ||
        user?.username ||
        (user?.email ? user.email.split("@")[0] : "Account");

  const initial = (
    user?.active_ig_username?.[0] ||
    user?.name?.[0] ||
    user?.email?.[0] ||
    "H"
  ).toUpperCase();

  const avatarUrl = user?.picture || user?.avatar_url;

  return (
    <div className="min-h-screen bg-[#f9f9f8] text-[#191918] font-sans antialiased selection:bg-[#e6f3fe] selection:text-[#0075de]">
      {/* HEADER NAVIGATION */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#f9f9f8]/90 backdrop-blur-xl border-b border-[#dfdcd9] shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
        <div className="h-16 md:h-20 w-full px-4 md:px-8 max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Official Hooop Logo */}
          <Link
            to={user ? "/home" : "/"}
            className="flex items-center gap-2.5 group"
          >
            <svg
              className="w-8 h-8 md:w-9 md:h-9 rounded-xl shadow-xs transition-transform group-hover:scale-105 shrink-0"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="32" height="32" rx="8" fill="#191918" />
              <path fill="#FFFFFF" d="M8 7h4v7h8V7h4v18h-4v-7H12v7H8V7z" />
            </svg>
            <span className="font-bold text-lg md:text-xl tracking-tight text-[#191918]">
              Hooop
            </span>
          </Link>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/home"
                className="flex items-center gap-2.5 py-1.5 pl-2 pr-3.5 rounded-full bg-white hover:bg-[#f0eeec] border border-[#dfdcd9] transition-all shadow-xs group"
                title="Go to Hooop Dashboard"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-7 h-7 rounded-full object-cover ring-1 ring-[#dfdcd9] shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#191918] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
                    {initial}
                  </div>
                )}
                <span className="text-xs md:text-sm font-semibold text-[#191918] group-hover:text-[#0075de] transition-colors max-w-[140px] truncate">
                  {displayName}
                </span>
                <span className="material-symbols-outlined text-[17px] text-[#8c8782] group-hover:text-[#191918] group-hover:translate-x-0.5 transition-all shrink-0">
                  arrow_forward
                </span>
              </Link>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full text-xs md:text-sm font-medium text-[#615d59] hover:text-[#191918] hover:bg-[#f0eeec] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  className="px-5 py-2 rounded-full bg-[#191918] text-white text-xs md:text-sm font-medium hover:bg-[#2b2a28] transition-all shadow-sm"
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="w-full pt-16 md:pt-20 bg-[#f9f9f8]">
        <div className="flex flex-col w-full">
          {/* HERO SECTION */}
          <section className="relative w-full overflow-hidden pb-12 lg:pb-20">
            {/* Subtle Minimal Ambient Glow (Black & Subtle Blue) */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[650px] h-[320px] bg-gradient-to-b from-[#0075de]/10 via-black/[0.02] to-transparent blur-3xl rounded-full -z-10"></div>
            <div className="max-w-6xl mx-auto px-4 md:px-8 pt-12 md:pt-16">
              {/* Split Hero Top Row */}
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 lg:gap-12 pb-6">
                {/* Left Side: Headline & Copy */}
                <div className="flex-1 max-w-2xl text-left">

                  {/* Headline */}
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl text-[#191918] font-extrabold tracking-tight leading-[1.08]">
                    When you run out of words, <br className="hidden sm:inline" />
                    tag in your wingman.
                  </h1>

                  {/* Subheadline */}
                  <p className="text-base sm:text-lg text-[#615d59] mt-4 leading-relaxed">
                    Let your hb/hg help you out when you are out of words. No
                    password sharing. Zero screenshot spam. Pure co-op banter.
                  </p>

                </div>

                {/* Right Side: Sign in with Google */}
                <div className="w-full lg:w-auto shrink-0 flex items-center justify-start lg:justify-end">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-3 px-7 py-4 rounded-full bg-[#191918] text-white text-sm font-semibold hover:bg-[#2b2a28] transition-all shadow-md active:scale-[0.98]"
                  >
                    <svg
                      className="w-5 h-5 bg-white rounded-full p-0.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      ></path>
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      ></path>
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        fill="#FBBC05"
                      ></path>
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        fill="#EA4335"
                      ></path>
                    </svg>
                    <span>Sign in with Google</span>
                  </Link>
                </div>
              </div>

              {/* APP MOCKUP PREVIEW WINDOW (Faithful to Image 1 and Image 2) */}
              <div className="hidden md:block w-full mt-10 max-w-5xl mx-auto rounded-2xl bg-white shadow-xl overflow-hidden text-left transition-all border border-[#dfdcd9]">
                {/* Mockup Top Window Chrome */}
                <div className="h-10 bg-[#f8f9ff] px-4 flex items-center justify-between border-b border-[#dfdcd9]/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block"></span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#eff4ff] shadow-xs text-[#615d59] text-[11px] font-mono">
                    <span className="material-symbols-outlined text-[13px] text-[#0075de]">
                      lock
                    </span>
                    <span className="text-[#191918]">
                      app.hooop.chat/conversations/chloe.vibes
                    </span>
                  </div>
                  <div className="w-[52px] hidden sm:block"></div>
                </div>

                {/* 3-Column Light Mode Interface Matching Reference Images */}
                <div className="grid grid-cols-12 min-h-[580px] bg-white">
                  {/* Column 1: Hooop App Sidebar */}
                  <div className="hidden md:flex md:col-span-3 lg:col-span-3 bg-white border-r border-[#dfdcd9]/60 flex-col justify-between p-4">
                    <div>
                      {/* Header with logo and handle pill */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-[#0b1c30] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                            H
                          </div>
                          <span className="text-base font-bold tracking-tight text-[#191918]">
                            Hooop
                          </span>
                        </div>
                        <div className="px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#615d59] text-[11px] font-mono">
                          @jay.walker
                        </div>
                      </div>
                      <p className="text-[11px] text-[#8c8782] mb-5 leading-tight">
                        When you are out of words, let your wingman handle it.
                      </p>

                      {/* Navigation Links */}
                      <nav className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#eff4ff] text-[#0075de] text-xs font-semibold cursor-pointer">
                          <span className="material-symbols-outlined text-[20px] text-[#0075de]">
                            home
                          </span>
                          <span>Home</span>
                        </div>
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[#615d59] hover:bg-[#f4f3f0] transition-colors text-xs font-semibold cursor-pointer">
                          <span className="material-symbols-outlined text-[20px]">
                            group
                          </span>
                          <span>Wingmen</span>
                        </div>
                        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[#615d59] hover:bg-[#f4f3f0] transition-colors text-xs font-semibold cursor-pointer">
                          <span className="material-symbols-outlined text-[20px]">
                            settings
                          </span>
                          <span>Settings</span>
                        </div>
                      </nav>
                    </div>

                    {/* Sign out link at bottom */}
                    <div className="flex items-center gap-2 px-3 py-2 text-[#615d59] text-xs font-semibold hover:text-[#191918] transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-[20px]">
                        logout
                      </span>
                      <span>Sign out</span>
                    </div>
                  </div>

                  {/* Column 2: Conversations List */}
                  <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-white border-r border-[#dfdcd9]/60 p-4 flex flex-col gap-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#191918]">
                        Conversations
                      </span>
                      <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-[#f4f3f0] transition-colors text-[#191918] text-xs font-bold border border-[#dfdcd9] shadow-xs">
                        <span className="text-base leading-none font-normal">+</span>
                        <span>Add DM</span>
                      </button>
                    </div>

                    {/* Search conversations */}
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-[#8c8782]">
                        search
                      </span>
                      <input
                        className="w-full bg-[#f8f9ff] text-[#191918] placeholder:text-[#8c8782] text-xs pl-9 pr-3 py-2 rounded-xl border border-[#dfdcd9]/60 focus:outline-none"
                        readOnly
                        type="text"
                        defaultValue="Search conversations..."
                      />
                    </div>

                    {/* Conversations item list */}
                    <div className="flex flex-col gap-2">
                      {/* Active Conversation: Chloe */}
                      <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#0075de]/20 shadow-xs flex items-center justify-between cursor-pointer transition-all">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-[#0b121e] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                            C
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#0075de] leading-tight">
                              Chloe
                            </div>
                            <div className="text-[11px] text-[#8c8782] font-mono">
                              @chloe.vibes
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Conversation 2: Tariq */}
                      <div className="p-3 rounded-xl bg-white border border-[#dfdcd9]/40 hover:bg-[#f4f3f0] shadow-xs flex items-center justify-between cursor-pointer transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-[#f0eeec] flex items-center justify-center text-[#615d59] font-bold text-sm shadow-xs">
                            T
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#191918] leading-tight">
                              Tariq
                            </div>
                            <div className="text-[11px] text-[#8c8782] font-mono">
                              @tariq_k
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Active Chat Pane (Chloe) */}
                  <div className="col-span-12 md:col-span-5 lg:col-span-6 bg-white flex flex-col justify-between">
                    {/* Active Chat Header */}
                    <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-[#dfdcd9]/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#0b121e] flex items-center justify-center text-white font-bold text-sm shadow-xs">
                          C
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#191918] leading-tight">
                            Chloe
                          </div>
                          <div className="text-[11px] text-[#8c8782] font-mono">
                            @chloe.vibes
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-white border border-[#dfdcd9] shadow-xs text-xs font-bold text-[#191918] flex items-center">
                        <span>Wingman</span>
                      </div>
                    </div>

                    {/* Messages Stream in Clean Light Mode */}
                    <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-white max-h-[380px]">
                      {demoMessages.map((msg) => {
                        if (msg.type === "incoming") {
                          return (
                            <div
                              key={msg.id}
                              className="flex items-start gap-2 max-w-[85%]"
                            >
                              <div className="w-8 h-8 rounded-lg bg-[#0b121e] shrink-0 flex items-center justify-center text-white font-bold text-xs mt-1">
                                C
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="text-[11px] text-[#8c8782] mb-1 font-mono">
                                  @{msg.sender}{" "}
                                  <span className="ml-1 text-[10px] text-[#a1a1aa]">
                                    {msg.time}
                                  </span>
                                </span>
                                <div className="px-3.5 py-2.5 rounded-2xl bg-white text-[#191918] text-xs font-medium shadow-xs border border-[#dfdcd9]">
                                  {msg.text}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div
                            key={msg.id}
                            className="flex items-start justify-end gap-2 ml-auto max-w-[85%]"
                          >
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-[#8c8782] mb-1 mr-1">
                                {msg.time}{" "}
                                <strong className="text-[#191918] font-bold ml-0.5">
                                  You
                                </strong>
                              </span>
                              <div className="px-3.5 py-2.5 rounded-2xl bg-[#0075de] text-white text-xs font-medium shadow-xs">
                                {msg.text}
                              </div>
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-[#0b1c30] shrink-0 flex items-center justify-center text-white font-bold text-[11px] mt-4 shadow-xs">
                              H
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Input Bar (Light Mode) */}
                    <div className="p-3 bg-white border-t border-[#dfdcd9]/60">
                      <form
                        onSubmit={handleSendDemoMessage}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#dfdcd9] shadow-xs focus-within:border-[#0075de] transition-colors"
                      >
                        <input
                          className="flex-1 bg-transparent text-[#191918] placeholder:text-[#8c8782] text-xs focus:outline-none"
                          placeholder="Type a reply... (Enter to send, Shift+Enter for newline)"
                          type="text"
                          value={demoInput}
                          onChange={(e) => setDemoInput(e.target.value)}
                        />
                        <button
                          type="submit"
                          className="w-8 h-8 rounded-full bg-[#0075de] text-white flex items-center justify-center shadow-xs hover:bg-[#0060b8] transition-all font-bold active:scale-95"
                          title="Send message"
                        >
                          <span className="material-symbols-outlined text-[17px]">
                            send
                          </span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>


          {/* HOW IT WORKS SECTION */}
          <section
            className="w-full bg-white py-16 lg:py-20 scroll-mt-24"
            id="how-it-works"
          >
            <div className="max-w-6xl mx-auto px-4 md:px-8">
              <div className="text-center max-w-2xl mx-auto mb-12">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0075de]">
                  Flawless Teamwork
                </span>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#191918] mt-2 tracking-tight">
                  How to Hooop
                </h2>
                <p className="text-sm md:text-base text-[#615d59] mt-2 leading-relaxed">
                  Never type in isolation again. Hooop turns risky DMs into
                  easy collab with your hb/hg.
                </p>
              </div>
              {/* Step Pill Controls */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {howToSteps.map((step, idx) => (
                  <button
                    key={step.step}
                    type="button"
                    onClick={() => setOrbitStep(idx)}
                    className={`orbit-pill px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      orbitStep === idx
                        ? "active bg-[#191918] text-white"
                        : "bg-[#f0eeec] text-[#615d59] hover:bg-[#ebe9e5]"
                    }`}
                  >
                    {step.pill}
                  </button>
                ))}
              </div>

              {/* 3D Orbit Stage */}
              <div
                className="orbit-stage"
                onMouseEnter={() => setIsOrbitHovered(true)}
                onMouseLeave={() => setIsOrbitHovered(false)}
              >
                {howToSteps.map((item, i) => {
                  let diff = i - orbitStep;
                  if (diff === 2) diff = -1;
                  if (diff === -2) diff = 1;

                  return (
                    <div
                      key={item.step}
                      data-pos={diff}
                      onClick={() => setOrbitStep(i)}
                      className="orbit-card rounded-2xl border p-6 md:p-8 flex flex-col justify-between"
                    >
                      <div>
                        <div
                          className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-base mb-4 shadow-xs transition-colors duration-300"
                          style={{
                            backgroundColor: diff === 0 ? "#0075de" : "#191918",
                          }}
                        >
                          {item.step}
                        </div>
                        <h3 className="text-lg font-bold text-[#191918]">
                          {item.title}
                        </h3>
                        <p className="text-xs md:text-sm text-[#615d59] mt-2.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Prev/Next Arrows */}
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  id="orbit-prev"
                  aria-label="Previous step"
                  onClick={() => setOrbitStep((prev) => (prev - 1 + 3) % 3)}
                  className="w-9 h-9 rounded-full border border-[#dfdcd9] bg-white hover:bg-[#f4f3f0] flex items-center justify-center text-[#191918] shadow-2xs cursor-pointer transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_back
                  </span>
                </button>
                <button
                  type="button"
                  id="orbit-next"
                  aria-label="Next step"
                  onClick={() => setOrbitStep((prev) => (prev + 1) % 3)}
                  className="w-9 h-9 rounded-full border border-[#dfdcd9] bg-white hover:bg-[#f4f3f0] flex items-center justify-center text-[#191918] shadow-2xs cursor-pointer transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_forward
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* FEATURES BENTO GRID */}
          <section
            className="w-full bg-[#f9f9f8] py-16 lg:py-20 border-t border-[#dfdcd9] scroll-mt-24"
            id="features"
          >
            <div className="max-w-6xl mx-auto px-4 md:px-8">
              <div className="text-left max-w-2xl mb-12">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0075de]">
                  Engineered For Chemistry
                </span>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#191918] mt-2 tracking-tight">
                  Everything you need to never fumble a DM
                </h2>
                <p className="text-sm md:text-base text-[#615d59] mt-2 leading-relaxed">
                  Designed with uncompromising privacy boundaries and lightning-fast
                  collaborative sync.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 lg:gap-x-16 gap-y-12 lg:gap-y-14">
                {/* Feature 1 */}
                <div className="flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#dfdcd9] text-[#191918] flex items-center justify-center mb-4 shadow-2xs">
                    <span className="material-symbols-outlined text-[20px]">
                      visibility_off
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-[#191918] tracking-tight">
                    Stealth Mode
                  </h3>
                  <p className="text-sm md:text-base text-[#615d59] mt-2.5 leading-relaxed">
                    The person on the other end has no idea someone else helped
                    you type. Every dispatch routes cleanly as your verified
                    profile directly through Meta APIs.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#dfdcd9] text-[#191918] flex items-center justify-center mb-4 shadow-2xs">
                    <span className="material-symbols-outlined text-[20px]">
                      devices
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-[#191918] tracking-tight">
                    Zero Downloads
                  </h3>
                  <p className="text-sm md:text-base text-[#615d59] mt-2.5 leading-relaxed">
                    100% lightweight web workstation. Your wingman doesn't
                    need to register or install software. They just open your
                    link on Safari, Chrome, or mobile.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#dfdcd9] text-[#191918] flex items-center justify-center mb-4 shadow-2xs">
                    <span className="material-symbols-outlined text-[20px]">
                      lock_clock
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-[#191918] tracking-tight">
                    Thread Sandbox
                  </h3>
                  <p className="text-sm md:text-base text-[#615d59] mt-2.5 leading-relaxed">
                    Granular isolation. Your wingman can only see the
                    conversation you intentionally invited them into. Your
                    other messages, photos, and archives remain 100% hidden.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="flex flex-col">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#dfdcd9] text-[#191918] flex items-center justify-center mb-4 shadow-2xs">
                    <span className="material-symbols-outlined text-[20px]">
                      smart_toy
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-[#191918] tracking-tight">
                    Dual Wingman Mode
                  </h3>
                  <p className="text-sm md:text-base text-[#615d59] mt-2.5 leading-relaxed">
                    Need a committee? Invite up to two friends into a private
                    side-channel to vote on punchlines and draft the ultimate
                    comeback together.
                  </p>
                </div>
              </div>
            </div>
          </section>



          {/* FAQ SECTION */}
          <section
            className="w-full bg-[#f9f9f8] py-16 lg:py-20 border-t border-[#dfdcd9] scroll-mt-24"
            id="faq"
          >
            <div className="max-w-4xl mx-auto px-4 md:px-8">
              <div className="text-center mb-12">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0075de]">
                  Got Questions?
                </span>
                <h2 className="text-3xl lg:text-4xl font-extrabold text-[#191918] mt-2 tracking-tight">
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="space-y-3.5">
                {[
                  {
                    q: "Does the other person know my wingman is typing?",
                    a: "No. The recipient only sees messages coming directly from your regular Instagram account. Hooop does not add badges, signatures, or metadata to outgoing messages.",
                  },
                  {
                    q: "Does my friend have to install anything?",
                    a: "Not at all. You generate an invite link and send it via text or WhatsApp. They open the link in any mobile or desktop web browser and immediately enter co-op mode.",
                  },
                  {
                    q: "Can my wingman read all my other conversations?",
                    a: "Absolutely not. Access is sandboxed on a strict, per-thread basis. When you invite a wingman, they only gain view and reply permissions for the exact thread you selected.",
                  },
                  {
                    q: "How do I end the wingman session?",
                    a: "You can click the “Revoke Access” button inside your Hooop dashboard at any moment. Your friend's session instantly terminates and they are redirected to a closed screen.",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    onClick={() => toggleFaq(i)}
                    className="p-5 rounded-2xl bg-white border border-[#dfdcd9] shadow-xs cursor-pointer hover:border-[#191918]/30 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm md:text-base font-bold text-[#191918]">
                        {item.q}
                      </h3>
                      <span className="material-symbols-outlined text-[#8c8782] text-[18px] transition-transform duration-200">
                        {activeFaq === i ? "expand_less" : "expand_more"}
                      </span>
                    </div>
                    {activeFaq === i && (
                      <p className="text-xs md:text-sm text-[#615d59] mt-2.5 leading-relaxed">
                        {item.a}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-[#dfdcd9] py-8">
        <div className="w-full px-4 md:px-8 max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#191918] flex items-center justify-center">
              <span className="text-white text-xs font-bold leading-none">
                H
              </span>
            </div>
            <span className="text-sm font-bold tracking-tight text-[#191918]">
              Hooop
            </span>
            <span className="text-xs text-[#736f6b] ml-2">
              © {new Date().getFullYear()} Hooop Inc. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-5 text-xs text-[#736f6b]">
            <Link
              to="/privacy"
              className="hover:text-[#191918] transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
