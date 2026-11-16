import {
  OrganViewer,
  type OrganModel,
  type OrganViewerProps,
} from "@/shared/organ-viewer"

// Generated from organui/lungs-3d at 5815084. The GLB stays in that
// repository under its own licence; see attribution.source.
export const lungsModel: OrganModel = {
  name: "Pulmones",
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
      name: "Lateral izquierda",
      direction: [1, 0, 0],
    },
    {
      name: "Lateral derecha",
      direction: [-1, 0, 0],
    },
  ],
  structures: [
    {
      id: "FMA7338",
      label: "Segmento apical derecho",
      group: "Lóbulo superior derecho",
      color: "#d5a286",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7339",
      label: "Segmento posterior derecho",
      group: "Lóbulo superior derecho",
      color: "#d5a286",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7359",
      label: "Segmento anterior derecho",
      group: "Lóbulo superior derecho",
      color: "#d5a286",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7361",
      label: "Segmento lateral derecho",
      group: "Lóbulo medio derecho",
      color: "#91b7a7",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7360",
      label: "Segmento medial derecho",
      group: "Lóbulo medio derecho",
      color: "#91b7a7",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7366",
      label: "Segmento superior derecho",
      group: "Lóbulo inferior derecho",
      color: "#b87f75",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7364",
      label: "Segmento basal anterior derecho",
      group: "Lóbulo inferior derecho",
      color: "#b87f75",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7363",
      label: "Segmento basal lateral derecho",
      group: "Lóbulo inferior derecho",
      color: "#b87f75",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7362",
      label: "Segmento basal posterior derecho",
      group: "Lóbulo inferior derecho",
      color: "#b87f75",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7372",
      label: "Segmento apicoposterior izquierdo",
      group: "Lóbulo superior izquierdo",
      color: "#d9b997",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7373",
      label: "Segmento anterior izquierdo",
      group: "Lóbulo superior izquierdo",
      color: "#d9b997",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7374",
      label: "Segmento lingular superior",
      group: "Lóbulo superior izquierdo",
      color: "#d9b997",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7375",
      label: "Segmento lingular inferior",
      group: "Lóbulo superior izquierdo",
      color: "#d9b997",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7376",
      label: "Segmento superior izquierdo",
      group: "Lóbulo inferior izquierdo",
      color: "#879fae",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7378",
      label: "Segmento basal anterior izquierdo",
      group: "Lóbulo inferior izquierdo",
      color: "#879fae",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7379",
      label: "Segmento basal lateral izquierdo",
      group: "Lóbulo inferior izquierdo",
      color: "#879fae",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7380",
      label: "Segmento basal posterior izquierdo",
      group: "Lóbulo inferior izquierdo",
      color: "#879fae",
      description:
        "Tejido asignado a este segmento en BodyParts3D; su forma y límites vienen del modelo original.",
    },
    {
      id: "FMA7394",
      label: "Tráquea",
      group: "Vías respiratorias",
      color: "#dfc6a3",
      description:
        "La tráquea lleva el aire hacia los bronquios principales derecho e izquierdo.",
    },
    {
      id: "FMA26661",
      label: "Árbol bronquial derecho",
      group: "Vías respiratorias",
      color: "#d8b47e",
      description:
        "Ramas disponibles de la vía aérea que entra al pulmón derecho, agrupadas para seleccionarlas.",
    },
    {
      id: "FMA26662",
      label: "Árbol bronquial izquierdo",
      group: "Vías respiratorias",
      color: "#d8b47e",
      description:
        "Ramas disponibles de la vía aérea que entra al pulmón izquierdo, agrupadas para seleccionarlas.",
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
