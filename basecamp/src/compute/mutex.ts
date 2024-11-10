import axios from "axios";
import { CommInstance } from "./comm";

interface MutexInfo {
  acquired: boolean,
  timestamp: string
}

export const getUserMutex = async (credential_id: string): Promise<MutexInfo> => {
  const mutex = await axios.get("/pdos/mutex", {
    params: {
      credential_id: credential_id
    }
  })
  const mutexInfo = mutex.data
  if (mutexInfo.acquired) {
    CommInstance.send("Successfully acquired mutex for user: " + credential_id)
  }
  return mutexInfo
}

export const releaseMutex = async (credential_id: string): Promise<boolean> => {
  const releaseResp = await axios.get("/pdos/mutex/release", { params: { credential_id: credential_id }})
  if (releaseResp.data) {
    CommInstance.send("Successfully released mutex for user: " + credential_id)
  }
  return releaseResp.data
}

export const acquireMutexForUser = async (credential_id: string): Promise<boolean> => {
  const mutexInfo = await getUserMutex(credential_id)

  if (!mutexInfo.acquired) {
    CommInstance.send("User mutex is locked for user: " + credential_id + "") 
    const timestamp = mutexInfo.timestamp
    const timestampEpoch = new Date(timestamp).getTime()
    const nowEpoch = new Date().getTime() 

    if (nowEpoch - timestampEpoch > 3000) {
      CommInstance.send("Reseting mutex for locked for user: " + credential_id + "") 
      await releaseMutex(credential_id)
      CommInstance.send("Mutex unlocked for user: " + credential_id + "") 
      const mutexInfo = await getUserMutex(credential_id)
      if (!mutexInfo.acquired) {
        return false
      } 

      CommInstance.send("Mutex successfully locked for: " + credential_id + "") 
    } else {
      CommInstance.send("Abandoning compute for locked for user: " + credential_id + "") 
      return false;
    }
  }

  return true
} 

export const cleanupMutexForUser = async (credential_id: string): Promise<boolean> => {
  return await releaseMutex(credential_id)
}