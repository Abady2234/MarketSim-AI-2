import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useLocation } from "wouter";
import { useCreateSimulation } from "@workspace/api-client-react";
import { Activity, Brain, Cpu, ImageIcon, Target, UploadCloud, X, ChevronLeft } from "lucide-react";

export default function Simulate() {
  const [, setLocation] = useLocation();
  const [ideaText, setIdeaText] = useState("");
  const [income, setIncome] = useState("");
  const [price, setPrice] = useState("");
  const [numPersonas, setNumPersonas] = useState(7);
  const [image1Url, setImage1Url] = useState<string>("");
  const [image2Url, setImage2Url] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const createSimulation = useCreateSimulation();
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement> | DragEvent, slot: 0 | 1) => {
    e.preventDefault();
    setIsDragging(false);

    let files: FileList | null = null;
    if ("dataTransfer" in e) {
      files = (e as DragEvent).dataTransfer?.files ?? null;
    } else {
      files = (e as ChangeEvent<HTMLInputElement>).target.files;
    }
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (slot === 0) setImage1Url(result);
      else setImage2Url(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!ideaText.trim()) return;

    createSimulation.mutate(
      {
        data: {
          ideaText,
          income: income || undefined,
          price: price || undefined,
          numPersonas,
          image1Url: image1Url || undefined,
          image2Url: image2Url || undefined,
        },
      },
      {
        onSuccess: (sim) => {
          setLocation(`/simulation/${sim.id}`);
        },
      }
    );
  };

  const imageSlots = [
    { url: image1Url, set: setImage1Url, ref: fileInput1Ref, slot: 0 as 0 | 1, label: "الصورة الأولى" },
    { url: image2Url, set: setImage2Url, ref: fileInput2Ref, slot: 1 as 0 | 1, label: "الصورة الثانية" },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-7xl">

      {/* Page Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-white/30 text-sm mb-4 font-bold uppercase tracking-widest">
          <ChevronLeft className="w-4 h-4" />
          <span>لوحة التحكم</span>
          <span>/</span>
          <span className="text-white/60">محاكاة جديدة</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">إطلاق محاكاة</h1>
        <p className="text-white/35 mt-2 text-sm uppercase tracking-widest font-bold">اضبط معاملات السوق المستهدف</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ─── Form ─── */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-simulate">
            <div className="glass-panel p-7 sm:p-9 relative overflow-hidden">
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-violet-600/15 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none" />

              <div className="space-y-8 relative z-10">

                {/* Idea */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-black text-white/80 uppercase tracking-widest">
                    <Brain className="w-4 h-4 text-violet-400" />
                    فكرة المنتج
                    <span className="text-cyan-400">*</span>
                  </label>
                  <textarea
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    placeholder="صف منتجك أو خدمتك، جمهورك المستهدف، والقيمة التي تقدمها..."
                    className="glass-input w-full min-h-[160px] p-5 text-white text-base leading-loose resize-y"
                    dir="auto"
                    required
                    data-testid="input-idea"
                  />
                </div>

                {/* Economics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-white/60 uppercase tracking-widest">
                      السعر <span className="text-white/30">(اختياري)</span>
                    </label>
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="مثال: 49 ريال/شهر"
                      className="glass-input w-full p-3.5 text-sm"
                      data-testid="input-price"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-black text-white/60 uppercase tracking-widest">
                      الدخل المستهدف <span className="text-white/30">(اختياري)</span>
                    </label>
                    <input
                      type="text"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder="مثال: 10 آلاف ريال شهرياً"
                      className="glass-input w-full p-3.5 text-sm"
                      data-testid="input-income"
                    />
                  </div>
                </div>

                {/* Personas Slider */}
                <div className="space-y-5 pt-5 border-t border-white/[0.07]">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-sm font-black text-white/80 uppercase tracking-widest">
                      <Target className="w-4 h-4 text-cyan-400" />
                      عدد الشخصيات
                    </label>
                    <div className="glass-badge px-4 py-1.5 rounded-full text-cyan-400 font-black text-lg font-mono">
                      {numPersonas}
                    </div>
                  </div>

                  <div className="relative pt-1">
                    <input
                      type="range"
                      min="3"
                      max="12"
                      value={numPersonas}
                      onChange={(e) => setNumPersonas(parseInt(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to left, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) ${100 - ((numPersonas - 3) / 9) * 100}%, #7c3aed ${100 - ((numPersonas - 3) / 9) * 100}%, #06b6d4 100%)`,
                        direction: "rtl"
                      }}
                      data-testid="input-personas"
                    />
                  </div>

                  {/* Persona dots */}
                  <div className="flex flex-wrap gap-2 justify-start pt-1">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          i < numPersonas
                            ? "bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-100"
                            : "bg-white/[0.06] scale-75 opacity-30"
                        }`}
                      >
                        <Target className="w-3.5 h-3.5 text-white" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div className="space-y-4 pt-5 border-t border-white/[0.07]">
                  <label className="flex items-center gap-2 text-sm font-black text-white/80 uppercase tracking-widest">
                    <ImageIcon className="w-4 h-4 text-violet-400" />
                    صور المنتج <span className="text-white/30">(اختياري — حتى صورتين)</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {imageSlots.map(({ url, set, ref, slot, label }) => (
                      <div
                        key={slot}
                        className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/20 group"
                      >
                        {url ? (
                          <>
                            <img src={url} alt={label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => set("")}
                                className="w-10 h-10 rounded-full bg-red-500/80 backdrop-blur text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <label
                            className={`flex flex-col items-center justify-center w-full h-full cursor-pointer transition-all ${
                              isDragging
                                ? "bg-violet-500/15 border-2 border-dashed border-violet-500"
                                : "hover:bg-white/[0.04]"
                            }`}
                            onDragOver={(ev: DragEvent<HTMLLabelElement>) => { ev.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(ev: DragEvent<HTMLLabelElement>) => {
                              ev.preventDefault();
                              handleImageUpload(ev as unknown as DragEvent, slot);
                            }}
                          >
                            <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center mb-3 group-hover:bg-violet-500/15 transition-colors">
                              <UploadCloud className="w-5 h-5 text-white/30 group-hover:text-violet-400 transition-colors" />
                            </div>
                            <span className="text-xs text-white/30 font-bold uppercase tracking-widest text-center px-4">
                              {label}
                              <br />
                              <span className="text-white/20 normal-case font-normal">اسحب أو اضغط للرفع</span>
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              ref={ref}
                              onChange={(ev) => handleImageUpload(ev, slot)}
                              data-testid={`input-image-${slot + 1}`}
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={!ideaText.trim() || createSimulation.isPending}
                    className="gradient-button w-full py-4 rounded-xl text-base font-black flex items-center justify-center gap-3 uppercase tracking-widest"
                    data-testid="btn-submit"
                  >
                    {createSimulation.isPending ? (
                      <span className="flex items-center gap-3">
                        <Cpu className="w-5 h-5 animate-spin" />
                        جارٍ التهيئة...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <Brain className="w-5 h-5" />
                        إطلاق المحاكاة
                      </span>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </form>
        </div>

        {/* ─── Right Panel ─── */}
        <div className="lg:col-span-4 space-y-5">
          <div className="glass-card p-6 sticky top-24">
            <h3 className="text-base font-black text-white mb-6 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              مراحل المعالجة
            </h3>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute top-4 right-[15px] bottom-4 w-[2px] bg-gradient-to-b from-violet-500/60 via-cyan-500/40 to-transparent" />

              <div className="space-y-7">
                {[
                  { num: "١", color: "violet", title: "تحليل الفكرة", desc: "استخراج القيمة الجوهرية والشريحة المستهدفة والميزة التنافسية." },
                  { num: "٢", color: "indigo", title: "بناء الشخصيات", desc: "توليد شخصيات واقعية بسيكولوجية مختلفة وعوامل إحجام." },
                  { num: "٣", color: "cyan", title: "محاكاة التفاعلات", desc: "حساب نسبة القبول وتحديد أنماط الفشل والنجاح." },
                  { num: "٤", color: "emerald", title: "الخطة الاستراتيجية", desc: "توصيات قابلة للتنفيذ لتطوير المنتج أو تعديل اتجاهه." },
                ].map(({ num, color, title, desc }, i) => (
                  <div key={i} className="flex gap-4 items-start relative z-10">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 font-black text-sm ${
                      color === "violet"  ? "border-violet-500 text-violet-400 bg-[#0d0825] shadow-[0_0_10px_rgba(139,92,246,0.4)]" :
                      color === "indigo"  ? "border-indigo-500 text-indigo-400 bg-[#0d0825] shadow-[0_0_10px_rgba(99,102,241,0.4)]" :
                      color === "cyan"    ? "border-cyan-500 text-cyan-400 bg-[#0d0825] shadow-[0_0_10px_rgba(6,182,212,0.4)]" :
                                           "border-emerald-500 text-emerald-400 bg-[#0d0825] shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    }`}>
                      {num}
                    </div>
                    <div className="pt-0.5">
                      <h4 className="font-black text-white text-sm mb-1">{title}</h4>
                      <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tip */}
            <div className="mt-8 p-4 rounded-xl bg-violet-500/[0.07] border border-violet-500/20">
              <p className="text-xs text-violet-300/70 leading-relaxed font-medium">
                <span className="text-violet-300 font-black">نصيحة:</span> كلما كان وصفك أكثر تفصيلاً، كانت الشخصيات أكثر دقة وواقعية.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
