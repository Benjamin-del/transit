// Import globals.css

import "../styles/globals.css"
//import "../styles/trackbar.css"
import { Nunito } from 'next/font/google'
 
// If loading a variable font, you don't need to specify the font weight
const inter = Nunito({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
})

export default function RootLayout({ children }) {
    return (
      <html lang="en" className={inter.className}>
        <body>
          {children}
        </body>
      </html>
    )
  }
export const metadata = {
  title: 'LongitudeTransit | Ottawa Public Transit Tracker',
}