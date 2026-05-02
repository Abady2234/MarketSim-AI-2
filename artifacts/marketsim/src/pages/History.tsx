import { useListSimulations } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History as HistoryIcon, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function History() {
  const { data: simulations, isLoading } = useListSimulations();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-border pb-4 mb-8">
        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center text-primary">
          <HistoryIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Simulation History</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-wider">Archive of previous market analyses</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full bg-card rounded-md" />
          ))}
        </div>
      ) : !simulations || simulations.length === 0 ? (
        <Card className="bg-card border-dashed border-border py-16">
          <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
            <Activity className="w-16 h-16 text-muted-foreground" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground uppercase tracking-widest">No History Found</h2>
              <p className="text-muted-foreground text-sm">You haven't run any simulations yet.</p>
            </div>
            <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10 uppercase font-bold text-xs tracking-wider mt-4">
              <Link href="/simulate">Initialize First Scan</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {simulations.map((sim) => (
            <Link key={sim.id} href={`/simulation/${sim.id}`}>
              <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1" dir="auto">
                      {sim.title || "Untitled Analysis"}
                    </h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mt-2">
                      ID: {sim.id} • {new Date(sim.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</span>
                      <Badge variant="outline" className={`uppercase text-xs font-bold tracking-wider ${sim.status === 'completed' ? 'border-success text-success' : sim.status === 'running' ? 'border-primary text-primary animate-pulse' : sim.status === 'failed' ? 'border-destructive text-destructive' : 'border-muted-foreground text-muted-foreground'}`}>
                        {sim.status}
                      </Badge>
                    </div>
                    <div className="flex flex-col items-end min-w-[100px]">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Acceptance</span>
                      {sim.acceptanceRate !== null && sim.acceptanceRate !== undefined ? (
                        <div className="text-xl font-bold text-accent">{Math.round(sim.acceptanceRate)}%</div>
                      ) : (
                        <div className="text-xl font-bold text-muted-foreground">--</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
