import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  useGetSimulation,
  getGetSimulationQueryKey,
  type Persona,
  type SimulationReport,
  useDeleteSimulation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSimulationStream } from "@/hooks/use-simulation-stream";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Play, Cpu, AlertTriangle, ArrowRight, Target, Lightbulb,
  TrendingUp, CheckCircle, XCircle, AlertCircle, Trash2, ChevronLeft,
} from "lucide-react";

export default function SimulationDetail() {
  const { id } = useParams<{ id: string }>();
  const simId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const deleteSimulation = useDeleteSimulation();

  const { data: simulation, isLoading, isError } = useGetSimulation(simId, {
    query: { enabled: !!simId, queryKey: getGetSimulationQueryKey(simId) },
  });

  const { state: streamState, startStream } = useSimulationStream(simId);
  const [localPersonas, setLocalPersonas] = useState<Persona[]>([]);
  const [localReport, setLocalReport] = useState<SimulationReport | null>(null);

  useEffect(() => {
    if (streamState.personas.length > 0) setLocalPersonas(streamState.personas);
  }, [streamState.personas]);

  useEffect(() => {
    if (streamState.report) setLocalReport(streamState.report);
  }, [streamState.report]);

  useEffect(() => {
    if (streamState.status === "completed") {
      queryClient.invalidateQueries({ queryKey: getGetSimulationQueryKey(simId) });
    }
  }, [streamState.status, simId, queryClient]);

  const displayPersonas = localPersonas.length > 0 ? localPersonas : (simulation?.personas || []);
  const displayReport = localReport || simulation?.report;
  const currentStatus = streamState.status !== "idle" ? streamState.status : simulation?.status;

  const isPending = currentStatus === "pending";
  const isRunning = currentStatus === "running";
  const isCompleted = currentStatus === "completed";
  const isFailed = currentStatus === "failed" || streamState.status === "error";

  const handleDelete = () => {
    if (confirm("هل أنت متأكد من حذف هذه المحاكاة؟")) {
      deleteSimulation.mutate({ id: simId }, { onSuccess: () => setLocation("/history") });
    }
  };

  const acceptanceData = [
    { name: "قرار شراء", value: displayPersonas.filter((p) => p.decision === "confirmed_buy").length, color: "#10b981" },
    { name: "متردد", value: displayPersonas.filter((p) => p.decision === "hesitant_buy").length, color: "#06b6d4" },
    { name: "رفض", value: displayPersonas.filter((p) => p.decision === "flat_reject").length, color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const acceptanceRate = streamState.acceptanceRate ?? simulation?.acceptanceRate ?? 0;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-6xl space-y-5">
        <Skeleton className="h-10 w-1/3 bg-white/[0.04] rounded-xl" />
        <Skeleton className="h-56 w-full bg-white/[0.04] rounded-2xl" />
        <Skeleton className="h-56 w-full bg-white/[0.04] rounded-2xl" />
      </div>
    );
  }

  if (isError || !simulation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertTriangle className="w-16 h-16 text-red-400" />
        <h2 className="text-2xl font-black text-white">لم يتم العثور على المحاكاة</h2>
        <Link href="/" className="gradient-button px-6 py-3 rounded-xl text-sm font-black">العودة للرئيسية</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-6xl pb-24">

      {/* ─── Header ─── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-white/30 text-sm mb-4 font-bold uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" />
          <Link href="/" className="hover:text-white/60 transition-colors">الرئيسية</Link>
          <span>/</span>
          <span className="text-white/60">تفاصيل المحاكاة</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight truncate" dir="auto">
              {simulation.title || "تحليل السوق المستهدف"}
            </h1>
            <p className="text-white/30 text-xs font-mono mt-1.5 uppercase tracking-widest">
              #{simulation.id} • {new Date(simulation.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
              isCompleted ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30" :
              isRunning   ? "bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30 animate-pulse" :
              isFailed    ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30" :
                            "bg-white/[0.06] text-white/40 ring-1 ring-white/10"
            }`}>
              {isCompleted ? "مكتمل" : isRunning ? "يعمل..." : isFailed ? "فشلت" : "في الانتظار"}
            </span>
            <button
              onClick={handleDelete}
              disabled={deleteSimulation.isPending}
              className="w-9 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-all border border-red-500/20"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Idea Input ─── */}
      <div className="glass-card p-6 mb-6">
        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">فكرة المنتج</p>
        <p className="text-white/80 text-sm leading-relaxed font-mono bg-black/20 p-4 rounded-xl border border-white/[0.06]" dir="auto">
          {simulation.ideaText}
        </p>
        {(simulation.price || simulation.income) && (
          <div className="flex gap-4 mt-4">
            {simulation.price && (
              <div className="text-xs text-white/40">
                <span className="text-white/20 uppercase tracking-wider">السعر: </span>
                <span className="text-cyan-400 font-bold">{simulation.price}</span>
              </div>
            )}
            {simulation.income && (
              <div className="text-xs text-white/40">
                <span className="text-white/20 uppercase tracking-wider">الدخل المستهدف: </span>
                <span className="text-violet-400 font-bold">{simulation.income}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Failed State ─── */}
      {isFailed && !isRunning && (
        <div className="glass-panel py-14 flex flex-col items-center justify-center text-center mb-6 relative overflow-hidden border border-red-500/20">
          <div className="absolute inset-0 bg-red-500/[0.04] rounded-2xl" />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <AlertTriangle className="w-9 h-9 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-2">فشلت المحاكاة</h2>
              <p className="text-white/40 max-w-md text-sm leading-relaxed">
                {streamState.error || "حدث خطأ أثناء توليد الشخصيات. يمكنك إعادة المحاولة الآن."}
              </p>
            </div>
            <button
              onClick={() => {
                setLocalPersonas([]);
                setLocalReport(null);
                startStream();
              }}
              className="gradient-button px-10 py-4 rounded-xl font-black text-base uppercase tracking-widest flex items-center gap-3"
            >
              <Play className="w-5 h-5" />
              إعادة المحاولة
            </button>
          </div>
        </div>
      )}

      {/* ─── Pending State ─── */}
      {isPending && (
        <div className="glass-panel py-16 flex flex-col items-center justify-center text-center mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-violet-500/5 rounded-2xl" />
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Cpu className="w-9 h-9 text-violet-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-2">المحرك جاهز للإطلاق</h2>
              <p className="text-white/40 max-w-md text-sm leading-relaxed">
                سيُولّد النظام جمهورًا اصطناعيًا مستهدفًا ويقيّم فكرتك بناءً على سلوكياتهم واحتياجاتهم الحقيقية.
              </p>
            </div>
            <button
              onClick={() => startStream()}
              className="gradient-button px-10 py-4 rounded-xl font-black text-base uppercase tracking-widest flex items-center gap-3"
            >
              <Play className="w-5 h-5" />
              بدء المحاكاة
            </button>
          </div>
        </div>
      )}

      {/* ─── Running State ─── */}
      {isRunning && (
        <div className="glass-card p-7 mb-6 border-cyan-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-l from-cyan-500/[0.04] to-transparent" />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div className="flex items-center gap-3">
              <Cpu className="w-6 h-6 text-cyan-400 animate-spin" />
              <span className="text-cyan-400 font-black uppercase tracking-widest text-sm">جارٍ المعالجة</span>
            </div>
            <p className="text-white/50 text-sm font-mono text-center">{streamState.progress || "جارٍ تهيئة المسارات العصبية..."}</p>
            <div className="w-full max-w-md bg-white/[0.06] rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-l from-cyan-400 to-violet-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(((displayPersonas.length) / (simulation.numPersonas || 8)) * 90, 90)}%` }}
              />
            </div>
            <p className="text-white/30 text-xs font-mono">{displayPersonas.length} / {simulation.numPersonas || "?"} شخصية</p>
          </div>
        </div>
      )}

      {/* ─── Personas Grid ─── */}
      {displayPersonas.length > 0 && (
        <div className="space-y-5 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              الجمهور الاصطناعي
            </h2>
            <span className="text-xs text-white/30 font-mono">{displayPersonas.length} شخصية</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {displayPersonas.map((persona, idx) => {
                const isBuy = persona.decision === "confirmed_buy";
                const isHesitant = persona.decision === "hesitant_buy";
                const isReject = persona.decision === "flat_reject";

                return (
                  <motion.div
                    key={persona.id || idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(idx * 0.08, 0.6) }}
                    className={`${
                      isBuy ? "persona-card-buy" :
                      isHesitant ? "persona-card-hesitant" :
                      "persona-card-reject"
                    } p-5`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-lg text-white leading-tight" dir="auto">
                          {persona.name}، {persona.age}
                        </h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest mt-0.5 font-bold">{persona.profession}</p>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isBuy ? "bg-emerald-500/20" : isHesitant ? "bg-cyan-500/20" : "bg-red-500/20"
                      }`}>
                        {isBuy && <CheckCircle className="text-emerald-400 w-5 h-5" />}
                        {isHesitant && <AlertCircle className="text-cyan-400 w-5 h-5" />}
                        {isReject && <XCircle className="text-red-400 w-5 h-5" />}
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="bg-black/20 rounded-xl p-3 border border-white/[0.05]">
                        <p className="text-white/60 italic leading-relaxed text-xs" dir="auto">"{persona.opinion}"</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/15 rounded-lg p-2.5">
                          <p className="text-[10px] text-white/25 uppercase tracking-widest font-bold mb-1">السلوك الرقمي</p>
                          <p className="text-white/60 text-xs leading-relaxed" title={persona.digitalBehavior}>{persona.digitalBehavior}</p>
                        </div>
                        <div className="bg-black/15 rounded-lg p-2.5">
                          <p className="text-[10px] text-red-400/60 uppercase tracking-widest font-bold mb-1">عامل الإحجام</p>
                          <p className="text-red-300/70 text-xs leading-relaxed" title={persona.dealBreaker}>{persona.dealBreaker}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ─── Report ─── */}
      {displayReport && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="space-y-6"
        >
          {/* Report Header */}
          <div className="flex items-center gap-3 pt-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/25">
              <Target className="text-violet-400 w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">تقرير تحليل السوق</h2>
              <p className="text-white/30 text-xs uppercase tracking-widest font-bold">نتائج المحاكاة الشاملة</p>
            </div>
          </div>

          {/* Chart + Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* Pie Chart */}
            <div className="glass-card p-6 flex flex-col items-center justify-center">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-4">نسبة القبول</p>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={acceptanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={72}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {acceptanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "rgba(13,8,37,0.95)",
                        borderColor: "rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        color: "white",
                        fontSize: "12px",
                        fontFamily: "Tajawal, sans-serif",
                      }}
                      itemStyle={{ color: "rgba(255,255,255,0.7)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-2">
                <div className="text-5xl font-black text-white">{Math.round(acceptanceRate)}<span className="text-2xl text-white/40">%</span></div>
                <div className="text-[10px] text-white/30 uppercase tracking-widest mt-1 font-bold">نسبة القبول</div>
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {[
                  { label: "شراء", color: "#10b981" },
                  { label: "متردد", color: "#06b6d4" },
                  { label: "رفض", color: "#ef4444" },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-white/40 font-bold">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy */}
            <div className="md:col-span-2 space-y-4">
              <div className="glass-card p-5 space-y-4">
                <h3 className="text-xs font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                  <Lightbulb className="w-3.5 h-3.5" />
                  الاستراتيجية الجوهرية
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] text-white/25 uppercase tracking-widest font-bold mb-1">الشريحة المستهدفة</p>
                    <p className="text-white/70 text-sm leading-relaxed" dir="auto">{displayReport.targetSegment}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/25 uppercase tracking-widest font-bold mb-1">الميزة التنافسية</p>
                    <p className="text-white/70 text-sm leading-relaxed" dir="auto">{displayReport.competitiveAdvantage}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5 border-emerald-500/15">
                  <div className="absolute inset-0 bg-emerald-500/[0.03] rounded-2xl pointer-events-none" />
                  <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <TrendingUp className="w-3.5 h-3.5" />
                    أنماط النجاح
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed" dir="auto">{displayReport.successPatterns}</p>
                </div>
                <div className="glass-card p-5 border-red-500/15">
                  <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    أنماط الفشل
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed" dir="auto">{displayReport.failurePatterns}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="glass-panel p-0 overflow-hidden">
            <div className="px-7 py-5 border-b border-white/[0.07] bg-gradient-to-r from-violet-500/[0.08] to-transparent">
              <h3 className="font-black text-white text-lg flex items-center gap-2 uppercase tracking-widest">
                <ArrowRight className="w-5 h-5 text-cyan-400" />
                التوصيات الاستراتيجية
              </h3>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {[displayReport.recommendation1, displayReport.recommendation2, displayReport.recommendation3]
                .filter(Boolean)
                .map((rec, i) => (
                  <div key={i} className="px-7 py-6 flex gap-5 items-start hover:bg-white/[0.02] transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                      i === 0 ? "bg-violet-500/20 text-violet-400 border border-violet-500/25" :
                      i === 1 ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/25" :
                                "bg-emerald-500/20 text-emerald-400 border border-emerald-500/25"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="text-white/65 leading-relaxed text-sm mt-1" dir="auto">{rec}</p>
                  </div>
                ))}
            </div>
          </div>

        </motion.div>
      )}
    </div>
  );
}
