import { autorun } from "mobx";
import { acquireMutexForUser, cleanupMutexForUser } from "./accounts/mutex";
import { User, getUser } from "./accounts/getUsers";
import { pdosConfig } from "./config";
import { CommInstance } from "../comm";

import * as pdosImport from "@alpinehealthcare/pdos";
const pdos = pdosImport.default.default
const Core = pdosImport.Core

export const acquireMutexAndRunPDOS = async (user: User, pdosFunction: (user: User) => Promise<void>) => {
  const [ credential_id ] = user
  const mutexAcquired = await acquireMutexForUser(credential_id)
  const refreshUser = await getUser(credential_id)

  if (!mutexAcquired) {
    return
  }

  new Core(pdosConfig)
  await pdos().start()
  await pdos().modules.auth.setCredentialId(credential_id)
        
  CommInstance.send("~~~~ PDOS running and ready ~~~~")

  let didPdosFunctionRun = false

  return new Promise<void>((resolve, reject) => {
    autorun(async () => {
      const isLoaded = pdos().stores.userAccount.isLoaded

      if (!isLoaded) {
        return
      }

      if (didPdosFunctionRun) {
        return
      }

      try {

        CommInstance.send("Running function on PDOS")
        didPdosFunctionRun = true
        await pdosFunction(user) 
        CommInstance.send("~~~~ Finished running function on PDOS ~~~~")
      } catch (e) {
        console.error("error running pdos function", e)
      }

      await cleanupMutexForUser(credential_id)

      resolve()
    })
  })
}
