import { useState, useEffect } from "react";
import { type Persona, type SimulationReport } from "@workspace/api-client-react";

type StreamState = {
  status: "idle" | "running" | "completed" | "error";
  progress: string;
  personas: Persona[];
  report: SimulationReport | null;
  acceptanceRate: number | null;
  error: string | null;
};

export function useSimulationStream(id: number) {
  const [state, setState] = useState<StreamState>({
    status: "idle",
    progress: "",
    personas: [],
    report: null,
    acceptanceRate: null,
    error: null,
  });

  const startStream = async () => {
    setState((s) => ({ ...s, status: "running", error: null }));
    try {
      const res = await fetch(`/api/simulations/${id}/run`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to start simulation");
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.type === "progress") {
                setState((s) => ({ ...s, progress: data.message }));
              } else if (data.type === "persona") {
                setState((s) => ({
                  ...s,
                  personas: [...s.personas, data.persona],
                }));
              } else if (data.type === "report") {
                setState((s) => ({ ...s, report: data.report }));
              } else if (data.type === "complete") {
                setState((s) => ({
                  ...s,
                  status: "completed",
                  acceptanceRate: data.acceptanceRate,
                }));
              } else if (data.type === "error") {
                setState((s) => ({
                  ...s,
                  status: "error",
                  error: data.message,
                }));
              }
            } catch (e) {
              console.error("Failed to parse SSE data", e);
            }
          }
        }
      }
    } catch (err: any) {
      setState((s) => ({ ...s, status: "error", error: err.message }));
    }
  };

  return { state, startStream };
}
