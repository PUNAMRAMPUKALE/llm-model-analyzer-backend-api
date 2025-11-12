import { stripIndents } from "common-tags";

type Scores = {
  completeness: number;         // coverage of prompt keywords (0..1)
  structure: number;            // headings/lists/sections present (0..1)
  coherence: number;            // discourse/topic continuity (0..1)
  redundancy: number;           // 1 - repetition rate (higher is better)
  lexical_diversity: number;    // unique/total token ratio (0..1)
  length_adequacy: number;      // close to target length (0..1)
  readability: number;          // normalized readability (0..1)
};

type Details = {
  tokens: number;
  sentences: number;
  keywordsMatched: string[];
  keywordsMissed: string[];
  sectionHints: { hasHeadings: boolean; hasLists: boolean; lineBreaks: number };
  repetition: { ngram: number; unique4grams: number; total4grams: number };
  coherencePairs: number;
  lengthTarget: number;
  notes: string[];
  summary?: string; // short 2–3 line conclusion
};

const STOP = new Set([
  "the","a","an","and","or","for","of","to","in","on","with","is","are","be","as","that",
  "this","it","by","from","at","about","into","over","after","than","then","so","such",
  "can","will","would","should","could","may"
]);

function tokenize(text: string) { return (text.toLowerCase().match(/[a-z0-9']+/g) ?? []); }
function sentencesOf(text: string) { return (text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)); }
function wordsMinusStop(words: string[]) { return words.filter(w => !STOP.has(w) && w.length > 2); }
function unique<T>(xs: T[]) { return Array.from(new Set(xs)); }
function ngrams(words: string[], n = 4) {
  const out: string[] = [];
  for (let i = 0; i <= words.length - n; i++) out.push(words.slice(i, i + n).join(" "));
  return out;
}
function jaccard(a: Set<string>, b: Set<string>) {
  const inter = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return union.size ? inter.size / union.size : 0;
}
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

function sectionScore(text: string) {
  const hasHeadings = /(^|\n)\s*\d+[\.\)]\s+|(^|\n)\s*#+\s+/m.test(text);
  const hasLists = /(^|\n)\s*[-*•]\s+|(^|\n)\s*\d+\.\s+/m.test(text);
  const lineBreaks = (text.match(/\n/g) ?? []).length;
  // weight: headings 0.5, lists 0.3, line breaks density 0.2
  const lbScore = clamp01(lineBreaks / Math.max(8, Math.round(text.length / 200)));
  const s = (hasHeadings ? 0.5 : 0) + (hasLists ? 0.3 : 0) + 0.2 * lbScore;
  return { score: clamp01(s), hasHeadings, hasLists, lineBreaks };
}

function redundancyScore(words: string[]) {
  const g4 = ngrams(words, 4);
  if (g4.length === 0) return { score: 1, repRate: 0, unique: 0, total: 0 };
  const uniq = new Set(g4);
  const repRate = 1 - uniq.size / g4.length; // 0..1 (higher means more repetition)
  const score = clamp01(1 - repRate);        // invert so higher is better
  return { score, repRate, unique: uniq.size, total: g4.length };
}

function lexicalDiversity(words: string[]) {
  if (!words.length) return 0;
  const ttr = unique(words).length / words.length; // 0..1
  return clamp01(0.2 + 0.8 * ttr); // gentle squeeze
}

/* ----------------------- Improved coherence metric ----------------------- */
function sentenceSets(sentences: string[]) {
  return sentences.map(s => new Set(wordsMinusStop(tokenize(s))));
}

const TRANSITION_CUES = new Set([
  "first","second","third","next","then","afterward","however","therefore","moreover",
  "furthermore","additionally","in","conclusion","overall","finally","meanwhile","consequently",
  "thus","hence","nevertheless","nonetheless","instead","similarly","likewise","additionally"
]);

function transitionCueScore(sent: string) {
  const w = tokenize(sent);
  const hit = w.some(t => TRANSITION_CUES.has(t));
  return hit ? 1 : 0;
}

/**
 * Coherence for long-form text:
 * - windowed topic overlap (Jaccard over content words) across 3-sentence windows
 * - plus transition/discourse cue bonus
 * - gently penalize only if redundancy is extremely low or extremely high
 * - small boost when structure is strong and text is long
 */
function improvedCoherence(text: string, redundancy01: number, struct01: number) {
  const sents = sentencesOf(text);
  if (sents.length < 2) return 0.65; // neutral when too short

  const sets = sentenceSets(sents);

  // Topic continuity: adjacent + (0.5 * next-adjacent) pairs
  let sum = 0, denom = 0;
  for (let i = 1; i < sets.length; i++) {
    sum += jaccard(sets[i - 1], sets[i]); denom += 1;
    if (i >= 2) { sum += 0.5 * jaccard(sets[i - 2], sets[i]); denom += 0.5; }
  }
  const topicAvg = denom ? sum / denom : 0;

  // Discourse markers (explicit transitions)
  let cueSum = 0;
  for (const s of sents) cueSum += transitionCueScore(s);
  const cueAvg = cueSum / sents.length; // 0..~1

  // Normalize topic overlap to a wide “good band” ~0.18–0.40
  const center = 0.28;
  const width  = 0.22;
  const topicScore = clamp01(1 - Math.abs(topicAvg - center) / width);

  // Blend topic (0.7) and cues (0.3)
  let coh = clamp01(0.7 * topicScore + 0.3 * cueAvg);

  // Soft consistency w/ redundancy
  const repPenalty = redundancy01 < 0.25 ? 0.88 : redundancy01 > 0.96 ? 0.93 : 1.0;
  coh = clamp01(coh * repPenalty);

  // Structural boost for long, well-structured text
  const wordCount = tokenize(text).length;
  if (struct01 >= 0.85 && wordCount >= 600) {
    coh = clamp01(0.9 * coh + 0.1 * Math.min(1, struct01 + 0.05));
  }

  return Math.max(coh, 0.35);
}

/* ------------------------------------------------------------------------ */

function completeness(prompt: string, words: string[]) {
  const p = wordsMinusStop(tokenize(prompt));
  const promptKeys = unique(p).slice(0, 15); // cap
  const wset = new Set(words);
  const hit = promptKeys.filter(k => wset.has(k));
  const score = promptKeys.length ? hit.length / promptKeys.length : 0.5;
  return { score, matched: hit, missed: promptKeys.filter(k => !wset.has(k)) };
}

function lengthAdequacy(text: string, prompt: string) {
  // If prompt contains “at least N lines/words”, honor; else target ~350 words
  const m = prompt.match(/at least\s+(\d+)\s+(lines|line|words|word)/i);
  const words = tokenize(text).length;
  let target = 350; // default
  if (m) {
    const n = Number(m[1]);
    target = m[2].toLowerCase().startsWith("line") ? n * 15 : n; // ~15 words/line
  }
  const ratio = words / Math.max(1, target);
  const score = Math.exp(-Math.pow(ratio - 1, 2) / 0.25); // sigma ~0.5
  return { score: clamp01(score), target };
}

function readability(text: string) {
  const sents = Math.max(1, sentencesOf(text).length);
  const words = tokenize(text).length || 1;
  const syllables = (text.toLowerCase().match(/[aeiouy]+/g) ?? []).length || 1;
  const wps = words / sents;
  const spw = syllables / words;
  const wScore = clamp01(1 - Math.abs(wps - 18) / 18);
  const sylScore = clamp01(1 - Math.abs(spw - 1.5) / 1.5);
  return 0.5 * wScore + 0.5 * sylScore;
}

export class MetricsClient {
  // weights sum to 1
  private weights = {
    completeness: 0.22,
    structure: 0.15,
    coherence: 0.18,
    redundancy: 0.12,
    lexical_diversity: 0.10,
    length_adequacy: 0.13,
    readability: 0.10,
  };

  async compute(prompt: string, text: string) {
    const toks = wordsMinusStop(tokenize(text));
    const sents = sentencesOf(text);

    const comp = completeness(prompt, toks);               // 0..1
    const sect = sectionScore(text);                       // 0..1 + flags
    const red  = redundancyScore(toks);                    // 0..1 (higher=less repeat)
    const lex  = lexicalDiversity(toks);                   // 0..1
    const coh  = improvedCoherence(text, red.score, sect.score); // 0..1 (improved)
    const len  = lengthAdequacy(text, prompt);             // 0..1
    const read = readability(text);                        // 0..1

    const scores: Scores = {
      completeness: comp.score,
      structure: sect.score,
      coherence: coh,
      redundancy: red.score,
      lexical_diversity: lex,
      length_adequacy: len.score,
      readability: read,
    };

    // weighted overall
    const overallQuality =
      scores.completeness * this.weights.completeness +
      scores.structure * this.weights.structure +
      scores.coherence * this.weights.coherence +
      scores.redundancy * this.weights.redundancy +
      scores.lexical_diversity * this.weights.lexical_diversity +
      scores.length_adequacy * this.weights.length_adequacy +
      scores.readability * this.weights.readability;

    const notes: string[] = [];
    if (scores.completeness < 0.5) notes.push("Low prompt coverage; add missing keywords.");
    if (scores.structure < 0.5) notes.push("Weak structure; add headings and bullet lists.");
    if (scores.coherence < 0.5) notes.push("Inconsistent flow between sections; add clear transitions.");
    if (scores.redundancy < 0.6) notes.push("Repetitive phrasing detected.");
    if (scores.length_adequacy < 0.5) notes.push("Length far from target.");
    if (scores.readability < 0.45) notes.push("Hard to read; simplify sentences.");

    // --- 2–3 line, actionable summary ---
    const parts: string[] = [];
    const strong = [
      scores.structure > 0.8 ? "structure" : null,
      scores.readability > 0.7 ? "readability" : null,
      scores.redundancy > 0.8 ? "low repetition" : null,
    ].filter(Boolean) as string[];
    const weak = [
      scores.completeness < 0.4 ? "completeness" : null,
      scores.coherence < 0.4 ? "coherence" : null,
      scores.length_adequacy < 0.4 ? "length" : null,
    ].filter(Boolean) as string[];

    parts.push(
      `Quality snapshot: ${strong.length ? `strong ${strong.join(", ")}` : "no standout strengths"}; ` +
      `${weak.length ? `weak ${weak.join(", ")}.` : "no critical weaknesses."}`
    );

    if (scores.completeness < 0.4 && comp.missed.length) {
      parts.push(`Coverage is low; include missing ideas like “${comp.missed.slice(0,3).join("”, “")}”.`);
    } else if (scores.coherence < 0.4) {
      parts.push("Flow is choppy; add connective phrases and merge short, isolated sentences.");
    } else if (scores.length_adequacy < 0.4) {
      parts.push(`Length off target; aim for ~${len.target} words and trim filler.`);
    }
    parts.push("Next run: try lower temperature (0.1–0.3) and front-load 3–5 prompt keywords.");
    const summary = parts.join(" ");

    const details: Details = {
      tokens: toks.length,
      sentences: sents.length,
      keywordsMatched: comp.matched,
      keywordsMissed: comp.missed,
      sectionHints: { hasHeadings: sect.hasHeadings, hasLists: sect.hasLists, lineBreaks: sect.lineBreaks },
      repetition: { ngram: red.repRate, unique4grams: red.unique, total4grams: red.total },
      coherencePairs: Math.max(0, sents.length - 1),
      lengthTarget: len.target,
      notes,
      summary,
    };

    return {
      overallQuality,
      scores,
      details,
      model_versions: { metrics: "v1.2.0" },
      rationale: stripIndents`
        Weighted composite across completeness / structure / coherence / redundancy /
        lexical diversity / length adequacy / readability.
        Coherence uses windowed topic overlap + discourse cues, normalized for long-form text.`,
    };
  }
}
