import OpenAI from 'openai';
import type { AIProvider } from './types';

export class PublicAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'Apertus-70B', temperature = 0.7) {
    const baseURL = process.env.PUBLICAI_BASE_URL || 'https://api.publicai.co/v1';
    this.client = new OpenAI({
      apiKey,
      baseURL,
    });
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