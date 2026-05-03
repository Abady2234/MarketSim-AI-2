import { useGetSimulationStats, useListSimulations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Activity, CheckCircle, Percent, ArrowLeft, Zap, Users, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetSimulationStats();
  const { data: simulations, isLoading: simsLoading } = useListSimulations();

  const isLoading = statsLoading || simsLoading;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 space-y-20 max-w-6xl">

      {/* ─── Hero ─── */}
      <section className="flex flex-col items-center text-center space-y-8 pt-8">
        <div className="glass-badge inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-cyan-400 uppercase tracking-widest">
          <Zap className="w-3.5 h-3.5" />
          منصة الذكاء الاصطناعي للسوق العربي
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.1]">
          اختبر فكرتك
          <br />
          <span className="gradient-text">قبل أن تبنيها</span>
        </h1>

        <p className="text-lg md:text-xl text-white/50 max-w-2xl font-medium leading-relaxed">
          أنشئ جمهورًا اصطناعيًا يحاكي آراء المستهلكين الحقيقيين ويحلل منتجك
          بصدق مطلق وديناميكيات السوق الفعلية.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <Link
            href="/simulate"
            data-testid="btn-hero-cta"
            className="gradient-button px-10 py-4 rounded-2xl text-lg font-black flex items-center gap-3 uppercase tracking-wide"
          >
            ابدأ المحاكاة
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link
            href="/history"
            className="px-8 py-4 rounded-2xl text-sm font-bold text-white/60 hover:text-white glass-card transition-all hover:bg-white/[0.08] uppercase tracking-widest"
          >
            عرض السجل
          </Link>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {isLoading ? (
          <>
            <Skeleton className="h-36 rounded-2xl bg-white/5" />
            <Skeleton className="h-36 rounded-2xl bg-white/5" />
            <Skeleton className="h-36 rounded-2xl bg-white/5" />
          </>
        ) : stats ? (
          <>
            <div className="stat-card p-7 flex flex-col gap-4" data-testid="stat-total">
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs uppercase tracking-widest font-bold">إجمالي المحاكاة</span>
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-violet-400" />
                </div>
              </div>
              <div className="text-5xl font-black text-white">{stats.totalSimulations}</div>
              <div className="h-[2px] w-12 bg-gradient-to-r from-violet-500 to-transparent rounded-full" />
            </div>

            <div className="stat-card p-7 flex flex-col gap-4" data-testid="stat-completed">
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs uppercase tracking-widest font-bold">مكتملة</span>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <div className="text-5xl font-black text-white">{stats.completedSimulations}</div>
              <div className="h-[2px] w-12 bg-gradient-to-r from-cyan-500 to-transparent rounded-full" />
            </div>

            <div className="stat-card p-7 flex flex-col gap-4" data-testid="stat-acceptance">
              <div className="flex items-center justify-between">
                <span className="text-white/40 text-xs uppercase tracking-widest font-bold">متوسط القبول</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                  <Percent className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="text-5xl font-black text-white">
                {stats.avgAcceptanceRate ? `${Math.round(stats.avgAcceptanceRate)}%` : '--'}
              </div>
              <div className="h-[2px] w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
            </div>
          </>
        ) : null}
      </section>

      {/* ─── How it works ─── */}
      <section className="space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-white">كيف يعمل النظام؟</h2>
          <p className="text-white/40 text-sm uppercase tracking-widest">أربع خطوات لفهم سوقك</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { step: "01", icon: BarChart3, color: "violet", title: "تحليل الفكرة", desc: "يستخرج النظام جوهر منتجك والشريحة المستهدفة من وصفك." },
            { step: "02", icon: Users, color: "indigo", title: "توليد الشخصيات", desc: "يبني 3–12 شخصية واقعية بسلوكيات ودوافع مختلفة." },
            { step: "03", icon: Activity, color: "cyan", title: "محاكاة السوق", desc: "تستجيب كل شخصية لفكرتك بناءً على قيمها وسلوكها الرقمي." },
            { step: "04", icon: Zap, color: "emerald", title: "تقرير استراتيجي", desc: "تلقى 3 توصيات عملية مدعومة بنسب القبول وأنماط الفشل." },
          ].map(({ step, icon: Icon, color, title, desc }) => (
            <div key={step} className="glass-card p-6 space-y-4 relative overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 ${
                color === "violet" ? "bg-violet-500" :
                color === "indigo" ? "bg-indigo-500" :
                color === "cyan" ? "bg-cyan-500" : "bg-emerald-500"
              }`} />
              <div className="relative">
                <span className="text-4xl font-black text-white/[0.06]">{step}</span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                color === "violet" ? "bg-violet-500/20" :
                color === "indigo" ? "bg-indigo-500/20" :
                color === "cyan" ? "bg-cyan-500/20" : "bg-emerald-500/20"
              }`}>
                <Icon className={`w-5 h-5 ${
                  color === "violet" ? "text-violet-400" :
                  color === "indigo" ? "text-indigo-400" :
                  color === "cyan" ? "text-cyan-400" : "text-emerald-400"
                }`} />
              </div>
              <div>
                <h3 className="font-black text-white text-base mb-1">{title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Recent Simulations ─── */}
      <section className="space-y-6 pb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">آخر المحاكاة</h2>
          <Link href="/history" className="text-cyan-400 hover:text-cyan-300 text-sm font-bold flex items-center gap-1.5 transition-colors">
            عرض الكل
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full bg-white/5 rounded-xl" />
            <Skeleton className="h-20 w-full bg-white/5 rounded-xl" />
            <Skeleton className="h-20 w-full bg-white/5 rounded-xl" />
          </div>
        ) : !simulations || simulations.length === 0 ? (
          <div className="glass-panel p-16 flex flex-col items-center justify-center text-center rounded-2xl">
            <div className="w-20 h-20 mb-6 relative">
              <div className="absolute inset-0 bg-violet-500/20 blur-2xl rounded-full" />
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                <Activity className="w-10 h-10 text-white/20" />
              </div>
            </div>
            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">لا توجد محاكاة بعد</h3>
            <p className="text-white/40 max-w-sm mb-8 text-sm leading-relaxed">أرشيف التحليلات فارغ. ابدأ محاكاتك الأولى وشاهد السوق يستجيب.</p>
            <Link
              href="/simulate"
              className="px-7 py-3 rounded-full gradient-button text-sm font-bold"
            >
              ابدأ الآن
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {simulations.map((sim) => (
              <Link key={sim.id} href={`/simulation/${sim.id}`} data-testid={`recent-sim-${sim.id}`}>
                <div className="glass-card px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.07] hover:border-violet-500/20 transition-all cursor-pointer group">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-base text-white group-hover:gradient-text transition-colors truncate" dir="auto">
                      {sim.title || "تحليل بدون عنوان"}
                    </h3>
                    <p className="text-xs text-white/35 mt-1 font-mono">
                      #{sim.id} • {new Date(sim.createdAt).toLocaleDateString("ar-SA")}
                    </p>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      sim.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30' :
                      sim.status === 'running'   ? 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30 animate-pulse' :
                      sim.status === 'failed'    ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30' :
                                                   'bg-white/8 text-white/40 ring-1 ring-white/10'
                    }`}>
                      {sim.status === 'completed' ? 'مكتمل' : sim.status === 'running' ? 'يعمل' : sim.status === 'failed' ? 'فشل' : 'انتظار'}
                    </span>

                    {sim.acceptanceRate !== null && sim.acceptanceRate !== undefined ? (
                      <div className="text-left min-w-[56px]">
                        <span className="text-2xl font-black text-white">{Math.round(sim.acceptanceRate)}</span>
                        <span className="text-sm text-white/40">%</span>
                      </div>
                    ) : (
                      <div className="text-2xl font-black text-white/20 min-w-[56px]">--</div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
