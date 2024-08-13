
import pdos, { Core } from "@alpinehealthcare/pdos";
import "./electron"

const hash = "QmaJtBdUUXDm4Z57zM3jSF99erid3MB84TxH7Z8ypyVpqp"

new Core({
	name: "pdfs",
  version: "0.0.2",
  env: "production",
  modules: {
    auth: {},
    dataRequest: {}
  },
});

pdos().start().then(async () => {
  await pdos().modules?.auth?.initializeUser(hash) 
})




