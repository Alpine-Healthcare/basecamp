
import pdos, { Core } from "@alpinehealthcare/pdos";
import "./electron"
import axios from "axios";
import { onLoad } from "./electron";
import { autorun } from "mobx";

const gateway = "http://localhost:8000"
axios.defaults.baseURL = gateway

const pdosConfig = {
  name: "pdos",
  version: "0.0.1",
  env: "production",
  modules: {
    auth: {},
    dataRequest: {}
  },
};

const getUserMutex = async (credential_id: string) => {
  const mutex = await axios.get("/pdos/mutex", {
    params: {
      credential_id: credential_id
    }
  })
  const mutexInfo = mutex.data
  console.log("mutexInfo: ", mutexInfo)
  return mutexInfo
}

const releaseMutex = async (credential_id: string) => {
 const releaseResp = await axios.get("/pdos/mutex/release", { params: { credential_id: credential_id }})
 return releaseResp
}

const runCompute = async (mainWindow: any) => {
  /**
   * Get users to run compute for
   */
  const usersReq = await axios.get("/pdos/users")
  const users = usersReq.data
  const usersList = Object.entries(users)
  if (usersList.length === 0) {
    mainWindow.webContents.send('compute-log', "Unable to find users to run compute.") 
  }

  for (const user of usersList) {
    let [credential_id, userInfo] = user


    /**
     * Acquire mutex for user
     */
    const mutexInfo = await getUserMutex(credential_id)

    if (!mutexInfo.acquired) {
      mainWindow.webContents.send('compute-log', "User mutex is locked for user: " + credential_id + "") 
      const timestamp = mutexInfo.timestamp
      const timestampEpoch = new Date(timestamp).getTime()
      const nowEpoch = new Date().getTime() 

      if (nowEpoch - timestampEpoch > 30000) {
        mainWindow.webContents.send('compute-log', "Reseting mutex for locked for user: " + credential_id + "") 
        await releaseMutex(credential_id)
        mainWindow.webContents.send('compute-log', "Mutex unlocked for user: " + credential_id + "") 
        const mutexInfo = await getUserMutex(credential_id)
        if (!mutexInfo.acquired) {
          continue
        } 

        mainWindow.webContents.send('compute-log', "Mutex successfully locked for: " + credential_id + "") 
      } else {
        mainWindow.webContents.send('compute-log', "Abandoning compute for locked for user: " + credential_id + "") 
        continue;
      }
    }

    /**
     * Post compute mutex cleanup
     */
    const cleanupMutex = async () => {
      await releaseMutex(credential_id)
    }


    /**
     * Run compute for user
     */
    mainWindow.webContents.send('compute-log', "Running compute for user: " + credential_id) 
    const userPDOS = new Core(pdosConfig)
    await userPDOS.start(undefined)
    await (userPDOS as any).modules.auth.setAccessPackage((userInfo as any).hash_id)
    autorun(async () => {
      const isLoaded = (userPDOS as any).stores.userAccount.isLoaded

      if (isLoaded) {
        await cleanupMutex()
        mainWindow.webContents.send('compute-log', "Finished running compute for user and released mutex: " + credential_id) 
        return
      }
      console.log("is loaded: ", isLoaded)
    })
  }
}

const computeScheduler = async (mainWindow: any) => {
  runCompute(mainWindow)
  setTimeout(() => computeScheduler(mainWindow), 30000)
}

onLoad.push(computeScheduler)

