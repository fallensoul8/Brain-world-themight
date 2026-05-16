import type { LLMProvider, LLMOptions } from './types.js';

/**
 * Ollama LLM Provider
 * Connects to local Ollama instance for inference
 * Default endpoint: http://localhost:11434
 */
export class OllamaClient implements LLMProvider {
  private endpoint: string;
  private model: string;
  private defaultModel = 'llama2';
  private maxRetries = 3;
  private retryDelayMs = 1000;

  constructor(endpoint = 'http://localhost:11434', model?: string) {
    this.endpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash
    this.model = model || this.defaultModel;
  }

  /** Set the model to use */
  setModel(model: string): void {
    this.model = model;
  }

  /** Get the currently configured model */
  getModel(): string {
    return this.model;
  }

  /**
   * Check if Ollama is healthy and reachable
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        timeout: 5000,
      });
      if (!response.ok) {
        console.warn(`[ollama] Health check failed: ${response.status}`);
        return false;
      }
      const data = (await response.json()) as { models?: unknown[] };
      return Array.isArray(data.models);
    } catch (err) {
      console.warn('[ollama] Health check failed:', err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  /**
   * Generate text via Ollama with retry logic
   */
  async generate(prompt: string, options?: LLMOptions): Promise<string> {
    const model = options?.model || this.model;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 500;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            prompt,
            temperature,
            num_predict: maxTokens,
            stream: false,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = (await response.json()) as { response?: string };
        const generated = data.response?.trim() || '';

        if (!generated) {
          throw new Error('Empty response from Ollama');
        }

        return generated;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[ollama] Generation attempt ${attempt + 1}/${this.maxRetries} failed:`, lastError.message);

        if (attempt < this.maxRetries - 1) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(`[ollama] Failed to generate after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Stream text generation (for real-time responses)
   */
  async stream(prompt: string, onChunk: (chunk: string) => void, options?: LLMOptions): Promise<void> {
    const model = options?.model || this.model;
    const temperature = options?.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? 500;

    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          temperature,
          num_predict: maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Process complete lines
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim();
            if (line) {
              try {
                const data = JSON.parse(line) as { response?: string };
                if (data.response) {
                  onChunk(data.response);
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }

          // Keep incomplete line in buffer
          buffer = lines[lines.length - 1];
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer) as { response?: string };
            if (data.response) {
              onChunk(data.response);
            }
          } catch {
            // Ignore final incomplete lines
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (err) {
      throw new Error(`[ollama] Stream failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as { models?: Array<{ name?: string }> };
      return data.models?.map((m) => m.name || '').filter(Boolean) || [];
    } catch (err) {
      console.error('[ollama] Failed to list models:', err instanceof Error ? err.message : String(err));
      return [];
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(model: string): Promise<void> {
    try {
      const response = await fetch(`${this.endpoint}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log(`[ollama] Pull ${model} completed`);
    } catch (err) {
      throw new Error(`[ollama] Failed to pull model: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

/**
 * Singleton instance
 */
let instance: OllamaClient | null = null;

/**
 * Get or create OllamaClient singleton
 */
export function getOllamaClient(endpoint?: string, model?: string): OllamaClient {
  if (!instance) {
    instance = new OllamaClient(endpoint, model);
  }
  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetOllamaClient(): void {
  instance = null;
}
