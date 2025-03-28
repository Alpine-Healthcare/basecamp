export default ({
  main: async function({ llm }: any){
    //const { value } = await llm.ask("Tell me some words of encouragement for maintaining physical health, keep it short and sweet.")
    return {
      type: "ENCOURAGEMENT",
      message: "You're doing great! Keep up the good work!"
    }
  },
  
})