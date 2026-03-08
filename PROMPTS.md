# PROMPTS

This file exists because of the instructions from the Cloudflare AI App Assignment.
Optional Assignment Instructions:
```
We plan to fast track review of candidates who complete an assignment to build a type of AI-powered application on Cloudflare. An AI-powered application should include the following components:
- LLM (recommend using Llama 3.3 on Workers AI), or an external LLM of your choice
- Workflow / coordination (recommend using Workflows, Workers or Durable Objects)
- User input via chat or voice (recommend using Pages or Realtime)
- Memory or state
Find additional documentation here.

IMPORTANT NOTE:
To be considered, your repository name must be prefixed with cf_ai_, must include a README.md file with project documentation and clear running instructions to try out components (either locally or via deployed link). AI-assisted coding is encouraged, but you must include AI prompts used in PROMPTS.md
```
This file includes the records of the prompts used to drive the implementation of `Watchpoint` . Note that the prompts below are written as iterative instructions to a coding agent that assisted me during the realization of this project. In my everyday working life I leverage AI Agents (Codex is my daily driver to be specific) for discussing design choices, implementing plans, evaluating different approaches and tradeoffs. These tools are so powerful if used the right way and can be a big productivity boost as long as they're guided with detailed plans, validation criteria and testing. Agents need something to compare their output with, so TDD is crucial.

*********************************************************************************

I have initialized this repo (empty as of now, @resources.md only) and we'll build a Cloudflare-native project where we'll have to get the most out of Cloudflare developer tools, leveraging Cloudflare Agents, Workflows and more features that I will present you in detail.
the idea is a paid AI web monitoring agent, i.e. instead of selling raw model access (providing LLM inference is something everyone could do), we sell a higher-level outcome: “check this site, remember its baseline behavior, detect regressions over time, and return a structured report”. from the user pov: a user should be able to create a "watcher" for a public website, run a baseline scan, store state over time, trigger rescans, and detect visible regressions between runs.
it is crucial to use Cloudflare as the source of truth and use Cloudflare SDKs whenever possible (all resources provided in @resources.md):
- use Cloudflare Agents SDK for the main agent runtime
- use Durable Objects through Agents SDK for per-watch state
- use Cloudflare Workflows for baseline and rescan orchestration
- use Cloudflare Browser Rendering for runtime browsing
- use Workers AI for summaries (model tbd)
- use x402 protocol for paid HTTP and paid MCP access, that's how we'll cover expenses for inference
- expose a dashboard for human demo and visualization
- expose MCP tools so any other agent can buy the capability

implementation rules:
- TypeScript only
- no `any`
- no weak typing shortcuts
- model illegal states carefully
- keep the design small and explicit
- prefer pure helper functions for parsing and state transitions

Testing rules:
- work TDD-first
- start from failing integration tests against the Worker surface
- keep fixture-based capture for deterministic tests
- use local tests for fast confidence and keep heavier validation separate

let's move to plan mode and plan the work thoroughly. let's discuss design choices, evaluate pros and cons of each and potential bottlenecks. the goal here is to discuss together and have a well organized plan of action. ask questions, doubts, design choices, so we can discuss together


*********************************************************************************

current implementation is too close to a normal fetch-based scanner. Cloudflare offers a tool called browser rendering, which is perfect for our use case. we should leverage browser rendering to delegate the headless Chrome scans on Cloudflare. to do so, we need to refactor so runtime uses cloudflare Browser Rendering, not plain `fetch`. see docs here and acquire knowledge: https://developers.cloudflare.com/browser-rendering/
keep tests deterministic by preserving a separate fixture capture mode.

*********************************************************************************

awesome, all tests for the Browser rendering integration are passing and the implementation looks good to me. now, the orchestration is too trivial, we dont want to run rescans directly inside the Agent. instead we can leverage Cloudflare Workflows for executing the rescans remotely. note that the Agent should remain the source of truth for watch state, while the Workflows should take care of retries, waiting, and run execution. again, all needed documentation for workflows is provided in @resources.md
we also need to add tests asserting the following:
- watch creation queues baseline work
- manual rescan uses the same workflow path
- workflow results are persisted back into the Agent state

lets move to plan mode and organize the work carefully, review and discuss design choices before proceeding with the implemetnation

*********************************************************************************

the payment flow still feels prototype-level, we're lacking an actual payment challenge. it's crucial to be compliant to the x402 protocol: replace custom payment behavior with the official x402 flow for both HTTP and MCP. official documentation is very clear and provided in @resources.md . here's the checklist and criteria for this task, we need:
- paid HTTP watch creation must return a real `402` challenge when unpaid
- paid MCP tools must use the same pricing source of truth as HTTP
- keep a local dev bypass only for local testing, not as the main design
- make the response clearly show which tier and model were purchased

write tests before changing the payment layer. ask me any questions or design choices that you may encounter

*********************************************************************************

awesome, x402 seems to be fully implemented and compliant with the protocol standard. lets move to the next weak points to address: the watch state is not clear enough, we need to improve observability. the goal is that the UI and API can clearly distinguish between the following states and handle them accordingly:
- queued
- running
- waiting
- exhausted
- failed

