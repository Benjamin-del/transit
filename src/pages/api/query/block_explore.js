import agency from "../../../../helpers/agency";
import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()
import { DateTime } from 'luxon'

import * as turf from '@turf/helpers'
import { headers } from "next/headers";

export const config = {
    runtime: "edge",
}

export default async function handler(req, res) {

    const params = new URL(req.url).searchParams
    const agencyId = params.get("agency")
    const blockId = params.get("block")

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
        return {
            trip_id: x.trip_id,
            route_id: thisTrip.route_id,
            service_id: thisTrip.service_id,
            trip_headsign: thisTrip.trip_headsign,
            direction_id: thisTrip.direction_id,
            block_id: thisTrip.block_id,
            first_stop: x.stop_id,
            start_time: x.arrival_time,
            end_time: (lastStops.filter((y) => {
                return y.trip_id === x.trip_id
            })[0].arrival_time)
        }
    }).sort((a, b) => {
        return Number(a.start_time.replace(/:/g, "")) - Number(b.start_time.replace(/:/g, ""))
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