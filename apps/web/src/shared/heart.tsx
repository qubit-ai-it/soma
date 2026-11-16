import {
  OrganViewer,
  type OrganModel,
  type OrganViewerProps,
} from "@/shared/organ-viewer"

// Generated from organui/heart-3d at c72ce66. The GLB stays in that
// repository under its own licence; see attribution.source.
export const heartModel: OrganModel = {
  name: "Corazón",
  src: "/models/heart.glb",
  bytes: 2524400,
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
  ],
  structures: [
    {
      id: "right-atrium",
      label: "Aurícula derecha",
      group: "Paredes del corazón",
      color: "#a96d70",
      description:
        "Recibe la sangre que vuelve del cuerpo y la pasa al ventrículo derecho.",
    },
    {
      id: "left-atrium",
      label: "Aurícula izquierda",
      group: "Paredes del corazón",
      color: "#b77c76",
      description:
        "Recibe la sangre oxigenada de los pulmones y la pasa al ventrículo izquierdo.",
    },
    {
      id: "ventricular-wall",
      label: "Pared ventricular",
      group: "Paredes del corazón",
      color: "#ab6159",
      description:
        "Tejido muscular que rodea las dos cámaras inferiores de bombeo.",
    },
    {
      id: "right-ventricle",
      label: "Cavidad del ventrículo derecho",
      group: "Cavidades ventriculares",
      color: "#b86661",
      description:
        "El espacio dentro del ventrículo derecho, que bombea la sangre hacia los pulmones.",
    },
    {
      id: "left-ventricle",
      label: "Cavidad del ventrículo izquierdo",
      group: "Cavidades ventriculares",
      color: "#d28b72",
      description:
        "El espacio dentro del ventrículo izquierdo, que bombea la sangre a la aorta.",
    },
    {
      id: "ascending-aorta",
      label: "Aorta ascendente",
      group: "Grandes vasos",
      color: "#c37f6a",
      description: "La aorta lleva la sangre del corazón al resto del cuerpo.",
    },
    {
      id: "aortic-arch",
      label: "Arco aórtico",
      group: "Grandes vasos",
      color: "#ca8d78",
      description:
        "Tramo de la aorta, la arteria principal que sale del corazón.",
    },
    {
      id: "pulmonary-trunk",
      label: "Tronco pulmonar",
      group: "Grandes vasos",
      color: "#789aab",
      description: "Lleva la sangre del ventrículo derecho hacia los pulmones.",
    },
    {
      id: "superior-vena-cava",
      label: "Vena cava superior",
      group: "Grandes vasos",
      color: "#8c9fab",
      description:
        "Una de las grandes venas que devuelven la sangre del cuerpo a la aurícula derecha.",
    },
    {
      id: "left-coronary",
      label: "Arteria coronaria izquierda",
      group: "Arterias coronarias",
      color: "#dfb58a",
      description:
        "Irriga el músculo cardíaco, incluidas partes del corazón izquierdo y el tabique ventricular.",
    },
    {
      id: "right-coronary",
      label: "Arteria coronaria derecha",
      group: "Arterias coronarias",
      color: "#d4a777",
      description: "Irriga la aurícula derecha y partes de ambos ventrículos.",
    },
  ],
  attribution: {
    credit:
      "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International",
    license: "CC BY 4.0",
    licenseUrl: "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html",
    source:
      "https://github.com/organui/heart-3d/blob/c72ce6654ff8e282942f97750d3104f55ef4fc3d/public/models/ATTRIBUTION.md",
  },
}

export type HeartProps = Omit<OrganViewerProps, "model">

export function Heart(props: HeartProps) {
  return <OrganViewer model={heartModel} {...props} />
}
