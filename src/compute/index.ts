import { Comm, CommInstance } from "../comm";
import { UserList, getUsers } from "./accounts/getUsers";
import { acquireMutexAndRunPDOS } from "./runPDOS";
import { scheduleTreatmentsForUser } from "./treatment/scheduleTreatmentsForUser";


export let userList: UserList = []

type UserScheduledJobs = { [cron: string] :  Array<() => Promise<void>>}
export const scheduledJobs: { [credentialId: string]: UserScheduledJobs } = {} 

export const initializeComputeNode = async () => {
  for (let user of userList) {
    await acquireMutexAndRunPDOS(user, scheduleTreatmentsForUser)
  }
}

export const runCompute = async (mainWindow: any) => {
  new Comm(mainWindow)

  userList = await getUsers()

  CommInstance.send("Starting compute node for users: " + userList.map((user) => user[0]).join(", "))

  initializeComputeNode()
}

