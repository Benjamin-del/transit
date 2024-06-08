import { DateTime } from "luxon";

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()

import config from "../../../../../config.json"
import gtfs_realtime from "../../../../../helpers/realtime_gtfs"
const gtfs_rt = config.gtfs_rt

export default async function handler(req,res) {
    const agency = req.query.agency
    if ((!req.query.trip && !req.query.route) || !agency) {
        console.log("GTFS/VEHICLE: Missing required parameters")
        res.status(400).json({ error: "Missing required parameters" })
        return
    }

    if (!gtfs_rt.includes(agency)) {
        res.status(501).json({ error: "Invalid Agency" })
        console.log("GTFS/VEHICLE:" + agency + " INVALID AGENCY")
        return 
    }
    console.log("GTFS/VEHICLE:" + req.query.trip + " " + agency)
    const feed = await gtfs_realtime.rt_beta("pos", agency)


    const trip = req.query.trip?.split(",") || []
    const route = req.query.route?.split(",") || []

    const ent = feed.entity
    
    const refTrips = ent.filter((x) => {
        if (!x.vehicle.trip) {
            return false
        } else {
            return trip.includes(x.vehicle.trip.tripId) || route.includes(x.vehicle.trip.routeId)
        }
    })
    
    const tripIds = refTrips.map((x) => {
        return x.vehicle.trip.tripId
    })
    console.log("tripIds", tripIds)
    const trips = await prisma.oc_trips.findMany({
        where: {
            trip_id: {
                in: tripIds
            }
        }
    })
    console.log("trips", trips)
    const tripInformation = refTrips.map((x) => {
        const tripInfo = trips.filter((y) => {
            return y.trip_id === x.vehicle.trip.tripId
        })[0]
        console.log("tripInfo", tripInfo)
        return {
            trip: tripInfo,
            tripId: x.vehicle.trip.tripId,
            route: x.vehicle.trip.routeId,
            dir: x.vehicle.trip.directionId,
            geo: true,
            longitude: x.vehicle.position.longitude,
            latitude: x.vehicle.position.latitude,
            time: DateTime.fromSeconds(Number(x.vehicle.timestamp.low), { zone: "America/Toronto" }).toFormat("HH:mm:ss"),
            info: {
                status: x.vehicle.currentStatus,
                stop: x.vehicle.stopId,
            },
            vehicle: x.vehicle.vehicle
        }
    })
    res.json({arrivals: tripInformation})

}
  