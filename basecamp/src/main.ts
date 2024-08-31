import { runCompute } from "./compute";
import "./electron"
import { onWindowLoad } from "./electron";


onWindowLoad.push(runCompute)