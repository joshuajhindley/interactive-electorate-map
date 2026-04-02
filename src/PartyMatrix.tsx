import React from 'react'
import { realParties } from './electorate-map-constants'
import './PartyMatrix.scss'

type PartyMatrixProps = {
  partyCompatibility: { [id: string]: boolean }
  togglePartyCompatibility: (partyId1: string, partyId2: string) => void
}

const PartyMatrix: React.FC<PartyMatrixProps> = ({ partyCompatibility, togglePartyCompatibility }) => {
  const partyKeys = Object.keys(realParties)

  return (
    <div>
      <div className='party-matrix-table-wrapper'>
        <table>
          <thead>
            <tr>
              <th />
              {partyKeys.map((key) => (
                <th key={key} className='party-header' style={{ borderTop: `5px solid ${realParties[key].color}` }}>
                  <div>{realParties[key].name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {partyKeys.map((rowKey) => (
              <tr key={rowKey}>
                <td className='party-header' style={{ borderLeft: `5px solid ${realParties[rowKey].color}` }}>
                  <strong>{realParties[rowKey].name}</strong>
                </td>

                {partyKeys.map((colKey) => {
                  if (colKey === rowKey) {
                    return <td />
                  }

                  // Both "nat-lab" and "lab-nat" result in the same key "lab-nat"
                  const pairKey = [rowKey, colKey].sort().join('-')
                  const isChecked = partyCompatibility[pairKey] || false

                  return (
                    <td
                      className={`${'party-cell'}${isChecked ? ' checked' : ''}`}
                      key={`${rowKey}-${colKey}`}
                      data-tooltip={realParties[rowKey].name + ' and ' + realParties[colKey].name}
                      onClick={() => togglePartyCompatibility(rowKey, colKey)}
                    >
                      <label className={`selector${isChecked ? ' selected' : ''}`}>
                        <input className='hidden' type='checkbox' checked={isChecked} readOnly />
                        <span className='party-box' onClick={() => togglePartyCompatibility(rowKey, colKey)} />
                      </label>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PartyMatrix
