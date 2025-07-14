const messages = [
  { role: "user", content: "Search confluence for pages about Leap KSS" },
  {
    role: "assistant",
    content: "",
    name: "Agent",
    tool_calls: [
      {
        id: 'chat_completion:tool:execute_cql_search:{"cql":"text ~ \\Leap KSS\\"","limit":"10"}',
        type: "function",
        function: {
          name: "execute_cql_search",
          arguments: '{"cql":"text ~ \\Leap KSS\\"", "limit": "10"}',
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
        id: 'chat_completion:tool:execute_cql_search:{"cql":"text ~ \\Leap KSS\\"","limit":10}',
        type: "function",
        function: {
          name: "execute_cql_search",
          arguments: '{"cql":"text ~ \\Leap KSS\\"", "limit": 10}',
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
  {
    role: "user",
    content:
      "Please summarize the following pages: \n\n1. https://example.com/leap-kss",
  },
  {
    role: "user",
    content:
      "Please summarize the following pages: \n\n1. https://example.com/leap-kss",
  },
  {
    role: "user",
    content:
      "Please summarize the following pages: \n\n1. https://example.com/leap-kss",
  },
  {
    role: "user",
    content:
      "Please summarize the following pages: \n\n1. https://example.com/leap-kss",
  },
];
