export default `({
  main: async function({ llm, data, intake }){

    await llm.addSystemContext("You are a health coach that gives advices based on the users health metrics for the given day.")
    const response = await llm.send("Get the users step_count for today")

    return {
      message: response,
    }
  } 

})`