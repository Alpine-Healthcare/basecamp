import * as ts from "typescript";
import LLM from "../ai/llm";

import * as pdosImport from "@alpinehealthcare/pdos";
import binary from "./binary";
import { CommInstance } from "../../comm";
import axios from "axios";
const pdos = pdosImport.default.default

const useTestExecutionBinary = true
const getExecutionBinary = async (therapyBinaryNode: any) => {
  if (useTestExecutionBinary) {
    return binary
  } else {
    const executionBinary = await axios.get("/pdos?return_raw=True&hash=" +therapyBinaryNode._rawNode.execution_binary)
    if (!executionBinary) {
      throw new Error("No execution binary found")
    }
  }
}

const getRequestedData = async (dataRequest: string[]) => {
  const data: { [key: string]: any} = {}

  for (let dataName of dataRequest) {
    const dataGroupNode = await pdos().tree.userAccount.edges.e_out_DataManifest.getDataGroup(dataName)

    if (dataGroupNode) {
      data[dataName] = dataGroupNode._rawNode.records
    }
  }

  const requestedDataParsed: any = {}

  Object.entries(data).map(([key, value]: any) => {
    requestedDataParsed[key] = Object.entries(value).map(([date, record]) => {
      return {
        data: new Date(parseInt(date)),
        record,
      }
    })
  })

  return data
}

const messages = [ 
  {
    sender: "Running Coach",
    message: "Try to run 3 miles either today or tomorrow to stay on track"
  },
  {
    sender: "Weight Watcher",
    message: "Looking good this week! You've been averaging 2100 calories a day which is great. Paired with your activity so far you could plan for a cheat day this Friday!"
  }
]

export const handleBinaryOutput = async (treatmentNode: any, retVal: any) => {
  await treatmentNode.addInstance([retVal.message])
  for (let i = 0; i< messages.length; i++) { 
    await pdos().tree.root.edges.e_out_Inbox.addMessage(messages[i].sender, messages[i].message);
  }
}

export const runTreatmentForUser = async (
  address: string,
  treatmentNode: any,
  treatmentBinary: any,
) => {
  try {
    CommInstance.send(`[${address}] Compiling and running execution binary`)

    const fetchedBinary = await getExecutionBinary(treatmentBinary)
    const bin = eval(ts.transpile(fetchedBinary));

    const dataManifest = treatmentBinary._rawNode.data_manifest
    const retVal = await bin.main(
      {
        llm : new LLM(),
        data: await getRequestedData(Object.keys(dataManifest)),
        intake: treatmentNode._rawNode.intake,
      }
    );

    await handleBinaryOutput(treatmentNode, retVal)

    CommInstance.send(`[${address}] Execution binary run successful`)
  }catch(e) {
    CommInstance.send(`[${address}] Execution binary run failed`)
  }
}