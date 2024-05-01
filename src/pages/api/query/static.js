export const config = {
    runtime: "edge",
}

import gtfs_static from "../../../../helpers/fetch_gtfs" /* Since I am going for an indepth search, I will need to use the static GTFS data directly */

export default async function handler(req, res) {
    const params = new URL(req.url).searchParams

    const agency = params.get("agency")
    const query = params.get("search").split(",")
    console.log(query.length)
    
    if (!agency || !query || (query.length === 1 && query[0] === "")) {
        console.log("GTFS/SCHEDULE: Missing required parameters")
        return new Response(JSON.stringify({ error: "Missing required parameters" , results: []}), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const trips = await gtfs_static.download("trips.txt", agency)

    const ftldtrips = trips.filter((x) => {
        const dts = x.split(",")
        return dts.some(element => query.includes(element));
    }).map((x) => {
        const dts = x.split(",")
        return {
            trip: {
                route: dts[0],
                service_id: dts[1],
                trip_id: dts[2],
                trip_headsign: dts[3].replace(/\"/g, "") || "Unknown",
                dir: dts[4],
                block_id: dts[5],
                shape: dts[6],
            },
            query: {
                relation: query.includes(dts[0]) ? "Route" : query.includes(dts[1]) ? "Service" : query.includes(dts[2]) ? "Trip" : query.includes(dts[3]) ? "Headsign" : query.includes(dts[4]) ? "Direction Id" : query.includes(dts[5]) ? "Block" : query.includes(dts[6]) ? "Shape" : "Unknown",
                search: query.includes(dts[0]) ? dts[0] : query.includes(dts[1]) ? dts[1] : query.includes(dts[2]) ? dts[2] : query.includes(dts[3]) ? dts[3] : query.includes(dts[4]) ? dts[4] : query.includes(dts[5]) ? dts[5] : query.includes(dts[6]) ? dts[6] : "Unknown"
            }
        }
    })

    return new Response(JSON.stringify({ error: false, status: 200, count: ftldtrips.length, results: ftldtrips }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}