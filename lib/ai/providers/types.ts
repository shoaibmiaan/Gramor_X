export interface AIProvider {
  generateChatCompletion(messages: { role: string; content: string }[]): Promise<string>;
}

export interface AIConfig {
  provider: 'openai' | 'groq' | 'gemini' | 'deepseek' | 'publicai' | 'mock';
  apiKey?: string;
  model?: string;
  temperature?: number;
}


