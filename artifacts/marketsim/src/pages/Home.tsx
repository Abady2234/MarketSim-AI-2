import { useGetSimulationStats } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Activity, CheckCircle, Percent, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { data: stats, isLoading } = useGetSimulationStats();

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1 text-sm uppercase tracking-wider">Overview of your market analyses</p>
        </div>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider">
          <Link href="/simulate">
            <Plus className="w-4 h-4 mr-2" />
            New Simulation
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-lg bg-card" />
          <Skeleton className="h-32 rounded-lg bg-card" />
          <Skeleton className="h-32 rounded-lg bg-card" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Simulations</CardTitle>
              <Activity className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground">{stats.totalSimulations}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Completed</CardTitle>
              <CheckCircle className="w-4 h-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-success">{stats.completedSimulations}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg Acceptance</CardTitle>
              <Percent className="w-4 h-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-accent">{stats.avgAcceptanceRate ? `${Math.round(stats.avgAcceptanceRate)}%` : '--'}</div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div>
        <h2 className="text-xl font-bold text-foreground mb-4 border-b border-border pb-2 inline-block">Recent Scans</h2>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full bg-card rounded-md" />
            <Skeleton className="h-16 w-full bg-card rounded-md" />
          </div>
        ) : stats?.recentSimulations?.length === 0 ? (
          <Card className="bg-card border-dashed border-border py-12">
            <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
              <Activity className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground uppercase tracking-widest text-sm">No scans detected. Initialize new simulation.</p>
              <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10 uppercase font-bold text-xs tracking-wider">
                <Link href="/simulate">Initialize</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {stats?.recentSimulations.map((sim) => (
              <Link key={sim.id} href={`/simulation/${sim.id}`}>
                <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1" dir="auto">{sim.title || "Untitled Analysis"}</h3>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{new Date(sim.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={`uppercase text-xs font-bold tracking-wider ${sim.status === 'completed' ? 'border-success text-success' : sim.status === 'running' ? 'border-primary text-primary animate-pulse' : 'border-muted-foreground text-muted-foreground'}`}>
                        {sim.status}
                      </Badge>
                      {sim.acceptanceRate !== null && sim.acceptanceRate !== undefined && (
                        <div className="text-lg font-bold text-accent">{Math.round(sim.acceptanceRate)}%</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
