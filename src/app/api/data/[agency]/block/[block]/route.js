import agency from "../../../../../../../helpers/agency";
import { PrismaClient } from '@prisma/client/edge'

import { DateTime } from "luxon";
const prisma = new PrismaClient()

export const runtime = "edge"

export async function GET(req) {
    const params = new URL(req.url).searchParams
    //const agencyId = params.get("agency")
    //const blockId = params.get("block")

    const pathname = new URL(req.url).pathname
    const agencyId = pathname.split("/")[3]
    const blockId = pathname.split("/").pop()

    console.log(agencyId, blockId)

    const format = params.get("format") || "json"

    if (!agencyId || !blockId) {
        console.log("GTFS/SCHEDULE: Missing required parameters")
        return new Response(JSON.stringify({ error: "Missing required parameters", results: [] }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }


    const agencyInfo = await agency.getAg(agencyId)

    if (!agencyInfo) {
        console.log("GTFS/SCHEDULE: Agency not found")
        return new Response(JSON.stringify({ error: "Agency not found", results: [] }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const blockTrips = await prisma[agencyInfo.db.trips].findMany({
        where: {
            block_id: blockId
        }
    })

    // Use Prisma.$transaction to get all of the first stop times for each trip (findFirst())

    const firstStops = await prisma.$transaction(blockTrips.map((x) => {
        return prisma[agencyInfo.db.stop_times].findFirst({
            where: {
                trip_id: x.trip_id
            },
            orderBy: {
                stop_sequence: "asc"
            }
        })
    }))

    const lastStops = await prisma.$transaction(blockTrips.map((x) => {
        return prisma[agencyInfo.db.stop_times].findFirst({
            where: {
                trip_id: x.trip_id
            },
            orderBy: {
                stop_sequence: "desc"
            }
        })
    }))

    var tripInformation = firstStops.map((x) => {
        const thisTrip = blockTrips.filter((y) => {
            return y.trip_id === x.trip_id
        })[0]

        console.log(x.arrival_time)

        const lastStop = lastStops.filter((y) => y.trip_id === x.trip_id)[0];

        return {
            id: x.trip_id,
            route_id: thisTrip.route_id,
            service_id: thisTrip.service_id,
            trip_headsign: thisTrip.trip_headsign,
            direction_id: thisTrip.direction_id,
            block_id: thisTrip.block_id,
            trip_start: x.arrival_time,
            trip_end: lastStop ? lastStop.arrival_time : null,
            first_stop: x.stop_id,
            last_stop: lastStop ? lastStop.stop_id  : null,
        }
    }).sort((a, b) => {
        return Number(a.trip_start.replace(/:/g, "")) - Number(b.trip_start.replace(/:/g, ""))
    })

    if (format === "array") {

        if (tripInformation.length === 0) {
            return new Response(JSON.stringify({ error: "No results", results: [], header: null, length: 0 }), {
                status: 200,
                headers: {
                    'content-type': 'application/json',
                },
            });
        }
        var header = Object.keys(tripInformation[0])
        var tripInformation = tripInformation.map((x) => {
            return Object.values(x)
        })
    }

    return new Response(JSON.stringify({ header: header, results: tripInformation, length: tripInformation.length }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}