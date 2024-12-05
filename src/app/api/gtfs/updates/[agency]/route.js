
// Description: Returns the real-time updates for a specific route, uses static data from the GTFS-RT feed, to detemine on-time status
// Usage: GET /api/gtfs/updates/:agency?trip=:trip_id

import { DateTime } from "luxon";

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()

import agency from "../../../../../../helpers/agency";

export const runtime = "edge"

export async function GET(req) {

    const params = new URL(req.url).searchParams
    const pathname = new URL(req.url).pathname

    const stop = params.get("stop")
    const agencyID = pathname.split("/")[4]

    if (!stop || !agencyID) {
        console.log("GTFS/UPDATES: Missing required parameters")
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const agencyInfo = await agency.getAg(agencyID)

    // Use the new Realtime DB proxy (js-updates)

    const feed = await fetch(agencyInfo.files.filter(x => x.id === "js-updates")[0].url)
    const feedData = await feed.json()

    if (!feedData) {
        return new Response(JSON.stringify({ error: "Error fetching GTFS-RT data" }), {
            status: 500,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    /* {
            "route": "61",
            "service_id": "16",
            "arrv": "10:36:49",
            "attribute": "Scheduled at:",
            "trip_id": "13000050",
            "trip_headsign": "Tunney's Pasture",
            "dir": "1",
            "block": "104296205",
            "shape_id": "shp-61-16"
        },*/
    const stopArrivals = feedData.data.filter((x) => {
        return x.stop_id === stop
    })

    const tripInfo = await prisma[agencyInfo.db.trips].findMany({
        where: {
            trip_id: {
                in: stopArrivals.map(x => x.trip_id)
            }
        }
    })

    const stTimes = await prisma[agencyInfo.db.stop_times].findMany({
        where: {
            AND: [
                {
                    stop_id: stop
                },
                {
                    trip_id: {
                        in: tripInfo.map(x => x.trip_id)
                    }
                }
            ]
        }
    })


    /*
      {
    "id": "153999",
    "trip_id": "3398050",
    "stop_id": "999",
    "arrival_time": "1726145685",
    "delay": null,
    "schedule_relationship": "0"
  },
    */

    const unixNow = Math.round(DateTime.now().toSeconds())
    const arrivalMap = stopArrivals.sort((a, b) => {
        return a.arrival_time - b.arrival_time // Sort by arrival time
    }).filter((x) => {
        return x.arrival_time > unixNow
    }).map((x) => {
        const trip = tripInfo.filter((y) => {
            return y.trip_id === x.trip_id
        })[0] // Get the trip info

        const arrvTime = DateTime.fromSeconds(Number(x.arrival_time)).setZone("America/Toronto")

        const refStTime = stTimes.filter(y => y.trip_id === x.trip_id)[0]

        const refStTimeObj = refStTime ? DateTime.fromFormat(refStTime.arrival_time, "HH:mm:ss") : null


        const arrvStDiff = Math.round(arrvTime.diff(refStTimeObj, "minutes").toObject().minutes)
        const arrvStDiffStr = arrvStDiff > 0 ? (arrvStDiff + " minutes late") : (arrvStDiff < 0 ? (Math.abs(arrvStDiff) + " minutes early") : "On time")

        // Get arrival in minutes compared to current time
        const diff = Math.round(arrvTime.diffNow("minutes").toObject().minutes) + " minutes (" + arrvTime.toFormat("HH:mm") + ")"
        return {
            route: trip?.route_id,
            service_id: trip?.service_id,
            arrv: diff,
            attribute: "Arriving in",
            trip_id: x.trip_id,
            trip_headsign: trip?.trip_headsign,
            dir: trip?.direction_id,
            block: trip.block_id,
            shape_id: trip?.shape_id,
            active: trip ? true : false,
            status: {
                schedule_time: refStTime ? refStTime.arrival_time : null,
                scheduled: refStTime ? true : false,
                scheduled_diff: arrvStDiffStr,
                scheduled_diff_min: arrvStDiff
            }
        }
    }).filter(x => {
        return x.active /*&& x.arrv > 0*/
    })

    const stopInfo = await prisma[agencyInfo.db.stops].findUnique({
        where: {
            stop_id: stop
        }
    })

    return new Response(JSON.stringify({

        query: {
            stop: stop,
            service: {},
            realtime: true,
            agency: agencyID
        },
        stop: stopInfo,
        schedule: arrivalMap,
    }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}