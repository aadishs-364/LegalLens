
"use client"

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ShieldAlert, Info, Scale, ChevronDown, ChevronUp, Loader2, MessageSquare, Lightbulb, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExplainRiskImplicationsOutput } from "@/ai/flows/explain-risk-implications";

interface RiskCardProps {
  risk: {
    riskFactor: string;
    category: string;
    explanation: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    originalFragment?: string;
  };
  isExplaining: boolean;
  isExpanded: boolean;
  details: ExplainRiskImplicationsOutput | null;
  onDeepDive: () => void;
  onToggleExpand: () => void;
}

export function RiskCard({ risk, isExplaining, isExpanded, details, onDeepDive, onToggleExpand }: RiskCardProps) {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'Critical': return "border-red-500/50 bg-red-500/10 text-red-400";
      case 'High': return "border-orange-500/50 bg-orange-500/10 text-orange-400";
      case 'Medium': return "border-yellow-500/50 bg-yellow-500/10 text-yellow-400";
      case 'Low': return "border-emerald-500/50 bg-emerald-500/10 text-emerald-400";
      default: return "border-border";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return <ShieldAlert className="h-5 w-5 text-red-500" />;
      case 'High': return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'Medium': return <Scale className="h-5 w-5 text-yellow-500" />;
      case 'Low': return <Info className="h-5 w-5 text-emerald-500" />;
      default: return null;
    }
  };

  const handleButtonClick = () => {
    if (!details && !isExplaining) {
      onDeepDive();
    } else {
      onToggleExpand();
    }
  };

  return (
    <Card className={cn("overflow-hidden border-l-4 transition-all hover:shadow-lg", getSeverityStyles(risk.severity))}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {getSeverityIcon(risk.severity)}
            <CardTitle className="text-lg font-bold">{risk.riskFactor}</CardTitle>
          </div>
          <Badge variant="outline" className={cn("font-bold uppercase tracking-wider", getSeverityStyles(risk.severity))}>
            {risk.severity}
          </Badge>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground opacity-70">
          {risk.category}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase text-foreground/70">Quick Analysis:</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {risk.explanation}
          </p>
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "w-full justify-between h-8 text-xs font-bold border border-border/50",
            isExplaining ? "bg-primary/10 border-primary/30" : "bg-secondary/20"
          )}
          onClick={handleButtonClick}
          disabled={isExplaining && !details}
        >
          {isExplaining ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> 
              AI is analyzing implications...
            </span>
          ) : (
            <>
              {details ? (isExpanded ? "Hide Deep Dive" : "Show Deep Dive & Alternatives") : "Get Deep Dive Analysis"}
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </>
          )}
        </Button>

        {isExpanded && (
          <div className="space-y-4 pt-4 border-t border-border/30 animate-in fade-in slide-in-from-top-2">
            {isExplaining && !details ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3 opacity-60">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-[10px] uppercase tracking-widest font-bold">Connecting to GenAI...</p>
              </div>
            ) : details ? (
              <>
                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-primary">
                     <FileWarning className="h-4 w-4" />
                     <h4 className="text-xs font-bold uppercase">Why it matters</h4>
                   </div>
                   <p className="text-sm text-foreground/90 leading-relaxed bg-background/30 p-3 rounded-lg border border-border/20">
                     {details.detailedExplanation}
                   </p>
                </div>

                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-accent">
                     <Lightbulb className="h-4 w-4" />
                     <h4 className="text-xs font-bold uppercase">Fairer Alternative</h4>
                   </div>
                   <p className="text-sm italic text-muted-foreground bg-accent/5 p-3 rounded-lg border border-accent/20">
                     "{details.fairerAlternative || "No specific wording suggested, consult your legal team."}"
                   </p>
                </div>

                <div className="space-y-2">
                   <div className="flex items-center gap-2 text-orange-400">
                     <MessageSquare className="h-4 w-4" />
                     <h4 className="text-xs font-bold uppercase">Ask your lawyer:</h4>
                   </div>
                   <p className="text-sm font-medium text-foreground p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                     {details.lawyerTip}
                   </p>
                </div>
              </>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
