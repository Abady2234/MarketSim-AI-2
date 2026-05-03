import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useLocation } from "wouter";
import { useCreateSimulation } from "@workspace/api-client-react";
import { Activity, Brain, Cpu, Database, ImageIcon, LineChart, Target, UploadCloud, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement> | DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    let files: FileList | null = null;
    if ('dataTransfer' in e) {
      files = e.dataTransfer.files;
    } else if (e.target instanceof HTMLInputElement) {
      files = e.target.files;
    }
    
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach((file, index) => {
      if (index > 1) return; // Max 2 files
      if (!file.type.startsWith('image/')) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (!image1Url && index === 0) {
          setImage1Url(result);
        } else if (!image2Url || index === 1) {
          setImage2Url(result);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!ideaText.trim()) return;

    createSimulation.mutate({ 
      data: { 
        ideaText,
        income: income || undefined,
        price: price || undefined,
        numPersonas,
        image1Url: image1Url || undefined,
        image2Url: image2Url || undefined
      } 
    }, {
      onSuccess: (sim) => {
        setLocation(`/simulation/${sim.id}`);
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tight">Launch Simulation</h1>
        <p className="text-white/60 mt-3 text-sm md:text-base uppercase tracking-widest font-medium">Initialize parameters for target market synthesis</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-simulate">
            <div className="glass-panel p-6 sm:p-8 rounded-2xl relative overflow-hidden">
              {/* Subtle accent glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px] pointer-events-none" />
              
              <div className="space-y-8 relative z-10">
                {/* Idea Field */}
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-white uppercase tracking-wider">
                    فكرتك / Product Idea <span className="text-cyan-400">*</span>
                  </label>
                  <textarea
                    value={ideaText}
                    onChange={(e) => setIdeaText(e.target.value)}
                    placeholder="Describe your product, target audience, and core value..."
                    className="w-full min-h-[160px] bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-y text-lg leading-relaxed"
                    dir="auto"
                    required
                    data-testid="input-idea"
                  />
                </div>

                {/* Optional Economics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-white/80 uppercase tracking-wider">
                      Price Point (Optional)
                    </label>
                    <input
                      type="text"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. $49/mo or 250 SAR"
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
                      data-testid="input-price"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-sm font-bold text-white/80 uppercase tracking-wider">
                      Target Income (Optional)
                    </label>
                    <input
                      type="text"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder="e.g. $10k MRR"
                      className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 transition-all"
                      data-testid="input-income"
                    />
                  </div>
                </div>

                {/* Personas Slider */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold text-white uppercase tracking-wider">
                      Synthesis Scale (Personas)
                    </label>
                    <Badge variant="outline" className="glass-badge text-cyan-400 font-mono text-base px-3">
                      {numPersonas}
                    </Badge>
                  </div>
                  
                  <input
                    type="range"
                    min="3"
                    max="12"
                    value={numPersonas}
                    onChange={(e) => setNumPersonas(parseInt(e.target.value))}
                    className="w-full accent-cyan-400 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                    data-testid="input-personas"
                  />
                  
                  <div className="flex flex-wrap gap-1.5 justify-center pt-2">
                    {[...Array(12)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                          i < numPersonas 
                            ? "bg-gradient-to-br from-violet-500 to-cyan-400 opacity-100 scale-100 shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                            : "bg-white/10 opacity-30 scale-75"
                        }`}
                      >
                        <Target className="w-4 h-4 text-white" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <label className="block text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-violet-400" />
                    Visual References (Optional)
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[image1Url, image2Url].map((url, idx) => (
                      <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/20 group">
                        {url ? (
                          <>
                            <img src={url} alt={`Upload ${idx+1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => idx === 0 ? setImage1Url("") : setImage2Url("")}
                              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur text-white flex items-center justify-center hover:bg-red-500/80 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <label 
                            className={`flex flex-col items-center justify-center w-full h-full cursor-pointer transition-colors ${
                              isDragging ? "bg-violet-500/20 border-violet-500 border-dashed" : "hover:bg-white/5 border-dashed border-white/20"
                            } border-2`}
                            onDragOver={(e: DragEvent<HTMLLabelElement>) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e: DragEvent<HTMLLabelElement>) => handleImageUpload(e as unknown as DragEvent)}
                          >
                            <UploadCloud className="w-8 h-8 text-white/40 mb-2 group-hover:text-cyan-400 transition-colors" />
                            <span className="text-xs text-white/50 uppercase tracking-widest text-center px-4">
                              Drop image here<br/>or click to browse
                            </span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={handleImageUpload}
                              ref={idx === 0 ? fileInputRef : undefined}
                              data-testid={`input-image-${idx+1}`}
                            />
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={!ideaText.trim() || createSimulation.isPending}
                    className="gradient-button w-full py-4 rounded-xl text-lg font-bold flex items-center justify-center gap-3 uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="btn-submit"
                  >
                    {createSimulation.isPending ? (
                      <span className="animate-pulse flex items-center gap-2">
                        <Cpu className="w-5 h-5 animate-spin" />
                        Initializing Sequence...
                      </span>
                    ) : (
                      <>
                        <Brain className="w-5 h-5" />
                        إطلاق المحاكاة
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Panel - Explanation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-6 rounded-2xl sticky top-24">
            <h3 className="text-xl font-display font-bold text-white mb-6 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              Engine Sequence
            </h3>
            
            <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-violet-500/50 before:to-cyan-400/50 before:left-0 md:before:left-0 before:z-0">
              
              <div className="relative z-10 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#0a0118] border-2 border-violet-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                  <Brain className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm uppercase tracking-wide">1. Parsing</h4>
                  <p className="text-white/50 text-sm mt-1 leading-relaxed">Extracts core value, target demographic, and competitive positioning from your raw input.</p>
                </div>
              </div>

              <div className="relative z-10 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#0a0118] border-2 border-indigo-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.5)]">
                  <Target className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm uppercase tracking-wide">2. Generation</h4>
                  <p className="text-white/50 text-sm mt-1 leading-relaxed">Synthesizes hyper-realistic personas with distinct demographics, psychology, and dealbreakers.</p>
                </div>
              </div>

              <div className="relative z-10 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#0a0118] border-2 border-cyan-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                  <LineChart className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm uppercase tracking-wide">3. Synthesis</h4>
                  <p className="text-white/50 text-sm mt-1 leading-relaxed">Simulates market reactions, calculating acceptance rates and identifying failure patterns.</p>
                </div>
              </div>

              <div className="relative z-10 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#0a0118] border-2 border-emerald-500 flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                  <Activity className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm uppercase tracking-wide">4. Action Plan</h4>
                  <p className="text-white/50 text-sm mt-1 leading-relaxed">Delivers actionable, strategic recommendations to pivot or double-down before building.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
