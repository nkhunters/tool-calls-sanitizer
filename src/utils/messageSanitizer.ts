import { sanitizerConfig } from "../config/sanitizer";
import * as crypto from "crypto-js";

interface OpenAIMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface ToolResponse {
  tool_call_id: string;
  content: string;
  success: boolean;
}

export class MessageSanitizer {
  /**
   * Main sanitization function that processes conversation history
   * and ensures only one pending tool call remains for Llama
   */
  sanitizeMessages(messages: OpenAIMessage[]): OpenAIMessage[] {
    try {
      // Step 1: Validate and clean messages
      const cleanedMessages = this.validateAndCleanMessages(messages);

      // Step 2: Remove duplicates
      const deduplicatedMessages = this.deduplicateMessages(cleanedMessages);

      // Step 3: Identify completed tool calls
      const completedToolCalls =
        this.identifyCompletedToolCalls(deduplicatedMessages);

      // Step 4: Transform messages
      const transformedMessages = this.transformMessages(
        deduplicatedMessages,
        completedToolCalls
      );

      return transformedMessages;
    } catch (error) {
      console.error("Message sanitization failed:", error);
      // Fallback: return original messages with basic validation
      return this.validateAndCleanMessages(messages);
    }
  }

  /**
   * Validate and clean messages - remove empty messages, fix malformed data
   */
  private validateAndCleanMessages(messages: OpenAIMessage[]): OpenAIMessage[] {
    return messages.filter((msg) => {
      // Remove messages with empty content (except tool calls)
      if (!msg.content && (!msg.tool_calls || msg.tool_calls.length === 0)) {
        return false;
      }

      // Validate role
      if (!["user", "assistant", "tool"].includes(msg.role)) {
        return false;
      }

      // Clean tool calls
      if (msg.tool_calls) {
        msg.tool_calls = msg.tool_calls.filter((call) => {
          if (!call.id || !call.function || !call.function.name) {
            return false;
          }

          // Validate JSON arguments
          try {
            if (call.function.arguments) {
              JSON.parse(call.function.arguments);
            }
          } catch (e) {
            console.warn(
              `Invalid JSON in tool call ${call.id}:`,
              call.function.arguments
            );
            call.function.arguments = "{}";
          }

          return true;
        });
      }

      return true;
    });
  }

  /**
   * Remove duplicate consecutive messages
   */
  private deduplicateMessages(messages: OpenAIMessage[]): OpenAIMessage[] {
    if (messages.length <= 1) return messages;

    const result: OpenAIMessage[] = [];
    const config = sanitizerConfig.getConfig();

    for (let i = 0; i < messages.length; i++) {
      const current = messages[i];
      const shouldInclude = this.shouldIncludeMessage(
        current,
        result,
        config.deduplicationWindow || 3
      );

      if (shouldInclude) {
        result.push(current);
      }
    }

    return result;
  }

