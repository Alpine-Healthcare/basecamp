export interface GetRecordsParams {
    list?: unknown;
  }
  
  export interface GetRecordsResponse {
    content: { type: "text"; text: string }[];
  }
  