"use client"

import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RiskCard } from "./RiskCard";
import { RiskMeter } from "./RiskMeter";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileText, AlertTriangle, Activity, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { IdentifyContractRisksOutput } from "@/ai/flows/identify-contract-risks";

interface ResultsDashboardProps {
  data: IdentifyContractRisksOutput;
}

export function ResultsDashboard({ data }: ResultsDashboardProps) {
  const handleCopy = () => {
    const text = `LegalLens Analysis Summary\n\nVerdict: ${data.summary.verdict}\nSummary: ${data.summary.oneSentence}\n\nPlain English Translation:\n${data.plainEnglish}\n\nRisks Identified: ${data.risks.length}`;
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Analysis summary has been copied.",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Split plain English by double newlines to render as distinct paragraphs
  const paragraphs = data.plainEnglish.split(/\n\n+/).filter(p => p.trim().length > 0);

  return (
    <div className="flex h-full flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
          <Activity className="h-5 w-5" />
          Analysis Results
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
            <Copy className="h-4 w-4" />
            Copy Summary
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="summary" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-secondary/50 p-1">
          <TabsTrigger value="summary" className="gap-2">
            <Activity className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="plain" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Plain English
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risks ({data.risks.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 flex-1 overflow-hidden rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm">
          <TabsContent value="summary" className="m-0 h-full">
            <ScrollArea className="h-full">
              <RiskMeter verdict={data.summary.verdict} summary={data.summary.oneSentence} />
              <div className="p-6 border-t border-border/50">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Quick Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="p-4 rounded-lg bg-background/40 border border-border/50">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Total Risks</p>
                      <p className="text-2xl font-bold">{data.risks.length}</p>
                   </div>
                   <div className="p-4 rounded-lg bg-background/40 border border-border/50">
                      <p className="text-xs text-muted-foreground uppercase mb-1">Clause Status</p>
                      <p className="text-2xl font-bold text-emerald-400">Valid</p>
                   </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="plain" className="m-0 h-full p-6">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-accent sticky top-0 bg-card/30 backdrop-blur-md pb-2 z-10">
                  <FileText className="h-5 w-5" />
                  Translated Content
                </h3>
                <div className="space-y-4">
                  {paragraphs.map((para, i) => (
                    <div 
                      key={i} 
                      className="rounded-lg bg-background/40 p-5 border border-border/50 leading-relaxed text-lg text-foreground/90 animate-in fade-in slide-in-from-left-2"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {para}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="risks" className="m-0 h-full">
            <ScrollArea className="h-full p-6">
              {data.risks.length > 0 ? (
                <div className="space-y-4">
                  {data.risks.map((risk, idx) => (
                    <RiskCard key={idx} risk={risk} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mb-2 opacity-20" />
                  <p>No major risks identified in this clause.</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
      
      <footer className="pt-4 text-[10px] text-muted-foreground text-center">
        Disclaimer: LegalLens provides AI-generated analysis for informational purposes only. It is not a substitute for professional legal advice.
      </footer>
    </div>
  );
}
