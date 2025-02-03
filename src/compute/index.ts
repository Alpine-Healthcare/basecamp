import { Comm, CommInstance } from "../comm";
import { UserList, getUsers } from "./accounts/getUsers";
import ethers from "ethers"
import * as pdosImport from "@alpinehealthcare/pdos";
const pdos = pdosImport.default.default
const Core = pdosImport.Core
import { Cron } from "croner";
import { runTreatmentForUser } from "./treatment/runTreatmentForUser";
const actions = pdosImport.actions

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
    env: "sepolia",
    context: {
      isComputeNode: true,
      gatewayURL
    },
    modules: {
      auth: {
        jsonRpcProvider: new ethers.JsonRpcProvider(INFURA_URL, {
          name: 'base-sepolia',
          chainId: 84532
        }),
        privateKey: PRIVATE_KEY
      },
    }
  });

  await pdos().start()
  await pdos().modules.auth.initializeWalletUserWithPrivateKey()
  CommInstance.send("Running compute node with public address: " + pdos().modules.auth.publicKey)

  const userAddresses = await pdos().modules.auth.getUsersForComputeNode(pdos().modules.auth.publicKey)

  for (let address of userAddresses) {
    const pdosRoot = await pdos().modules.auth.getPDOSRoot(address)
    await pdos().tree.root.init(pdosRoot)
    const activeTreatments = await actions.treatments.getActiveTreatments()

    if (!activeTreatments.length) {
      continue
    }

    for (let treatment of activeTreatments) {

      const run = async () => {
        const pdosRoot = await pdos().modules.auth.getPDOSRoot(address)
      
        await pdos().tree.root.init(pdosRoot)

        const treatmentBinary = await actions.treatments.getTreatmentBinaryForTreatment(treatment)
        await runTreatmentForUser(address, treatment, treatmentBinary)
        await pdos().tree.root.syncLocalRootHash(address)
      };

      await run()

    }


  }


}

