import * as ts from "typescript";
import LLM from "../ai/llm";

import { pdos, actions } from "@alpinehealthcare/pdos";
import binary from "./binary";
import { CommInstance } from "../../comm";
import axios from "axios";

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
  try {
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
  } catch (e) {
    console.log("unable to fetch any data")
  }
  

  return data
}

export const handleBinaryOutput = async (treatmentNode: any, retVal: any) => {
  console.log("adding mesage", treatmentNode._rawNode.data.treatmentName, retVal.message)
  await actions.inbox.add(treatmentNode._rawNode.data.treatmentName, retVal.message);
  await treatmentNode.addInstance([retVal.message])
}

export const runTreatmentForUser = async (
  address: string,
  treatmentNode: any,
  treatmentBinary: any,
) => {
  try {
    CommInstance.send(`[${address}] Compiling and running execution binary`)

    const fetchedBinary = await getExecutionBinary(treatmentBinary)
    /*eslint no-eval: "error"*/
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
    console.log("error: ", e);
    CommInstance.send(`[${address}] Execution binary run failed`)
  }
}