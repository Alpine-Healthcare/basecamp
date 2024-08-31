import pdos, { Core, PDFSNode } from "@alpinehealthcare/pdos";

interface Binary {
  frequency: string
  name: string
  type: string
  binary: PDFSNode
}

export const getTreatmentBinaries = async () => {
  const treatmentBinaries = []
  try {
    const treatments: PDFSNode[] = Object.values(await pdos().stores.userAccount.edges.e_out_TreatmentManifest.edges)
    for (let treatment of treatments) {
      treatmentBinaries.push((treatment as any).edges.e_out_TreatmentBinary)
    }
  } catch (e) {
    return []
  }

  return treatmentBinaries.map((treatmentBinary: PDFSNode) => {

    return {
      frequency: treatmentBinary._rawNode.frequency,
      name: treatmentBinary._rawNode.name,
      type: treatmentBinary._rawNode.type,
      binary: treatmentBinary
    }
  })
}