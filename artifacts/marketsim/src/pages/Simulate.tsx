import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateSimulation } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Terminal, Cpu } from "lucide-react";

export default function Simulate() {
  const [, setLocation] = useLocation();
  const [ideaText, setIdeaText] = useState("");
  const createSimulation = useCreateSimulation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaText.trim()) return;

    createSimulation.mutate({ data: { ideaText } }, {
      onSuccess: (sim) => {
        setLocation(`/simulation/${sim.id}`);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">New Simulation</h1>
        <p className="text-muted-foreground mt-1 text-sm uppercase tracking-wider">Initialize target market analysis</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border/50 bg-background/50">
          <CardTitle className="flex items-center gap-2 text-primary uppercase tracking-widest text-sm">
            <Terminal className="w-4 h-4" />
            Input Parameters
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Describe your product idea, target audience, and core value proposition. Arabic is supported.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Textarea
              value={ideaText}
              onChange={(e) => setIdeaText(e.target.value)}
              placeholder="e.g. A B2B SaaS platform for local coffee shops in Riyadh to manage inventory..."
              className="min-h-[250px] bg-background border-border text-foreground font-mono resize-y focus-visible:ring-primary text-base p-4"
              dir="auto"
              required
            />
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={!ideaText.trim() || createSimulation.isPending}
                className="bg-primary text-primary-foreground font-bold uppercase tracking-widest px-8"
              >
                {createSimulation.isPending ? (
                  <span className="animate-pulse">Initializing...</span>
                ) : (
                  <>
                    <Cpu className="w-4 h-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
