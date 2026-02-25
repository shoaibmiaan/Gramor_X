import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from './types';

export class GeminiProvider implements AIProvider {
  private model: any;
  private modelName: string;

  constructor(apiKey: string, model = 'gemini-1.5-flash-latest', temperature = 0.7) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = model;
    this.model = genAI.getGenerativeModel({ model });
  }

  async generateChatCompletion(messages: { role: string; content: string }[]): Promise<string> {
    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const lastMessage = messages[messages.length - 1].content;

    const chat = this.model.startChat({ history });
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    return response.text();
  }
}