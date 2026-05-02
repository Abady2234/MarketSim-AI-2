import { useEffect, useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetSimulation, getGetSimulationQueryKey, type Persona, type SimulationReport, useDeleteSimulation } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSimulationStream } from "@/hooks/use-simulation-stream";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Play, Cpu, AlertTriangle, ArrowLeft, Target, Lightbulb, TrendingUp, CheckCircle, XCircle, AlertCircle, Trash2 } from "lucide-react";

export default function SimulationDetail() {
  const { id } = useParams<{ id: string }>();
  const simId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const deleteSimulation = useDeleteSimulation();
  
  const { data: simulation, isLoading, isError } = useGetSimulation(simId, {
    query: { enabled: !!simId, queryKey: getGetSimulationQueryKey(simId) }
  });

  const { state: streamState, startStream } = useSimulationStream(simId);
  const [localPersonas, setLocalPersonas] = useState<Persona[]>([]);
  const [localReport, setLocalReport] = useState<SimulationReport | null>(null);

  // Sync stream state to local state
  useEffect(() => {
    if (streamState.personas.length > 0) {
      setLocalPersonas(streamState.personas);
    }
  }, [streamState.personas]);

  useEffect(() => {
    if (streamState.report) {
      setLocalReport(streamState.report);
    }
  }, [streamState.report]);

  // Use either stream state or initial query state
  const displayPersonas = localPersonas.length > 0 ? localPersonas : (simulation?.personas || []);
  const displayReport = localReport || simulation?.report;
  const currentStatus = streamState.status !== "idle" ? streamState.status : simulation?.status;
  
  const handleRun = () => {
    startStream();
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this simulation?")) {
      deleteSimulation.mutate({ id: simId }, {
        onSuccess: () => {
          setLocation("/history");
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-1/3 bg-card" />
        <Skeleton className="h-64 w-full bg-card" />
      </div>
    );
  }

  if (isError || !simulation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertTriangle className="w-16 h-16 text-destructive" />
        <h2 className="text-2xl font-bold text-foreground">Simulation Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const isPending = currentStatus === "pending";
  const isRunning = currentStatus === "running";
  const isCompleted = currentStatus === "completed";

  // Calculate chart data based on personas
  const acceptanceData = [
    { name: "Confirmed Buy", value: displayPersonas.filter(p => p.decision === "confirmed_buy").length, color: "hsl(var(--success))" },
    { name: "Hesitant", value: displayPersonas.filter(p => p.decision === "hesitant_buy").length, color: "hsl(var(--accent))" },
    { name: "Reject", value: displayPersonas.filter(p => p.decision === "flat_reject").length, color: "hsl(var(--destructive))" },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground line-clamp-1" dir="auto">
            {simulation.title || "Target Market Analysis"}
          </h1>
          <p className="text-muted-foreground text-xs md:text-sm uppercase tracking-widest mt-1">
            ID: {simulation.id} • {new Date(simulation.createdAt).toLocaleString()}
          </p>
        </div>
        <Badge variant="outline" className={`uppercase px-3 py-1 text-xs font-bold tracking-widest ${
          isCompleted ? 'border-success text-success bg-success/10' : 
          isRunning ? 'border-primary text-primary bg-primary/10 animate-pulse' : 
          'border-muted-foreground text-muted-foreground'
        }`}>
          {currentStatus}
        </Badge>
        <Button variant="ghost" size="icon" onClick={handleDelete} disabled={deleteSimulation.isPending} className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Input Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground font-mono text-sm leading-relaxed bg-background p-4 rounded border border-border" dir="auto">
            {simulation.ideaText}
          </p>
        </CardContent>
      </Card>

      {isPending && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
            <Cpu className="w-16 h-16 text-primary" />
            <div className="text-center">
              <h2 className="text-2xl font-bold text-primary tracking-wide uppercase mb-2">Ready to Initialize</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                The simulation engine is primed. We will generate a synthetic market of targeted personas and evaluate your product idea against their specific needs and behaviors.
              </p>
            </div>
            <Button onClick={handleRun} size="lg" className="bg-primary text-primary-foreground font-bold tracking-widest uppercase px-8">
              <Play className="w-5 h-5 mr-2" />
              Begin Simulation
            </Button>
          </CardContent>
        </Card>
      )}

      {isRunning && (
        <Card className="bg-card border-primary/50 overflow-hidden">
          <div className="bg-primary/10 p-6 flex flex-col items-center justify-center space-y-4">
            <Cpu className="w-12 h-12 text-primary animate-pulse" />
            <h3 className="text-xl font-bold text-primary uppercase tracking-widest">System Processing</h3>
            <p className="text-foreground font-mono text-sm">{streamState.progress || "Initializing neural pathways..."}</p>
            <Progress value={Math.min((displayPersonas.length / 8) * 100, 99)} className="w-full max-w-md h-2 bg-background" />
          </div>
        </Card>
      )}

      {(displayPersonas.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground border-b border-border pb-2 inline-block">Synthetic Audience</h2>
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
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  >
                    <Card className={`h-full border ${isBuy ? 'border-success/50 bg-success/5' : isHesitant ? 'border-accent/50 bg-accent/5' : 'border-destructive/50 bg-destructive/5'}`}>
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-lg text-foreground" dir="auto">{persona.name}, {persona.age}</h3>
                            <p className="text-sm text-muted-foreground uppercase tracking-wider">{persona.profession}</p>
                          </div>
                          {isBuy && <CheckCircle className="text-success w-6 h-6" />}
                          {isHesitant && <AlertCircle className="text-accent w-6 h-6" />}
                          {isReject && <XCircle className="text-destructive w-6 h-6" />}
                        </div>
                        
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Opinion</span>
                            <p className="text-foreground italic bg-background/50 p-2 rounded" dir="auto">"{persona.opinion}"</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-xs text-muted-foreground uppercase tracking-wider block">Digital Behavior</span>
                              <p className="text-foreground text-xs truncate" title={persona.digitalBehavior}>{persona.digitalBehavior}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground uppercase tracking-wider block">Dealbreaker</span>
                              <p className="text-foreground text-xs truncate text-destructive" title={persona.dealBreaker}>{persona.dealBreaker}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {displayReport && (
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8 mt-12"
        >
          <div className="flex items-center gap-3">
            <Target className="text-primary w-8 h-8" />
            <h2 className="text-3xl font-bold text-foreground">Market Synthesis Report</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-card border-border md:col-span-1 flex flex-col justify-center items-center p-6">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-6">Market Acceptance</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={acceptanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {acceptanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'hsl(var(--foreground))', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center mt-4">
                <div className="text-4xl font-bold text-foreground">
                  {streamState.acceptanceRate || simulation?.acceptanceRate || 0}%
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Acceptance Score</div>
              </div>
            </Card>

            <div className="md:col-span-2 space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-primary uppercase tracking-widest flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Core Strategy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Target Segment</span>
                    <p className="text-foreground" dir="auto">{displayReport.targetSegment}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Competitive Advantage</span>
                    <p className="text-foreground" dir="auto">{displayReport.competitiveAdvantage}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-success/5 border-success/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-success uppercase tracking-widest flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Success Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground" dir="auto">{displayReport.successPatterns}</p>
                  </CardContent>
                </Card>
                <Card className="bg-destructive/5 border-destructive/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-destructive uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Failure Patterns
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground" dir="auto">{displayReport.failurePatterns}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <Card className="bg-card border-primary/30">
            <CardHeader className="border-b border-border bg-background/50">
              <CardTitle className="text-lg font-bold text-primary uppercase tracking-widest">Strategic Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {[displayReport.recommendation1, displayReport.recommendation2, displayReport.recommendation3].map((rec, i) => (
                  <div key={i} className="p-6 flex gap-4 items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold font-mono">
                      {i + 1}
                    </div>
                    <p className="text-foreground leading-relaxed mt-1" dir="auto">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
