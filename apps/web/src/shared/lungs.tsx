import {
  OrganViewer,
  type OrganModel,
  type OrganViewerProps,
} from "@/shared/organ-viewer"

// Generated from organui/lungs-3d at 5815084. The GLB stays in that
// repository under its own licence; see attribution.source.
export const lungsModel: OrganModel = {
  name: "Lungs",
  src: "/models/lungs.glb",
  bytes: 3901260,
  defaultView: "Anterior",
  views: [
    {
      name: "Anterior",
      direction: [0, 0, 1],
    },
    {
      name: "Posterior",
      direction: [0, 0, -1],
    },
    {
      name: "Left lateral",
      direction: [1, 0, 0],
    },
    {
      name: "Right lateral",
      direction: [-1, 0, 0],
    },
  ],
  structures: [
    {
      id: "FMA7338",
      label: "Right apical segment",
      group: "Right upper lobe",
      color: "#d5a286",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7339",
      label: "Right posterior segment",
      group: "Right upper lobe",
      color: "#d5a286",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7359",
      label: "Right anterior segment",
      group: "Right upper lobe",
      color: "#d5a286",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7361",
      label: "Right lateral segment",
      group: "Right middle lobe",
      color: "#91b7a7",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7360",
      label: "Right medial segment",
      group: "Right middle lobe",
      color: "#91b7a7",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7366",
      label: "Right superior segment",
      group: "Right lower lobe",
      color: "#b87f75",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7364",
      label: "Right anterior basal segment",
      group: "Right lower lobe",
      color: "#b87f75",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7363",
      label: "Right lateral basal segment",
      group: "Right lower lobe",
      color: "#b87f75",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7362",
      label: "Right posterior basal segment",
      group: "Right lower lobe",
      color: "#b87f75",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7372",
      label: "Left apicoposterior segment",
      group: "Left upper lobe",
      color: "#d9b997",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7373",
      label: "Left anterior segment",
      group: "Left upper lobe",
      color: "#d9b997",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7374",
      label: "Superior lingular segment",
      group: "Left upper lobe",
      color: "#d9b997",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7375",
      label: "Inferior lingular segment",
      group: "Left upper lobe",
      color: "#d9b997",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7376",
      label: "Left superior segment",
      group: "Left lower lobe",
      color: "#879fae",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7378",
      label: "Left anterior basal segment",
      group: "Left lower lobe",
      color: "#879fae",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7379",
      label: "Left lateral basal segment",
      group: "Left lower lobe",
      color: "#879fae",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7380",
      label: "Left posterior basal segment",
      group: "Left lower lobe",
      color: "#879fae",
      description:
        "Tissue assigned to this segment in BodyParts3D; its shape and boundaries come from the original model.",
    },
    {
      id: "FMA7394",
      label: "Trachea",
      group: "Airways",
      color: "#dfc6a3",
      description:
        "The trachea carries air to the right and left main bronchi.",
    },
    {
      id: "FMA26661",
      label: "Right bronchial tree",
      group: "Airways",
      color: "#d8b47e",
      description:
        "Available branches of the airway entering the right lung, grouped for selection.",
    },
    {
      id: "FMA26662",
      label: "Left bronchial tree",
      group: "Airways",
      color: "#d8b47e",
      description:
        "Available branches of the airway entering the left lung, grouped for selection.",
    },
  ],
  attribution: {
    credit:
      "BodyParts3D / Anatomography, © The Database Center for Life Science. CC BY-SA 2.1 Japan. Adapted by OrganUI.",
    license: "CC BY-SA 2.1 JP",
    licenseUrl: "https://lifesciencedb.jp/bp3d/info/index.html#License",
    source:
      "https://github.com/organui/lungs-3d/blob/5815084f43efe438ebfae3fd889ee2baf343dfbf/public/models/LICENSE.txt",
  },
}

export type LungsProps = Omit<OrganViewerProps, "model">

export function Lungs(props: LungsProps) {
  return <OrganViewer model={lungsModel} {...props} />
}
