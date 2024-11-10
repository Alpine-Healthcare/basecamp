
export const CLUSTERS =  [
  { "key": "0", "color": "#6c3e81", "clusterLabel": "Treatments" },
  { "key": "1", "color": "#666666", "clusterLabel": "Access" },
  { "key": "2", "color": "#666666", "clusterLabel": "Data" }
]

export const TAGS = [
  { "key": "Treatment", "image": "method.svg" },
  { "key": "Access", "image": "person.svg" },
  { "key": "Data", "image": "tool.svg" }
]

const nodeToCluster = {
  "N_UserAccount": "1",
}

export const createNode = (data: any) => {
  console.log("Data: ", data)

  const nodeType = data._nodeType

  return {
    URL: data,
    data,
    cluster: nodeToCluster[nodeType],
    key: nodeType,
    label: nodeType,
    score: 0.00006909602204225056,
    tag: "Access",
    x: 0,
    y: 0
  }
}

export const getTreeGraphSnapshot = (root: any) => {

  const snapshot: any = {
    edges: [],
    nodes: [],
  }

  snapshot.nodes.push(createNode(root))




  return snapshot
}