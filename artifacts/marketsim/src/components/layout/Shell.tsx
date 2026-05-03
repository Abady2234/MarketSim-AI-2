import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, History, LayoutDashboard } from "lucide-react";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Mission Control", icon: LayoutDashboard },
    { href: "/simulate", label: "Launch Simulation", icon: Activity },
    { href: "/history", label: "Intelligence Archive", icon: History },
  ];

  return (
    <div className="min-h-[100dvh] relative overflow-hidden flex flex-col text-slate-200">
      {/* Animated Orbs Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-violet-600/20 blur-[120px] animate-orb-drift mix-blend-screen" />
        <div className="absolute top-[40%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-cyan-500/20 blur-[100px] animate-orb-drift-reverse mix-blend-screen" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/20 blur-[140px] animate-orb-drift mix-blend-screen" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group cursor-pointer" data-testid="link-home">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-violet-500 to-cyan-400 p-0.5">
              <div className="w-full h-full bg-[#0a0118] rounded-[3px] flex items-center justify-center">
                <Activity className="w-4 h-4 text-cyan-400 group-hover:text-violet-400 transition-colors" />
              </div>
            </div>
            <span className="font-display font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              MarketSim <span className="text-cyan-400">AI</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : ""}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 w-full">
        {children}
      </main>
    </div>
  );
}
