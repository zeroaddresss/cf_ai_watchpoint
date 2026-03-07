# Cloudflare Docs Index

Source-of-truth reference index for `Watchpoint`.

## 0. Current implementation touchpoints

The current codebase most directly depends on these Cloudflare docs:
- [Agents overview](https://developers.cloudflare.com/agents/)
- [Agents API](https://developers.cloudflare.com/agents/api-reference/agents-api/)
- [Run Workflows](https://developers.cloudflare.com/agents/api-reference/run-workflows/)
- [Browse the web](https://developers.cloudflare.com/agents/api-reference/browse-the-web/)
- [Using AI Models](https://developers.cloudflare.com/agents/api-reference/using-ai-models/)
- [Testing your Agents](https://developers.cloudflare.com/agents/getting-started/testing-your-agent/)
- [Test a Remote MCP Server](https://developers.cloudflare.com/agents/guides/test-a-remote-mcp-server/)
- [x402 overview](https://developers.cloudflare.com/agents/x402/)
- [Charge for HTTP content](https://developers.cloudflare.com/agents/x402/charge-for-http-content/)
- [Charge for MCP tools](https://developers.cloudflare.com/agents/x402/charge-mcp-tools/)
- [Workers AI GLM 4.7 Flash model page](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/)
- [Browser Rendering](https://developers.cloudflare.com/browser-rendering/)

Safe validation references:
- [Testing your Agents](https://developers.cloudflare.com/agents/getting-started/testing-your-agent/)
- [Test a Remote MCP Server](https://developers.cloudflare.com/agents/guides/test-a-remote-mcp-server/)
- [Run Workflows](https://developers.cloudflare.com/agents/api-reference/run-workflows/)

## 1. Cloudflare Agents landing

Primary landing page:
- [agents.cloudflare.com](https://agents.cloudflare.com/)

Main landing-page paths and linked product references:
- [Get Started](https://dash.cloudflare.com/)
- [View Docs](https://developers.cloudflare.com/agents/)
- [Email Workers](https://developers.cloudflare.com/email-routing/email-workers/)
- [WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Workers](https://developers.cloudflare.com/workers/)
- [Calls](https://developers.cloudflare.com/calls/)
- [Workers AI](https://developers.cloudflare.com/workers-ai/)
- [AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Workflows](https://developers.cloudflare.com/workflows/)
- [MCP servers](https://developers.cloudflare.com/agents/model-context-protocol/tools/)
- [Browser Rendering](https://developers.cloudflare.com/browser-rendering/)
- [Vectorize](https://developers.cloudflare.com/vectorize/)
- [D1](https://developers.cloudflare.com/d1/)

Landing-page concepts worth keeping in mind:
- CPU-time billing vs wall-time billing for agentic workloads
- Durable Objects + WebSocket hibernation as the state/runtime substrate
- Full-stack agent pattern: input -> LLM -> execution -> tools

## 2. Cloudflare Agents docs

Docs root:
- [Agents overview](https://developers.cloudflare.com/agents/)

### Getting started

- [Quick start](https://developers.cloudflare.com/agents/getting-started/quick-start/)
- [Add to existing project](https://developers.cloudflare.com/agents/getting-started/add-to-existing-project/)
- [Testing your Agents](https://developers.cloudflare.com/agents/getting-started/testing-your-agent/)
- [Build a chat agent](https://developers.cloudflare.com/agents/getting-started/build-a-chat-agent/)
- [Prompt an AI model](https://developers.cloudflare.com/workers-ai/guides/prompting/)

### Concepts

- [What are agents?](https://developers.cloudflare.com/agents/concepts/what-are-agents/)
- [Workflows](https://developers.cloudflare.com/agents/concepts/workflows/)
- [Tools](https://developers.cloudflare.com/agents/concepts/tools/)
- [Agent class internals](https://developers.cloudflare.com/agents/concepts/agent-class-internals/)
- [Human in the Loop](https://developers.cloudflare.com/agents/concepts/human-in-the-loop/)
- [Calling LLMs](https://developers.cloudflare.com/agents/concepts/calling-llms/)
- [Patterns](https://developers.cloudflare.com/agents/patterns/)

### Guides

- [Human-in-the-loop patterns](https://developers.cloudflare.com/agents/guides/human-in-the-loop-patterns/)
- [Webhooks](https://developers.cloudflare.com/agents/guides/webhooks/)
- [Build a Slack Agent](https://developers.cloudflare.com/agents/guides/build-a-slack-agent/)
- [Build an Interactive ChatGPT App](https://developers.cloudflare.com/agents/guides/build-an-interactive-chatgpt-app/)
- [Build a Remote MCP server](https://developers.cloudflare.com/agents/guides/build-a-remote-mcp-server/)
- [Test a Remote MCP Server](https://developers.cloudflare.com/agents/guides/test-a-remote-mcp-server/)
- [Securing MCP servers](https://developers.cloudflare.com/agents/guides/securing-mcp-servers/)
- [Connect to an MCP server](https://developers.cloudflare.com/agents/guides/connect-to-an-mcp-server/)
- [Handle OAuth with MCP servers](https://developers.cloudflare.com/agents/guides/handle-oauth-with-mcp-servers/)
- [Cross-domain authentication](https://developers.cloudflare.com/agents/guides/cross-domain-authentication/)
- [Implement Effective Agent Patterns](https://github.com/cloudflare/agents/tree/main/examples/patterns)
- [Build a Remote MCP Client](https://github.com/cloudflare/agents/tree/main/examples/remote-mcp-client)

### API reference

- [API reference index](https://developers.cloudflare.com/agents/api-reference/)
- [Agents API](https://developers.cloudflare.com/agents/api-reference/agents-api/)
- [Routing](https://developers.cloudflare.com/agents/api-reference/calling-agents/)
- [Configuration](https://developers.cloudflare.com/agents/api-reference/configuration/)
- [Chat agents](https://developers.cloudflare.com/agents/api-reference/chat-agents/)
- [Client SDK](https://developers.cloudflare.com/agents/api-reference/client-sdk/)
- [Callable methods](https://developers.cloudflare.com/agents/api-reference/callable-methods/)
- [Store and sync state](https://developers.cloudflare.com/agents/api-reference/store-and-sync-state/)
- [Readonly connections](https://developers.cloudflare.com/agents/api-reference/readonly-connections/)
- [WebSockets](https://developers.cloudflare.com/agents/api-reference/using-websockets/)
- [HTTP and Server-Sent Events](https://developers.cloudflare.com/agents/api-reference/http-sse/)
- [Protocol messages](https://developers.cloudflare.com/agents/api-reference/protocol-messages/)
- [Schedule tasks](https://developers.cloudflare.com/agents/api-reference/schedule-tasks/)
- [Queue tasks](https://developers.cloudflare.com/agents/api-reference/queue-tasks/)
- [Retries](https://developers.cloudflare.com/agents/api-reference/retries/)
- [createMcpHandler](https://developers.cloudflare.com/agents/api-reference/create-mcp-handler/)
- [McpAgent](https://developers.cloudflare.com/agents/api-reference/mcp-agent/)
- [McpClient](https://developers.cloudflare.com/agents/api-reference/mcp-client/)
- [Run Workflows](https://developers.cloudflare.com/agents/api-reference/run-workflows/)
- [Using AI Models](https://developers.cloudflare.com/agents/api-reference/using-ai-models/)
- [Retrieval Augmented Generation](https://developers.cloudflare.com/agents/api-reference/rag/)
- [Browse the web](https://developers.cloudflare.com/agents/api-reference/browse-the-web/)
- [Email routing](https://developers.cloudflare.com/agents/api-reference/email-routing/)
- [getCurrentAgent()](https://developers.cloudflare.com/agents/api-reference/get-current-agent/)
- [Observability](https://developers.cloudflare.com/agents/api-reference/observability/)
- [Codemode](https://developers.cloudflare.com/agents/api-reference/codemode/)

### MCP

- [MCP overview](https://developers.cloudflare.com/agents/model-context-protocol/)
- [MCP tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/)
- [MCP authorization](https://developers.cloudflare.com/agents/model-context-protocol/authorization/)
- [MCP transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/)
- [MCP governance](https://developers.cloudflare.com/agents/model-context-protocol/governance/)
- [MCP server portals](https://developers.cloudflare.com/mcp/)
- [Cloudflare's own MCP servers](https://developers.cloudflare.com/agents/model-context-protocol/cloudflare-mcp-servers/)

### x402

- [x402 overview](https://developers.cloudflare.com/agents/x402/)
- [Charge for HTTP content](https://developers.cloudflare.com/agents/x402/charge-for-http-content/)
- [Charge for MCP tools](https://developers.cloudflare.com/agents/x402/charge-mcp-tools/)
- [Pay from Agents SDK](https://developers.cloudflare.com/agents/x402/pay-from-agents-sdk/)
- [Pay from coding tools](https://developers.cloudflare.com/agents/x402/pay-from-coding-tools/)

### Platform and machine-readable resources

- [Agents limits](https://developers.cloudflare.com/agents/platform/limits/)
- [Prompt engineering](https://developers.cloudflare.com/workers-ai/guides/prompting/)
- [Agents prompt.txt](https://developers.cloudflare.com/agents/prompt.txt)
- [Agents llms.txt](https://developers.cloudflare.com/agents/llms.txt)
- [Agents llms-full.txt](https://developers.cloudflare.com/agents/llms-full.txt)
- [Developer Platform llms-full.txt](https://developers.cloudflare.com/llms-full.txt)

## 3. Cloudflare AI Gateway docs

Docs root:
- [AI Gateway overview](https://developers.cloudflare.com/ai-gateway/)

### Getting started

- [Get started](https://developers.cloudflare.com/ai-gateway/get-started/)

### Using AI Gateway

- [Unified API (OpenAI-compatible)](https://developers.cloudflare.com/ai-gateway/usage/universal/)
- [Workers AI provider](https://developers.cloudflare.com/ai-gateway/providers/workers-ai/)
- [Amazon Bedrock provider](https://developers.cloudflare.com/ai-gateway/providers/bedrock/)
- [Anthropic provider](https://developers.cloudflare.com/ai-gateway/providers/anthropic/)
- [Azure OpenAI provider](https://developers.cloudflare.com/ai-gateway/providers/azure-openai/)
- [Baseten provider](https://developers.cloudflare.com/ai-gateway/providers/baseten/)
- [Cartesia provider](https://developers.cloudflare.com/ai-gateway/providers/cartesia/)
- [Cerebras provider](https://developers.cloudflare.com/ai-gateway/providers/cerebras/)
- [Cohere provider](https://developers.cloudflare.com/ai-gateway/providers/cohere/)
- [Deepgram provider](https://developers.cloudflare.com/ai-gateway/providers/deepgram/)
- [DeepSeek provider](https://developers.cloudflare.com/ai-gateway/providers/deepseek/)
- [ElevenLabs provider](https://developers.cloudflare.com/ai-gateway/providers/elevenlabs/)
- [Fal AI provider](https://developers.cloudflare.com/ai-gateway/providers/fal-ai/)
- [Google AI Studio provider](https://developers.cloudflare.com/ai-gateway/providers/google-ai-studio/)
- [Google Vertex AI provider](https://developers.cloudflare.com/ai-gateway/providers/google-vertex-ai/)
- [Groq provider](https://developers.cloudflare.com/ai-gateway/providers/groq/)
- [HuggingFace provider](https://developers.cloudflare.com/ai-gateway/providers/huggingface/)
- [Ideogram provider](https://developers.cloudflare.com/ai-gateway/providers/ideogram/)
- [Mistral AI provider](https://developers.cloudflare.com/ai-gateway/providers/mistral/)
- [OpenAI provider](https://developers.cloudflare.com/ai-gateway/providers/openai/)
- [OpenRouter provider](https://developers.cloudflare.com/ai-gateway/providers/openrouter/)
- [Parallel provider](https://developers.cloudflare.com/ai-gateway/providers/parallel/)
- [Perplexity provider](https://developers.cloudflare.com/ai-gateway/providers/perplexity/)
- [Replicate provider](https://developers.cloudflare.com/ai-gateway/providers/replicate/)
- [xAI provider](https://developers.cloudflare.com/ai-gateway/providers/xai/)

### WebSockets API

- [WebSockets API overview](https://developers.cloudflare.com/ai-gateway/usage/websockets-api/)
- [Realtime WebSockets API](https://developers.cloudflare.com/ai-gateway/usage/websockets-api/realtime-api/)
- [Non-realtime WebSockets API](https://developers.cloudflare.com/ai-gateway/usage/websockets-api/non-realtime-api/)

### Features

- [Features overview](https://developers.cloudflare.com/ai-gateway/features/)
- [Unified Billing](https://developers.cloudflare.com/ai-gateway/features/unified-billing/)
- [Caching](https://developers.cloudflare.com/ai-gateway/features/caching/)
- [Rate limiting](https://developers.cloudflare.com/ai-gateway/features/rate-limiting/)
- [Dynamic routing overview](https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/)
- [Using a dynamic route](https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/using/)
- [Dynamic routing JSON configuration](https://developers.cloudflare.com/ai-gateway/features/dynamic-routing/json-configuration/)
- [DLP overview](https://developers.cloudflare.com/ai-gateway/features/data-loss-prevention/)
- [Set up DLP](https://developers.cloudflare.com/ai-gateway/features/data-loss-prevention/setup/)
- [Guardrails overview](https://developers.cloudflare.com/ai-gateway/features/guardrails/)
- [Set up Guardrails](https://developers.cloudflare.com/ai-gateway/features/guardrails/setup/)
- [Guardrails supported model types](https://developers.cloudflare.com/ai-gateway/features/guardrails/model-types/)
- [Guardrails usage considerations](https://developers.cloudflare.com/ai-gateway/features/guardrails/usage-considerations/)

### Configuration

- [BYOK / Store Keys](https://developers.cloudflare.com/ai-gateway/configuration/byok/)
- [Custom costs](https://developers.cloudflare.com/ai-gateway/configuration/custom-costs/)
- [Custom Providers](https://developers.cloudflare.com/ai-gateway/configuration/custom-providers/)
- [Manage gateways](https://developers.cloudflare.com/ai-gateway/configuration/manage-gateway/)
- [Request handling](https://developers.cloudflare.com/ai-gateway/configuration/request-handling/)
- [Authenticated gateway](https://developers.cloudflare.com/ai-gateway/configuration/authenticated-gateway/)

### Observability

- [Costs](https://developers.cloudflare.com/ai-gateway/observability/costs/)
- [Custom metadata](https://developers.cloudflare.com/ai-gateway/observability/custom-metadata/)
- [OpenTelemetry](https://developers.cloudflare.com/ai-gateway/observability/opentelemetry/)
- [Analytics](https://developers.cloudflare.com/ai-gateway/observability/analytics/)
- [Logging overview](https://developers.cloudflare.com/ai-gateway/observability/logging/)
- [Workers Logpush](https://developers.cloudflare.com/ai-gateway/observability/logging/logpush/)

### Integrations

- [Vercel AI SDK](https://developers.cloudflare.com/ai-gateway/integrations/vercel-ai-sdk/)
- [Agents](https://developers.cloudflare.com/ai-gateway/integrations/agents/)
- [AI Gateway Binding Methods](https://developers.cloudflare.com/ai-gateway/integrations/binding-methods/)
- [Workers AI](https://developers.cloudflare.com/ai-gateway/integrations/workers-ai/)

### Platform and utilities

- [Platform overview](https://developers.cloudflare.com/ai-gateway/reference/)
- [Limits](https://developers.cloudflare.com/ai-gateway/platform/limits/)
- [Pricing](https://developers.cloudflare.com/ai-gateway/platform/pricing/)
- [Audit logs](https://developers.cloudflare.com/ai-gateway/platform/audit-logs/)
- [Changelog](https://developers.cloudflare.com/ai-gateway/changelog/)
- [Header glossary](https://developers.cloudflare.com/ai-gateway/reference/headers/)
- [REST API reference](https://developers.cloudflare.com/api/resources/ai_gateway/)
- [AI Gateway MCP server](https://github.com/cloudflare/ai-gateway-mcp)
- [AI Assistant](https://developers.cloudflare.com/ai-gateway/ai-assistant/)
- [Architectures](https://developers.cloudflare.com/ai-gateway/architectures/)

### Machine-readable resources

- [AI Gateway llms.txt](https://developers.cloudflare.com/ai-gateway/llms.txt)
- [AI Gateway prompt.txt](https://developers.cloudflare.com/ai-gateway/prompt.txt)
- [AI Gateway llms-full.txt](https://developers.cloudflare.com/ai-gateway/llms-full.txt)
- [Developer Platform llms-full.txt](https://developers.cloudflare.com/llms-full.txt)

## 4. Closest adjacent Cloudflare docs for this project

These are not part of the requested three roots, but they are the most likely supporting references we will need while implementing:
- [Workers](https://developers.cloudflare.com/workers/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Durable Objects](https://developers.cloudflare.com/durable-objects/)
- [Browser Rendering](https://developers.cloudflare.com/browser-rendering/)
- [Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Workers AI model catalog](https://developers.cloudflare.com/workers-ai/models/)
- [Workers AI GLM 4.7 Flash model page](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/)
- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Workflows](https://developers.cloudflare.com/workflows/)
- [Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)

## 5. Suggested development order

When implementing `Watchpoint`, the most useful sequence is:
- Agents overview -> Quick start -> Add to existing project -> Testing your Agents
- Agents API -> Store and sync state -> Schedule tasks -> Using AI Models -> Browse the web
- x402 overview -> HTTP content -> MCP tools -> Pay from Agents SDK
- AI Gateway get started -> Integrations/Agents -> Request handling -> Costs/Analytics/Logging
