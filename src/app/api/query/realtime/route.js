import gtfs_realtime from "../../../../../helpers/realtime_gtfs"

import agency from "../../../../../helpers/agency";
import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()

export async function GET(req) {

    const params = new URL(req.url).searchParams
    
    const param_agency = params.get("agency")
    const param_search = params.get("search")?.split(",") || []

    if (!param_search || !param_agency || (param_search.length === 1 && param_search[0] === "")) {
        console.log("GTFS/VEHICLE: Missing required parameters")
        res.status(400).json({ error: "Missing required parameters" , results: []})
        return
    }
    
    const agencyInfo = await agency.getAg(param_agency)
    const feed = await gtfs_realtime.rt_beta("pos", param_agency)

    if (!feed) {
        return new Response({
            error: true,
            status: 502,
            message: "Feed not found"
        })
    }
    const ent = feed.entity

    const refVehicle = ent.filter((x) => {
        if (!x.vehicle.trip) {
            return false
        } else {
            return param_search.includes(x.vehicle.vehicle.id) || param_search.includes(x.vehicle.trip.tripId) || param_search.includes(x.vehicle.trip.routeId)
        } 
    })

    const tripIds = refVehicle.filter((x) => {
        return x.vehicle.trip.tripId
    }).map((x) => {
        return x.vehicle.trip.tripId
    })

    const tripInfo = await prisma[agencyInfo.db.trips].findMany({
        where: {
            trip_id: {
                in: tripIds
            }
        }
    })

    const vheicleTrips = refVehicle.map((x) => {
        const trip = tripInfo.filter((y) => {
            return y.trip_id === x.vehicle.trip.tripId
        })[0]

        return {
            tripId: x.vehicle.trip.tripId || "Unknown",
            trip: trip || null,
            route: x.vehicle.trip.routeId || "Unknown",
            dir: x.vehicle.trip.directionId || "Unknown",
            geo: [x.vehicle.position.longitude, x.vehicle.position.latitude] || ["Unknown", "Unknown"],
            vehicle: x.vehicle.vehicle.id || "Unknown",
            status: x.vehicle.currentStatus || "Unknown",
            details: {
                speed: (Math.round(x.vehicle.position.speed * 3.6) + " Km/h") || "Unknown",
                bearing: x.vehicle.position.bearing || "Unknown",
                odometer: x.vehicle.position.odometer || "Unknown",
                congestion: x.vehicle.congestionLevel || "Unknown",
                occupancy: x.vehicle.occupancyStatus || "Unknown",
                stop: x.vehicle.stopId ? x.vehicle.stopId : "Unknown",
                timestamp: x.vehicle.timestamp.low || "Unknown",             
            },
            query: {
                relation: param_search.includes(x.vehicle.vehicle.id) ? "Vehicle" : param_search.includes(x.vehicle.trip.tripId) ? "Trip" : "Route",
                search: param_search.includes(x.vehicle.vehicle.id) ? x.vehicle.vehicle.id : param_search.includes(x.vehicle.trip.tripId) ? x.vehicle.trip.tripId : x.vehicle.trip.routeId
            }
        }
    })


    return new Response(JSON.stringify({error: false, status: 200, count: vheicleTrips.length, results: vheicleTrips}), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });

}