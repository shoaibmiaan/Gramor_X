import type { AIProvider } from './types';

export class DeepSeekProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private apiUrl: string;

  constructor(apiKey: string, model = 'deepseek-chat', temperature = 0.7) {
    this.apiKey = apiKey;
    this.model = model;
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  }

  async generateChatCompletion(messages: { role: string; content: string }[]): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
}