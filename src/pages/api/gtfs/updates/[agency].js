import { DateTime } from "luxon";
import config from "../../../../../config.json"

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()

import gtfs_realtime from "../../../../../helpers/realtime_gtfs"
import agency from "../../../../../helpers/agency"
export default async function handler(req, res) {

    // Get id's
    const stopId = req.query.stop
    const agencyId = req.query.agency

    // Check if agency is valid
    const agencyInfo = await agency.getAg(agencyId)

    if (!agencyInfo) {
        console.log("GTFS/UPDATES: Invalid Agency")
        res.status(501).json({ error: "Invalid Agency" })
        return
    }
    if (!stopId || !agencyId) { /* Missing required parameters */
        console.log("GTFS/UPDATES: Missing required parameters")
        res.status(400).json({ error: "Missing required parameters" })
        return
    }

    const stop = await prisma[agencyInfo.db.stops].findFirst({
        where: {
            stop_id: stopId
        }
    })
    
    if (!stop) { /* Invalid peramaters */
        console.log("GTFS/UPDATES: Invalid Paramaters")
        res.status(501).json({ error: "Invalid Paramaters" })
        return
    }

    const feed = await gtfs_realtime.rt_beta("trip", agencyId)

    const ent = feed.entity
    const refTimes = ent.filter((x) => {

        if (!x.tripUpdate) {
            return false
        }
        if (!x.tripUpdate.stopTimeUpdate) {
            return false
        }
        return x.tripUpdate.stopTimeUpdate.filter((y) => {
            return y.stopId === stopId
        }).length > 0
    }).map((x) => {
        return {
            tripId: x.tripUpdate.trip.tripId,
            stopTimeUpdate: x.tripUpdate.stopTimeUpdate.filter((y) => {
                return y.stopId === stopId
            })
        }
    })

    const tripIds = refTimes.map((x) => {
        return x.tripId
    })

    const trips = await prisma.oc_trips.findMany({
        where: {
            trip_id: {
                in: tripIds
            }
        }
    })

    const tripInformation = refTimes.map((x) => {
        const tripInfo = trips.filter((y) => {
            return y.trip_id === x.tripId
        })[0]
        return {
            route: tripInfo.route_id,
            service_id: tripInfo.service_id,
            arrv: DateTime.fromSeconds(x.stopTimeUpdate[0].arrival.time.low).toFormat("HH:mm:ss"),
            attribute: "Live ETA:",
            trip_id: tripInfo.trip_id,
            trip_headsign: tripInfo.trip_headsign,
            dir: tripInfo.direction_id,
            block: tripInfo.block_id,
            shape_id: tripInfo.shape_id,
        } 
    })

    return res.json({
        query: {
            stop: stopId,
            realtime_support: true,
            realtime: true,
            accdays: [],
            time: DateTime.fromSeconds(feed.header.timestamp.low, { zone: "America/Toronto" }).toFormat("HH:mm:ss"),
        },
        stop: stop,
        schedule: tripInformation
    })
}