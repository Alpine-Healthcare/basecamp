import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory";
export const [ serverTransport, clientTransport ] = InMemoryTransport.createLinkedPair();
