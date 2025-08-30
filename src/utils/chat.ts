export type SendMode = 'censored' | 'full';

export async function sendChat(prompt: string, mode: SendMode): Promise<{ output: string }>{
  try {
    const baseURL = "https://api.aimlapi.com/v1";
    const apiKey = "e0aa1b6e51f145c3aaa8a8388adcc6e7"; // Your AIML API Key
    
    const systemPrompt = "You are a helpful AI assistant named Mist. Be descriptive and helpful in your responses.";
    const userPrompt = prompt;

    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistralai/Mistral-7B-Instruct-v0.2",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 256,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'No response generated';
    
    return { output: aiResponse };
  } catch (error) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to get AI response: ${errorMessage}`);
  }
}



