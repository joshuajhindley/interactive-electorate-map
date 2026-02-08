import React, { useMemo, useState, useEffect, useRef, type JSX, type RefObject } from 'react'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import type { GeometryCollection } from 'topojson-specification'
import Modal from './Modal'
import { exportSvg, getCountByValue, getFill, hashString, slugify } from './electorate-map-utils'
import type { ElectorateFeature, Party, PartyAssignments, PartySeats, Seats } from './electorate-map-types'
import './ElectorateMap.scss'
import { allParties, parties } from './electorate-map-constants'

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
  PARTY,
}

/*
TODO:
    colourblind mode?
    ability select other party - custom name and colour
*/

// TODO fix image export - works unless manually changin party vote???
// TODO test on Chrome and phone

const STORAGE_KEY = 'nz-electorate-ratings-2026'

export const ElectorateMap: React.FC<Props> = ({ isMobile }) => {
  const [generalTopology, setGeneralTopology] = useState<Nullable<Topology>>(null)
  const [maoriTopology, setMaoriTopology] = useState<Nullable<Topology>>(null)
  const [selectedParty, setSelectedParty] = useState<Party>(parties.nat)
  const [partyAssignments, setPartyAssignments] = useState<PartyAssignments>({})
  const [partySeats, setPartySeats] = useState<PartySeats>(() => {
    const initialSeats = {} as PartySeats
    Object.keys(parties).forEach((partyId) => {
      if (partyId !== 'unk') {
        initialSeats[partyId] = { partyVotePercentage: 0, electorateSeats: 0, listSeats: 0, totalSeats: 0, overhang: 0 }
      }
    })
    return initialSeats
  })
  const [workingPartyVotePercentage, setWorkingPartyVotePercentage] = useState<Record<string, number>>(() => {
    return Object.fromEntries(
      Object.entries(partySeats).map(([partyId, value]) => {
        return [partyId, value.partyVotePercentage]
      }),
    )
  })
  const [results2020, setResults2020] = useState<PartyAssignments>({})
  const [results2023, setResults2023] = useState<PartyAssignments>({})
  const [electorateStats, setElectorateStats] = useState<ElectorateStats>({})
  const [mode, setMode] = useState<Mode>(Mode.GENERAL)
  const [tooltip, setTooltip] = useState<Nullable<string>>(null)
  const [showHint, setShowHint] = useState<boolean>(false)
  const [hideMap, setHideMap] = useState<boolean>(false)
  const [mobileAcknowledged, setMobileAcknowledged] = useState<boolean>(false)
  const [showPartiesWithNoSeats, setShowPartiesWithNoSeats] = useState<boolean>(true)
  const svgRef = useRef<Nullable<SVGSVGElement>>(null)
  const gRef = useRef<Nullable<SVGGElement>>(null)
  const zoomRef = useRef<Nullable<d3.ZoomBehavior<SVGSVGElement, unknown>>>(null)
  const afterUpdateRef = useRef<Nullable<() => void>>(null)

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
    afterUpdateRef.current = () => {
      recalculateAndUpdate()
    }

    const electorateSeatsByParty = getCountByValue(partyAssignments)
    setPartySeats((prev) =>
      Object.fromEntries(
        Object.entries(prev).map(([partyId, prevSeats]) => [
          partyId,
          {
            ...prevSeats,
            electorateSeats: electorateSeatsByParty[partyId] ?? 0,
          },
        ]),
      ),
    )

    localStorage.setItem(STORAGE_KEY, JSON.stringify(partyAssignments))
  }, [partyAssignments])

  useEffect(() => {
    setWorkingPartyVotePercentage(
      Object.fromEntries(
        Object.entries(partySeats).map(([partyId, value]) => {
          return [partyId, value.partyVotePercentage]
        }),
      ),
    )

    if (afterUpdateRef.current) {
      afterUpdateRef.current()
      afterUpdateRef.current = null
    }
  }, [partySeats])

  // Load JSON data
  useEffect(() => {
    let baseUrl = import.meta.env.BASE_URL
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, baseUrl.length - 1)
    }

    requestIdleCallback(() => {
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
    })
  }, [])

  useEffect(() => {
    setResults2023(
      Object.entries(electorateStats).reduce((acc, [id, stats]) => {
        acc[id] = Object.keys(stats['2023'][0])[0]
        return acc
      }, {} as PartyAssignments),
    )
    setResults2020(
      Object.entries(electorateStats).reduce((acc, [id, stats]) => {
        acc[id] = Object.keys(stats['2020'][0])[0]
        return acc
      }, {} as PartyAssignments),
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
    () => (electorateStats?.[slugifiedTooltip]?.effects ?? ['Negligible']).filter((effect) => !effect.match(/National|Labour|Green|ACT|NZ First/)),
    [electorateStats, slugifiedTooltip],
  )
  const partyEffects = useMemo(() => (electorateStats?.[slugifiedTooltip]?.effects ?? []).filter((effect) => effect.match(/National|Labour|Green|ACT|NZ First/)), [electorateStats, slugifiedTooltip])

  const exportMapButton = (
    <button
      key={'export-map'}
      onClick={async () => {
        setHideMap(true)
        await exportSvg(gRef, svgRef, path, generalPaths, maoriPaths, generalFeatures, maoriFeatures, partyAssignments, partySeats, parties, isMobile)
        setHideMap(false)
      }}
    >
      Export Map
    </button>
  )

  const recalculateAndUpdate = () => {
    setPartySeats((prev) => {
      return recalculate(prev)
    })
  }

  const recalculate = (currentSeats: PartySeats) => {
    const seatsWithQuotient = [] as [string, number][]

    Object.entries(currentSeats).forEach(([party, { electorateSeats }]) => {
      if (!electorateSeats && workingPartyVotePercentage[party] < 5.0) {
        return
      }

      let divisor = 1
      while (divisor < 240) {
        seatsWithQuotient.push([party, workingPartyVotePercentage[party] / divisor])
        divisor += 2
      }
    })
    seatsWithQuotient.sort((val1, val2) => (val1[1] > val2[1] ? -1 : 1))

    const seats = Object.fromEntries(Object.keys(parties).map((partyId) => [partyId, 0]))
    for (let i = 0; i < 120; i++) {
      const nextSeat = seatsWithQuotient[i]
      if (nextSeat) {
        seats[nextSeat[0]] = seats[nextSeat[0]] + 1
      }
    }

    return Object.fromEntries(
      Object.entries(currentSeats).map(([partyId, prevSeats]) => [
        partyId,
        {
          electorateSeats: prevSeats.electorateSeats,
          totalSeats: Math.max(prevSeats.electorateSeats, seats[partyId]),
          listSeats: Math.max(0, seats[partyId] - prevSeats.electorateSeats),
          overhang: Math.max(0, prevSeats.electorateSeats - seats[partyId]),
          partyVotePercentage: workingPartyVotePercentage[partyId],
        },
      ]),
    )
  }

  const totals = useMemo(() => {
    const allSeats: Seats = {
      partyVotePercentage: 0,
      electorateSeats: 0,
      listSeats: 0,
      totalSeats: 0,
      overhang: 0,
    }

    allSeats.partyVotePercentage = Object.values(workingPartyVotePercentage).reduce((acc, value) => (acc += value), 0)

    Object.values(partySeats).forEach((value) => {
      allSeats.electorateSeats += value.electorateSeats
      allSeats.listSeats += value.listSeats
      allSeats.totalSeats += value.totalSeats
      allSeats.overhang += value.overhang
    })

    return allSeats
  }, [partySeats, workingPartyVotePercentage])

  const blocs = useMemo(() => {
    const allBlocs = [
      // National-led
      ['nat'],
      ['nat', 'act'],
      ['nat', 'nzf'],
      ['nat', 'top'],
      ['nat', 'act', 'nzf'],
      ['nat', 'act', 'top'],
      ['nat', 'nzf', 'top'],
      ['nat', 'act', 'nzf', 'top'],
      // Labour-led
      ['lab'],
      ['lab', 'gre'],
      ['lab', 'nzf'],
      ['lab', 'top'],
      ['lab', 'gre', 'nzf'],
      ['lab', 'gre', 'top'],
      ['lab', 'tpm'],
      ['lab', 'tpm', 'top'],
      ['lab', 'gre', 'tpm'],
      ['lab', 'gre', 'tpm', 'top'],
    ]

    return allBlocs
      .map((parties) => {
        // one of the parties is not in parliament
        if (parties.some((partyId) => partySeats[partyId].totalSeats === 0)) {
          return {
            parties: parties,
            numSeats: 0,
            seatPercent: 0,
          }
        }

        const numSeats = parties.reduce((sum, partyId) => (sum += partySeats[partyId].totalSeats), 0)
        const seatPercent = (numSeats / totals.totalSeats) * 100

        return {
          parties: parties,
          numSeats: numSeats,
          seatPercent: seatPercent,
        }
      })
      .filter(({ seatPercent }) => seatPercent > 50)
  }, [partySeats, totals])

  console.log(workingPartyVotePercentage)

  return (
    <div className={`main-container ${isMobile ? 'mobile' : 'desktop'}`}>
      {isMobile && !mobileAcknowledged && (
        <Modal onClose={() => setMobileAcknowledged(true)}>
          <div>Please note that while this page is usable on mobile, it is primarily intended and optimised for use on desktop devices.</div>
        </Modal>
      )}
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
      <div>
        {mode === Mode.PARTY && (
          <div className='seat-calculator-container'>
            <table>
              <thead>
                <tr>
                  <th colSpan={3}></th>
                  <th colSpan={4}>Seats</th>
                </tr>
                <tr>
                  <th colSpan={2}>Party</th>
                  <th>Party Vote</th>
                  <th>Electorate</th>
                  <th>List</th>
                  <th>Total</th>
                  <th className='tooltip'>
                    OH<span className='tooltip-text'>Overhang</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(partySeats)
                  .sort(([partyId1, val1], [partyId2, val2]) => {
                    if (val1.totalSeats > val2.totalSeats) {
                      return -1
                    } else if (val1.totalSeats < val2.totalSeats) {
                      return 1
                    }
                    if (val1.partyVotePercentage === 0 && val2.partyVotePercentage === 0) {
                      // order alphabetically
                      return partyId1 < partyId2 ? -1 : 1
                    }
                    return val1.partyVotePercentage > val2.partyVotePercentage ? -1 : 1
                  })
                  .map(([partyId, value]) => (
                    <tr key={`seats-${partyId}`} className={!showPartiesWithNoSeats && value.totalSeats === 0 ? 'hidden' : ''}>
                      <td className={`party-box ${partyId}`}></td>
                      <td className='party-name'>{allParties[partyId]?.name ?? parties.unk.name}</td>
                      <td className='party-vote'>
                        <input
                          type='number'
                          value={workingPartyVotePercentage[partyId]}
                          onChange={(e) => {
                            setWorkingPartyVotePercentage((prev) => ({
                              ...prev,
                              [partyId]: +e.target.value,
                            }))
                          }}
                        />{' '}
                        %
                      </td>
                      <td className='num-seats'>{value.electorateSeats}</td>
                      <td className='num-seats'>{value.listSeats}</td>
                      <td className='num-seats'>{value.totalSeats}</td>
                      <td className='overhang'>{value.overhang || ''}</td>
                    </tr>
                  ))}
                <tr>
                  <td colSpan={2}></td>
                  <td className='total-seats'>{totals.partyVotePercentage.toFixed(2) + '%'}</td>
                  <td className='total-seats'>{totals.electorateSeats}</td>
                  <td className='total-seats'>{totals.listSeats}</td>
                  <td className='total-seats'>{totals.totalSeats}</td>
                  <td className='total-seats'>{totals.overhang || ''}</td>
                </tr>
              </tbody>
            </table>
            <div className='button-container'>
              <button onClick={() => recalculateAndUpdate()}>Recalculate</button>
              <label className='checkbox-container'>
                Show parties with zero seats
                <input className='hidden' type='checkbox' checked={showPartiesWithNoSeats} onChange={() => setShowPartiesWithNoSeats(!showPartiesWithNoSeats)} />
                <span />
              </label>
            </div>
            <table>
              <thead>
                <tr>
                  <th colSpan={3}>Possible Blocs To Form Majority</th>
                </tr>
                <tr>
                  <th>Parties</th>
                  <th>Total Seats</th>
                  <th>Percentage of Seats</th>
                </tr>
              </thead>
              <tbody>
                {blocs.map((bloc) => (
                  <tr key={`bloc-${bloc.parties.join('-')}`}>
                    <td>
                      {bloc.parties.map((party) => (
                        <span key={`bloc-${bloc.parties.join('-')}-${party}`} className={`party-box ${party}`} />
                      ))}
                    </td>
                    <td>{bloc.numSeats}</td>
                    <td>{bloc.seatPercent.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className='table-message'>
              Please note previous election results may show incorrect seat counts due to the combination of the Mana and Ōhāriu electorates into the Kenepuru electorate following the 2025 Boundary
              Review.
            </div>
          </div>
        )}
        <div className={`${hideMap || mode === Mode.PARTY ? 'hidden-map' : ''}`}>
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
      </div>
      <Options
        isMobile={isMobile}
        results2020={results2020}
        results2023={results2023}
        mode={mode}
        setMode={setMode}
        partyAssignments={partyAssignments}
        setPartyAssignments={setPartyAssignments}
        setPartySeats={setPartySeats}
        selectedParty={selectedParty}
        setSelectedParty={setSelectedParty}
        resetZoom={resetZoom}
        additionalButtons={[exportMapButton]}
        afterUpdateRef={afterUpdateRef}
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
  setPartySeats: React.Dispatch<React.SetStateAction<PartySeats>>
  results2023: PartyAssignments
  results2020: PartyAssignments
  selectedParty: Party
  setSelectedParty: React.Dispatch<React.SetStateAction<Party>>
  resetZoom: (instantly: boolean) => void
  additionalButtons: JSX.Element[]
  afterUpdateRef: RefObject<Nullable<() => void>>
}

const Options: React.FC<OptionsProps> = (props) => {
  const [showLoadModal, setShowLoadModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    return {
      '2020': {
        lab: [50.01, 20, 65, 0], // should be 19 but electorate no longer exists
        nat: [25.58, 10, 33, 0],
        gre: [7.86, 9, 10, 0],
        act: [7.59, 9, 10, 0],
        tpm: [1.17, 1, 2, 0],
        nzf: [2.6, 0, 0, 0],
        top: [1.51, 0, 0, 0],
      },
      '2023': {
        nat: [38.08, 5, 49, 1],
        lab: [26.91, 18, 34, 0], // should be 17 but electorate no longer exists
        gre: [11.6, 12, 15, 0],
        act: [8.64, 9, 11, 0],
        nzf: [6.08, 8, 8, 0],
        tpm: [3.08, 0, 6, 2],
        top: [2.22, 0, 0, 0],
      },
    }
  }, []) as { [year in '2020' | '2023']: { [partyId: string]: number[] } }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(props.partyAssignments, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'nz-electorate-ratings-2026.json'
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
      alert('The selected file was not a valid ratings file.')
    }
  }

  const onLoad = (assignments: PartyAssignments, year: '2020' | '2023' | 'none') => {
    // set assignments after seats are set to avoid conflicts
    props.afterUpdateRef.current = () => {
      props.setPartyAssignments(assignments)
    }

    const electorateCountByParty = getCountByValue(assignments)
    const updatedSeats = {} as PartySeats
    switch (year) {
      case '2020':
        props.setPartySeats((prev) => {
          Object.keys(prev).forEach((party) => {
            updatedSeats[party] = {
              partyVotePercentage: results[2020][party][0],
              listSeats: results[2020][party][1],
              electorateSeats: electorateCountByParty[party] ?? 0,
              totalSeats: results[2020][party][2],
              overhang: results[2020][party][3],
            }
          })
          return updatedSeats
        })
        break
      case '2023':
        props.setPartySeats((prev) => {
          Object.keys(prev).forEach((party) => {
            updatedSeats[party] = {
              partyVotePercentage: results[2023][party][0],
              listSeats: results[2023][party][1],
              electorateSeats: electorateCountByParty[party] ?? 0,
              totalSeats: results[2023][party][2],
              overhang: results[2023][party][3],
            }
          })
          return updatedSeats
        })
        break
      case 'none':
        props.setPartySeats((prev) => {
          Object.keys(prev).forEach((party) => {
            updatedSeats[party] = { partyVotePercentage: 0, electorateSeats: 0, listSeats: 0, totalSeats: 0, overhang: 0 }
          })
          return updatedSeats
        })
        break
    }
    setShowLoadModal(false)
  }

  const loadModal = (
    <Modal onClose={() => setShowLoadModal(false)} className='load-ratings-modal'>
      <h3 className='modal-header'>Load Ratings </h3>
      <div className={`modal-body ${props.isMobile ? 'mobile' : ''}`}>
        <button onClick={() => onLoad(props.results2023, '2023')}>Load 2023 Results</button>
        <button onClick={() => onLoad(props.results2020, '2020')}>Load 2020 Results</button>
        <button onClick={() => onLoad({}, 'none')}>Load Blank Map</button>
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
            <label>Seat Type:</label>
            <select value={props.mode} onChange={(e) => props.setMode(+e.target.value)}>
              <option value={Mode.GENERAL}>General</option>
              <option value={Mode.MAORI}>Māori</option>
              <option value={Mode.PARTY}>Party</option>
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
          <strong>Seat Type</strong>
          <label className={`selector ${props.mode === Mode.GENERAL ? 'selected' : ''}`}>
            <input
              className='hidden'
              type='radio'
              name='general'
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
              name='maori'
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
          <label className={`selector ${props.mode === Mode.PARTY ? 'selected' : ''}`}>
            <input
              className='hidden'
              type='radio'
              name='party'
              value={Mode.PARTY}
              checked={props.mode === Mode.PARTY}
              onChange={() => {
                props.resetZoom(false)
                props.setMode(Mode.PARTY)
              }}
            />
            <span className='party-box' />
            Party
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
