import * as d3 from 'd3'
import * as htmlToImage from 'html-to-image'
import * as polygonClipping from 'martinez-polygon-clipping'
import rewind from '@turf/rewind'
import { SafeLikelyLean, type ElectorateFeature, type Parties, type PartyAssignments, type PartySeats, type Path } from './electorate-map-types'
import { cityGroups } from './electorate-map-constants'

export const getFill = (partyAssignments: PartyAssignments, parties: Parties, id: string, leanLikelyEnabled: boolean) => {
  const assignment = partyAssignments[id]
  const partyId = assignment?.party ?? 'unk'
  const party = parties[partyId]
  if (!party) return '#ccc'
  if (!leanLikelyEnabled) return party.color

  if (assignment?.rating === SafeLikelyLean.LEAN) return party.lean ?? party.color
  if (assignment?.rating === SafeLikelyLean.LIKELY) return party.likely ?? party.color
  return party.color
}

const macronMap: Record<string, string> = {
  ā: 'a',
  ē: 'e',
  ī: 'i',
  ō: 'o',
  ū: 'u',
}

export const getNextRating = (currentRating?: SafeLikelyLean) => {
  switch (currentRating) {
    case undefined:
    case SafeLikelyLean.LEAN:
      return SafeLikelyLean.SAFE
    case SafeLikelyLean.SAFE:
      return SafeLikelyLean.LIKELY
    case SafeLikelyLean.LIKELY:
      return SafeLikelyLean.LEAN
  }
}

export const getPrevRating = (currentRating?: SafeLikelyLean) => {
  switch (currentRating) {
    case undefined:
    case SafeLikelyLean.SAFE:
      return SafeLikelyLean.LEAN
    case SafeLikelyLean.LIKELY:
      return SafeLikelyLean.SAFE
    case SafeLikelyLean.LEAN:
      return SafeLikelyLean.LIKELY
  }
}

export const getCountByValue = (record: PartyAssignments) => {
  const result = Object.values(record).reduce<Record<string, { total: number; safe: number; likely: number; lean: number }>>((acc, value) => {
    acc[value.party] = acc[value.party] || { total: 0, safe: 0, likely: 0, lean: 0 }

    // undefined or safe
    if (!value.rating) {
      acc[value.party].safe++
    } else if (value.rating === SafeLikelyLean.LIKELY) {
      acc[value.party].likely++
    } else {
      acc[value.party].lean++
    }
    acc[value.party].total++
    return acc
  }, {})
  return result
}

/**
 * @param id1 The first party's id (e.g. nat)
 * @param id2 The second party's id (e.g. lab)
 * @returns the pair key of the two parties (e.g. lab-nat)
 */
export const getPartyPairKey = (id1: string, id2: string) => {
  return [id1, id2].sort().join('-')
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[āēīōū]/g, (char) => macronMap[char])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const hashString = (input: string) => {
  var hash = 0,
    len = input.length
  for (var i = 0; i < len; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0 // to 32bit integer
  }
  return hash
}

