export type SensitiveFinding = {
  kind: 'email' | 'phone' | 'credit_card' | 'ssn' | 'api_key' | 'ip' | 'ipv6' | 'address_like' | 'password_like' | 'person' | 'dob';
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
    const model = 'iiiorg/piiranha-v1-detect-personal-information';
    const token = process.env.HF_API_TOKEN;

    if (!token) {
      console.warn('No Hugging Face API token found. Set VITE_HF_API_TOKEN in your environment.');
      return [];
    }

    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inputs: text })
      }
    );

    if (!response.ok) {
      console.error('Piiranha API failed:', response.status, await response.text());
      return [];
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.warn('Unexpected format:', data);
      return [];
    }

    const PII_LABEL_MAP: Record<string, SensitiveFinding['kind']> = {
      'EMAIL': 'email',
      'TELEPHONENUM': 'phone',
      'CREDITCARDNUMBER': 'credit_card',
      'SOCIALNUM': 'ssn',
      'TAXNUM': 'ssn',
      'PASSWORD': 'password_like',
      'USERNAME': 'api_key',
      'ACCOUNTNUM': 'api_key',
      'IDCARDNUM': 'ssn',
      'DRIVERLICENSENUM': 'ssn',
      'GIVENNAME': 'person',
      'SURNAME': 'person',
      'BUILDINGNUM': 'address_like',
      'STREET': 'address_like',
      'CITY': 'address_like',
      'ZIPCODE': 'address_like',
      'DATEOFBIRTH': 'dob'
    };

    const mapped: SensitiveFinding[] = [];

    for (const item of data) {
      const label = item.entity_group || item.entity;
      const kind = PII_LABEL_MAP[label] || 'person'; // fallback

      const start = item.start ?? 0;
      const end = item.end ?? 0;
      const match = (start && end) ? text.slice(start, end) : (item.word || '');

      if (label && label !== 'O' && match) {
        mapped.push({ kind, start, end, match });
      }
    }

    return mergeFindings(mapped);
  } catch (err) {
    console.error('Piiranha ML detection failed:', err);
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