  /**
   * Determine if a message should be included based on deduplication logic
   */
  private shouldIncludeMessage(
    message: OpenAIMessage,
    previousMessages: OpenAIMessage[],
    windowSize: number
  ): boolean {
    const recentMessages = previousMessages.slice(-windowSize);
    const messageHash = this.hashMessage(message);

    for (const prevMsg of recentMessages) {
      if (this.hashMessage(prevMsg) === messageHash) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate hash for message content comparison
   */
  private hashMessage(message: OpenAIMessage): string {
    const hashContent = {
      role: message.role,
      content: message.content,
      tool_calls: message.tool_calls || [],
      tool_call_id: message.tool_call_id,
    };

    return crypto.MD5(JSON.stringify(hashContent)).toString();
  }

  /**
   * First pass: identify which tool calls have been completed
   * (have corresponding tool response messages)
   */
  private identifyCompletedToolCalls(messages: OpenAIMessage[]): Set<string> {
    const completedToolCalls = new Set<string>();

    messages.forEach((msg) => {
      if (msg.role === "tool" && msg.tool_call_id) {
        completedToolCalls.add(msg.tool_call_id);
      }
    });

    return completedToolCalls;
  }

  /**
   * Second pass: transform messages by compressing completed tool calls
   * and keeping only the latest pending tool call
   */
  private transformMessages(
    messages: OpenAIMessage[],
    completedToolCalls: Set<string>
  ): OpenAIMessage[] {
    const result: OpenAIMessage[] = [];
    const toolResponses = this.buildToolResponseMap(messages);
    const orphanedToolResponses = this.findOrphanedToolResponses(
      messages,
      completedToolCalls
    );

    // Remove orphaned tool responses from completed set
    orphanedToolResponses.forEach((id) => completedToolCalls.delete(id));

    for (const msg of messages) {
      if (
        msg.role === "assistant" &&
        msg.tool_calls &&
        msg.tool_calls.length > 0
      ) {
        const pendingToolCalls = msg.tool_calls.filter(
          (call) => !completedToolCalls.has(call.id)
        );

        if (pendingToolCalls.length === 0) {
          // All tool calls completed - convert to summary
          const summary = this.generateToolSummary(
            msg.tool_calls,
            toolResponses
          );
          if (summary.trim()) {
            result.push({
              role: "assistant",
              content: summary,
              name: msg.name,
            });
          }
        } else {
          // Keep only the last pending tool call for Llama
          result.push({
            ...msg,
            tool_calls: [pendingToolCalls[pendingToolCalls.length - 1]],
          });
        }
      } else if (msg.role === "tool") {
        // Skip tool response messages as they're now part of summaries
        // But keep orphaned tool responses
        if (orphanedToolResponses.has(msg.tool_call_id!)) {
          result.push(msg);
        }
      } else {
        // Keep user messages and other assistant messages as-is
        result.push(msg);
      }
    }

    return result;
  }

  /**
   * Find orphaned tool responses (responses without matching tool calls)
   */
  private findOrphanedToolResponses(
    messages: OpenAIMessage[],
    completedToolCalls: Set<string>
  ): Set<string> {
    const toolCallIds = new Set<string>();
    const orphanedResponses = new Set<string>();

    // First pass: collect all tool call IDs
    messages.forEach((msg) => {
      if (msg.role === "assistant" && msg.tool_calls) {
        msg.tool_calls.forEach((call) => toolCallIds.add(call.id));
      }
    });

    // Second pass: find tool responses without matching tool calls
    messages.forEach((msg) => {
      if (msg.role === "tool" && msg.tool_call_id) {
        if (!toolCallIds.has(msg.tool_call_id)) {
          orphanedResponses.add(msg.tool_call_id);
        }
      }
    });

    return orphanedResponses;
  }

  /**
   * Build a map of tool call IDs to their responses for summary generation
   */
  private buildToolResponseMap(
    messages: OpenAIMessage[]
  ): Map<string, ToolResponse> {
    const toolResponses = new Map<string, ToolResponse>();

    messages.forEach((msg) => {
      if (msg.role === "tool" && msg.tool_call_id) {
        const success = !msg.content.toLowerCase().includes("error");
        toolResponses.set(msg.tool_call_id, {
          tool_call_id: msg.tool_call_id,
          content: msg.content,
          success,
        });
      }
    });

    return toolResponses;
  }

  /**
   * Generate human-readable summary of completed tool calls
   */
  private generateToolSummary(
    toolCalls: ToolCall[],
    toolResponses: Map<string, ToolResponse>
  ): string {
    const summaries = toolCalls
      .map((call) => {
        const response = toolResponses.get(call.id);
        const functionName = call.function.name;
        let args: any = {};

        try {
          args = JSON.parse(call.function.arguments);
        } catch (e) {
          args = { raw: call.function.arguments };
        }

        if (!response) {
          return `Initiated ${functionName} with ${JSON.stringify(args)}`;
        }

        // Skip failed tool calls that were immediately retried
        if (!response.success) {
          const hasSuccessfulRetry = this.hasSuccessfulRetry(
            call,
            toolCalls,
            toolResponses
          );
          if (hasSuccessfulRetry) {
            return null; // Skip this failed attempt
          }
          return `Failed to execute ${functionName}: ${response.content}`;
        }

        return this.generateSuccessfulToolSummary(
          functionName,
          args,
          response.content
        );
      })
      .filter((summary) => summary !== null);

    return summaries.join("\n");
  }

  /**
   * Check if a failed tool call has a successful retry
   */
  private hasSuccessfulRetry(
    failedCall: ToolCall,
    allToolCalls: ToolCall[],
    toolResponses: Map<string, ToolResponse>
  ): boolean {
    const failedFunctionName = failedCall.function.name;
    const failedArgs = failedCall.function.arguments;

    // Look for similar tool calls with successful responses
    for (const otherCall of allToolCalls) {
      if (otherCall.id === failedCall.id) continue;

      if (otherCall.function.name === failedFunctionName) {
        const otherResponse = toolResponses.get(otherCall.id);
        if (otherResponse && otherResponse.success) {
          // Check if arguments are similar (indicating a retry)
          if (
            this.areArgumentsSimilar(failedArgs, otherCall.function.arguments)
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Check if two argument strings are similar (for retry detection)
   */
  private areArgumentsSimilar(args1: string, args2: string): boolean {
    try {
      const parsed1 = JSON.parse(args1);
      const parsed2 = JSON.parse(args2);

      // Simple similarity check - compare main parameters
      const keys1 = Object.keys(parsed1);
      const keys2 = Object.keys(parsed2);

      if (keys1.length !== keys2.length) return false;

      for (const key of keys1) {
        if (parsed1[key] !== parsed2[key]) {
          // Allow for minor variations (like limit as string vs number)
          if (String(parsed1[key]) !== String(parsed2[key])) {
            return false;
          }
        }
      }

      return true;
    } catch (e) {
      // If JSON parsing fails, do string comparison
      return args1.replace(/\s/g, "") === args2.replace(/\s/g, "");
    }
  }

  /**
   * Generate specific summaries for successful tool calls
   */
  private generateSuccessfulToolSummary(
    functionName: string,
    args: any,
    responseContent: string
  ): string {
    switch (functionName) {
      case "execute_cql_search":
        try {
          const results = JSON.parse(responseContent);
          const count = results.results?.length || 0;
          return `Searched Confluence for "${args.cql}" and found ${count} result(s)`;
        } catch {
          return `Successfully executed Confluence search for "${args.cql}"`;
        }

      case "get_page_content":
        return `Retrieved content from page: ${args.url || args.page_id}`;

      case "web_search":
        return `Performed web search for: ${args.query}`;

      default:
        return `Successfully executed ${functionName} with ${JSON.stringify(
          args
        )}`;
    }
  }
}

export const messageSanitizer = new MessageSanitizer();
