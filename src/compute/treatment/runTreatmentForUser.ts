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

const convertSnakeCaseToCamelCase = (str: string) =>
  str
    .toLowerCase()
    .replace(/([-_][a-z])/g, (group: string) =>
      group.toUpperCase().replace("-", "").replace("_", ""),
    )
    .replace(/^./, (firstChar) => firstChar.toUpperCase());

const getRequestedData = async (dataRequest: string[]) => {
  const data: { [key: string]: any} = {}
  try {
    for (let dataName of dataRequest) {
      console.log("dataName", dataName)
      const dataGroupNode = await pdos().tree.userAccount.edges.e_out_DataManifest.getDataGroup(convertSnakeCaseToCamelCase(dataName))
  
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

async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

export const handleBinaryOutput = async (treatmentNode: any, retVal: any, expoPushToken?: string) => {
  const time = new Date().getSeconds()
  const shouldClearInbox = time % 2 === 0
  if (retVal.message) {
    if (shouldClearInbox) {
      await actions.inbox.clear()
    } else {
      await actions.inbox.add(treatmentNode._rawNode.data.treatmentName, retVal.message);
    }
  } else {
    await actions.inbox.clear()
  }
  await treatmentNode.addInstance([retVal.message])
  if (expoPushToken && retVal.message && !shouldClearInbox) {
    const title = `${treatmentNode._rawNode.data.treatmentName} sent you a message`
    const body = "Tap here to view the interaction"
    await sendPushNotification(expoPushToken, title, body)
  }
}

export const runTreatmentForUser = async (
  address: string,
  treatmentNode: any,
  treatmentBinary: any,
  expoPushToken?: string
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

    await handleBinaryOutput(treatmentNode, retVal, expoPushToken)

    CommInstance.send(`[${address}] Execution binary run successful`)
  }catch(e) {
    console.log("error: ", e);
    CommInstance.send(`[${address}] Execution binary run failed`)
  }
}