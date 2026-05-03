import { useListSimulations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Activity, ArrowLeft, ChevronLeft } from "lucide-react";

export default function History() {
  const { data: simulations, isLoading } = useListSimulations();

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-5xl">

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-white/30 text-sm mb-4 font-bold uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" />
          <span>لوحة التحكم</span>
          <span>/</span>
          <span className="text-white/60">سجل المحاكاة</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center border border-violet-500/20">
            <Clock className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white">سجل المحاكاة</h1>
            <p className="text-white/35 text-sm uppercase tracking-widest font-bold mt-1">أرشيف تحليلات السوق السابقة</p>
          </div>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl bg-white/[0.04]" />
          ))}
        </div>
      ) : !simulations || simulations.length === 0 ? (
        <div className="glass-panel py-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 mb-6 relative">
            <div className="absolute inset-0 bg-violet-500/15 blur-2xl rounded-full" />
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <Activity className="w-10 h-10 text-white/15" />
            </div>
          </div>
          <h3 className="text-xl font-black text-white mb-2">لا توجد محاكاة في السجل</h3>
          <p className="text-white/35 text-sm max-w-sm mb-8 leading-relaxed">لم تُنشئ أي محاكاة بعد. ابدأ أولى تجاربك الآن.</p>
          <Link href="/simulate" className="gradient-button px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest">
            ابدأ محاكاة جديدة
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {simulations.map((sim) => (
            <Link key={sim.id} href={`/simulation/${sim.id}`}>
              <div className="glass-card px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.07] hover:border-violet-500/20 transition-all cursor-pointer group">

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-base text-white group-hover:text-cyan-300 transition-colors truncate" dir="auto">
                    {sim.title || "تحليل بدون عنوان"}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-white/25 font-mono">#{sim.id}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-xs text-white/25">
                      {new Date(sim.createdAt).toLocaleDateString("ar-SA", {
                        year: "numeric", month: "long", day: "numeric"
                      })}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] text-white/25 uppercase tracking-widest font-bold mb-1">الحالة</p>
                    <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      sim.status === "completed" ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30" :
                      sim.status === "running"   ? "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30 animate-pulse" :
                      sim.status === "failed"    ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30" :
                                                   "bg-white/[0.06] text-white/30 ring-1 ring-white/10"
                    }`}>
                      {sim.status === "completed" ? "مكتمل" :
                       sim.status === "running"   ? "يعمل" :
                       sim.status === "failed"    ? "فشل" : "انتظار"}
                    </span>
                  </div>

                  <div className="text-right min-w-[64px]">
                    <p className="text-[10px] text-white/25 uppercase tracking-widest font-bold mb-1">القبول</p>
                    {sim.acceptanceRate !== null && sim.acceptanceRate !== undefined ? (
                      <div>
                        <span className="text-2xl font-black text-white">{Math.round(sim.acceptanceRate)}</span>
                        <span className="text-sm text-white/40">%</span>
                      </div>
                    ) : (
                      <span className="text-2xl font-black text-white/20">--</span>
                    )}
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowLeft className="w-5 h-5 text-cyan-400" />
                  </div>
                </div>

              </div>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}
