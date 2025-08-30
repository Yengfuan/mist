export type SendMode = 'censored' | 'full';

export async function sendChat(prompt: string, mode: SendMode): Promise<{ output: string }>{
  // Stubbed implementation. Replace with actual OpenAI/ChatGPT API call.
  // Example shape for future:
  // const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ prompt, mode }) });
  // const data = await res.json();
  // return { output: data.output };
  await new Promise(r => setTimeout(r, 300));
  return { output: `[SIMULATED ${mode.toUpperCase()} RESPONSE]\n\nYou said:\n${prompt}` };
}



