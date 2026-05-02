import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, History, PlusCircle } from "lucide-react";

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight uppercase text-primary">MarketSim</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === "/" ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"}`}>
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link href="/simulate" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === "/simulate" ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"}`}>
            <PlusCircle className="w-4 h-4" />
            New Simulation
          </Link>
          <Link href="/history" className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${location === "/history" ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"}`}>
            <History className="w-4 h-4" />
            History
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-border flex items-center px-8 shrink-0">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Terminal Online • SECURE CONNECTION</div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
