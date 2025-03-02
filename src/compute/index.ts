import { Comm, CommInstance } from "../comm";
import { UserList } from "./accounts/getUsers";
import ethers from "ethers"
import { pdos, Core, actions } from "@alpinehealthcare/pdos";
import { runTreatmentForUser } from "./treatment/runTreatmentForUser";
import * as LitJsSdk from '@lit-protocol/lit-node-client-nodejs';

import { config } from 'dotenv'
config({
  path: process.cwd() + "/../.env.active"
})

const PRIVATE_KEY = process.env.COMPUTE_NODE_PRIVATE_KEY
const INFURA_URL = process.env.INFURA_URL;
const gatewayURL = process.env.ALPINE_GATEWAY_URL

export let userAddressList: UserList = []
type UserScheduledJobs = { [cron: string] :  Array<() => Promise<void>>}
export const scheduledJobs: { [credentialId: string]: UserScheduledJobs } = {} 

export const runCompute = async (mainWindow: any) => {
  new Comm(mainWindow)

  new Core({
    env: "marigold",
    context: {
      isComputeNode: true,
      gatewayURL: "https://network.alpine.healthcare/api"
    },
    modules: {
      auth: {
        jsonRpcProvider: new ethers.JsonRpcProvider(INFURA_URL, {
          name: 'base-sepolia',
          chainId: 84532
        }),
        privateKey: PRIVATE_KEY
      },
      encryption: {
        enabled: true,
      }
    }
  });

  await pdos().start({
    encryption: {
      litNodePackage: LitJsSdk.LitNodeClientNodeJs
    }
  })
  await pdos().modules?.auth?.initializeWalletUserWithPrivateKey()
  CommInstance.send("Running compute node with public address: " + pdos().modules.auth.publicKey)

  const userAddresses = await pdos().modules.auth.getUsersForComputeNode(pdos().modules.auth.publicKey)

  for (let address of userAddresses) {
    if (address !== "0x6309Bd836Fd8FD103742bf3b87A09a1a016eA959") {
      continue 
    }
    const pdosRoot = await pdos().modules.auth.getPDOSRoot(address)
    const accessPackage = await pdos().modules.auth.getAccessPackageFromRoot(pdosRoot)
    await pdos().modules.encryption?.setAccessPackage(accessPackage);
    await pdos().tree.root.init(pdosRoot);
    pdos().modules.auth.setDelegatedPublicKey(address)

    const activeTreatments = await actions.treatments.getActiveTreatments()

    if (!activeTreatments.length) {
      continue
    }

    for (let treatment of activeTreatments) {
      const treatmentBinary = await actions.treatments.getTreatmentBinaryForTreatment(treatment)
      await runTreatmentForUser(address, treatment, treatmentBinary)
    }

  }
}

