  /*
  Fetch data requested from the treatment

  const getRequestedData = async (dataRequest: string[]) => {
    const data: { [key: string]: any} = {}

    for (let dataName of dataRequest) {
      const dataGroupNode = await pdos().tree.userAccount.edges.e_out_DataManifest.getDataGroup(dataName)

      if (dataGroupNode) {
        data[dataName] = dataGroupNode._rawNode.records
      }
    }

    return data
  }
  const dataManifest = therapyBinaryNode._rawNode.data_manifest
  const requestedData = await getRequestedData(Object.keys(dataManifest));
  */



export default `({
    main: async function(api, input){

    
      const dataParsed = {}

      let inputDataParsed;
      try {
      inputDataParsed = Object.entries(input).map(([key, value]: any) => {
        dataParsed[key] = Object.entries(value).map(([date, record]) => {
  
          return {
            data: new Date(parseInt(date)),
            record,
          }
        })
      })
  
      } catch(e) {
        console.log("error: ", e)
        return
      }
  
      await api.llm.addSystemContext("You are an assitant that is helping the user with thier weight. They will send you data that has both the date and record value for step counts and body mass. Keep it short in your response.")
      const response = await api.llm.sendMessage("Hi this is my data so far: " + JSON.stringify(dataParsed) + ", how am i doing?")
  
      return {
        message: response
      }
    } 
    })`