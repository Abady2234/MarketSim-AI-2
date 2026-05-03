import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Clock, LayoutDashboard } from "lucide-react";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "لوحة التحكم", icon: LayoutDashboard },
    { href: "/simulate", label: "محاكاة جديدة", icon: Activity },
    { href: "/history", label: "سجل المحاكاة", icon: Clock },
  ];

  return (
    <div className="min-h-[100dvh] relative overflow-hidden flex flex-col text-white">
      {/* Animated Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-15%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-violet-700/25 blur-[130px] animate-[orb-drift_20s_infinite_alternate_ease-in-out] mix-blend-screen" />
        <div className="absolute top-[50%] left-[-10%] w-[35vw] h-[35vw] rounded-full bg-cyan-600/20 blur-[110px] animate-[orb-drift-reverse_25s_infinite_alternate_ease-in-out] mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[25%] w-[50vw] h-[40vw] rounded-full bg-indigo-700/20 blur-[150px] animate-[orb-drift_30s_infinite_alternate_ease-in-out] mix-blend-screen" />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.07] bg-black/30 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer" data-testid="link-home">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 p-[2px] shadow-[0_0_16px_rgba(139,92,246,0.4)]">
              <div className="w-full h-full bg-[#0d0825] rounded-[6px] flex items-center justify-center">
                <Activity className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <span className="font-display font-black text-xl tracking-tight">
              <span className="text-white">MarketSim</span>
              <span className="gradient-text"> AI</span>
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-${item.label}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-violet-500/15 text-white border border-violet-500/30 shadow-[0_0_12px_-4px_rgba(139,92,246,0.5)]"
                      : "text-white/50 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile nav */}
          <nav className="flex md:hidden items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2 rounded-lg transition-all ${
                    isActive ? "bg-violet-500/20 text-cyan-400" : "text-white/40 hover:text-white"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                </Link>
              );
            })}
          </nav>

        </div>
      </header>

      {/* Main */}
      <main className="flex-1 relative z-10 w-full">
        {children}
      </main>
    </div>
  );
}
