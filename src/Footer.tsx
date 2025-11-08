import React, { useState } from 'react'
import './Footer.css'
import Modal from './Modal'

export const Footer: React.FC<{}> = () => {
  const [showLicense, setShowLicense] = useState(false)

  return (
    <>
      <footer>
        Interactive NZ Electorate Map v1.0.2
        <br />
        Created by Joshua Hindley -{' '}
        <a target='_blank' href='https://twitter.com/jhindleynz'>
          @jhindleynz
        </a>
        <br />
        <u>
          <span className='license-link' onClick={() => setShowLicense(true)}>
            License & Acknowledgements
          </span>
        </u>
      </footer>
      {showLicense && (
        <Modal onClose={() => setShowLicense(false)}>
          <h2>Acknowledgements</h2>
          <p>
            A big thanks to Rustie from{' '}
            <a target='_blank' href='https://x.com/Overhang_AoNZ'>
              The Overhang
            </a>{' '}
            for letting me use his{' '}
            <a target='_blank' href='https://x.com/Overhang_AoNZ/status/1953634192140747254'>
              analysis
            </a>{' '}
            on the effects of the new boundaries for each electorate. Be sure to check out his work if you haven't already.
          </p>
          <hr />
          <h2>License Information</h2>
          <p>This project uses geospatial data from Stats NZ and Land Information New Zealand (LINZ).</p>
          <p>
            <a target='_blank' href='https://datafinder.stats.govt.nz/layer/122741-general-electorates-2025/'>
              General Electorates 2025
            </a>{' '}
            — Stats NZ, via Stats NZ Geographic Data Service.
            <br />
            <a target='_blank' href='https://datafinder.stats.govt.nz/layer/122742-maori-electorates-2025/'>
              Māori Electorates 2025
            </a>{' '}
            — Stats NZ, via Stats NZ Geographic Data Service.
            <br />
            <a target='_blank' href='https://data.linz.govt.nz/layer/51153-nz-coastlines-and-islands-polygons-topo-150k/'>
              NZ Coastlines and Islands Polygons (Topo 1:50k)
            </a>{' '}
            — LINZ, via LINZ Data Service.
          </p>
          <p>
            The <i>General Electorates 2025</i> and <i>Māori Electorates 2025</i> datasets have modified using the <br />
            <i>NZ Coastlines and Islands Polygons (Topo 1:50k)</i> dataset and simplified for use in this project.
            <br />
            <br />
            These datasets are licensed under{' '}
            <a target='_blank' href='https://creativecommons.org/licenses/by/4.0/'>
              Creative Commons Attribution 4.0 International (CC BY 4.0)
            </a>
          </p>
          <p>
            <a href='https://www.flaticon.com/free-icons/new-zealand' title='new zealand icons'>
              New Zealand icons created by Three musketeers - Flaticon
            </a>
          </p>
          <hr />
          <h2>Project License</h2>
          <p>
            The source code, map rendering logic, and user interface of this project are licensed under the{' '}
            <a target='_blank' href='https://en.wikipedia.org/wiki/MIT_License'>
              MIT License
            </a>
            <br />© 2025 Joshua Hindley. See the{' '}
            <a target='_blank' href='https://github.com/joshuajhindley/interactive-electorate-map/blob/master/LICENSE'>
              license file
            </a>{' '}
            for details.
          </p>
          <button onClick={() => setShowLicense(false)}>Close</button>
        </Modal>
      )}
    </>
  )
}
