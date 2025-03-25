import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { clientTransport } from "./transport.js";

export const pdosMCPClient = new Client(
  {
    name: "PDOS",
    version: "1.0.0"
  },
  {
    capabilities: {
      prompts: {},
      resources: {},
      tools: {}
    }
  }
);

pdosMCPClient.connect(clientTransport);