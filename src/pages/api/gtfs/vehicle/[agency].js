import { DateTime } from "luxon";
import gtfs from "../../../../../helpers/fetch_gtfs"
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
    const feed = await gtfs_realtime.realtime("VehiclePositions", agency)
    const trips = await gtfs.download("trips.txt", agency)
    function cacheTrips(tripId) {
        console.log("tripId", tripId)
        return trips.filter((x) => {
            return x.split(",")[2] === tripId
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
                shape_id: dts[6],
            }
        })[0]
    }

    const trip = req.query.trip?.split(",") || []
    const route = req.query.route?.split(",") || []

    const ent = feed.entity
        
    const ftld = ent.filter((x) => {
        
        console.log(x.vehicle)
        if (!x.vehicle.trip) {
            return false
        } else {
            return trip.includes(x.vehicle.trip.tripId) || route.includes(x.vehicle.trip.routeId)
        }
    }).map((x) =>{
        console.log(x)
        const pt = {
            trip: cacheTrips(x.vehicle.trip.tripId),
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

        return pt
    })
    res.json({arrivals: ftld})

}
  