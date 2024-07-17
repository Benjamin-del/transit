import Head from "next/head"
import { DateTime } from "luxon"

const URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.URL

export default function Home({ data }) {
    const dt = DateTime.fromISO(data.update).setZone("America/Toronto").toFormat("yyyy-MM-dd")
    return (
        <div>
            <Head>
                <title>Benja Transit3 - Open Data Notice</title>
            </Head>
            <main className="flex min-h-screen flex-col items-center justify-between p-24">
                <h2>City of Ottawa</h2>
                <p>GTFS & GTFS-RT Provided By OC Transpo & City Of Ottawa</p>
                <h3>Database Update Logs</h3>
                <div>
                    {data.runs.map((x) => {
                        return (
                            <div key={x.id} className="border border-gray-200 p-4 my-4">
                                <h3>Run ID: {x.id}</h3>
                                <p>Status: {x.status}</p>
                                <p>Conclusion: {x.conclusion}</p>
                                <p>Created: {x.created.split("T")[0]}</p>
                            </div>
                        )
                    })}
                </div>
            </main>
        </div>
    )
}

export async function getServerSideProps() {
    // Fetch data from external API

    const res = await fetch(URL + "/api/status")
    const data = await res.json()
    // Pass data to the page via props
    return { props: { data } }
}
