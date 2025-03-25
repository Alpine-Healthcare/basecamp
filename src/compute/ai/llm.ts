import Anthropic from '@anthropic-ai/sdk';
import { getTools } from './tools';
import { pdosMCPClient } from './mcpClient';
export default class LLM {
  private client: Anthropic
  private messages: Anthropic.MessageParam[] = []
  private tools: any[] = getTools()

  constructor(){
    this.client = new Anthropic({
      apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
    });
  }

  public async addSystemContext(context: string): Promise<void> {
    this.messages.push({
      role: 'assistant',
      content: context
    })
  }

  public async send(message: string): Promise<string | undefined> {
    this.messages.push({
        role: 'user',
        content: message
    })

    return this.completeChat()
  }

  public async completeChat(): Promise<string | undefined> {
    const message: Anthropic.Message = await this.client.messages.create({
      max_tokens: 1024,
      model: 'claude-3-5-sonnet-20240620',
      messages: this.messages,
      tools: this.tools
    });

    console.log(message)
    return await this.handleAnthropicResponse(message)
  }

  private async handleAnthropicResponse(message: Anthropic.Message): Promise<string | undefined> {

    if (message.stop_reason === "tool_use") {
      const toolCall = message.content[message.content.length - 1] as Anthropic.ToolUseBlock
      if (toolCall.type === "tool_use") {
        return this.handleToolCall(toolCall)
      }
    }

    if (message.content[0].type === "text") {
      return message.content[0].text
    } 

    return undefined;
  }

  private async handleToolCall(toolCall: Anthropic.ToolUseBlock): Promise<string | undefined> {
    console.log("Got Tool CALL", toolCall)

    const result = await pdosMCPClient.callTool({
      name: toolCall.name,
      arguments: toolCall.input as { [x: string]: unknown; }
   })

    return "I don't know how to use that tool.";
  }

}