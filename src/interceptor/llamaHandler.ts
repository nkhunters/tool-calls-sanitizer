import { messageSanitizer } from '../utils/messageSanitizer';

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface LlamaRequest {
  messages: OpenAIMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
}

interface LlamaResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: ToolCall[];
    };
  }>;
}

export class LlamaHandler {
  private llamaApiUrl: string;
  private llamaApiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.llamaApiUrl = apiUrl;
    this.llamaApiKey = apiKey;
  }

  /**
   * Main handler that processes OpenAI-compatible requests for Llama
   */
  async handleChatCompletion(request: LlamaRequest): Promise<LlamaResponse> {
    try {
      // Sanitize messages to ensure single tool call compatibility
      const sanitizedMessages = messageSanitizer.sanitizeMessages(request.messages);
      
      // Validate that we have at most one pending tool call
      this.validateToolCallConstraints(sanitizedMessages);
      
      // Create Llama-compatible request
      const llamaRequest = {
        ...request,
        messages: sanitizedMessages
      };
      
      // Send to Llama API
      const response = await this.callLlamaApi(llamaRequest);
      
      return response;
    } catch (error) {
      throw new Error(`Llama handler error: ${error.message}`);
    }
  }

  /**
   * Validate that sanitized messages meet Llama's single tool call constraint
   */
  private validateToolCallConstraints(messages: OpenAIMessage[]): void {
    for (const message of messages) {
      if (message.role === 'assistant' && message.tool_calls) {
        if (message.tool_calls.length > 1) {
          throw new Error(
            `Sanitization failed: Found ${message.tool_calls.length} tool calls, expected 1 or 0`
          );
        }
      }
    }
  }

  /**
   * Make actual API call to Llama endpoint
   */
  private async callLlamaApi(request: LlamaRequest): Promise<LlamaResponse> {
    const response = await fetch(this.llamaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.llamaApiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Llama API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Process streaming responses from Llama (if supported)
   */
  async *handleStreamingCompletion(request: LlamaRequest): AsyncGenerator<any, void, unknown> {
    const sanitizedMessages = messageSanitizer.sanitizeMessages(request.messages);
    this.validateToolCallConstraints(sanitizedMessages);

    const llamaRequest = {
      ...request,
      messages: sanitizedMessages,
      stream: true
    };

    const response = await fetch(this.llamaApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.llamaApiKey}`
      },
      body: JSON.stringify(llamaRequest)
    });

    if (!response.ok) {
      throw new Error(`Llama API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body available');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (e) {
              console.warn('Failed to parse streaming response:', data);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

export default LlamaHandler;