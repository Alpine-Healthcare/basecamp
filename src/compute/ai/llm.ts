import OpenAI from 'openai';


export default class LLM {
  private client: any
  private messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

  constructor(){
    this.client = new OpenAI({
      apiKey: process.env.OPEN_API_KEY 
    });
  }

  public async addSystemContext(context: string){
    this.messages.push({
      role: 'system',
      content: context
    })
    await this.completeChat()
  }

  public async sendMessage(message: string){
    this.messages.push({
        role: 'user',
        content: message
    })

    return await this.completeChat()
  }

  private async completeChat() {
    const chatCompletion = await this.client.chat.completions.create({
      messages: this.messages,
      model: 'gpt-3.5-turbo',
    });
    return chatCompletion.choices[0].message.content
  }


}