import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: "", // This is the default and can be omitted
});

export default class LLM {
  private messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

  constructor(){}

  public async addSystemContext(context: string){
    this.messages.push({
        role: 'system',
        content: context
    })
    await this.completeChat()
  }

  public async sendMessage(message: string){
    console.log("gettign called!!")
    this.messages.push({
        role: 'user',
        content: message
    })

    return await this.completeChat()
  }

  private async completeChat() {
    const chatCompletion = await client.chat.completions.create({
      messages: this.messages,
    model: 'gpt-3.5-turbo',
    });
    return chatCompletion.choices[0].message.content
  }


}