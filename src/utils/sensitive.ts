export type SensitiveFinding = {
  kind: 'email' | 'phone' | 'credit_card' | 'ssn' | 'api_key' | 'ip' | 'ipv6' | 'address_like' | 'password_like' | 'ner_person' | 'ner_org' | 'ner_loc' | 'ner_misc';
  start: number;
  end: number;
  match: string;
};

const REGEXES: Array<{ kind: SensitiveFinding['kind']; regex: RegExp }> = [
  { kind: 'email', regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { kind: 'phone', regex: /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}\b/g },
  { kind: 'credit_card', regex: /\b(?:\d[ -]*?){13,19}\b/g },
  { kind: 'ssn', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
  { kind: 'api_key', regex: /\b(?:sk|key|api|token)[_:-]?[A-Za-z0-9\-_]{16,}\b/gi },
  { kind: 'ip', regex: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g },
  { kind: 'ipv6', regex: /\b(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}\b/gi },
  { kind: 'address_like', regex: /\b\d{1,5}\s+[^\n,]{3,}\s+(Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Lane|Ln\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Way)\b/gi },
  { kind: 'password_like', regex: /(password|passphrase|passwd)\s*[:=]\s*\S+/gi },
];

export function detectSensitive(text: string): SensitiveFinding[] {
  const findings: SensitiveFinding[] = [];
  for (const { kind, regex } of REGEXES) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      findings.push({ kind, start, end, match: match[0] });
      if (regex.lastIndex === match.index) regex.lastIndex++;
    }
  }
  return mergeFindings(findings);
}

export function mergeFindings(findings: SensitiveFinding[]): SensitiveFinding[] {
  findings.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: SensitiveFinding[] = [];
  for (const f of findings) {
    const last = merged[merged.length - 1];
    if (!last || f.start > last.end) {
      merged.push(f);
      continue;
    }
    const lastLen = last.end - last.start;
    const curLen = f.end - f.start;
    if (curLen > lastLen) merged[merged.length - 1] = f;
  }
  return merged;
}

export function censorText(text: string, findings: SensitiveFinding[], strategy: 'fixed' | 'length' = 'fixed'): string {
  if (findings.length === 0) return text;
  const segments: string[] = [];
  let cursor = 0;
  for (const f of findings.sort((a, b) => a.start - b.start)) {
    if (f.start > cursor) segments.push(text.slice(cursor, f.start));
    const len = f.end - f.start;
    segments.push(strategy === 'length' ? '•'.repeat(Math.min(len, 64)) : '[REDACTED]');
    cursor = f.end;
  }
  if (cursor < text.length) segments.push(text.slice(cursor));
  return segments.join('');
}

export async function detectSensitiveML(text: string): Promise<SensitiveFinding[]> {
  try {
    const model = 'dslim/bert-base-NER';
    const token = (import.meta as any).env?.VITE_HF_TOKEN;
    const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Response can be nested arrays depending on pipeline aggregation.
    const flat = Array.isArray(data) ? (Array.isArray(data[0]) ? data[0] : data) : [];
    const mapped: SensitiveFinding[] = [];
    for (const item of flat as any[]) {
      const label = String(item.entity_group || item.entity || '').toUpperCase();
      const start = item.start ?? 0;
      const end = item.end ?? 0;
      const match = text.slice(start, end);
      let kind: SensitiveFinding['kind'] | null = null;
      if (label === 'PER' || label === 'PERSON') kind = 'ner_person';
      else if (label === 'ORG') kind = 'ner_org';
      else if (label === 'LOC') kind = 'ner_loc';
      else if (label === 'MISC') kind = 'ner_misc';
      if (kind && match) mapped.push({ kind, start, end, match });
    }
    return mergeFindings(mapped);
  } catch {
    return [];
  }
}

export async function analyzeSmart(text: string, useML: boolean) {
  const regexFindings = detectSensitive(text);
  if (!useML) {
    const censored = censorText(text, regexFindings, 'fixed');
    return { findings: regexFindings, censored };
  }
  const mlFindings = await detectSensitiveML(text);
  const merged = mergeFindings([...regexFindings, ...mlFindings]);
  const censored = censorText(text, merged, 'fixed');
  return { findings: merged, censored };
}

