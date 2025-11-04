import type { Parties, TransformGroup } from './electorate-map-types'

/**
 * Currently existing parties
 */
export const parties: Parties = {
  nat: { id: 'nat', name: 'National', color: '#00529f' },
  lab: { id: 'lab', name: 'Labour', color: '#d82a20' },
  gre: { id: 'gre', name: 'Green', color: '#098137' },
  act: { id: 'act', name: 'ACT', color: '#fde401' },
  nzf: { id: 'nzf', name: 'NZ First', color: '#000000' },
  tpm: { id: 'tpm', name: 'Te Pāti Māori', color: '#b2001a' },
  top: { id: 'top', name: 'Opportunities', color: '#09B598' },
  unk: { id: 'unk', name: 'None', color: '#ccc' },
}

/**
 * Currently existing parties and former parties that placed 3rd or better in
 * the cadidate vote for an electorate in 2020 or 2023
 */
export const allParties: Parties = {
  ...parties,
  hea: { id: 'hea', name: 'Heartland*', color: '#185533' },
  dnz: { id: 'dnz', name: 'Democracy NZ*', color: '#30B6C1' },
  nzl: { id: 'nzl', name: 'NZ Loyal*', color: '#FDB813' },
  nco: { id: 'nco', name: 'New Conservative', color: '#00AEEF' },
  ind: { id: 'ind', name: 'Independent', color: '#dcdcdc' },
  can: { id: 'can', name: 'Legalise Cannabis', color: '#33cc33' },
}

/**
 * The transform groups for each city. This contains all of the information needed to generate the exported SVG.
 */
export const cityGroups: TransformGroup[] = [
  {
    title: { name: 'Wellington', x: 410, y: 525 },
    lines: [
      { x1: 335, y1: 550, x2: 380, y2: 505 },
      { x1: 380, y1: 505, x2: 525, y2: 505 },
    ],
    ids: ['wellington-north', 'wellington-bays', 'kenepuru', 'hutt-south', 'remutaka'],
    scale: 6,
    dx: 12,
    dy: 42,
  },
  {
    title: { name: 'Christchurch', x: 245, y: 570 },
    lines: [
      { x1: 160, y1: 700, x2: 240, y2: 550 },
      { x1: 240, y1: 550, x2: 335, y2: 550 },
      { x1: 335, y1: 550, x2: 335, y2: 700 },
    ],
    ids: ['ilam', 'wigram', 'christchurch-central', 'christchurch-east'],
    scale: 8,
    dx: 0,
    dy: 20,
  },
  {
    title: { name: 'Palmerston North', x: 408, y: 420 },
    lines: [
      { x1: 400, y1: 505, x2: 400, y2: 400 },
      { x1: 400, y1: 400, x2: 525, y2: 400 },
    ],
    ids: ['palmerston-north'],
    scale: 6,
    dx: 13,
    dy: 24,
  },
  {
    title: { name: 'Hamilton', x: 30, y: 300 },
    lines: [
      { x1: 0, y1: 400, x2: 120, y2: 400 },
      { x1: 120, y1: 400, x2: 120, y2: 280 },
    ],
    ids: ['hamilton-east', 'hamilton-west'],
    scale: 10,
    dx: -31,
    dy: 16,
  },
  {
    title: { name: 'Mt Maunganui', x: 420, y: 20 },
    lines: [
      { x1: 410, y1: 0, x2: 410, y2: 110 },
      { x1: 410, y1: 110, x2: 525, y2: 110 },
    ],
    ids: ['mt-maunganui'],
    scale: 6,
    dx: 10,
    dy: -20,
  },
  {
    title: { name: 'Auckland', x: 80, y: 20 },
    lines: [
      { x1: 210, y1: 0, x2: 320, y2: 160 },
      { x1: 320, y1: 160, x2: 220, y2: 280 },
      { x1: 220, y1: 280, x2: 0, y2: 280 },
    ],
    ids: [
      'whangaparaoa',
      'east-coast-bays',
      'north-shore',
      'northcote',
      'upper-harbour',
      'henderson',
      'glendene',
      'waitakere',
      'mt-albert',
      'mt-roskill',
      'auckland-central',
      'epsom',
      'tamaki',
      'maungakiekie',
      'pakuranga',
      'botany',
      'otahuhu',
      'mangere',
      'manurewa',
      'takanini',
    ],
    scale: 9,
    dx: -17,
    dy: -13,
  },
  {
    title: { name: 'Tāmaki Makaurau', x: 580, y: 20 },
    lines: [
      { x1: 750, y1: 0, x2: 750, y2: 145 },
      { x1: 525, y1: 145, x2: 750, y2: 145 },
    ],
    ids: ['tamaki-makaurau'],
    scale: 6,
    dx: 48,
    dy: -11,
    isMaori: true,
  },
]
