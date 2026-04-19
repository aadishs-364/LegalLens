"use client"

import React from 'react';
import { cn } from "@/lib/utils";

interface RiskMeterProps {
  verdict: 'Low' | 'Medium' | 'High' | 'Critical';
  summary: string;
}

export function RiskMeter({ verdict, summary }: RiskMeterProps) {
  const levels = [
    { label: 'Low', color: 'bg-emerald-500', active: verdict === 'Low' },
    { label: 'Medium', color: 'bg-yellow-500', active: verdict === 'Medium' },
    { label: 'High', color: 'bg-orange-500', active: verdict === 'High' },
    { label: 'Critical', color: 'bg-red-500', active: verdict === 'Critical' },
  ];

  const getActiveColor = () => {
    switch (verdict) {
      case 'Low': return 'text-emerald-500';
      case 'Medium': return 'text-yellow-500';
      case 'High': return 'text-orange-500';
      case 'Critical': return 'text-red-500';
      default: return 'text-primary';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <h3 className="mb-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">Overall Risk Verdict</h3>
      <div className={cn("text-4xl font-black mb-6 tracking-tighter", getActiveColor())}>
        {verdict.toUpperCase()}
      </div>
      
      <div className="relative h-4 w-full max-w-md overflow-hidden rounded-full bg-secondary flex gap-1 p-1">
        {levels.map((level) => (
          <div
            key={level.label}
            className={cn(
              "flex-1 h-full rounded-full transition-all duration-500",
              level.active ? level.color : "bg-muted/30 opacity-20"
            )}
          />
        ))}
      </div>
      
      <p className="mt-6 max-w-lg text-lg font-medium leading-relaxed italic text-foreground/90">
        "{summary}"
      </p>
    </div>
  );
}