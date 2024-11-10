import axios from "axios";
export const NODE_TLS_REJECT_UNAUTHORIZED='0'

//const gateway = "https://network.alpine.healthcare/api"
const gateway = "http://localhost:8000"
axios.defaults.baseURL = gateway

export const pdosConfig = {
  env: "production",
  gatewayURL: gateway,
  modules: {
    auth: {},
  },
  isComputeNode: true,
};