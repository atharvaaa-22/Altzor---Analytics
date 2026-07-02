import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { CircuitBreaker } from '../../utils/circuitBreaker.js';

export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  latencyMs: number;
}

const genAi = new GoogleGenerativeAI(env.GOOGLE_GENAI_API_KEY);

const geminiBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeMs: 60_000,
  name: 'gemini-api',
});

export async function callAi(
  systemPrompt: string,
  messages: AiMessage[],
): Promise<AiResponse> {
  try {
    const result = await geminiBreaker.execute(() => callGemini(systemPrompt, messages));
    return result;
  } catch (error) {
    console.error('[AI] Gemini call failed:', (error as Error).message);
    throw new Error(
      'AI service is temporarily unavailable. Please try again in a few moments.',
    );
  }
}

async function callGemini(
  systemPrompt: string,
  messages: AiMessage[],
): Promise<AiResponse> {
  const start = Date.now();

  const model = genAi.getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: systemPrompt,
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });
  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessage(lastMessage?.content ?? '');

  const response = result.response;
  const usage = response.usageMetadata;

  return {
    content: response.text(),
    model: env.GEMINI_MODEL,
    tokensUsed: usage
      ? (usage.promptTokenCount ?? 0) + (usage.candidatesTokenCount ?? 0)
      : undefined,
    latencyMs: Date.now() - start,
  };
}
