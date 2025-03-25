import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { serverTransport } from "./transport";
import { z } from "zod";

export let pdosMCPServer: McpServer | null = null

export const startMcpServer = async () => {

  pdosMCPServer = new McpServer({
      name: "PDOS",
      version: "1.0.0",
      capabilities: {
        resources: {},
        prompts: {},
        tools: {}
      }
  });

  pdosMCPServer.tool(
    "get_records_for_today",
    { metric: z.string() },
    async ({ metric }: { metric: string }) => ({
        content: [{ type: "text", text: `Getting records for ${metric}` }]
    })
  );

  pdosMCPServer.connect(serverTransport);
};
