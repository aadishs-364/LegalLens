"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Eraser, BookOpen, Clock, ShieldCheck, Zap } from "lucide-react";
import { SAMPLE_CLAUSE } from "./lib/sample-clause";
import { ResultsDashboard } from "@/components/LegalLens/ResultsDashboard";
import { identifyContractRisks, type IdentifyContractRisksOutput } from "@/ai/flows/identify-contract-risks";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HistoryItem {
  fullText: string;
  displaySnippet: string;
  verdict: string;
  timestamp: number;
  results?: IdentifyContractRisksOutput;
}

export default function LegalLensPage() {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<IdentifyContractRisksOutput | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const historyRef = useRef<HTMLDivElement>(null);

  // Hydration safety for localStorage
  useEffect(() => {
    const saved = localStorage.getItem('legallens_history_v4');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const handleAnalyze = async () => {
    if (!inputText || inputText.length < 50) {
      toast({
        variant: "destructive",
        title: "Input too short",
        description: "Please provide at least 50 characters of legal text for analysis.",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = await identifyContractRisks({ contractClause: inputText });
      
      if (!data.isValidClause) {
        toast({
          variant: "destructive",
          title: "Invalid Input",
          description: "This text doesn't appear to be a legal contract clause.",
        });
        setResults(null);
      } else {
        setResults(data);
        const newEntry: HistoryItem = {
          fullText: inputText,
          displaySnippet: inputText.substring(0, 80) + '...',
          verdict: data.summary.verdict,
          timestamp: Date.now(),
          results: data
        };
        const updatedHistory = [newEntry, ...history.filter(h => h.fullText !== inputText).slice(0, 9)];
        setHistory(updatedHistory);
        localStorage.setItem('legallens_history_v4', JSON.stringify(updatedHistory));
      }
    } catch (error: any) {
      console.error("Analysis Error:", error);
      const errorMessage = String(error?.message || "").toUpperCase();
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('LIMIT');
      
      if (isRateLimit) {
        toast({
          variant: "destructive",
          title: "AI Capacity Reached",
          description: "Rotating API instances to find available capacity...",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: error?.message || "An unexpected response was received from the server. Please try a shorter clause or try again later.",
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    setResults(null);
  };

  const handleLoadSample = () => {
    setInputText(SAMPLE_CLAUSE);
    setResults(null);
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setInputText(item.fullText);
    if (item.results) {
      setResults(item.results);
    } else {
      setResults(null);
    }
    toast({
      title: "History Restored",
      description: "Previous contract text and analysis have been loaded.",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToHistory = () => {
    if (historyRef.current) {
      historyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      toast({
        title: "No History",
        description: "You haven't performed any analyses yet.",
      });
    }
  };

  const charCount = inputText.length;
  const isOverLimit = charCount > 10000;
  const countColor = charCount === 0 ? "text-muted-foreground" : isOverLimit ? "text-red-500" : charCount > 8000 ? "text-orange-400" : "text-primary/60";

  return (
    <div className="min-h-screen bg-background font-body selection:bg-primary/30">
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_20px_rgba(140,201,255,0.3)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-foreground">LEGAL<span className="text-primary">LENS</span></h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold leading-none">Plain English Contract Guide</p>
            </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={scrollToHistory}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Clock className="h-4 w-4" />
              History
            </button>
            <div className="h-4 w-px bg-border" />
            <Button variant="outline" size="sm" className="rounded-full border-primary/50 text-primary hover:bg-primary/10">
              Upgrade to Pro
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          <section className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
                Understand any contract <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">in seconds.</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-md">
                Paste your complex legal clause below. Our AI instantly translates it and identifies hidden risks.
              </p>
            </div>

            <Card className="p-6 border-border/50 bg-card/50 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <Zap className="h-24 w-24 text-primary" />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="contract-input" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Legal Contract Text
                  </label>
                  <span className={cn("text-xs font-mono", countColor)}>
                    {charCount.toLocaleString()} / 10,000
                  </span>
                </div>
                
                <Textarea
                  id="contract-input"
                  placeholder="Paste your legal text here (e.g., NDA, Employment Agreement, Terms of Service)..."
                  className="min-h-[350px] bg-background/50 border-border/50 focus-visible:ring-primary/50 resize-none text-base leading-relaxed p-4"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  maxLength={11000}
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={handleLoadSample}
                    className="gap-2 text-xs font-bold h-11"
                    disabled={isAnalyzing}
                  >
                    <BookOpen className="h-4 w-4" />
                    Load Sample
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleClear}
                    className="gap-2 text-xs font-bold h-11"
                    disabled={isAnalyzing || !inputText}
                  >
                    <Eraser className="h-4 w-4" />
                    Clear
                  </Button>
                  <Button 
                    className="col-span-2 gap-2 h-11 font-bold text-base shadow-[0_0_20px_rgba(140,201,255,0.2)]"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !inputText || charCount < 50}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Analysing...
                      </>
                    ) : (
                      <>
                        <Search className="h-5 w-5" />
                        Translate & Analyze
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
            
            {history.length > 0 && (
              <div ref={historyRef} className="space-y-4 pt-4 border-t border-border/30 scroll-mt-20">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent Analyses
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
                  {history.map((item, i) => (
                    <Card 
                      key={i} 
                      className="p-3 bg-secondary/30 border border-border/50 cursor-pointer hover:bg-secondary/50 transition-all hover:scale-[1.02] group/item"
                      onClick={() => handleHistoryClick(item)}
                    >
                      <div className="flex items-center justify-between mb-2">
                         <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              item.verdict === 'Low' ? 'bg-emerald-500' : 
                              item.verdict === 'Medium' ? 'bg-yellow-500' :
                              'bg-red-500'
                            )} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">{item.verdict}</span>
                         </div>
                         <span className="text-[8px] text-muted-foreground">{new Date(item.timestamp).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-3 leading-tight group-hover/item:text-foreground transition-colors whitespace-pre-wrap">
                        {item.displaySnippet}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="min-h-[600px] flex flex-col">
            {isAnalyzing ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-12">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
                  <Loader2 className="h-16 w-16 text-primary animate-spin relative" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-foreground">Analysing your Legalase and identifying risks...</h3>
                  <p className="text-muted-foreground mt-2">Connecting to our neural legal engine...</p>
                </div>
              </div>
            ) : results ? (
              <ResultsDashboard data={results} />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 rounded-2xl border border-dashed border-border/50 bg-secondary/10 p-12 text-center">
                <div className="h-20 w-20 rounded-full bg-secondary/30 flex items-center justify-center">
                   <ShieldCheck className="h-10 w-10 text-muted-foreground opacity-50" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">No analysis yet</h3>
                  <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                    Results will appear here after you click the "Translate & Analyze" button.
                  </p>
                </div>
              </div>
            )}
          </section>

        </div>
      </main>

      <footer className="mt-20 border-t border-border/40 py-12 px-4">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="space-y-4">
            <div className="flex items-center gap-2 opacity-70">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-black tracking-tighter">LEGAL<span className="text-primary">LENS</span></h2>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Making law accessible to everyone through advanced AI interpretation. Understand what you sign, every single time.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Platform</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="hover:text-primary cursor-pointer transition-colors">How it works</li>
                  <li className="hover:text-primary cursor-pointer transition-colors">Pricing</li>
                  <li className="hover:text-primary cursor-pointer transition-colors">API Docs</li>
                </ul>
             </div>
             <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Company</h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="hover:text-primary cursor-pointer transition-colors">About Us</li>
                  <li className="hover:text-primary cursor-pointer transition-colors">Privacy</li>
                  <li className="hover:text-primary cursor-pointer transition-colors">Terms</li>
                </ul>
             </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Join our legal updates</h4>
            <div className="flex gap-2">
               <input type="email" placeholder="Email address" className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-xs flex-1 outline-none focus:border-primary/50" />
               <Button size="sm" className="text-xs font-bold">Subscribe</Button>
            </div>
          </div>
        </div>
        <div className="container mx-auto mt-12 pt-8 border-t border-border/20 text-center">
           <p className="text-[10px] text-muted-foreground uppercase tracking-widest">© 2026 LegalLens. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
