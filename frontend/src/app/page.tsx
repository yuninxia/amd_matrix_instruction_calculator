'use client';
// @ts-nocheck
export const dynamic = "force-static";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { PrismAsyncLight as SyntaxHighlighter } from 'react-syntax-highlighter/dist/esm';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Change this to wherever your backend API for the matrix_calculator lives.
const API_BASE = process.env.NEXT_PUBLIC_MATRIX_API ?? "/api";

export default function MatrixCalculatorApp() {
  /* ------------------------------------------------------------------
   * UI State ---------------------------------------------------------
   * ----------------------------------------------------------------*/
  const [architectures, setArchitectures] = useState<string[]>([]);
  const [instructions, setInstructions] = useState<string[]>([]);

  const [arch, setArch] = useState("");
  const [instruction, setInstruction] = useState("");
  const [mode, setMode] = useState("detail-instruction");
  const [matrixType, setMatrixType] = useState<string>("D");

  const [additionalFlags, setAdditionalFlags] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  /* ------------------------------------------------------------------
   * Fetch helpers ----------------------------------------------------
   * ----------------------------------------------------------------*/
  const fetchArchitectures = async () => {
    const res = await fetch(`${API_BASE}/architectures`);
    if (!res.ok) throw new Error("Failed to fetch architectures");
    const data = (await res.json()) as string[];
    setArchitectures(data);
  };

  const fetchInstructions = async (architecture: string) => {
    if (!architecture) return;
    setInstructions([]);
    const res = await fetch(`${API_BASE}/instructions?arch=${architecture}`);
    if (!res.ok) throw new Error("Failed to fetch instructions");
    const data = (await res.json()) as string[];
    setInstructions(data);
  };

  /* ------------------------------------------------------------------
   * Effect hooks -----------------------------------------------------
   * ----------------------------------------------------------------*/
  useEffect(() => {
    fetchArchitectures().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (arch) {
      fetchInstructions(arch).catch((e) => setError(e.message));
    }
  }, [arch]);

  /* ------------------------------------------------------------------
   * Event handlers ---------------------------------------------------
   * ----------------------------------------------------------------*/
  const handleCalculate = async () => {
    setLoading(true);
    setError("");
    setResult("");
    setCopied(false);
    try {
      const res = await fetch(`${API_BASE}/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          architecture: arch,
          instruction,
          mode,
          matrix_type: matrixType,
          flags: additionalFlags,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const text = await res.text();
      const formattedText = text.replace(/\\n/g, '\n');
      setResult(formattedText);
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(String(e));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy: ', err);
      });
    }
  };

  /* ------------------------------------------------------------------
   * Render UI --------------------------------------------------------
   * ----------------------------------------------------------------*/
  return (
    <motion.div
      className="min-h-screen bg-slate-100 p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h1 className="text-3xl font-semibold mb-8 text-center text-slate-700 tracking-tight">
        AMD Matrix Instruction Calculator Frontend
      </h1>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/3">
          <Card className="shadow-xl rounded-2xl h-full">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-2xl font-semibold">Configuration</h2>

              {/* Architecture selector */}
              <div className="space-y-1">
                <label className="font-medium">Architecture</label>
                <Select value={arch} onValueChange={setArch}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select architecture" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {architectures.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Instruction selector */}
              <div className="space-y-1">
                <label className="font-medium">Instruction</label>
                <Select value={instruction} onValueChange={setInstruction}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select instruction" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {instructions.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mode selector */}
              <div className="space-y-1">
                <label className="font-medium">Mode</label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "detail-instruction",
                      "register-layout",
                      "matrix-layout",
                      "get-register",
                      "matrix-entry",
                    ].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Matrix Type selector - Conditionally rendered */}
              {["register-layout", "matrix-layout", "get-register", "matrix-entry"].includes(mode) && (
                <div className="space-y-1">
                  <label className="font-medium">Matrix Type</label>
                  <Select value={matrixType} onValueChange={setMatrixType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select matrix type" />
                    </SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "D", "K"].map((mt) => (
                        <SelectItem key={mt} value={mt}>
                          {mt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Additional flags (simple key/value JSON) */}
              <div className="space-y-1">
                <label className="font-medium">Additional Flags (JSON)</label>
                <Input
                  placeholder='{ "wave": 64, "transpose": true }'
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    try {
                      const json = JSON.parse(e.target.value || "{}");
                      setAdditionalFlags(json);
                    } catch {
                      // ignore invalid json, will show error on calculate
                    }
                  }}
                />
              </div>

              <Button
                className="w-full mt-4 text-lg"
                disabled={loading || !arch || !instruction}
                onClick={handleCalculate}
              >
                {loading ? "Calculating..." : "Run"}
              </Button>

              {error && (
                <p className="text-red-600 text-sm whitespace-pre-wrap font-mono">
                  {error}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:w-2/3">
          <Card className="shadow-xl rounded-2xl h-full">
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Results</h2>
                {result && (
                  <Button onClick={handleCopy} variant="outline" size="sm">
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                )}
              </div>
              <SyntaxHighlighter
                language="text"
                style={atomDark}
                customStyle={{
                  borderRadius: '0.75rem', // Corresponds to rounded-xl
                  padding: '1rem', // Corresponds to p-4
                  margin: '0px', // Remove default margin if any
                  maxHeight: '70vh',
                  overflowX: 'auto',
                  backgroundColor: '#1d1f21' // A common dark background for atomOneDark, adjust if needed
                }}
                showLineNumbers // Optional: add line numbers
                wrapLines // Optional: wrap lines, or use wrapLongLines
              >
                {result || "<output will appear here>"}
              </SyntaxHighlighter>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