note: do not add generic dashboards or fake observability. just expose the state we already have in a clean way.

*********************************************************************************

ive noticed the browser navigation logic is too naive and may end up being useless, it requires more rules. by doing so, the scans will be more targeted and effective. rules:
- prioritize same-origin links
- ignore fragment links and same-page variants
- avoid logout/account-style actions
- prefer meaningful CTAs like checkout, pricing, get started, docs, browse
- keep the logic simple and test it directly with small unit tests

i care more about stable behavior than clever heuristics. if you have suggestions on other useful rules we may adapt, feel free to propose them and we'll evaluate them

*********************************************************************************

the failure handling for browser navigation is too rough. there are so many things that could go wrong (timeouts, server errors, captchas/automation blocks). we need to improve the way we handle these and have a more tolerant failure behavior. here's a checklist:
- classify navigation timeout vs generic navigation failure vs extraction failure
- treat screenshot failure as a warning, not a full run failure
- preserve useful evidence if text extraction succeeded
- keep failed runs in history instead of hiding them

add tests that prove failure cases are modeled cleanly. before proceeding, let's discuss approaches and potential scenarios i might have missed. the goal is to plan a robust solution that is both reliable and tolerant for issues that may occurr during browser navigation

*********************************************************************************

we dont need no fancy ui for this project, but the dashboard still looks like a debug page. keep the same product shape, but make the UI reviewer-friendly:
- clear watch summary
- timeline of runs
- diff visibility
- screenshot availability
- visible workflow state

do not turn it into a generic admin panel. it should feel like a focused product demo. make use of frontend-design skill to avoid ai-slop-looking ui

*********************************************************************************

I want to extend the current testing suite wiwth a real end-to-end validation layer, but I do not want it mixed into the default test flow. add a local browser E2E suite for the dashboard using playwright (which is what CF Browser rendering does under the hood), but keep it manual and separate from `npm test`. my machine can't handle too many headless browser instances in parallel, so we have to make it lightweight:
- one worker only
- no parallel browser runs
- fixture mode only
- coverage: create watch, wait for baseline, trigger rescan, inspect diff

*********************************************************************************

e2e tests are all successful. now we also need a proof for MCP, which will be used by other AI agents. CF docs have a useful documentation showing how to test MCP servers: https://developers.cloudflare.com/agents/guides/test-remote-mcp-server/ . add a remote MCP validator script checking the following behaviors:
- connect to the deployed MCP endpoint
- list tools
- confirm unpaid paid-tool behavior
- run one paid watch creation with x402
- fetch the resulting watch status

*********************************************************************************

everything seems to work like a charm, we've made a lot of changes and architectural immprovements since the first demo. now we need to make sure the readme is aligned with our current implementation. perform ground-checking on the codebase and compare it with the readme architecture. for deep inspection of the codebase you can spawn an agent team working in parallel, with an orchestrator agent leading the work. specifically:
- align README with the real implementation
- remove stale architecture notes
- document safe default checks vs heavy manual validation
- explain who pays for inference and why our service is worth buying
- keep the language simple and practical

*********************************************************************************

the current frontend is too barebone. html/css/js was fine for the first prototype, but now it makes the demo look weaker than the actual backend. i want to migrate the UI to React while keeping the backend untouched. same Worker, same routes, same product behavior. do not redesign the app architecture on the server side: this is a frontend refactor, not a product rewrite. requirements:
- keep the existing Worker endpoints exactly as they are
- move from static html/js/css to React + TypeScript
- split the UI into components and hooks with clear responsibilities
- keep state management simple and local, no redux/zustand
- preserve the current flow:
  - fetch pricing
  - create a demo watch
  - poll watch detail
  - trigger manual rescan
  - show run timeline and diff
- make the UI strongly inspired by Cloudflare's design language, but do not copy their website
- use shadcn/ui where it helps with quality and speed (shadcn/ui skill may come in handy)
- use frontend-design skill to avoid generic ai-slop-looking UI
- use react best practices: typed props, small components, reusable hooks, no messy imperative DOM logic

testing/validation rules:
- work TDD-first where possible
- keep UI tests separate from Worker tests
- do not mix Playwright into the default test flow
- my machine is sensitive to memory pressure, so avoid starting heavy local servers unless really necessary

let's plan the migration carefully, discuss and define together the target component structure and the validation strategy, then implement it step by step

*********************************************************************************

the architecture diagram is not good enough. i do not want an embedded excalidraw or a generic flowchart-looking artifact. i want a custom diagram built directly in React, fully integrated in the /demo page, with a premium feel and coherent with the rest of the product. here's the direction:
- do not use mermaid or react-flow for the final rendering
- use cloudflare-branded svg marks where appropriate for Workers AI, Browser Rendering, Agents / Durable Objects, Workflows
- nodes must be clickable and open a clean popup with concise explanations
- explanations must stay simple:
  - what it is for
  - what it does
  - how it works in Watchpoint
- avoid dense technical text and avoid over-explaining
- connectors must be elegant and intentional, not random svg lines

use frontend-design skill and react best practices for this work. before implementing, reason carefully about the component model and the svg/layout strategy
