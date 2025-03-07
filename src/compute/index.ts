import { Comm, CommInstance } from "../comm";
import { UserList } from "./accounts/getUsers";
import ethers from "ethers"
import { pdos, Core, actions } from "@alpinehealthcare/pdos";
import { runTreatmentForUser } from "./treatment/runTreatmentForUser";
import * as LitJsSdk from '@lit-protocol/lit-node-client-nodejs';
import { Cron } from 'croner';

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

const addressToRunFor = [ "0x07BD6d82E20FEC1fA4B66592B46Cba018932aDfA" ]

async function processTreatmentsForUsers() {
  CommInstance.send("Running scheduled treatment checks...")
  
  for (let address of addressToRunFor) {
    try {
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
        if (treatment._rawNode.data.treatmentName === "Deep Breath Work") {
          continue
        }

        const treatmentBinary = await actions.treatments.getTreatmentBinaryForTreatment(treatment)
        await runTreatmentForUser(address, treatment, treatmentBinary, pdos().tree.root._rawNode.data.expoPushToken)
      }
    } catch (error) {
      CommInstance.send(`Error processing treatments for ${address}: ${error.message}`)
    }
  }
  
  CommInstance.send("Completed scheduled treatment checks")
}

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

  //const userAddresses = await pdos().modules.auth.getUsersForComputeNode(pdos().modules.auth.publicKey)

  await processTreatmentsForUsers();
  
  new Cron('*/30 * * * *', processTreatmentsForUsers);

  CommInstance.send("Treatment checks scheduled to run every 30 minutes")
}

