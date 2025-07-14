import { messageSanitizer } from "./utils/messageSanitizer";
//import { LlamaHandler } from "./src/interceptor/llamaHandler";

// Example usage with your existing messages
const messages = [
  { role: "user", content: "Search confluence for pages about Leap KSS" },
  {
    role: "assistant",
    content: "",
    name: "Agent",
    tool_calls: [
      {
        id: 'chat_completion:tool:execute_cql_search:{"cql":"text ~ \\"Leap KSS\\"","limit":"10"}',
        type: "function",
        function: {
          name: "execute_cql_search",
          arguments: '{"cql":"text ~ \\"Leap KSS\\"", "limit": "10"}',
        },
      },
    ],
  },
  {
    role: "tool",
    content:
      "Error: Received tool input did not match the expected schema\nPlease fix your mistakes.",
    name: "execute_cql_search",
    tool_call_id:
      'chat_completion:tool:execute_cql_search:{"cql":"text ~ \\"Leap KSS\\"","limit":"10"}',
  },
  {
    role: "assistant",
    content: "",
    name: "Agent",
    tool_calls: [
      {
        id: 'chat_completion:tool:execute_cql_search:{"cql":"text ~ \\"Leap KSS\\"","limit":10}',
        type: "function",
        function: {
          name: "execute_cql_search",
          arguments: '{"cql":"text ~ \\"Leap KSS\\"", "limit": 10}',
        },
      },
    ],
  },
  {
    role: "tool",
    content:
      '{\n  "results": [\n    {\n      "id": "123",\n      "title": "Leap KSS",\n      "url": "https://example.com/leap-kss"\n    }\n  ]\n}',
    name: "execute_cql_search",
    tool_call_id:
      'chat_completion:tool:execute_cql_search:{"cql":"text ~ \\"Leap KSS\\"","limit":10}',
  },
  {
    role: "assistant",
    content:
      "The search results includes the following pages: \n\n1. https://example.com/leap-kss",
    name: "Agent",
    tool_calls: [],
  },
  {
    role: "user",
    content:
      "Please summarize the following pages: \n\n1. https://example.com/leap-kss",
  },
];

// Sanitize the messages
const sanitizedMessages = messageSanitizer.sanitizeMessages(messages as any);

console.log("Original messages:", messages.length);
console.log("Sanitized messages:", sanitizedMessages.length);
console.log("\nSanitized result:");
console.log(JSON.stringify(sanitizedMessages, null, 2));

// // Example of using with LlamaHandler
// const handler = new LlamaHandler('https://api.llama.example.com/v1/chat/completions', 'your-api-key');

// // This would now work with Llama's single tool call constraint
// handler.handleChatCompletion({
//   messages: sanitizedMessages,
//   model: 'llama-3.2-1b-instruct',
//   temperature: 0.7
// }).then(response => {
//   console.log('Llama response:', response);
// }).catch(error => {
//   console.error('Error:', error);
// });
