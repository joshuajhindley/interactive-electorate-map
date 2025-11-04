import { ElectorateMap } from './ElectorateMap'
import './App.css'
import { Footer } from './Footer'
import { useEffect, useState } from 'react'

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoint)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])
  return isMobile
}

const App = () => {
  const isMobile = useIsMobile()
  return (
    <>
      <main className={`main${isMobile ? ' mobile' : ''}`}>
        {isMobile ? <h2>Interactive New Zealand Electorate Map</h2> : <h1>Interactive NZ Electorate Map</h1>}
        <ElectorateMap isMobile={isMobile} />
      </main>
      <Footer />
    </>
  )
}

export default App
