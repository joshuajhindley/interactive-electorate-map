import * as d3 from 'd3'
import * as htmlToImage from 'html-to-image'
import * as polygonClipping from 'martinez-polygon-clipping'
import rewind from '@turf/rewind'
import type { ElectorateFeature, Parties, PartyAssignments, PartySeats, Path } from './electorate-map-types'
import { cityGroups } from './electorate-map-constants'

export const getFill = (partyAssignments: PartyAssignments, parties: Parties, id: string) => {
  const partyId = partyAssignments[id] || 'unk'
  return parties[partyId]?.color ?? '#ccc'
}

const macronMap: Record<string, string> = {
  ā: 'a',
  ē: 'e',
  ī: 'i',
  ō: 'o',
  ū: 'u',
}

export const getCountByValue = (record: Record<string, string>) => {
  const result = Object.values(record).reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {})
  return result
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
      .attr('fill', getFill(partyAssignments, parties, id))
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
      .attr('fill', getFill(partyAssignments, parties, id))
      .attr('stroke', 'black')
      .attr('stroke-width', 0.5)
      .attr('vector-effect', 'non-scaling-stroke')
  })

  if (Object.values(partySeats).some((value) => value.totalSeats > 0)) {
    const partiesWithSeats = Object.entries(partySeats).filter(([_, { totalSeats }]) => totalSeats > 0)
    const legend = g.append('g').attr('transform', `translate(${w * 2 - 260}, ${h - (Object.keys(partiesWithSeats).length - 1) * 20 - 80})`)
    added.push(legend)

    legend.append('text').attr('x', 35).attr('y', 0).text('Party').attr('font-size', 14).attr('font-family', 'sans-serif').attr('fill', 'black').attr('font-weight', 'bold')
    legend.append('text').attr('x', 85).attr('y', -8).text('Electorate').attr('font-size', 14).attr('font-family', 'sans-serif').attr('fill', 'black').attr('font-weight', 'bold')
    legend.append('text').attr('x', 100).attr('y', 8).text('Seats').attr('font-size', 14).attr('font-family', 'sans-serif').attr('fill', 'black').attr('font-weight', 'bold')
    legend.append('text').attr('x', 166).attr('y', -8).text('List').attr('font-size', 14).attr('font-family', 'sans-serif').attr('fill', 'black').attr('font-weight', 'bold')
    legend.append('text').attr('x', 160).attr('y', 8).text('Seats').attr('font-size', 14).attr('font-family', 'sans-serif').attr('fill', 'black').attr('font-weight', 'bold')
    legend.append('text').attr('x', 212).attr('y', -8).text('Total').attr('font-size', 14).attr('font-family', 'sans-serif').attr('fill', 'black').attr('font-weight', 'bold')
    legend.append('text').attr('x', 210).attr('y', 8).text('Seats').attr('font-size', 14).attr('font-family', 'sans-serif').attr('fill', 'black').attr('font-weight', 'bold')

    partiesWithSeats
      .sort((entry1, entry2) => (entry1[1].totalSeats > entry2[1].totalSeats ? -1 : 1))
      .forEach(([partyId, { electorateSeats, listSeats, totalSeats }], i) => {
        const y = (i + 1) * 20

        const { name, color } = parties[partyId]

        legend.append('rect').attr('x', 0).attr('y', y).attr('width', 16).attr('height', 16).attr('fill', color).attr('stroke', 'black')

        legend
          .append('text')
          .attr('x', 24)
          .attr('y', y + 12)
          .text(name)
          .attr('font-size', 14)
          .attr('font-family', 'sans-serif')
          .attr('fill', 'black')

        legend
          .append('text')
          .attr('x', 126 - electorateSeats.toString().length * 8)
          .attr('y', y + 12)
          .text(electorateSeats)
          .attr('font-size', 14)
          .attr('font-family', 'sans-serif')
          .attr('fill', 'black')

        legend
          .append('text')
          .attr('x', 184 - listSeats.toString().length * 8)
          .attr('y', y + 12)
          .text(listSeats)
          .attr('font-size', 14)
          .attr('font-family', 'sans-serif')
          .attr('fill', 'black')

        legend
          .append('text')
          .attr('x', 238 - totalSeats.toString().length * 8)
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

  if (isMobile) {
    lines.append('text').attr('x', 825).attr('y', 675).attr('fill', 'black').attr('font-size', 12).attr('font-family', 'sans-serif').text('Created using Interactive Electorate Map')
  } else {
    lines
      .append('text')
      .attr('x', 825)
      .attr('y', 675)
      .attr('fill', 'black')
      .attr('font-size', 12)
      .attr('font-family', 'sans-serif')
      .text('Created using ')
      .append('a')
      .attr('xlink:href', 'https://hindley.me/interactive-electorate-map/')
      .attr('target', '_blank')
      .append('tspan')
      .attr('cursor', 'pointer')
      .attr('fill', 'blue')
      .attr('text-decoration', 'underline')
      .text('Interactive Electorate Map')
  }

  lines.append('text').attr('x', 826).attr('y', 690).attr('fill', 'black').attr('font-size', 11).attr('font-family', 'sans-serif').text('https://hindley.me/interactive-electorate-map')

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
