import OpenAI from 'openai';
import type { AIProvider } from './types';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-3.5-turbo', temperature = 0.7) {
    this.client = new OpenAI({ apiKey });
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