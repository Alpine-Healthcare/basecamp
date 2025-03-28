import * as ts from "typescript";
import LLM from "../ai/llm";

import binary_sense from "./binary_sense";
import binary_breath from "./binary_breath";
import { CommInstance } from "../../comm";
import axios from "axios";
import binary_vibes from "./binary_vibes";
import { actions } from "@alpinehealthcare/pdos"

const useTestExecutionBinary = true
const getExecutionBinary = async (treatmentName: string,therapyBinaryNode: any) => {
  if (useTestExecutionBinary) {
    if (treatmentName === "Vibes") {
      return binary_vibes
    } else if (treatmentName === "Sense") {
      return binary_sense
    } else {
      return binary_breath
    }
  } else {
    const executionBinary = await axios.get("/pdos?return_raw=True&hash=" +therapyBinaryNode._rawNode.execution_binary)
    if (!executionBinary) {
      throw new Error("No execution binary found")
    }
  }
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


interface BinaryRetVal {
  type: string,
  encounter?: any,
  message?: string
}

export const handleBinaryOutput = async (
  treatmentNode: any,
  retVal: BinaryRetVal,
  expoPushToken?: string
) => {

  const treatmentName = treatmentNode._rawNode.data.treatmentName
  const encounterDate = new Date()

  const encounter = await actions.encounters.add(
    treatmentName,
    encounterDate,
    retVal
  )
  console.log("encounter", encounter)
  await actions.inbox.add(
    treatmentName,
    encounterDate,
    { ...retVal, encounterHash: encounter._hash }
  );

  if (expoPushToken && retVal.message) {
    /*
    const title = `${treatmentNode._rawNode.data.treatmentName} sent you a message`
    const body = "Tap here to view the interaction"
    await sendPushNotification(expoPushToken, title, body)
    */
  }

}

export const runTreatmentForUser = async (
  address: string,
  treatmentNode: any,
  treatmentBinary: any,
  expoPushToken?: string
) => {
  try {
    CommInstance.send(`[${address}] Compiling and running health agent binary`)

    const fetchedBinary = await getExecutionBinary(treatmentNode._rawNode.data.treatmentName, treatmentNode)

    const bin = fetchedBinary

    const llm = new LLM()
    await llm.addToSystemContext(`The treatment name is: ${treatmentNode._rawNode.data.treatmentName}`)

    const environment = {
      llm
    };

    const retVal = await bin.main(environment) as BinaryRetVal | undefined;

    if (!retVal) {
      return
    }

    await handleBinaryOutput(treatmentNode, retVal, expoPushToken)

    CommInstance.send(`[${address}] Execution binary run successful`)
  }catch(e) {
    console.log("error: ", e);
    CommInstance.send(`[${address}] Execution binary run failed`)
  }
}