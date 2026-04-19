"use client"

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ShieldAlert, Info, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

interface RiskCardProps {
  risk: {
    riskTitle: string;
    category: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical';
    originalFragment: string;
    explanation: string;
    lawyerTip: string;
  };
}

export function RiskCard({ risk }: RiskCardProps) {
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

  return (
    <Card className={cn("overflow-hidden border-l-4 transition-all hover:shadow-lg", getSeverityStyles(risk.severity))}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {getSeverityIcon(risk.severity)}
            <CardTitle className="text-lg font-bold">{risk.riskTitle}</CardTitle>
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
          <h4 className="mb-1 text-sm font-semibold text-foreground">Why this matters:</h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {risk.explanation}
          </p>
        </div>

        <div className="rounded-md bg-background/50 p-3 italic">
          <h4 className="mb-1 text-xs font-bold uppercase text-muted-foreground">Original Text:</h4>
          <p className="text-sm text-foreground/80">"{risk.originalFragment}"</p>
        </div>

        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <h4 className="mb-1 text-sm font-semibold text-primary flex items-center gap-2">
            <Info className="h-4 w-4" />
            Lawyer Tip:
          </h4>
          <p className="text-sm italic text-foreground/90">
            "{risk.lawyerTip}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}