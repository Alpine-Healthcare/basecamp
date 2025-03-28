import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { serverTransport } from "./transport";
import { z } from "zod";
import { actions } from "@alpinehealthcare/pdos";

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

  // Dynamically create tools for each action in the actions object
  for (const category in actions) {
    if (Object.prototype.hasOwnProperty.call(actions, category)) {
      const categoryActions = actions[category as keyof typeof actions];
      
      if (categoryActions && typeof categoryActions === 'object') {
        for (const actionName in categoryActions) {
          if (Object.prototype.hasOwnProperty.call(categoryActions, actionName)) {
            // Use type assertion to avoid TypeScript errors
            const actionFunction = (categoryActions as any)[actionName];
            
            // Skip if not a function
            if (typeof actionFunction !== 'function') continue;

            if (!actionFunction.mcpEnabled) continue;

            const paramsSchema = actionFunction.parameters ? 
                Object.entries(actionFunction.parameters.properties || {}).reduce((acc, [key, value]) => {
                  console.log("key: ", key, "value: ", value)
                  // Convert JSON Schema types to Zod types
                  if ((value as any).type === "string") {
                    acc[key] = z.string();
                  } else if ((value as any).type === "number") {
                    acc[key] = z.number();
                  } else if ((value as any).type === "boolean") {
                    acc[key] = z.boolean();
                  } else {
                    // Default to any for complex types
                    acc[key] = z.any();
                  }
                  return acc;
                }, {} as Record<string, any>)
              : {};
            
            const toolName = `${category}_${actionName}`;
            
            pdosMCPServer.tool(
              toolName,
              paramsSchema,
              async (params: { params?: Record<string, any> }) => {
                try {
                  // Use Function type assertion for the action function
                  const func = actionFunction as (...args: any[]) => Promise<any>;
                  const result = await func(...Object.values(params));
                  return {
                    content: [{ 
                      type: "text", 
                      text: `${JSON.stringify(result)}` 
                    }]
                  };
                } catch (error: any) {
                  return {
                    content: [{ 
                      type: "text", 
                      text: `Error executing ${toolName}: ${error.message}` 
                    }]
                  };
                }
              }
            );
          }
        }
      }
    }
  }

  pdosMCPServer.connect(serverTransport);
};
