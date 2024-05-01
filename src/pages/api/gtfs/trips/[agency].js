import gtfs_static from "../../../../../helpers/fetch_gtfs"
import { DateTime } from "luxon";


export const config = {
    runtime: 'edge', // this is a pre-requisite
};

export default async function handler(req, res) {
    const params = new URL(req.url).searchParams
    const pathname = new URL(req.url).pathname
    const tripid = params.get("trip")
    const queryStop = params.get("stop")

    const ag = pathname.split("/")[4]
    if (!tripid || !ag) {
        console.log("GTFS/TRIPS: Missing required parameters")
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const times = await gtfs_static.download("stop_times.txt", ag)
    const stops = await gtfs_static.download("stops.txt", ag)
    const trip = await gtfs_static.download("trips.txt", ag)

    const thisTrip = trip.filter((x) => {
        return x.split(",")[2] === tripid
    }).map((x) => {
        const dts = x.split(",")
        return {
             //route_id,service_id,trip_id,trip_headsign,direction_id,block_id,shape_id
            route: dts[0],
            service_id: dts[1],
            trip_id: dts[2],
            trip_headsign: dts[3].replace(/\"/g, ""),
            dir: dts[4],
            block_id: dts[5],
            shape: dts[6].replace("\r", "")
        }
    })[0]
    const now = Number(DateTime.now().setZone("America/Toronto").toFormat("HHmmss"))

    const ftldtms = times.filter((x) => {
        return x.split(",")[0] === tripid
    }).sort((a, b) => {
        return a.split(",")[3] - b.split(",")[3]
    }).map((x) => {
        const dts = x.split(",")
        //tripid,arrival_time,stop_id,stop_sequence

        const stop = stops.filter((y) => {
            return y.split(",")[0] === dts[2]
        }).map((y) => {
            const dts = y.split(",")
            return {
                //stop_id,stop_code,stop_name,stop_lat,stop_lon
                id: dts[0],
                code: dts[1],
                name: dts[2].replace(/\"/g, ""),
                geo: [Number(dts[3]), Number(dts[4])],
                currentStop: queryStop === y.split(",")[0]
            }
        })[0]

        return {
            //trip_id: dts[0],
            arrival_time: dts[1],
            stop: stop,
            stop_sequence: dts[4],
            location: {
                passed: now > Number(dts[1].replace(/:/g, "")),
                atStop: now.toString().substring(0, 4) - dts[1].replace(/:/g, "").substring(0, 4) === 0
            }
        }
    })
    return new Response(JSON.stringify({
        query: {
            trip: tripid,
            stop: queryStop
        },
        trip: ftldtms,
        tripInfo: thisTrip
        }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}