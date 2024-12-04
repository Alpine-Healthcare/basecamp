import * as pdosImport from "@alpinehealthcare/pdos";
const pdos = pdosImport.default.default

export const getTreatmentsForUser = async () => {
  const treatmentBinaries = []
  try {
    const treatments: any[] = Object.values(await pdos().stores.userAccount.edges.e_out_TreatmentManifest.edges)
    for (let treatment of treatments) {
      const treatmentBinary = (treatment as any).edges.e_out_TreatmentBinary
      treatmentBinaries.push({
        treatment: treatment,
        frequency: treatmentBinary._rawNode.frequency,
        name: treatmentBinary._rawNode.name,
        type: treatmentBinary._rawNode.type,
        binary: treatmentBinary
      })
    }
  } catch (e) {
    return []
  }

  return treatmentBinaries
}