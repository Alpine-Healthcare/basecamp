export default ({
  main: async function({ llm }: any){

    const { value: checkInHappened } = await llm.ask("Was there an encounter for today", "TRUE_OR_FALSE")

    if (checkInHappened) {
      const sendOverview = false

      if (sendOverview) {
        return {
          type: "VIBES_OVERVIEW"
        }
      } else {
        return undefined
      }
    } else {
      return {
        encounter: {
          form: [
            {
              id: "ea19efee-1404-4caa-8143-423348aa8110",
              type: "radio",
              label: "How you feeling today?",
              options: [
                "Terrible",
                "Bad",
                "Same",
                "Good",
                "Great"
              ]
            }
          ],
          meta: {
            type: 'popup'
          }
        },
        type: "VIBES_CHECK_IN",
        message: "Hey there, checking in on the vibes. How you feeling?"
      }
    }

  },
  
})