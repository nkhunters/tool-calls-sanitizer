import { messageSanitizer } from "./utils/messageSanitizer";

// Complex test cases to demonstrate production-ready edge case handling
const complexTestCases = {
  // Test Case 1: Multiple completed tool calls in single message
  multipleCompletedToolCalls: [
    { role: "user", content: "Search for both 'AI' and 'ML' topics" },
    {
      role: "assistant",
      content: "",
      name: "Agent",
      tool_calls: [
        {
          id: "search_ai",
          type: "function",
          function: {
            name: "execute_cql_search",
            arguments: '{"cql":"text ~ \\"AI\\"", "limit": 5}',
          },
        },
        {
          id: "search_ml",
          type: "function",
          function: {
            name: "execute_cql_search",
            arguments: '{"cql":"text ~ \\"ML\\"", "limit": 5}',
          },
        },
      ],
    },
    {
      role: "tool",
      content: '{"results": [{"id": "ai1", "title": "AI Basics"}]}',
      name: "execute_cql_search",
      tool_call_id: "search_ai",
    },
    {
      role: "tool",
      content: '{"results": [{"id": "ml1", "title": "ML Fundamentals"}]}',
      name: "execute_cql_search",
      tool_call_id: "search_ml",
    },
    {
      role: "user",
      content: "Now get the content of both pages",
    },
    {
      role: "assistant",
      content: "",
      name: "Agent",
      tool_calls: [
        {
          id: "get_ai_content",
          type: "function",
          function: {
            name: "get_page_content",
            arguments: '{"page_id": "ai1"}',
          },
        },
      ],
    },
  ],

  // Test Case 2: Duplicate messages + tool calls with retries
  duplicatesWithRetries: [
    { role: "user", content: "Search for Python tutorials" },
    {
      role: "assistant",
      content: "",
      name: "Agent",
      tool_calls: [
        {
          id: "python_search_1",
          type: "function",
          function: {
            name: "execute_cql_search",
            arguments: '{"cql":"text ~ \\"Python\\"", "limit": "10"}', // String limit - will fail
          },
        },
      ],
    },
    {
      role: "tool",
      content: "Error: limit must be a number",
      name: "execute_cql_search",
      tool_call_id: "python_search_1",
    },
    {
      role: "assistant",
      content: "",
      name: "Agent",
      tool_calls: [
        {
          id: "python_search_2",
          type: "function",
          function: {
            name: "execute_cql_search",
            arguments: '{"cql":"text ~ \\"Python\\"", "limit": 10}', // Fixed - number limit
          },
        },
      ],
    },
    {
      role: "tool",
      content: '{"results": [{"id": "py1", "title": "Python Tutorial"}]}',
      name: "execute_cql_search",
      tool_call_id: "python_search_2",
    },
    { role: "user", content: "Great! Now summarize the tutorial" },
    { role: "user", content: "Great! Now summarize the tutorial" }, // Duplicate 1
    { role: "user", content: "Great! Now summarize the tutorial" }, // Duplicate 2
    { role: "user", content: "Great! Now summarize the tutorial" }, // Duplicate 3
  ],

  // Test Case 3: Edge cases and malformed data
  edgeCases: [
    { role: "user", content: "Test edge cases" },
    {
      role: "assistant",
      content: "",
      name: "Agent",
      tool_calls: [
        {
          id: "malformed_json",
          type: "function",
          function: {
            name: "web_search",
            arguments: '{"query": "test", "invalid": }', // Invalid JSON
          },
        },
      ],
    },
    {
      role: "tool",
      content: "Error: Invalid JSON in request",
      name: "web_search",
      tool_call_id: "malformed_json",
    },
    // Empty content message
    { role: "assistant", content: "", name: "Agent" },
    // Orphaned tool response (no matching tool call)
    {
      role: "tool",
      content: "This is an orphaned response",
      name: "unknown_tool",
      tool_call_id: "non_existent_call",
    },
    // Missing tool_call_id
    {
      role: "tool",
      content: "Response without tool_call_id",
      name: "some_tool",
    },
    {
      role: "assistant",
      content: "",
      name: "Agent",
      tool_calls: [
        {
          id: "valid_call",
          type: "function",
          function: {
            name: "get_page_content",
            arguments: '{"page_id": "test123"}',
          },
        },
      ],
    },
  ],

  // Test Case 4: Large conversation with mixed scenarios
  largeConversation: [
    { role: "user", content: "Help me research machine learning" },
    {
      role: "assistant",
      content: "",
      name: "Agent",
      tool_calls: [
        {
          id: "ml_search",
          type: "function",
          function: {
            name: "execute_cql_search",
            arguments: '{"cql":"text ~ \\"machine learning\\"", "limit": 5}',
          },
        },
      ],
    },
    {
      role: "tool",
      content:
        '{"results": [{"id": "ml1", "title": "ML Intro"}, {"id": "ml2", "title": "ML Algorithms"}]}',
      name: "execute_cql_search",
      tool_call_id: "ml_search",
    },
    {
      role: "assistant",
      content: "Found 2 ML articles. Let me get their content.",
      name: "Agent",
      tool_calls: [
        {
          id: "get_ml1",
          type: "function",
          function: {
            name: "get_page_content",
            arguments: '{"page_id": "ml1"}',
          },
        },
        {
          id: "get_ml2",
          type: "function",
          function: {
            name: "get_page_content",
            arguments: '{"page_id": "ml2"}',
          },
        },
      ],
    },
    {
      role: "tool",
      content: "ML Intro content here...",
      name: "get_page_content",
      tool_call_id: "get_ml1",
    },
    {
      role: "tool",
      content: "ML Algorithms content here...",
      name: "get_page_content",
      tool_call_id: "get_ml2",
    },
    {
      role: "assistant",
      content: "Based on the articles, here's what I found about ML...",
      name: "Agent",
    },
    { role: "user", content: "Now search for deep learning" },
    { role: "user", content: "Now search for deep learning" }, // Duplicate
    {
      role: "assistant",
      content: "",
      name: "Agent",
      tool_calls: [
        {
          id: "dl_search",
          type: "function",
          function: {
            name: "web_search",
            arguments: '{"query": "deep learning tutorial"}',
          },
        },
      ],
    },
  ],
};

