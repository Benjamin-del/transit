import { DateTime } from "luxon";

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()

import agency from "../../../../../helpers/agency";

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

    const agencyInfo = await agency.getAg(ag)


    const trip = await prisma[agencyInfo.db.trips].findUnique({
        where: {
            trip_id: tripid
        }
    })

    const times = await prisma[agencyInfo.db.stop_times].findMany({
        where: {
            trip_id: tripid
        }
    })

    const tripStops = times.map((x) => {
        return x.stop_id
    })

    const stops = await prisma[agencyInfo.db.stops].findMany({
        where: {
            stop_id: {
                in: tripStops
            }
        }
    })
    const now = Number(DateTime.now().setZone("America/Toronto").toFormat("HHmmss"))

    const ftldtms = times.map((x) => {
        const stop = stops.filter((y) => {
            return y.stop_id === x.stop_id
        })[0]

        return {
            arrival_time: x.arrival_time,
            stop: {
                id: stop.stop_id,
                code: stop.stop_code,
                name: stop.stop_name,
                geo: [stop.stop_lat, stop.stop_lon],
                currentStop: queryStop === stop.stop_id
            },
            stop_sequence: x.stop_sequence,
            location: {
                passed: now > Number(x.arrival_time.replace(/:/g, "")),
                atStop: now.toString().substring(0, 4) - x.arrival_time.replace(/:/g, "").substring(0, 4) === 0
            }
        }
    })

    return new Response(JSON.stringify({
        query: {
            trip: tripid,
            stop: queryStop
        },
        trip: ftldtms,
        tripInfo: trip,
        }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}