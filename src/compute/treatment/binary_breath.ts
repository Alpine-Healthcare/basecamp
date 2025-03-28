export default ({
  main: async function({ llm }: any){
    const { value } = await llm.ask("Give a short breathing exercise.")
    return {
      type: "BREATH_EXERCISE",
      message: value
    }
  },
  
})