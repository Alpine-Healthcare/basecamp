import axios from "axios";

const gateway = "http://localhost:8000"
axios.defaults.baseURL = gateway

export const pdosConfig = {
  name: "pdos",
  version: "0.0.1",
  env: "production",
  isComputeNode: true,
  modules: {
    auth: {},
  },
};