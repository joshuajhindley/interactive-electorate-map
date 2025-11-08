import React, { useMemo, useState, useEffect, useRef, type JSX } from 'react'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import type { GeometryCollection } from 'topojson-specification'
import Modal from './Modal'
import { exportSvg, getFill, hashString, slugify } from './electorate-map-utils'
import type { ElectorateFeature, Party, PartyAssignments } from './electorate-map-types'
import './ElectorateMap.scss'
import { allParties, parties } from './electorate-map-constants'
import Swal from 'sweetalert2'

type Topology = any

type Nullable<T> = T | null

type Props = {
  isMobile: boolean
}

type ElectorateStats = {
  [electorateId: string]: {
    [year in '2020' | '2023']: Array<{ [partyId: string]: number }>
  } & { effects: string[] }
}

enum Mode {
  GENERAL,
  MAORI,
}

/*
TODO:
    colourblind mode?
    ability select other party - custom name and colour
    party vote calculator
*/

const STORAGE_KEY = 'nz-electorate-ratings-2025'

export const ElectorateMap: React.FC<Props> = ({ isMobile }) => {
  const [generalTopology, setGeneralTopology] = useState<Nullable<Topology>>(null)
  const [maoriTopology, setMaoriTopology] = useState<Nullable<Topology>>(null)
  const [selectedParty, setSelectedParty] = useState<Party>(parties.nat)
  const [partyAssignments, setPartyAssignments] = useState<PartyAssignments>({})
  const [results2020, setResults2020] = useState<PartyAssignments>({})
  const [results2023, setResults2023] = useState<PartyAssignments>({})
  const [electorateStats, setElectorateStats] = useState<ElectorateStats>({})
  const [mode, setMode] = useState<Mode>(Mode.GENERAL)
  const [tooltip, setTooltip] = useState<Nullable<string>>(null)
  const [showHint, setShowHint] = useState<boolean>(false)
  const [hideMap, setHideMap] = useState<boolean>(false)
  const svgRef = useRef<Nullable<SVGSVGElement>>(null)
  const gRef = useRef<Nullable<SVGGElement>>(null)
  const zoomRef = useRef<Nullable<d3.ZoomBehavior<SVGSVGElement, unknown>>>(null)

  const width = 525
  const height = 700

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        setPartyAssignments(JSON.parse(raw))
      } catch {}
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(partyAssignments))
  }, [partyAssignments])

  // Load JSON data
  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL

    fetch(`${baseUrl}/data/general-electorates.json`)
      .then((r) => r.json())
      .then(setGeneralTopology)

    fetch(`${baseUrl}/data/maori-electorates.json`)
      .then((r) => r.json())
      .then(setMaoriTopology)

    fetch(`${baseUrl}/data/electorate-stats.json`)
      .then((r) => r.json())
      .then((json) => {
        setElectorateStats(json)
      })
  }, [])

  useEffect(() => {
    if (isMobile) {
      Swal.fire({
        icon: 'info',
        text: 'While this page is usable on mobile, it is primarily intended and optimised for use on desktop.',
        confirmButtonText: 'Acknowledge',
        confirmButtonColor: 'dodgerblue',
      })
    }
  }, [])

  useEffect(() => {
    setResults2023(
      Object.entries(electorateStats).reduce((acc, [id, stats]) => {
        acc[id] = Object.keys(stats['2023'][0])[0]
        return acc
      }, {} as PartyAssignments)
    )
    setResults2020(
      Object.entries(electorateStats).reduce((acc, [id, stats]) => {
        acc[id] = Object.keys(stats['2020'][0])[0]
        return acc
      }, {} as PartyAssignments)
    )
  }, [electorateStats])

  const generalFeatures: ElectorateFeature[] = useMemo(() => {
    if (!generalTopology) {
      return []
    }

    const collection = generalTopology.objects['data'] as GeometryCollection

    const geo = feature(generalTopology, collection)

    return geo.features.map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        name: (f.properties as Record<string, any>)?.name ?? 'Unknown',
        partyId: (f.properties as Record<string, any>)?.partyId ?? 'unk',
      },
    }))
  }, [generalTopology])

  const maoriFeatures: ElectorateFeature[] = useMemo(() => {
    if (!maoriTopology) {
      return []
    }

    const collection = maoriTopology.objects['data'] as GeometryCollection

    const geo = feature(maoriTopology, collection)

    return geo.features.map((f) => ({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        name: (f.properties as Record<string, any>)?.name ?? 'Unknown',
        partyId: (f.properties as Record<string, any>)?.partyId ?? 'unk',
      },
    }))
  }, [maoriTopology])

  // NZ-centric projection (Mercator tuned)
  const projection = useMemo(() => {
    return d3
      .geoMercator()
      .center([172.5, -41.0])
      .scale(2200)
      .translate([width / 2, height / 2])
  }, [width, height])

  const path = useMemo(() => d3.geoPath(projection), [projection])

  const generalPaths = useMemo(() => {
    return generalFeatures.map((feat) => ({
      id: slugify(feat.properties.name),
      d: path(feat)!,
      name: feat.properties.name,
    }))
  }, [generalFeatures, path])

  const maoriPaths = useMemo(() => {
    return maoriFeatures.map((feat) => ({
      id: slugify(feat.properties.name),
      d: path(feat)!,
      name: feat.properties.name,
    }))
  }, [maoriFeatures, path])

  useEffect(() => {
    if (!svgRef.current || !gRef.current) {
      return
    }

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 32]) // min and max zoom
      .translateExtent([
        [-200, -200],
        [width + 200, height + 200],
      ]) // min and max pan
      .clickDistance(5)
      .filter((event) => {
        if (event.type === 'wheel') {
          return true
        }
        if (event.type === 'mousedown') {
          return true
        }
        if (event.type === 'touchstart' && event.touches.length === 2) {
          return true
        }
        return false
      })
      .on('zoom', (event) => {
        const { k } = event.transform

        d3.select(gRef.current).attr('transform', event.transform.toString())
        // scale stroke-width
        d3.select(gRef.current)
          .selectAll('path')
          .style('stroke-width', `${Math.min(Math.max(k * 0.125, 0.5), 1.8)}px`)
          .on('mouseenter', function () {
            d3.select(this).style('stroke-width', `${Math.min(Math.max(k, 2), 3)}px`)
          })
          .on('mouseleave', function () {
            d3.select(this).style('stroke-width', `${Math.min(Math.max(k * 0.125, 0.5), 1.8)}px`)
          })
      })

    const svg = d3.select(svgRef.current)
    svg.call(zoom as any)
    zoomRef.current = zoom

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        setShowHint(true)
        setTimeout(() => setShowHint(false), 2500) // auto-hide after 2.5s
        svg.node()?.removeEventListener('touchstart', handleTouchStart)
      }
    }

    svg.node()?.addEventListener('touchstart', handleTouchStart)

    return () => {
      svg.on('.zoom', null)
      svg.node()?.removeEventListener('touchstart', handleTouchStart)
    }
  }, [width, height])

  const resetZoom = (instantly: boolean) => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(instantly ? 0 : 750)
        .call(zoomRef.current.transform, d3.zoomIdentity) // reset to identity
    }
  }

  const handleClick = (id: string) => {
    setPartyAssignments({
      ...partyAssignments,
      [id]: selectedParty.id,
    })
  }

  const slugifiedTooltip = useMemo(() => slugify(tooltip ?? ''), [tooltip])

  const nonPartyEffects = useMemo(
    () => (electorateStats?.[slugifiedTooltip]?.effects ?? ['Negligible']).filter((effect) => !effect.match(/National|Labour|Green|ACT/)),
    [electorateStats, slugifiedTooltip]
  )
  const partyEffects = useMemo(() => (electorateStats?.[slugifiedTooltip]?.effects ?? []).filter((effect) => effect.match(/National|Labour|Green|ACT/)), [electorateStats, slugifiedTooltip])

  const exportMapButton = (
    <button
      key={'export-map'}
      onClick={async () => {
        setHideMap(true)
        await exportSvg(gRef, svgRef, path, generalPaths, maoriPaths, generalFeatures, maoriFeatures, partyAssignments, parties, isMobile)
        setHideMap(false)
      }}
    >
      Export Map
    </button>
  )

  return (
    <div className={`main-container ${isMobile ? 'mobile' : 'desktop'}`}>
      <div className='electorate-information'>
        <strong>Electorate Information</strong>
        {tooltip ? (
          <>
            <br />
            <h3>
              <i>{tooltip}</i>
            </h3>
            <hr />
            {(['2023', '2020'] as const).map((year) => (
              <React.Fragment key={year}>
                <br />
                <b>{year} Candidate Vote Result</b>
                <br />
                <div className='table-wrapper'>
                  {electorateStats?.[slugifiedTooltip]?.[year] ? (
                    <table>
                      <tbody>
                        {electorateStats?.[slugifiedTooltip]?.[year].map((party) => (
                          <tr key={`${year}-${Object.keys(party)[0]}`}>
                            <td className={`party-box ${Object.keys(party)[0]}`}></td>
                            <td className='party-name'>{allParties[Object.keys(party)[0]]?.name ?? parties.unk.name}</td>
                            <td className='party-result'>{Object.values(party)[0].toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <span>N/A</span>
                  )}
                </div>
              </React.Fragment>
            ))}
            <br />
            <hr />
            <br />
            <b>Effect of New Boundaries</b>
            {nonPartyEffects.map((effect) => (
              <React.Fragment key={hashString(effect)}>
                <br />
                {effect}
              </React.Fragment>
            ))}
            {!partyEffects.length ? (
              <br />
            ) : (
              <div className='table-wrapper'>
                <table>
                  <tbody>
                    {partyEffects.map((effect) => (
                      <tr key={hashString(effect)}>
                        <td className={`party-box ${Object.values(parties).find((party) => party.name === effect.split(': ')[0])?.id}`}></td>
                        <td className='party-name'>{effect.split(': ')[0]}</td>
                        <td className={`party-result ${effect.split(': ')[1].includes('+') ? 'better' : 'worse'}`}>{effect.split(': ')[1]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <br />
            <hr />
            <br />
          </>
        ) : (
          <>
            <br />
            <br />
            {isMobile ? 'Tap on an electorate to see more information.' : 'Hover over or click on an electorate to see more information.'}
            <br />
            <br />
            Third or lower placed parties are shown if they received 5% or more of the candidate vote.
            <br />
            <br />
            Asterisks in a party name denote that the party is defunct or otherwise unregistered.
            <br />
            <br />
            <hr />
            <br />
          </>
        )}
      </div>
      <div className={`${hideMap ? 'hidden' : ''}`}>
        <svg
          ref={svgRef}
          className='main-svg'
          width={isMobile ? '100%' : width}
          height={isMobile ? '100%' : height}
          viewBox={`0 0 ${width} ${height}`}
          role='img'
          aria-label='Interactive NZ electorates map, click an electorate to change rating'
        >
          <g ref={gRef}>
            {(mode === Mode.GENERAL ? generalPaths : maoriPaths).map(({ id, d, name }) => (
              <path
                key={id}
                d={d}
                data-id={id}
                fill={getFill(partyAssignments, parties, id)}
                stroke='#333'
                className={`electorate ${partyAssignments[id] || 'unk'}`}
                tabIndex={-1}
                aria-label={`${name} - ${partyAssignments[id] ?? 'unk'}`}
                onClick={() => {
                  setTooltip(name)
                  handleClick(id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setTooltip(name)
                    handleClick(id)
                  }
                }}
                onMouseEnter={() => {
                  setTooltip(name)
                }}
              />
            ))}
          </g>
        </svg>
        {showHint && <div className='hint'>Use two fingers to move the map</div>}
      </div>
      <Options
        isMobile={isMobile}
        results2020={results2020}
        results2023={results2023}
        mode={mode}
        setMode={setMode}
        partyAssignments={partyAssignments}
        setPartyAssignments={setPartyAssignments}
        selectedParty={selectedParty}
        setSelectedParty={setSelectedParty}
        resetZoom={resetZoom}
        additionalButtons={[exportMapButton]}
      />
    </div>
  )
}

type OptionsProps = {
  isMobile: boolean
  mode: Mode
  setMode: React.Dispatch<React.SetStateAction<Mode>>
  partyAssignments: PartyAssignments
  setPartyAssignments: React.Dispatch<React.SetStateAction<PartyAssignments>>
  results2023: PartyAssignments
  results2020: PartyAssignments
  selectedParty: Party
  setSelectedParty: React.Dispatch<React.SetStateAction<Party>>
  resetZoom: (instantly: boolean) => void
  additionalButtons: JSX.Element[]
}

const Options: React.FC<OptionsProps> = (props) => {
  const [showLoadModal, setShowLoadModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(props.partyAssignments, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nz-electorate-ratings-2025.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file: File) => {
    const text = await file.text()
    try {
      const parsed = JSON.parse(text)
      props.setPartyAssignments(parsed)
      setShowLoadModal(false)
    } catch {
      Swal.fire({
        icon: 'error',
        text: 'The selected file was not a valid ratings file.',
        confirmButtonText: 'Acknowledge',
        confirmButtonColor: 'dodgerblue',
      })
    }
  }

  const onLoad = (assignments: PartyAssignments) => {
    props.setPartyAssignments(assignments)
    setShowLoadModal(false)
  }

  const loadModal = (
    <Modal onClose={() => setShowLoadModal(false)} className='load-ratings-modal'>
      <h3 className='modal-header'>Load Ratings </h3>
      <div className={`modal-body ${props.isMobile ? 'mobile' : ''}`}>
        <button onClick={() => onLoad(props.results2023)}>Load 2023 Results</button>
        <button onClick={() => onLoad(props.results2020)}>Load 2020 Results</button>
        <button onClick={() => onLoad({})}>Load Blank Map</button>
        {!props.isMobile && (
          <>
            <button
              onClick={() => {
                fileInputRef.current?.click()
              }}
            >
              Load Custom Ratings
            </button>
            <input
              ref={fileInputRef}
              className='hidden'
              type='file'
              accept='application/json'
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) {
                  importJson(f)
                }
              }}
            />
          </>
        )}
      </div>
    </Modal>
  )

  if (props.isMobile) {
    return (
      <>
        <div className='mobile-options-container'>
          <div className='select-container'>
            <label>Electorate Type:</label>
            <select value={props.mode} onChange={(e) => props.setMode(+e.target.value)}>
              <option value={Mode.GENERAL}>General</option>
              <option value={Mode.MAORI}>Māori</option>
            </select>
          </div>
          <div className='select-container'>
            <label>Party:</label>
            <select value={props.selectedParty.id} onChange={(e) => props.setSelectedParty(parties[e.target.value])}>
              {Object.keys(parties).map((partyId) => (
                <option key={partyId} value={partyId}>
                  {parties[partyId].name}
                </option>
              ))}
            </select>
          </div>
          <div className='mobile-button-container'>
            <button onClick={() => props.resetZoom(false)}>Reset Map Zoom</button>
            <button
              onClick={() => {
                setShowLoadModal(true)
              }}
            >
              Load...
            </button>
            {props.additionalButtons}
          </div>
        </div>

        {showLoadModal && loadModal}
      </>
    )
  }

  return (
    <div className='menu'>
      <div className='selector-container'>
        <div className='container'>
          <strong>Party</strong>
          {Object.keys(parties).map((partyId) => (
            <label key={partyId} className={`selector ${props.selectedParty.id === partyId ? 'selected' : ''}`}>
              <input className='hidden' type='radio' name='party' value={partyId} checked={props.selectedParty.id === partyId} onChange={() => props.setSelectedParty(parties[partyId])} />
              <span className={`party-box ${partyId}`} />
              {parties[partyId].name}
            </label>
          ))}
        </div>
        <hr />
        <div className='container'>
          <strong>Electorate Type</strong>
          <label className={`selector ${props.mode === Mode.GENERAL ? 'selected' : ''}`}>
            <input
              className='hidden'
              type='radio'
              name='electorate'
              value={Mode.GENERAL}
              checked={props.mode === Mode.GENERAL}
              onChange={() => {
                props.resetZoom(false)
                props.setMode(Mode.GENERAL)
              }}
            />
            <span className='party-box' />
            General
          </label>
          <label className={`selector ${props.mode === Mode.MAORI ? 'selected' : ''}`}>
            <input
              className='hidden'
              type='radio'
              name='electorate'
              value={Mode.MAORI}
              checked={props.mode === Mode.MAORI}
              onChange={() => {
                props.resetZoom(false)
                props.setMode(Mode.MAORI)
              }}
            />
            <span className='party-box' />
            Māori
          </label>
          <div className='message'>Use the 'Export Map' button to combine both electorate types into a single image and download it.</div>
        </div>
      </div>
      <hr />
      <div className='button-container'>
        <button onClick={() => props.resetZoom(false)}>Reset Map Zoom</button>
        <button onClick={() => setShowLoadModal(true)}>Load Ratings...</button>
        <button onClick={exportJson}>Export Ratings</button>
        {props.additionalButtons}
      </div>
      <hr />
      {showLoadModal && loadModal}
    </div>
  )
}
