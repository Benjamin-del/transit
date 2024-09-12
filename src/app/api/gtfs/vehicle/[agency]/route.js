import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()

import agency from "../../../../../../helpers/agency"
import { DateTime } from "luxon";

export const runtime = "edge"

export async function GET(req) {

    const params = new URL(req.url).searchParams
    const pathname = new URL(req.url).pathname

    const trip = params.get("trip")?.split(",") || []
    const route = params.get("route")?.split(",") || []
    const agencyID = pathname.split("/")[4]

    const agencyInfo = await agency.getAg(agencyID)

    if ((!trip && !req.query.route) || !agencyID) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    if (!agencyInfo || agencyInfo.rt == false) {
        return new Response(JSON.stringify({ error: "Invalid Agency" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const feed = await fetch(agencyInfo.files.filter(x => x.id === "js-pos")[0].url)
    const feedData = await feed.json()

    if (!feedData) {
        return new Response(JSON.stringify({ error: "Error fetching GTFS-RT data" }), {
            status: 500,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    const { data } = feedData

    console.log("routeId", route)
    console.log("tripId", trip)



    const refTrips = data.filter((x) => {
        console.log(x)
        return trip.includes(x.trip_id) || route.includes(x.route_id)
    })

    const stTripIds = refTrips.map(x => x.trip_id)

    const stTrips = await prisma[agencyInfo.db.trips].findMany({
        where: {
            trip_id: {
                in: stTripIds
            }
        }
    })

    const tripInformation = refTrips.map((x) => {
        const tripInfo = stTrips.filter((y) => {
            return y.trip_id === x.trip_id
        })[0]
        //console.log("tripInfo", tripInfo)

        /*
            {
      "id": 1,
      "trip_deleted": false,
      "trip_id": "9924040",
      "route_id": "11",
      "direction": "0",
      "schedule_relationship": null,
      "vehicle_id": 4848,
      "lat": 45.4214630126953,
      "lon": -75.6987152099609,
      "speed": "0",
      "stop_id": null,
      "status": 2,
      "timestamp": 1726072270,
      "congestion_level": "0",
      "occupancy_status": "0"
    },
        */
        return {
            trip: tripInfo,
            tripId: x.trip_id,
            route: x.route_id,
            dir: tripInfo.direction_id,
            geo: true,
            longitude: x.lon,
            latitude: x.lat,
            time: DateTime.fromSeconds(Number(x.timestamp), { zone: "America/Toronto" }).toFormat("HH:mm:ss"),
            info: {
                status: x.status,
                stop: x.stop_id,
            },
            vehicle: {
                id: x.vehicle_id,
                speed: x.speed,
                congestion: x.congestion_level,
                occupancy: x.occupancy_status
            }
        }
    })

    console.log("refTrips", refTrips)
    return new Response(JSON.stringify({
        arrivals: tripInformation
    }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}