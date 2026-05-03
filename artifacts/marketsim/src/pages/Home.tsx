import { useGetSimulationStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Activity, CheckCircle, Percent, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { data: stats, isLoading } = useGetSimulationStats();

  return (
    <div className="container mx-auto px-4 py-12 space-y-16 max-w-6xl">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center text-center space-y-6 py-12">
        <Badge variant="outline" className="glass-badge text-cyan-400 border-cyan-400/30 px-4 py-1.5 uppercase tracking-widest text-xs">
          Synthetic Intelligence Platform
        </Badge>
        <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white max-w-4xl leading-tight" dir="auto">
          اختبر فكرتك قبل أن <span className="gradient-text">تبنيها</span>
        </h1>
        <p className="text-lg md:text-xl text-white/60 max-w-2xl font-light">
          Generate an AI-powered synthetic audience that analyzes your product idea with brutal honesty and real-world market dynamics.
        </p>
        <Link 
          href="/simulate" 
          data-testid="btn-hero-cta"
          className="gradient-button mt-4 px-8 py-4 rounded-full text-lg font-bold flex items-center gap-3 uppercase tracking-wide"
        >
          ابدأ المحاكاة
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-2xl glass-card border-none bg-white/5" />
            <Skeleton className="h-32 rounded-2xl glass-card border-none bg-white/5" />
            <Skeleton className="h-32 rounded-2xl glass-card border-none bg-white/5" />
          </>
        ) : stats ? (
          <>
            <div className="glass-card p-6 flex flex-col justify-between" data-testid="stat-total">
              <div className="flex items-center justify-between text-white/60">
                <span className="uppercase tracking-widest text-sm font-medium">Total Simulations</span>
                <Activity className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-5xl font-light text-white mt-4">{stats.totalSimulations}</div>
            </div>
            
            <div className="glass-card p-6 flex flex-col justify-between" data-testid="stat-completed">
              <div className="flex items-center justify-between text-white/60">
                <span className="uppercase tracking-widest text-sm font-medium">Completed</span>
                <CheckCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="text-5xl font-light text-white mt-4">{stats.completedSimulations}</div>
            </div>
            
            <div className="glass-card p-6 flex flex-col justify-between" data-testid="stat-acceptance">
              <div className="flex items-center justify-between text-white/60">
                <span className="uppercase tracking-widest text-sm font-medium">Avg Acceptance</span>
                <Percent className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-5xl font-light text-white mt-4">
                {stats.avgAcceptanceRate ? `${Math.round(stats.avgAcceptanceRate)}%` : '--'}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Recent Simulations */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-white">Recent Intelligence</h2>
          <Link href="/history" className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1 transition-colors">
            View Archive <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full glass-card border-none bg-white/5" />
            <Skeleton className="h-20 w-full glass-card border-none bg-white/5" />
          </div>
        ) : stats?.recentSimulations?.length === 0 ? (
          <div className="glass-panel p-16 flex flex-col items-center justify-center text-center rounded-2xl">
            <div className="w-24 h-24 mb-6 relative">
              <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
              <svg viewBox="0 0 100 100" className="w-full h-full text-white/20 relative z-10" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="50" cy="50" r="40" strokeDasharray="4 4" />
                <circle cx="50" cy="50" r="20" />
                <path d="M50 30 v40 M30 50 h40" strokeDasharray="2 4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-wide">No Data Streams Active</h3>
            <p className="text-white/50 max-w-md mb-8">Your intelligence archive is empty. Initialize a new simulation to generate market insights.</p>
            <Link 
              href="/simulate" 
              className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition-colors"
            >
              Initialize Scan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stats?.recentSimulations.map((sim) => (
              <Link key={sim.id} href={`/simulation/${sim.id}`} data-testid={`recent-sim-${sim.id}`}>
                <div className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors line-clamp-1" dir="auto">
                      {sim.title || "Untitled Analysis"}
                    </h3>
                    <p className="text-xs text-white/50 uppercase tracking-widest mt-1">
                      {new Date(sim.createdAt).toLocaleDateString()} • ID: {sim.id}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <Badge 
                      variant="outline" 
                      className={`uppercase text-xs font-bold tracking-widest px-3 py-1 ${
                        sim.status === 'completed' ? 'border-emerald-400/50 text-emerald-400 bg-emerald-400/10 shadow-[0_0_10px_-2px_rgba(52,211,153,0.3)]' : 
                        sim.status === 'running' ? 'border-cyan-400/50 text-cyan-400 bg-cyan-400/10 animate-pulse shadow-[0_0_10px_-2px_rgba(34,211,238,0.3)]' : 
                        'border-white/20 text-white/60 bg-white/5'
                      }`}
                    >
                      {sim.status}
                    </Badge>
                    
                    {sim.acceptanceRate !== null && sim.acceptanceRate !== undefined ? (
                      <div className="flex items-baseline gap-1 min-w-[80px] justify-end">
                        <span className="text-2xl font-light text-white">{Math.round(sim.acceptanceRate)}</span>
                        <span className="text-sm text-white/50">%</span>
                      </div>
                    ) : (
                      <div className="min-w-[80px] text-right text-white/30 text-2xl font-light">--</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
