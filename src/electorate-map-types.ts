export type ElectorateFeature = GeoJSON.Feature<GeoJSON.Geometry, { name: string; partyId: string }>

export enum SafeLikelyLean {
  SAFE,
  LIKELY,
  LEAN,
}

export type PartyAssignments = {
  [electorateId: string]: {
    rating?: SafeLikelyLean
    party: string
  }
}

export type Party = {
  id: string
  name: string
  color: string
  likely?: string
  lean?: string
}

export type Parties = {
  [partyId: string]: Party
}

export type Seats = {
  partyVotePercentage: number
  listSeats: number
  electorateSeats: {
    total: number
    safe: number
    likely: number
    lean: number
  }
  totalSeats: number
  overhang: number
}

export type PartySeats = {
  [partyId: string]: Seats
}

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