// Test all scenarios
console.log("=== COMPLEX PRODUCTION TEST CASES ===\\n");

Object.entries(complexTestCases).forEach(([testName, messages]) => {
  console.log(`\\n--- ${testName.toUpperCase()} ---`);
  console.log(`Original messages: ${messages.length}`);

  try {
    const sanitized = messageSanitizer.sanitizeMessages(messages);
    console.log(`Sanitized messages: ${sanitized.length}`);

    // Check for single tool call constraint
    const toolCallMessages = sanitized.filter(
      (msg) =>
        msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0
    );

    const hasMultipleToolCalls = toolCallMessages.some(
      (msg) => msg.tool_calls && msg.tool_calls.length > 1
    );

    console.log(
      `✅ Single tool call constraint: ${
        !hasMultipleToolCalls ? "PASSED" : "FAILED"
      }`
    );

    // Show first few sanitized messages
    console.log("\\nFirst few sanitized messages:");
    sanitized.slice(0, 3).forEach((msg, i) => {
      console.log(
        `${i + 1}. [${msg.role}] ${
          msg.content?.substring(0, 50) || "No content"
        }${msg.tool_calls ? ` (${msg.tool_calls.length} tool calls)` : ""}`
      );
    });
  } catch (error) {
    console.error(`❌ Error in ${testName}:`, error.message);
  }
});

// Performance test with very large conversation
console.log("\\n=== PERFORMANCE TEST ===");
const largeConversation = [];
for (let i = 0; i < 100; i++) {
  largeConversation.push({ role: "user", content: `Message ${i}` });
  largeConversation.push({ role: "assistant", content: `Response ${i}` });
}

const startTime = Date.now();
const result = messageSanitizer.sanitizeMessages(largeConversation);
const endTime = Date.now();

console.log(
  `Processed ${largeConversation.length} messages in ${endTime - startTime}ms`
);
console.log(`Result: ${result.length} messages`);
console.log(
  `✅ Performance: ${
    endTime - startTime < 100 ? "GOOD" : "SLOW"
  } (< 100ms expected)`
);

export { complexTestCases, messageSanitizer };
