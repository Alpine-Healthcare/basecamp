import { CommInstance } from "../../comm";
import { User } from "../accounts/getUsers";
import { Cron } from "croner";
import { scheduledJobs } from "..";

import * as pdosImport from "@alpinehealthcare/pdos";
import { getTreatmentsForUser } from "./getTreatmentsForUser";
import { acquireMutexAndRunPDOS } from "../runPDOS";
import { runTreatmentForUser } from "./runTreatmentForUser";
const pdos = pdosImport.default.default

export const scheduleTreatmentsForUser = async (user: User) => {
    const [credential_id, userInfo] = user
    const treatments = await getTreatmentsForUser()
    for (let treatmentBinary of treatments) {

      //const treatmentBinaryFrequency = treatmentBinary.frequency
      const treatmentBinaryFrequency = '* * * * *' 

      const treatmentType = treatmentBinary.name

      if (!scheduledJobs[credential_id]) {
        scheduledJobs[credential_id] = {}
      }

      if (!scheduledJobs[credential_id][treatmentBinaryFrequency]) {
        scheduledJobs[credential_id][treatmentBinaryFrequency] = []
      }

      scheduledJobs[credential_id][treatmentBinaryFrequency].push(async () => {
        CommInstance.send("Running therapy job for: " + credential_id + "for treatment type: " + treatmentType)
        await acquireMutexAndRunPDOS(user, async () => {
          try {
            const userAccountNode = pdos().tree.userAccount
            const binaryNode = treatmentBinary.binary
            const treatmentNode = treatmentBinary.treatment

            await runTreatmentForUser(credential_id, userAccountNode, binaryNode, treatmentNode)
          } catch (e) {
            console.log("Failed running therapy job: ", e)
          }
        })
        CommInstance.send("Finished therapy job for: " + credential_id + "for treatment type: " + treatmentType)
      })

      CommInstance.send("Scheduled therapy job for user: " + credential_id + " with treatment type: " + treatmentType)
    }

    if (!scheduledJobs[credential_id]) {
      return
    }

    console.log("jobs: ", JSON.stringify(scheduledJobs))
    console.log("jobs list: ", Object.keys(scheduledJobs[credential_id]))

    Object.keys(scheduledJobs[credential_id]).forEach((cron) => {
      console.log("scheduling cron: ", cron)
        const jobs = scheduledJobs[credential_id][cron]

        console.log("jobs length: ", jobs.length)
      new Cron(cron, async () => {
        for (let i = 0; i < jobs.length; i++) {
          try {
            console.log("starting job: ", i)
            await jobs[i]()
            console.log("finished job: ", i)
          } catch (e) {
            console.log("Failed running job: ", e)
          }
        }
      })
    })

    CommInstance.send("Finished scheduling therapy jobs for user: " + credential_id) 
}