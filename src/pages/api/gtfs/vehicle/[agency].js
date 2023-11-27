import { DateTime } from "luxon";
import gtfs from "../../../../../helpers/fetch_gtfs"
import config from "../../../../../config.json"
import gtfs_realtime from "../../../../../helpers/realtime_gtfs"
const gtfs_rt = config.gtfs_rt

export default async function handler(req,res) {
    const agency = req.query.agency
    if (!gtfs_rt.includes(agency)) {
        res.status(400).json({ error: "Invalid Agency" })
        return 
    }

    const feed = await gtfs_realtime.realtime("vehicule", agency)
    const trips = await gtfs.download("trips.txt", agency)
    function cacheTrips(tripId) {
        console.log("tripId", tripId)
        return trips.filter((x) => {
            return x.split(",")[2] === tripId
        }).map((x) => {
            return {
                route: x.split(",")[0],
                service_id: x.split(",")[1],
                trip_id: x.split(",")[2],
                trip_headsign: x.split(",")[3].replace(/\"/g, ""),
                dir: x.split(",")[4],
                shape: x.split(",")[5],
            }
        })[0]
    }

    const trip = req.query.trip.split(",")
    const ent = feed.entity
        
    const ftld = ent.filter((x) => {
        //console.log(x.vehicle.trip)
        if (!x.vehicle.trip) {
            return false
        } else {
            return trip.includes(x.vehicle.trip.tripId)
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
  