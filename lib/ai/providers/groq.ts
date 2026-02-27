import Groq from 'groq-sdk';
import type { AIProvider } from './types';

export class GroqProvider implements AIProvider {
  private client: Groq;
  private model: string;

  constructor(apiKey: string, model = 'llama-3.3-70b-versatile', temperature = 0.7) {
    this.client = new Groq({ apiKey });
    this.model = model;
  }

  async generateChatCompletion(messages: { role: string; content: string }[]): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: messages as any,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content || '';
  }
}