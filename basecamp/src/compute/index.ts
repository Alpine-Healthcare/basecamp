import pdos, { Core, PDFSNode } from "@alpinehealthcare/pdos";
import { autorun } from "mobx";
import { acquireMutexForUser, cleanupMutexForUser, getUserMutex, releaseMutex } from "./mutex";
import { Comm, CommInstance } from "./comm";
import { User, UserList, getUser, getUsers } from "./users";
import { pdosConfig } from "./config";
import { getTreatmentBinaries } from "./pdos";
import schedule from "node-schedule"
import * as ts from "typescript";
import LLM from "./llm";



export let userList: UserList = []

type UserScheduledJobs = { [cron: string] :  Array<() => Promise<void>>}
const scheduledJobs: { [credentialId: string]: UserScheduledJobs } = {} 

const acquireMutexAndRunPDOS = async (user: User, pdosFunction: (user: User) => Promise<void>) => {
  const [ credential_id ] = user
  const mutexAcquired = await acquireMutexForUser(credential_id)
  const refreshUser = await getUser(credential_id)
  const userInfo = refreshUser[1]

  if (!mutexAcquired) {
    return
  }

  new Core(pdosConfig)
  await pdos().start(undefined)
  await pdos().modules.auth.setAccessPackage((userInfo as any).hash_id)

  return new Promise<void>((resolve, reject) => {
    autorun(async () => {
      const isLoaded = pdos().stores.userAccount.isLoaded

      if (!isLoaded) {
        return
      }

      await pdosFunction(user) 

      await cleanupMutexForUser(credential_id)
      resolve()
    })
  })
}

const runTherapyJob = async (
  userRootNode: PDFSNode,
  therapyBinaryNode: PDFSNode
) => {

  let binary: string = `({
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
    })`;

    let bin
    try {
      bin = eval(ts.transpile(binary));
    }catch(e) {
      console.log("Error: failed compiling binary ", e)
      return
    }

  const getRequestedData = async (dataRequest: string[]) => {
    const data: { [key: string]: any} = {}

    for (let dataName of dataRequest) {
      const dataGroupNode = await pdos().stores.userAccount.edges.e_out_DataManifest.getDataGroup(dataName)

      if (dataGroupNode) {
        data[dataName] = dataGroupNode._rawNode.records
      }
    }

    return data
  }

  const dataManifest = therapyBinaryNode._rawNode.data_manifest
  const requestedData = await getRequestedData(Object.keys(dataManifest));

  const api = {
    llm : new LLM()
  } 

  const retVal = await bin.main(api, requestedData);


  // Update User node
  (userRootNode as any).edges.e_out_Inbox.addMessage(retVal.message);

}

const scheduleTherapyJobsForUser = async (user: User) => {
    const [credential_id, userInfo] = user
    const treatmentBinaries = await getTreatmentBinaries()

    for (let treatmentBinary of treatmentBinaries) {

      const treatmentBinaryFrequency = treatmentBinary.frequency
      //const treatmentBinaryFrequency = '* * * * *' 

      const treatmentType = treatmentBinary.name

      if (!scheduledJobs[credential_id]) {
        scheduledJobs[credential_id] = {}
      }

      if (!scheduledJobs[credential_id][treatmentBinaryFrequency]) {
        scheduledJobs[credential_id][treatmentBinaryFrequency] = []
      }

      scheduledJobs[credential_id][treatmentBinaryFrequency].push(async () => {
        CommInstance.send("Running therapy job for: " + credential_id + "for treatment type: " + treatmentType)
        await acquireMutexAndRunPDOS(user, () => runTherapyJob(pdos().stores.userAccount,treatmentBinary.binary ))
        CommInstance.send("Finished therapy job for: " + credential_id + "for treatment type: " + treatmentType)
      })

      CommInstance.send("Scheduled therapy job for user: " + credential_id + " with treatment type: " + treatmentType)
    }

    Object.keys(scheduledJobs[credential_id]).forEach((cron) => {
      schedule.scheduleJob('* * * * *', async () => {
        const jobs = scheduledJobs[credential_id][cron]

        for (let i = 0; i < jobs.length; i++) {
          await jobs[i]()
        }
      })
    })

    CommInstance.send("Finished scheduling therapy jobs for user: " + credential_id) 
}

export const initializeComputeNode = async () => {
  for (let user of userList) {
    await acquireMutexAndRunPDOS(user, scheduleTherapyJobsForUser)
  }
}

export const runCompute = async (mainWindow: any) => {
  new Comm(mainWindow)

  // Fetch users to run compute for 
  userList = await getUsers()
  CommInstance.send("Starting compute node for users: " + userList.map((user) => user[0]).join(", "))

  // Figure out which therapy jobs to schedule for each user
  initializeComputeNode()
}

