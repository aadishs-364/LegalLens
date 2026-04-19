"use client"

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RiskCard } from "./RiskCard";
import { RiskMeter } from "./RiskMeter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, Download, FileText, Activity, CheckCircle2, Book } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { IdentifyContractRisksOutput } from "@/ai/flows/identify-contract-risks";
import type { ExplainRiskImplicationsOutput } from "@/ai/flows/explain-risk-implications";
import { explainRiskImplications } from "@/ai/flows/explain-risk-implications";

interface ResultsDashboardProps {
  data: IdentifyContractRisksOutput;
}

export function ResultsDashboard({ data }: ResultsDashboardProps) {
  // Store deep dive results and loading states at the dashboard level to persist through tab switches
  const [riskDetails, setRiskDetails] = useState<Record<number, ExplainRiskImplicationsOutput>>({});
  const [loadingRisks, setLoadingRisks] = useState<Record<number, boolean>>({});

  const handleCopy = () => {
    let text = `LegalLens Analysis Summary\n`;
    text += `============================\n\n`;
    text += `Verdict: ${data.summary.verdict}\n`;
    text += `Summary: ${data.summary.oneSentence}\n\n`;
    
    text += `Plain English Translation:\n`;
    text += `--------------------------\n`;
    text += `${data.plainEnglish}\n\n`;
    
    text += `Risks Identified (${data.risks.length}):\n`;
    text += `--------------------------\n`;
    data.risks.forEach((risk, i) => {
      text += `${i + 1}. ${risk.riskFactor} (${risk.severity})\n`;
      text += `   Category: ${risk.category}\n`;
      text += `   Explanation: ${risk.explanation}\n`;
      const details = riskDetails[i];
      if (details) {
        text += `   Deep Dive: ${details.detailedExplanation}\n`;
        text += `   Fairer Alternative: ${details.fairerAlternative || 'N/A'}\n`;
        text += `   Ask Lawyer: ${details.lawyerTip}\n`;
      }
      text += `\n`;
    });

    if (data.glossary && data.glossary.length > 0) {
      text += `Glossary Terms:\n`;
      text += `---------------\n`;
      data.glossary.forEach(item => {
        text += `- ${item.term}: ${item.meaning}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Complete analysis, risks, and glossary have been copied.",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeepDive = async (index: number) => {
    if (riskDetails[index]) return;
    
    setLoadingRisks(prev => ({ ...prev, [index]: true }));
    try {
      const risk = data.risks[index];
      const result = await explainRiskImplications({
        riskTitle: risk.riskFactor,
        originalFragment: risk.originalFragment || risk.explanation,
        severity: risk.severity,
        existingExplanation: risk.explanation
      });
      setRiskDetails(prev => ({ ...prev, [index]: result }));
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Deep Dive Failed",
        description: "Could not fetch detailed implications.",
      });
    } finally {
      setLoadingRisks(prev => ({ ...prev, [index]: false }));
    }
  };

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
            Copy All
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
            <Download className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="summary" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4 bg-secondary/50 p-1">
          <TabsTrigger value="summary" className="gap-2 text-xs">
            Summary
          </TabsTrigger>
          <TabsTrigger value="plain" className="gap-2 text-xs">
            Plain English
          </TabsTrigger>
          <TabsTrigger value="risks" className="gap-2 text-xs">
            Risks ({data.risks.length})
          </TabsTrigger>
          <TabsTrigger value="glossary" className="gap-2 text-xs">
            Glossary
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
                      <p className="text-xs text-muted-foreground uppercase mb-1">Key Terms Found</p>
                      <p className="text-2xl font-bold text-accent">{data.glossary?.length || 0}</p>
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
                    <RiskCard 
                      key={idx} 
                      risk={risk} 
                      isExplaining={loadingRisks[idx] || false}
                      details={riskDetails[idx] || null}
                      onDeepDive={() => handleDeepDive(idx)}
                    />
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

          <TabsContent value="glossary" className="m-0 h-full p-6">
            <ScrollArea className="h-full">
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2 text-primary sticky top-0 bg-card/30 backdrop-blur-md pb-2 z-10">
                  <Book className="h-5 w-5" />
                  Terms Breakdown
                </h3>
                {data.glossary && data.glossary.length > 0 ? (
                  <div className="rounded-lg border border-border/50 bg-background/40 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[150px] font-bold text-foreground">Term</TableHead>
                          <TableHead className="font-bold text-foreground">Meaning</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.glossary.map((item, i) => (
                          <TableRow key={i} className="border-border/30">
                            <TableCell className="font-bold text-primary">{item.term}</TableCell>
                            <TableCell className="text-muted-foreground">{item.meaning}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center text-muted-foreground">
                    <Book className="h-10 w-10 mb-2 opacity-20" />
                    <p>No specific legal terms required breakdown.</p>
                  </div>
                )}
              </div>
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