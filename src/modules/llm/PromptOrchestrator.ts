// backend/src/modules/llm/PromptOrchestrator.ts
import { stripIndents } from "common-tags";

const STOP = new Set([
  "the","a","an","and","or","for","of","to","in","on","with","is","are","be","as","that",
  "this","it","by","from","at","about","into","over","after","than","then","so","such",
  "can","will","would","should","could","may","you","your","yours","we","our","ours"
]);

function tokenize(s: string) { return (s.toLowerCase().match(/[a-z0-9']+/g) ?? []); }
function keywordsFromPrompt(user: string, cap = 18) {
  const toks = tokenize(user).filter(w => !STOP.has(w) && w.length > 2);
  const uniq: string[] = [];
  for (const w of toks) if (!uniq.includes(w)) uniq.push(w);
  return uniq.slice(0, cap);
}

// Optional domain packs — expand coverage automatically for common topics
const DOMAIN_PACKS: Record<string, string[]> = {
  fintech: [
    "authorization","authentication","PCI-DSS","tokenization","acquiring bank","issuing bank",
    "interchange","chargeback","reconciliation","settlement","ISO 8583","fraud scoring",
    "3-D Secure","risk engine","ledger","webhook","dispute","KYC","AML","orchestration","retry logic"
  ],
  llm: [
    "prompt engineering","RAG","vector database","BM25","embedding","reranking",
    "grounding","hallucination","evaluation","nDCG@k","Recall@k","chunking",
    "window size","temperature","top_p","streaming","function calling"
  ]
};

function inferDomains(user: string): string[] {
  const s = user.toLowerCase();
  const picks: string[] = [];
  if (/(fintech|payment|bank|card|wallet|kyc|aml|interchange|issuer|acquirer)/.test(s)) picks.push("fintech");
  if (/(llm|rag|embedding|vector|bm25|rerank|prompt|token)/.test(s)) picks.push("llm");
  return picks;
}

export type QualityMode = "strong" | "balanced" | "creative";

/**
 * Builds a strict, metrics-oriented instruction block that:
 * - enforces headings/lists (Structure)
 * - enforces transitions & short sentences (Coherence + Readability)
 * - injects keyword coverage targets (Completeness)
 * - discourages repeated phrasing (Redundancy, Lexical diversity)
 * - aims for ~400 lines (Length adequacy)
 */
export function buildStructuredPrompt(userPrompt: string, mode: QualityMode = "strong") {
  const baseKeys = keywordsFromPrompt(userPrompt, 18);
  const packs = inferDomains(userPrompt).flatMap(d => DOMAIN_PACKS[d] ?? []);
  const allKeys = Array.from(new Set([...baseKeys, ...packs]));

  // tighter constraints for "strong", looser for others
  const sentencesPerLine = true;
  const targetLines = mode === "strong" ? 400 : 250;
  const minHeadings = mode === "strong" ? 10 : 6;
  const minBullets = mode === "strong" ? 28 : 16;
  const presencePenalty = mode === "strong" ? 0.3 : 0.1;
  const frequencyPenalty = mode === "strong" ? 0.3 : 0.1;

  const rules = stripIndents`
    Produce a **highly structured** answer that **maximizes**:
    - Structure (headings, subheadings, bullet lists)
    - Coherence (logical transitions between adjacent sentences)
    - Readability (short sentences; clear words)
    - Completeness (cover ALL target keywords below)
    - Lexical diversity (avoid repeating phrases; vary sentence starts)
    - Low redundancy (no repeated 4-grams)
    - Length adequacy (aim for about ${targetLines} lines)

    **Must-follow formatting**
    1) Use at least **${minHeadings}+ headings** (## …, ### …) across distinct sections:
       Overview; Key Concepts; Step-by-step Flow; Roles; Data & Fields; Security; Risk/Fraud; Errors/Declines; Fees/Costs; Observability & SLAs; Case Study; FAQs; Summary.
    2) Include at least **${minBullets}+ bullet items** spread across the document.
    3) Use explicit transitions between sentences: “Therefore,” “As a result,” “Consequently,” “Building on this,” “However,” “Meanwhile,” etc.
    4) Keep sentences short: **12–18 words**; avoid run-ons.
    5) **Each sentence on its own line**${sentencesPerLine ? " (hard requirement)" : ""}.
    6) Avoid repetitive scaffolding (don’t start many sentences with “First/Next/Finally”).
    7) Use synonyms to prevent repeated phrases; vary sentence openings.

    **Target keywords to naturally cover** (do not list them verbatim; weave them in context):
    ${allKeys.length ? "- " + allKeys.join(", ") : "- (no extra keywords inferred)"}

    **Deliverables inside the answer**
    - Clear, well-labeled sections and subsections.
    - At least one short, realistic mini case study.
    - A compact summary at the end with 5–8 bullets.
  `;

  const finalPrompt = stripIndents`
    You are a careful technical writer who optimizes for structure, coherence, readability, and completeness.
    The user asks:
    """
    ${userPrompt}
    """
    Follow the rules strictly:

    ${rules}
  `;

  return {
    prompt: finalPrompt,
    // export penalties so caller can set them in provider if supported
    penalties: { presencePenalty, frequencyPenalty },
    targetLines,
    keywords: allKeys,
  };
}
