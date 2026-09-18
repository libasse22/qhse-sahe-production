"use client";

import { useState } from "react";
import { askCopilotAction } from "@/lib/actions/copilot.actions";
import { CopilotSource } from "@/lib/types/copilot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Bot, User, ExternalLink, ShieldCheck, FileText, Copy, RefreshCw, Check } from "lucide-react";
import Link from "next/link";

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: CopilotSource[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Quelles sont les actions correctives (CAPA) en retard ?",
  "Quels sont les permis de travail actifs ou à risque ?",
  "Résumé des 5 derniers incidents déclarés",
  "Documents externes nécessitant une vérification ISO 7.5",
  "Synthèse pour la prochaine réunion QHSE"
];

export function AssistantQhseClient() {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Bonjour ! Je suis votre Copilote QHSE intelligent. Je suis connecté en temps réel aux données de votre entreprise (CAPA, Incidents, Permis PtW, Inspections, Audits, GED & Réunions) pour vous aider à analyser la conformité et préparer vos actions.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  async function handleSend(queryText?: string) {
    const text = queryText || inputQuery;
    if (!text.trim() || loading) return;

    setErrorBanner(null);
    const userMsg: MessageItem = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setLoading(true);

    try {
      const res = await askCopilotAction(text);
      if (res.success && res.data) {
        const assistantMsg: MessageItem = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: res.data.markdownContent,
          sources: res.data.sources,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setErrorBanner(res.error || "Impossible d'obtenir une réponse du Copilote.");
      }
    } catch {
      setErrorBanner("Erreur de connexion avec le service Copilote.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-6xl mx-auto space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 rounded-xl">
            <Sparkles className="h-6 w-6 text-indigo-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Assistant & Copilote QHSE
              <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/30 text-xs">
                V3 Operational
              </Badge>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 inline" />
              Réponses factuelles ancrées dans vos bases métier (CAPA, Audits, Permis, GED, Incidents)
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setMessages([messages[0]])}
          className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Recommencer
        </Button>
      </div>

      {errorBanner && (
        <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-lg text-xs">
          {errorBanner}
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-1">
                <Bot className="h-4 w-4 text-indigo-400" />
              </div>
            )}

            <div
              className={`max-w-3xl rounded-2xl p-4 text-sm leading-relaxed space-y-3 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none"
                  : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none"
              }`}
            >
              <div className="flex items-center justify-between text-xs opacity-75 border-b border-white/10 pb-1 mb-2">
                <span className="font-semibold">
                  {msg.role === "user" ? "Vous" : "Copilote QHSE"}
                </span>
                <span className="text-[10px]">{msg.timestamp}</span>
              </div>

              {/* Message Content */}
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Provenance Cards (Sources) */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 mt-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-indigo-400" />
                      Sources et faits consultés ({msg.sources.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {msg.sources.map((src, i) => (
                      <div
                        key={i}
                        className="bg-slate-950/80 border border-slate-800 p-2 rounded-lg text-xs hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-200 truncate">{src.title}</span>
                          {src.href && (
                            <Link href={src.href} className="text-indigo-400 hover:underline inline-flex items-center gap-0.5 text-[11px] shrink-0">
                              Voir <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                        {src.badgeText && (
                          <div className="mt-1">
                            <Badge variant={src.badgeVariant || "outline"} className="text-[10px] py-0 px-1.5">
                              {src.badgeText}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assistant Footer Controls */}
              {msg.role === "assistant" && msg.id !== "welcome" && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Assistant QHSE - Confirmation humaine recommandée</span>
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="hover:text-slate-300 flex items-center gap-1 text-slate-400"
                  >
                    {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedId === msg.id ? "Copié" : "Copier"}
                  </button>
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center shrink-0 mt-1">
                <User className="h-4 w-4 text-slate-200" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-sm text-slate-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400 animate-spin" />
              Analyse en cours des registres QHSE, CAPA, Audits & GED...
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      {messages.length < 3 && (
        <div className="space-y-1.5 pt-2">
          <p className="text-xs text-slate-400 font-medium">Suggestions de questions rapides :</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="text-xs bg-slate-900 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 text-slate-300 py-1.5 px-3 rounded-lg text-left transition"
              >
                💡 {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Box */}
      <div className="pt-2 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Posez votre question QHSE (ex: Synthèse des CAPA bloquées ou en retard...)"
            disabled={loading}
            className="bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 flex-1"
          />
          <Button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5"
          >
            {loading ? <Sparkles className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
