export default `({
  main: async function({ llm, data, intake }){

    await llm.addSystemContext("Your are a guru who has mastered kriya yoga breathwork. You will guide the user through a kriya yoga breathwork session.")

    const response = await llm.sendMessage("Give an encouraging message before starting the session")

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