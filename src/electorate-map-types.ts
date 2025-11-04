export type ElectorateFeature = GeoJSON.Feature<GeoJSON.Geometry, { name: string; partyId: string }>

export type PartyAssignments = Record<string, string>

export type Party = {
  id: string
  name: string
  color: string
}

export type Parties = {
  [partyId: string]: Party
}

export type Selection = d3.Selection<any, unknown, null, undefined>

export type TransformGroup = {
  ids: string[]
  scale: number
  title: {
    name: string
    x: number
    y: number
  }
  lines?: {
    x1: number
    y1: number
    x2: number
    y2: number
  }[]
  dx: number
  dy: number
  isMaori?: boolean
}

export type Path = {
  id: string
  d: string
  name: string
}
