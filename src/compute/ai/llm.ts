import Anthropic from '@anthropic-ai/sdk';
import { getTools } from './tools';
import { pdosMCPClient } from './mcpClient';
import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";

const systemContext = `
  You are a Health Agent that is able to use the tools provided to help guide the user through their health journey. The tools allow you to access the users health data.
`

export enum LLMResponseType {
  TrueOrFalse = "TRUE_OR_FALSE",
  Text = "TEXT"
}

const TrueOrFalse = z.object({
  type: z.literal("TRUE_OR_FALSE"),
  value: z.boolean()
})
const TrueOrFalseSchema = zodToJsonSchema(TrueOrFalse, "TrueOrFalse");

export default class LLM {
  private client: Anthropic
  private systemContext: string = ""
  private messages: any[] = []
  private tools: any[] = getTools()

  constructor(){
    this.client = new Anthropic({
      apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
    });
  }

  public async addToSystemContext(context: string): Promise<void> {
    this.systemContext += context
  }

  public async ask(
    message: string,
    responseType: LLMResponseType = LLMResponseType.Text
  ): Promise<string | undefined> {
    this.messages.push({
        role: 'user',
        content: `
          ${message}

          Please respond with json in the following format:
          ${responseType === LLMResponseType.TrueOrFalse ? `
            ${JSON.stringify(TrueOrFalseSchema)}
          ` : ""}
        `
    })

    const result = await this.completeChat(responseType)
    console.log("LLM Ask Result: ", result)
    return result
  }

  public async completeChat(responseType: LLMResponseType, isRetry: boolean = false): Promise<string | undefined> {
    console.log("\n\n\n\n\nmessages:", JSON.stringify(this.messages))
    const message: Anthropic.Message = await this.client.messages.create({
      max_tokens: 2024,
      model: 'claude-3-7-sonnet-latest',
      messages: this.messages,
      tools: this.tools,
      system: this.systemContext ?? systemContext,
      thinking: {
        type: 'enabled',
        budget_tokens: 1024
      }
    });

    console.log("message:", message)

    for (const content of message.content) {
      this.messages.push({
          role: 'assistant',
          content: [content]
        })
    }

    return await this.handleAnthropicResponse(message, responseType, isRetry)
  }

  private async handleAnthropicResponse(
    message: Anthropic.Message,
    responseType: LLMResponseType,
    isRetry: boolean = false
  ): Promise<any | undefined> {

    if (message.stop_reason === "tool_use") {
      const toolCall = message.content[message.content.length - 1] as Anthropic.ToolUseBlock
      const toolId = toolCall.id
      if (toolCall.type === "tool_use") {
        const toolResponse = await this.handleToolCall(toolCall)
        console.log("toolResponse:", toolResponse)
        if (toolResponse) {
          this.messages.push({
            role: 'user',
            content: [{
              type: "tool_result",
              tool_use_id: toolId,
              content: (toolResponse as any).content[0].text
            }] 
          })
          return this.completeChat(responseType)
        } else {
          this.messages.push({
            role: 'user',
            content: [{
              type: "tool_result",
              tool_use_id: toolId,
              content: "No data returned from tool call" 
            }] 
          })
          return this.completeChat(responseType)

        }
      }
    }

    if (message.content[0].type === "text") {
      const text = message.content[0].text
      const match = text.match(/{[\s\S]*}/);
      const jsonText = match ? match[0] : "";

      if (jsonText) {
        const json = JSON.parse(jsonText)
        if (responseType === LLMResponseType.TrueOrFalse) {
          return TrueOrFalse.parse(json)
        }

        return jsonText
      } else {
        if (isRetry) {
          return undefined
        }
        return this.completeChat(responseType, true)
      }

    } 

    return undefined;
  }

  private async handleToolCall(toolCall: Anthropic.ToolUseBlock): Promise<CallToolResult | undefined> {
    try {
      return await pdosMCPClient.callTool({
        name: toolCall.name,
        arguments: toolCall.input as { [x: string]: unknown; }
      })
    } catch (error) {

    }
  }

}