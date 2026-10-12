import Hero from './components/Hero.jsx'
import Rail from './components/Rail.jsx'
import Footer from './components/Footer.jsx'
import { Contact, Ethos, Mission, Team } from './components/Sections.jsx'

export default function App() {
  return (
    <>
      <Hero />
      <Rail />
      <main>
        <Ethos />
        <Mission />
        <Team />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
