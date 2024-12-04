import * as ts from "typescript";
import LLM from "../ai/llm";

import * as pdosImport from "@alpinehealthcare/pdos";
import binary from "./binary";
import { CommInstance } from "../../comm";
const pdos = pdosImport.default.default

export const runTreatmentForUser = async (
  credential_id: string,
  userRootNode: any,
  therapyBinaryNode: any,
  treatmentNode: any,
) => {
  const treatmentType = therapyBinaryNode.name
  try {
    CommInstance.send("Compiling binary: " + credential_id + "for treatment type: " + treatmentType)
    const bin = eval(ts.transpile(binary));
    const retVal = await bin.main({
      llm : new LLM()
    }, {});
    if (retVal && retVal.message) {
      await treatmentNode.addInstance([retVal.message])
      CommInstance.send("Added treatment instance: " + credential_id + "for treatment type: " + treatmentType)
      console.log("userRootNode.edges.e_out_Inbox: ", userRootNode.edges.e_out_Inbox)
      await userRootNode.edges.e_out_Inbox.addMessage(retVal.message);
      CommInstance.send("Added to inbox: " + credential_id + "for treatment type: " + treatmentType)
    }
    CommInstance.send("Treatment successful: " + credential_id + "for treatment type: " + treatmentType)
  }catch(e) {
    console.log("Error: failed compiling binary ", e)
  }
}