import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useLocation } from "wouter";
import { useCreateSimulation } from "@workspace/api-client-react";
import {
  Brain, Cpu, ImageIcon, Target, UploadCloud, X, ChevronLeft,
  ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";

const EXAMPLE_IDEAS = [
  {
    emoji: "🧥",
    label: "ملابس محلية",
    ideaText: "تطبيق لبيع ملابس سعودية محلية بتصاميم عصرية تجمع بين الأصالة والحداثة. المنتج موجه للشباب السعودي بين 18-35 سنة الذي يريد التميز بلبس عربي أنيق.",
    price: "149-349 ريال للقطعة",
    targetAge: "18-35 سنة",
    targetCity: "الرياض، جدة، الدمام",
    problemSolved: "صعوبة إيجاد ملابس عربية عصرية وأنيقة بسعر معقول",
  },
  {
    emoji: "🍜",
    label: "مطعم أكل سريع",
    ideaText: "مطعم وجبات سريعة يقدم أكلات سعودية تقليدية (كبسة، مندي، جريش) في صيغة وجبات سريعة مناسبة للطلب أونلاين والتوصيل خلال 30 دقيقة.",
    price: "35-85 ريال للوجبة",
    targetAge: "20-45 سنة",
    targetCity: "الرياض",
    problemSolved: "الأكل السعودي التقليدي يحتاج وقت طويل للتحضير وما يتوفر في مطاعم التوصيل",
  },
  {
    emoji: "📚",
    label: "تطبيق تعليمي",
    ideaText: "منصة تعليمية عربية تعلم البرمجة للمبتدئين من خلال مشاريع عملية وبالعربي الفصيح. كل درس لا يتجاوز 10 دقائق مع تمارين تفاعلية.",
    price: "49 ريال/شهر",
    targetAge: "16-30 سنة",
    problemSolved: "معظم المحتوى التقني بالإنجليزي وصعب الفهم للمبتدئ العربي",
  },
  {
    emoji: "💆",
    label: "صحة ورفاهية",
    ideaText: "خدمة مساج ورفاهية منزلية للنساء في المنازل. المعالجات متخصصات يأتون إليك في وقت مناسب. يشمل مساج، مانيكير، باديكير.",
    price: "200-500 ريال/جلسة",
    targetAge: "25-50 سنة",
    targetCity: "جدة، الرياض",
    problemSolved: "صعوبة الذهاب للصالونات مع الانشغال بالعمل والأطفال",
  },
  {
    emoji: "🚗",
    label: "تطبيق سيارات",
    ideaText: "تطبيق لتأجير السيارات بين أفراد، يتيح لأصحاب السيارات تأجير سياراتهم في أوقات فراغها وكسب دخل إضافي، مثل Airbnb للسيارات.",
    price: "150-400 ريال/يوم",
    targetAge: "22-45 سنة",
    problemSolved: "أسعار تأجير السيارات التقليدية مرتفعة وكثير من السيارات مواقفة دون فائدة",
  },
  {
    emoji: "🏋️",
    label: "فيتنس ولياقة",
    ideaText: "اشتراك شهري في صالة رياضية حديثة للنساء فقط، مع مدربات معتمدات وبرامج تغذية مخصصة وتتبع تطور اللياقة عبر تطبيق ذكي.",
    price: "299 ريال/شهر",
    targetAge: "18-45 سنة",
    targetCity: "الرياض",
    problemSolved: "قلة الخيارات النسائية الاحترافية في مجال اللياقة وارتفاع الأسعار",
  },
];

export default function Simulate() {
  const [, setLocation] = useLocation();
  const [ideaText, setIdeaText] = useState("");
  const [income, setIncome] = useState("");
  const [price, setPrice] = useState("");
  const [numPersonas, setNumPersonas] = useState(12);
  const [image1Url, setImage1Url] = useState<string>("");
  const [image2Url, setImage2Url] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  // New detail fields
  const [targetAge, setTargetAge] = useState("");
  const [targetCity, setTargetCity] = useState("");
  const [problemSolved, setProblemSolved] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const createSimulation = useCreateSimulation();
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const applyExample = (ex: typeof EXAMPLE_IDEAS[0]) => {
    setIdeaText(ex.ideaText);
    if (ex.price) setPrice(ex.price);
    if (ex.targetAge) setTargetAge(ex.targetAge);
    if (ex.targetCity) setTargetCity(ex.targetCity ?? "");
    if (ex.problemSolved) setProblemSolved(ex.problemSolved);
    window.scrollTo({ top: 300, behavior: "smooth" });
  };

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
          targetAge: targetAge || undefined,
          targetCity: targetCity || undefined,
          problemSolved: problemSolved || undefined,
          competitors: competitors || undefined,
          extraDetails: extraDetails || undefined,
        },
      },
      { onSuccess: (sim) => setLocation(`/simulation/${sim.id}`) }
    );
  };

  const imageSlots = [
    { url: image1Url, set: setImage1Url, ref: fileInput1Ref, slot: 0 as 0 | 1, label: "الصورة الأولى" },
    { url: image2Url, set: setImage2Url, ref: fileInput2Ref, slot: 1 as 0 | 1, label: "الصورة الثانية" },
  ];

  const personaLabel = numPersonas <= 10 ? "اختبار سريع" : numPersonas <= 20 ? "تحليل متوسط" : numPersonas <= 30 ? "تحليل عميق" : "تحليل شامل";

  return (
    <div className="container mx-auto px-4 sm:px-6 py-10 max-w-7xl">

      {/* Breadcrumb */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-white/30 text-xs mb-4 font-bold uppercase tracking-widest">
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>لوحة التحكم</span>
          <span>/</span>
          <span className="text-white/60">محاكاة جديدة</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">إطلاق محاكاة</h1>
        <p className="text-white/35 mt-2 text-sm uppercase tracking-widest font-bold">اضبط معاملات السوق المستهدف</p>
      </div>

      {/* ─── Examples ─── */}
      <div className="mb-8">
        <p className="text-xs font-black text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          أمثلة جاهزة — اضغط لتطبيق
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_IDEAS.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => applyExample(ex)}
              className="glass-badge px-4 py-2 rounded-full text-sm font-bold text-white/60 hover:text-white hover:bg-white/[0.12] hover:border-cyan-500/30 transition-all duration-200 flex items-center gap-2"
            >
              <span>{ex.emoji}</span>
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* ─── Form ─── */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-simulate">

            {/* Main glass panel */}
            <div className="glass-panel p-7 sm:p-8 relative overflow-hidden">
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-cyan-500/8 rounded-full blur-[60px] pointer-events-none" />

              <div className="space-y-7 relative z-10">

                {/* Idea */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-black text-white/80 uppercase tracking-widest">
                    <Brain className="w-4 h-4 text-violet-400" />
                    فكرة المنتج <span className="text-cyan-400">*</span>
                  </label>
                  <textarea
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    placeholder="صف منتجك أو خدمتك، جمهورك المستهدف، والقيمة التي تقدمها..."
                    className="glass-input w-full min-h-[140px] p-5 text-white text-base leading-loose resize-y"
                    dir="auto"
                    required
                    data-testid="input-idea"
                  />
                </div>

                {/* Price + Income */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-white/50 uppercase tracking-widest">
                      السعر <span className="text-white/25">(اختياري)</span>
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
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-white/50 uppercase tracking-widest">
                      الدخل المستهدف <span className="text-white/25">(اختياري)</span>
                    </label>
                    <input
                      type="text"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder="مثال: 10,000 ريال/شهر"
                      className="glass-input w-full p-3.5 text-sm"
                      data-testid="input-income"
                    />
                  </div>
                </div>

                {/* ─── Advanced / Extra Details ─── */}
                <div className="pt-3 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm font-black text-white/40 hover:text-white/70 transition-colors mb-4"
                  >
                    {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    تفاصيل إضافية <span className="text-white/20 font-normal normal-case">(تحسّن دقة التحليل)</span>
                  </button>

                  {showAdvanced && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-white/50 uppercase tracking-widest">
                            الفئة العمرية المستهدفة
                          </label>
                          <input
                            type="text"
                            value={targetAge}
                            onChange={(e) => setTargetAge(e.target.value)}
                            placeholder="مثال: 25-40 سنة"
                            className="glass-input w-full p-3.5 text-sm"
                            data-testid="input-target-age"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-black text-white/50 uppercase tracking-widest">
                            المنطقة / المدينة
                          </label>
                          <input
                            type="text"
                            value={targetCity}
                            onChange={(e) => setTargetCity(e.target.value)}
                            placeholder="مثال: الرياض، جدة"
                            className="glass-input w-full p-3.5 text-sm"
                            data-testid="input-target-city"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-black text-white/50 uppercase tracking-widest">
                          المشكلة التي يحلها المنتج
                        </label>
                        <input
                          type="text"
                          value={problemSolved}
                          onChange={(e) => setProblemSolved(e.target.value)}
                          placeholder="مثال: صعوبة إيجاد أكل صحي سريع التوصيل"
                          className="glass-input w-full p-3.5 text-sm"
                          data-testid="input-problem"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-black text-white/50 uppercase tracking-widest">
                          المنافسون الحاليون
                        </label>
                        <input
                          type="text"
                          value={competitors}
                          onChange={(e) => setCompetitors(e.target.value)}
                          placeholder="مثال: نون، أمازون السعودية، متاجر التجزئة التقليدية"
                          className="glass-input w-full p-3.5 text-sm"
                          data-testid="input-competitors"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-black text-white/50 uppercase tracking-widest">
                          أي تفاصيل إضافية تريد تحليلها
                        </label>
                        <textarea
                          value={extraDetails}
                          onChange={(e) => setExtraDetails(e.target.value)}
                          placeholder="أي معلومات إضافية تريد أن يأخذها النظام بعين الاعتبار..."
                          className="glass-input w-full min-h-[80px] p-4 text-sm resize-y"
                          dir="auto"
                          data-testid="input-extra"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Personas Slider */}
                <div className="space-y-4 pt-4 border-t border-white/[0.06]">
                  <div className="flex justify-between items-center">
                    <label className="flex items-center gap-2 text-sm font-black text-white/80 uppercase tracking-widest">
                      <Target className="w-4 h-4 text-cyan-400" />
                      حجم العينة
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/30 font-bold uppercase tracking-widest">{personaLabel}</span>
                      <div className="glass-badge px-4 py-1.5 rounded-full text-cyan-400 font-black text-lg font-mono">
                        {numPersonas}
                      </div>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="3"
                    max="40"
                    step="1"
                    value={numPersonas}
                    onChange={(e) => setNumPersonas(parseInt(e.target.value))}
                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to left, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.08) ${100 - ((numPersonas - 3) / 37) * 100}%, #7c3aed ${100 - ((numPersonas - 3) / 37) * 100}%, #06b6d4 100%)`,
                      direction: "rtl",
                    }}
                    data-testid="input-personas"
                  />

                  {/* Tier markers */}
                  <div className="flex justify-between text-[10px] text-white/20 font-bold uppercase tracking-widest px-0.5">
                    <span>3</span>
                    <span>سريع ←</span>
                    <span className="text-white/30">معياري</span>
                    <span>→ شامل</span>
                    <span>40</span>
                  </div>

                  {/* Mini persona dots — show up to 20 */}
                  <div className="flex flex-wrap gap-1.5 justify-start pt-1">
                    {[...Array(Math.min(numPersonas, 20))].map((_, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)] flex items-center justify-center"
                      >
                        <Target className="w-3 h-3 text-white" />
                      </div>
                    ))}
                    {numPersonas > 20 && (
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-[9px] text-white/50 font-black">+{numPersonas - 20}</span>
                      </div>
                    )}
                  </div>

                  {numPersonas > 20 && (
                    <p className="text-[10px] text-amber-400/60 font-bold">
                      ملاحظة: {numPersonas} شخصية ستستغرق وقتاً أطول للمعالجة (حوالي {Math.ceil(numPersonas / 8) * 30}-{Math.ceil(numPersonas / 8) * 60} ثانية)
                    </p>
                  )}
                </div>

                {/* Images */}
                <div className="space-y-4 pt-4 border-t border-white/[0.06]">
                  <label className="flex items-center gap-2 text-xs font-black text-white/50 uppercase tracking-widest">
                    <ImageIcon className="w-3.5 h-3.5 text-violet-400" />
                    صور المنتج <span className="text-white/25 font-normal normal-case">(اختياري — حتى صورتين)</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {imageSlots.map(({ url, set, ref, slot, label }) => (
                      <div key={slot} className="relative aspect-video rounded-xl overflow-hidden border border-white/8 bg-black/20 group">
                        {url ? (
                          <>
                            <img src={url} alt={label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => set("")}
                                className="w-10 h-10 rounded-full bg-red-500/80 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <label
                            className={`flex flex-col items-center justify-center w-full h-full cursor-pointer transition-all ${
                              isDragging ? "bg-violet-500/15 border-2 border-dashed border-violet-500" : "hover:bg-white/[0.03]"
                            }`}
                            onDragOver={(ev: DragEvent<HTMLLabelElement>) => { ev.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(ev: DragEvent<HTMLLabelElement>) => { ev.preventDefault(); handleImageUpload(ev as unknown as DragEvent, slot); }}
                          >
                            <div className="w-10 h-10 rounded-xl bg-white/[0.05] flex items-center justify-center mb-2 group-hover:bg-violet-500/15 transition-colors">
                              <UploadCloud className="w-5 h-5 text-white/25 group-hover:text-violet-400 transition-colors" />
                            </div>
                            <span className="text-[10px] text-white/25 font-bold uppercase tracking-widest text-center px-4">
                              {label}<br />
                              <span className="normal-case font-normal text-white/15">اسحب أو اضغط</span>
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
                <div className="pt-2">
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
                        إطلاق المحاكاة ({numPersonas} شخصية)
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
          <div className="glass-card p-6 sticky top-24 space-y-6">

            {/* Engine steps */}
            <div>
              <h3 className="text-xs font-black text-white/50 mb-5 uppercase tracking-widest flex items-center gap-2">
                <Brain className="w-3.5 h-3.5 text-cyan-400" />
                مراحل المعالجة
              </h3>

              <div className="relative">
                <div className="absolute top-4 right-[15px] bottom-4 w-[2px] bg-gradient-to-b from-violet-500/50 via-cyan-500/30 to-transparent" />
                <div className="space-y-6">
                  {[
                    { num: "١", color: "violet", title: "تحليل الفكرة", desc: "استخراج القيمة الجوهرية والشريحة المستهدفة والميزة التنافسية." },
                    { num: "٢", color: "indigo", title: "بناء الشخصيات", desc: `توليد ${numPersonas} شخصية واقعية بسيكولوجية مختلفة.` },
                    { num: "٣", color: "cyan", title: "محاكاة التفاعلات", desc: "حساب نسبة القبول وتحديد أنماط الفشل والنجاح." },
                    { num: "٤", color: "emerald", title: "التقرير الاستراتيجي", desc: "توصيات قابلة للتنفيذ لتطوير المنتج." },
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
                        <h4 className="font-black text-white text-sm mb-0.5">{title}</h4>
                        <p className="text-white/35 text-xs leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Persona count guide */}
            <div className="space-y-2 pt-4 border-t border-white/[0.06]">
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">دليل عدد الشخصيات</p>
              {[
                { range: "3–10", label: "اختبار سريع", time: "~30 ثا", color: "cyan" },
                { range: "11–20", label: "تحليل متوسط", time: "~1 دقيقة", color: "violet" },
                { range: "21–30", label: "تحليل عميق", time: "~2 دقيقة", color: "indigo" },
                { range: "31–40", label: "تحليل شامل", time: "~3-4 دقائق", color: "amber" },
              ].map(({ range, label, time, color }) => (
                <div key={range} className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  (numPersonas <= 10 && color === "cyan") ||
                  (numPersonas > 10 && numPersonas <= 20 && color === "violet") ||
                  (numPersonas > 20 && numPersonas <= 30 && color === "indigo") ||
                  (numPersonas > 30 && color === "amber")
                    ? "bg-white/[0.07] border border-white/10"
                    : "opacity-40"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-white/40">{range}</span>
                    <span className="text-xs text-white/60 font-bold">{label}</span>
                  </div>
                  <span className="text-[10px] text-white/30">{time}</span>
                </div>
              ))}
            </div>

            {/* Tip */}
            <div className="p-4 rounded-xl bg-violet-500/[0.06] border border-violet-500/15">
              <p className="text-xs text-violet-300/60 leading-relaxed">
                <span className="text-violet-300 font-black">نصيحة:</span> استخدم "تفاصيل إضافية" لتضمين معلومات عن المنافسين، المشكلة المحددة، أو الميزة السرية — سيجعل التحليل أكثر دقة بكثير.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
