import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createx402MCPClient, isPaymentRequiredError } from "@x402/mcp";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const mcpUrl = readRequiredEnv("WATCHPOINT_MCP_URL");
const privateKey = readRequiredEnv("WATCHPOINT_X402_PRIVATE_KEY");
const targetUrl = process.env.WATCHPOINT_REMOTE_TARGET_URL ?? "https://example.com";
const network = process.env.WATCHPOINT_X402_NETWORK ?? "eip155:84532";

await verifyUnpaidFlow(mcpUrl);
await verifyPaidFlow(mcpUrl, privateKey, network, targetUrl);

console.log("Remote MCP smoke validation passed.");

async function verifyUnpaidFlow(mcpUrl) {
	const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));
	const client = new Client({
		name: "watchpoint-remote-smoke",
		version: "0.0.0",
	});

	try {
		await client.connect(transport);
		const listedTools = await client.listTools();
		const toolNames = listedTools.tools.map((tool) => tool.name).sort();
		assertSubset(toolNames, [
			"create_watch_premium",
			"create_watch_standard",
			"get_watch_status",
			"list_pricing",
		]);
		console.log("Discovered tools:", toolNames.join(", "));

		try {
			await client.callTool({
				name: "create_watch_standard",
				arguments: { targetUrl },
			});
			throw new Error("Expected unpaid create_watch_standard to require payment.");
		} catch (error) {
			if (!isPaymentRequiredError(error)) {
				throw error;
			}

			console.log("Unpaid tool call returned payment required as expected.");
		}
	} finally {
		await client.close();
	}
}

async function verifyPaidFlow(mcpUrl, privateKey, network, targetUrl) {
	const account = privateKeyToAccount(privateKey);
	const client = createx402MCPClient({
		name: "watchpoint-paid-smoke",
		version: "0.0.0",
		schemes: [
			{
				network,
				client: new ExactEvmScheme(account),
			},
		],
		autoPayment: true,
		onPaymentRequested: ({ paymentRequired }) => {
			const firstOption = paymentRequired.accepts[0];
			console.log(`Approving payment request for ${firstOption?.amount ?? "unknown amount"}.`);
			return true;
		},
	});
	const transport = new StreamableHTTPClientTransport(new URL(mcpUrl));

	try {
		await client.connect(transport);
		const createResult = await client.callTool("create_watch_standard", { targetUrl });
		if (!createResult.paymentMade) {
			throw new Error("Expected paid MCP tool call to settle a payment.");
		}

		const createdWatch = parseToolJson(extractTextContent(createResult.content));
		const watchId = readWatchId(createdWatch);
		console.log(`Created watch ${watchId}.`);

		const statusResult = await client.callTool("get_watch_status", { watchId });
		const statusPayload = parseToolJson(extractTextContent(statusResult.content));
		const returnedWatchId = readWatchId(statusPayload);
		if (returnedWatchId !== watchId) {
			throw new Error(`Expected watch id ${watchId}, received ${returnedWatchId}.`);
		}

		console.log("Paid tool execution and follow-up status lookup succeeded.");
	} finally {
		await client.close();
	}
}

function extractTextContent(content) {
	const textItem = content.find((item) => item.type === "text" && typeof item.text === "string");
	if (textItem === undefined) {
		throw new Error("Tool response did not include text content.");
	}

	return textItem.text;
}

function parseToolJson(text) {
	try {
		return JSON.parse(text);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown JSON parse error";
		throw new Error(`Failed to parse tool response JSON: ${message}`);
	}
}

function readWatchId(payload) {
	if (!isRecord(payload) || !isRecord(payload.watch) || typeof payload.watch.id !== "string") {
		throw new Error("Tool response did not contain a watch id.");
	}

	return payload.watch.id;
}

function assertSubset(actualValues, expectedValues) {
	for (const expectedValue of expectedValues) {
		if (!actualValues.includes(expectedValue)) {
			throw new Error(`Missing expected tool "${expectedValue}".`);
		}
	}
}

function readRequiredEnv(name) {
	const value = process.env[name];
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Missing required environment variable ${name}.`);
	}

	return value;
}

function isRecord(value) {
	return typeof value === "object" && value !== null;
}
