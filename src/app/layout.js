// Import globals.css

import "../styles/globals.css"

export default function RootLayout({ children }) {
    return (
      <html lang="en">
        <body>
          {/* Layout UI */}
          <main>{children}</main>
        </body>
      </html>
    )
  }
export const metadata = {
  title: 'Benja Transit | NCR Public Transit Tracker',
}