export const exportSvg = async (
  gRef: React.RefObject<SVGGElement | null>,
  svgRef: React.RefObject<SVGSVGElement | null>,
  path: d3.GeoPath<any, d3.GeoPermissibleObjects>,
  generalPaths: Path[],
  maoriPaths: Path[],
  generalFeatures: ElectorateFeature[],
  maoriFeatures: ElectorateFeature[],
  partyAssignments: PartyAssignments,
  partySeats: PartySeats,
  parties: Parties,
  isMobile: boolean,
  leanLikelyEnabled: boolean,
) => {
  const g = d3.select(gRef.current)

  // Save current zoom transform
  const currentTransform = d3.zoomTransform(g.node()!)

  // Reset zoom (identity transform)
  g.attr('transform', null)

  const svg = d3.select(svgRef.current)
  const svgWidth = svg.attr('width')
  const [x, y, w, h] = svg.attr('viewBox')?.split(' ').map(Number)
  svg.attr('viewBox', `${x} ${y} ${w * 2} ${h}`)
  svg.attr('width', w * 2)

  const added: Array<d3.Selection<any, unknown, null, undefined>> = []
  const removed: SVGPathElement[] = g.selectAll<SVGPathElement, unknown>(`path`).nodes()

  const rect = svg
    .insert('rect', ':first-child')
    .attr('class', 'svg-border')
    .attr('x', x)
    .attr('y', y)
    .attr('width', w * 2)
    .attr('height', h)
    .attr('fill', 'white')
    .attr('stroke', 'black')
    .attr('stroke-width', 4)
  added.push(rect)

  // create group for lines and text
  const lines = g.append('g').attr('class', 'lines')
  added.push(lines)

  lines.append('line').attr('x1', w).attr('y1', y).attr('x2', w).attr('y2', h).attr('stroke', 'black')

  g.selectAll<SVGPathElement, unknown>(`path`).remove()

  generalPaths.forEach(({ id, d, name: _name }) => {
    g.append('path')
      .attr('d', d)
      .attr('data-id', id)
      .attr('fill', getFill(partyAssignments, parties, id, leanLikelyEnabled))
      .attr('stroke', 'black')
      .attr('stroke-width', 0.4)
      .attr('vector-effect', 'non-scaling-stroke')
  })

  const maoriGroup = g.append('g').attr('transform', `translate(${w}, 0)`)
  added.push(maoriGroup)

  maoriPaths.forEach(({ id, d, name: _name }) => {
    maoriGroup
      .append('path')
      .attr('d', d)
      .attr('data-id', id)
      .attr('fill', getFill(partyAssignments, parties, id, leanLikelyEnabled))
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5)
      .attr('vector-effect', 'non-scaling-stroke')
  })

  if (Object.values(partySeats).some((value) => value.totalSeats > 0)) {
    const partiesWithSeats = Object.entries(partySeats).filter(([_, { totalSeats }]) => totalSeats > 0)
    const legend = g.append('g').attr('transform', `translate(${w * 2 - 280}, ${h - (Object.keys(partiesWithSeats).length - 1) * 20 - 50})`)
    added.push(legend)

    const baseline = leanLikelyEnabled ? -16 : 0

    legend.append('text').attr('x', 28).attr('y', baseline).text('Party').attr('font-size', 14).attr('font-family', 'sans-serif').attr('fill', 'black').attr('font-weight', 'bold')
    legend
      .append('text')
      .attr('x', 103)
      .attr('y', baseline - 8)
      .text('Electorate')
      .attr('font-size', 14)
      .attr('font-family', 'sans-serif')
      .attr('fill', 'black')
      .attr('font-weight', 'bold')
    legend
      .append('text')
      .attr('x', 118)
      .attr('y', baseline + 8)
      .text('Seats')
      .attr('font-size', 14)
      .attr('font-family', 'sans-serif')
      .attr('fill', 'black')
      .attr('font-weight', 'bold')
    if (leanLikelyEnabled) {
      legend
        .append('text')
        .attr('x', 103)
        .attr('y', baseline + 24)
        .text('Sa')
        .attr('font-size', 10)
        .attr('font-family', 'sans-serif')
        .attr('fill', 'black')
        .attr('font-weight', 'bold')
      legend
        .append('text')
        .attr('x', 123)
        .attr('y', baseline + 24)
        .text('Li')
        .attr('font-size', 10)
        .attr('font-family', 'sans-serif')
        .attr('fill', 'black')
        .attr('font-weight', 'bold')
      legend
        .append('text')
        .attr('x', 143)
        .attr('y', baseline + 24)
        .text('Le')
        .attr('font-size', 10)
        .attr('font-family', 'sans-serif')
        .attr('fill', 'black')
        .attr('font-weight', 'bold')
      legend
        .append('text')
        .attr('x', 163)
        .attr('y', baseline + 24)
        .text('To')
        .attr('font-size', 10)
        .attr('font-family', 'sans-serif')
        .attr('fill', 'black')
        .attr('font-weight', 'bold')
    }
    legend
      .append('text')
      .attr('x', 186)
      .attr('y', baseline - 8)
      .text('List')
      .attr('font-size', 14)
      .attr('font-family', 'sans-serif')
      .attr('fill', 'black')
      .attr('font-weight', 'bold')
    legend
      .append('text')
      .attr('x', 180)
      .attr('y', baseline + 8)
      .text('Seats')
      .attr('font-size', 14)
      .attr('font-family', 'sans-serif')
      .attr('fill', 'black')
      .attr('font-weight', 'bold')
    legend
      .append('text')
      .attr('x', 232)
      .attr('y', baseline - 8)
      .text('Total')
      .attr('font-size', 14)
      .attr('font-family', 'sans-serif')
      .attr('fill', 'black')
      .attr('font-weight', 'bold')
    legend
      .append('text')
      .attr('x', 230)
      .attr('y', baseline + 8)
      .text('Seats')
      .attr('font-size', 14)
      .attr('font-family', 'sans-serif')
      .attr('fill', 'black')
      .attr('font-weight', 'bold')

    partiesWithSeats
      .sort((entry1, entry2) => (entry1[1].totalSeats > entry2[1].totalSeats ? -1 : 1))
      .forEach(([partyId, { electorateSeats, listSeats, totalSeats }], i) => {
        const y = (i + 1) * 20

        const { name, color, likely, lean } = parties[partyId]

        if (leanLikelyEnabled && likely && lean) {
          legend.append('rect').attr('x', -32).attr('y', y).attr('width', 16).attr('height', 16).attr('fill', color)
          legend.append('rect').attr('x', -16).attr('y', y).attr('width', 16).attr('height', 16).attr('fill', likely)
          legend.append('rect').attr('x', 0).attr('y', y).attr('width', 16).attr('height', 16).attr('fill', lean)
        } else {
          legend.append('rect').attr('x', 0).attr('y', y).attr('width', 16).attr('height', 16).attr('fill', color)
        }

        legend
          .append('text')
          .attr('x', 22)
          .attr('y', y + 12)
          .text(name)
          .attr('font-size', 14)
          .attr('font-family', 'sans-serif')
          .attr('fill', 'black')

        if (leanLikelyEnabled) {
          legend
            .append('text')
            .attr('x', 118 - electorateSeats.safe.toString().length * 8)
            .attr('y', y + 12)
            .text(electorateSeats.safe)
            .attr('font-size', 14)
            .attr('font-family', 'sans-serif')
            .attr('fill', 'black')
          legend
            .append('text')
            .attr('x', 138 - electorateSeats.likely.toString().length * 8)
            .attr('y', y + 12)
            .text(electorateSeats.likely)
            .attr('font-size', 14)
            .attr('font-family', 'sans-serif')
            .attr('fill', 'black')
          legend
            .append('text')
            .attr('x', 158 - electorateSeats.lean.toString().length * 8)
            .attr('y', y + 12)
            .text(electorateSeats.lean)
            .attr('font-size', 14)
            .attr('font-family', 'sans-serif')
            .attr('fill', 'black')
          legend
            .append('text')
            .attr('x', 178 - electorateSeats.total.toString().length * 8)
            .attr('y', y + 12)
            .text(electorateSeats.total)
            .attr('font-size', 14)
            .attr('font-family', 'sans-serif')
            .attr('fill', 'black')
        } else {
          legend
            .append('text')
            .attr('x', 146 - electorateSeats.total.toString().length * 8)
            .attr('y', y + 12)
            .text(electorateSeats.total)
            .attr('font-size', 14)
            .attr('font-family', 'sans-serif')
            .attr('fill', 'black')
        }

        legend
          .append('text')
          .attr('x', 204 - listSeats.toString().length * 8)
          .attr('y', y + 12)
          .text(listSeats)
          .attr('font-size', 14)
          .attr('font-family', 'sans-serif')
          .attr('fill', 'black')

        legend
          .append('text')
          .attr('x', 258 - totalSeats.toString().length * 8)
          .attr('y', y + 12)
          .text(totalSeats)
          .attr('font-size', 14)
          .attr('font-family', 'sans-serif')
          .attr('fill', 'black')
      })
  }

  // Create a temporary group for each collection
  cityGroups.forEach((group) => {
    const highlight = g.append('g').attr('class', group.title.name)
    added.push(highlight)

    const features: ElectorateFeature[] = []
    const polys: (number[][][] | number[][][][])[] = []

    group.ids.forEach((id) => {
      let feature = group.isMaori ? maoriFeatures.find((feature) => slugify(feature.properties.name) === id) : generalFeatures.find((feature) => slugify(feature.properties.name) === id)
      if (feature) {
        if (feature.geometry.type === 'Polygon') {
          polys.push(feature.geometry.coordinates as number[][][])
        } else if (feature.geometry.type === 'MultiPolygon') {
          polys.push(feature.geometry.coordinates as number[][][][])
        }
        features.push(feature)
      }
    })

    let unionFeature: GeoJSON.Feature

    if (features.length === 1) {
      unionFeature = features[0]
    } else {
      const union = polys.reduce((acc, poly) => {
        return acc ? polygonClipping.union(acc, poly) : poly
      })

      unionFeature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'MultiPolygon',
          coordinates: union as number[][][][],
        },
      }

      rewind(unionFeature, { reverse: true, mutate: true })
    }

    const d = path(unionFeature)
    const addedPath = g
      .append('path')
      .attr('d', d)
      .attr('fill', 'white')
      .attr('stroke', 'black')
      .attr('stroke-width', 0.25)
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('fill-rule', 'evenodd')
      .attr('transform', `translate(${group.isMaori ? w : 0}, 0)`)
    added.push(addedPath)

    group.ids.forEach((id) => {
      const node = g.select<SVGPathElement>(`path[data-id="${id}"]`).node()
      if (node) {
        const clone = node.cloneNode(true) as SVGPathElement
        clone.setAttribute('style', 'stroke-width: 0.4')
        clone.setAttribute('stroke', 'black')
        clone.setAttribute('vector-effect', 'non-scaling-stroke')

        highlight.node()?.appendChild(clone)
        d3.select(clone).raise()

        node.parentNode?.removeChild(node)
      }
    })

    const bbox = highlight.node()!.getBBox()
    const cx = bbox.x + bbox.width / 2
    const cy = bbox.y + bbox.height / 2

    highlight.attr('transform', `translate(${cx},${cy}) scale(${group.scale}) translate(${-cx},${-cy}) translate(${group.dx},${group.dy})`)
  })

  cityGroups.forEach((group) => {
    const { x, y, name } = group.title
    lines.append('text').attr('x', x).attr('y', y).attr('fill', 'black').attr('font-size', 14).attr('font-family', 'sans-serif').text(name)
    group.lines?.forEach(({ x1, y1, x2, y2 }) => {
      lines.append('line').attr('x1', x1).attr('y1', y1).attr('x2', x2).attr('y2', y2).attr('stroke', 'black')
    })
  })

  lines.append('text').attr('x', 825).attr('y', 15).attr('fill', 'black').attr('font-size', 12).attr('font-family', 'sans-serif').text('Created using Interactive Electorate Map')
  lines.append('text').attr('x', 826).attr('y', 30).attr('fill', 'black').attr('font-size', 11).attr('font-family', 'sans-serif').text('https://hindley.me/interactive-electorate-map')

  try {
    // Export the SVG with duplicates included
    const node = svgRef.current as unknown as HTMLElement
    const dataUrl = isMobile ? await htmlToImage.toPng(node, { width: 1050, height: 700 }) : await htmlToImage.toSvg(node, { width: 1050, height: 700 })

    const link = document.createElement('a')
    link.download = 'electoral-map'
    link.href = dataUrl
    link.click()
  } finally {
    // Always remove the temporary duplicates
    added.forEach((addedComponent) => addedComponent.remove())

    g.selectAll<SVGPathElement, unknown>(`path`).remove()

    // Restore previous zoom transform
    g.attr('transform', currentTransform.toString())
    svg.attr('viewBox', `${x} ${y} ${w} ${h}`)

    // width needs to be adjusted
    svg.attr('width', svgWidth)

    removed.forEach((node) => {
      g.node()?.appendChild(node)
    })
  }
}
