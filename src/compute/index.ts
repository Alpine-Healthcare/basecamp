import { Comm, CommInstance } from "../comm";
import { UserList } from "./accounts/getUsers";
import ethers from "ethers"
import { pdos, Core, actions } from "@alpinehealthcare/pdos";
import { runTreatmentForUser } from "./treatment/runTreatmentForUser";
import * as LitJsSdk from '@lit-protocol/lit-node-client-nodejs';
import { Cron } from 'croner';

import { config } from 'dotenv'
import { startMcpServer } from "./ai/mcpServer";
config({
  path: process.cwd() + "/../.env.active"
})

const PRIVATE_KEY = process.env.COMPUTE_NODE_PRIVATE_KEY
const INFURA_URL = process.env.INFURA_URL;
const gatewayURL = process.env.ALPINE_GATEWAY_URL

export let userAddressList: UserList = []
type UserScheduledJobs = { [cron: string] :  Array<() => Promise<void>>}
export const scheduledJobs: { [credentialId: string]: UserScheduledJobs } = {} 

const addressToRunFor = [ "0x2aC01FBCd8D7C60CA2bBEF7D348e70C5ec43ea57" ]

async function processTreatmentsForUsers(address: string) {
  CommInstance.send(`[${address}] Initializing Health Agents for user`)
 
  for (let address of addressToRunFor) {
    try {
      // start mcp server
      await startMcpServer()
      CommInstance.send(`[${address}] Started MCP server`)

      const pdosRoot = await pdos().modules.auth.getPDOSRoot(address)
      const accessPackage = await pdos().modules.auth.getAccessPackageFromRoot(pdosRoot)
      await pdos().modules.encryption?.setAccessPackage(accessPackage);
      await pdos().tree.root.init(pdosRoot);
      pdos().modules.auth.setDelegatedPublicKey(address)

      const activeTreatments = await actions.treatments.getActiveTreatments()

      if (!activeTreatments.length) {
        continue
      }

      CommInstance.send(`[${address}] Fetched active treatments`)
      for (let treatment of activeTreatments) {
        const treatmentBinary = await actions.treatments.getTreatmentBinaryForTreatment(treatment)
        const expoPushToken = pdos().tree.root._rawNode?.data?.expoPushToken ?? undefined
        await runTreatmentForUser(address, treatment, treatmentBinary, expoPushToken)
      }
    } catch (error) {
      CommInstance.send(`Error processing treatments for ${address}: ${error.message}`)
    }
  }
  
  CommInstance.send(`[${address}] Completed scheduled health agents`)
}

export const runCompute = async (mainWindow: any) => {
  new Comm(mainWindow)

  new Core({
    env: "marigold",
    context: {
      isComputeNode: true,
      gatewayURL: "http://localhost:8000",
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

  for (let address of addressToRunFor) {
    await processTreatmentsForUsers(address)
  }

  //new Cron('*/30 * * * *', processTreatmentsForUsers);

}

