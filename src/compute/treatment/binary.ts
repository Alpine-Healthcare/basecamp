export default `({
  main: async function({ llm, data, intake }){

    await llm.addSystemContext("You are a weight loss assistant that guides the user through their weight loss journey.Your role should be a combination of a nutritionist, personal trainer, and friend.")

    const response = await llm.sendMessage("Hi this is my data so far: " + JSON.stringify(data) + ", give me some advice on what to do today based on my data for the week")

    if (response.toLowerCase() === "no") {
      return {
        message: undefined,
      }
    }


    return {
      message: response,
    }
  } 

})`