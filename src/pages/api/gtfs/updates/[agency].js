import { DateTime } from "luxon";
import config from "../../../../../config.json"
const gtfs_rt = config.gtfs_rt

import helper_stops from "../../../../../helpers/stops"
import gtfs from "../../../../../helpers/fetch_gtfs"
import gtfs_realtime from "../../../../../helpers/realtime_gtfs"

export default async function handler(req, res) {
    const agency = req.query.agency
    if (!gtfs_rt.includes(agency)) {
        res.status(400).json({ error: "Invalid Agency" })
        return 
    }

    const stopId = req.query.stop

    const trips = await gtfs.download("trips.txt", agency)

    if (!trips || !stopId) {
        res.status(400).json({ error: "Missing required parameters" })
    }
    const stop = await helper_stops.get(stopId, agency)
    if (!stop) {
        res.status(404).json({ error: "404" })
        return
    }
    function cacheTrips(tripId) {
        //console.log("tripId", tripId)
        return trips.filter((x) => {
            return x.split(",")[2] === tripId
        }).map((x) => {
            //route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
            return {
                route: x.split(",")[0],
                service_id: x.split(",")[1],
                trip_id: x.split(",")[2],
                trip_headsign: x.split(",")[3],
                dir: x.split(",")[4],
                shape: x.split(",")[5],
            }
        })[0]
    }
    const feed = await gtfs_realtime.realtime("trip", agency)

    function getarrv(stopTimeUpdate) {
        return stopTimeUpdate.filter((x) => {
            //console.log(x.stopId,stop)
            //console.log(x.arrival.time)
            if (!x.arrival && !x.departure) {
                console.log("ERROR!", x)
                return false
            }
            return x.stopId === stopId
            
        }).map((x) => {
            //console.log(x)
            function getTime(x) {
                console.log(x)
                console.log("time1", x)
                if (!x.arrival && x.departure) {
                    console.log("-ARRV DEP")
                    return {
                        attribute: "Departing at:",
                        time: DateTime.fromSeconds(x.departure.time.low, { zone: "America/Toronto" }) 
                    }
                } else if (x.arrival && !x.departure) {
                    console.log("ARRV -DEP")
                    return {
                        attribute: "Live ETA:",
                        time: DateTime.fromSeconds(x.arrival.time.low, { zone: "America/Toronto" })
                    }
                } else if (x.arrival && x.departure) {
                    console.log("ARRV + DEP")
                    console.log(x.arrival.time)
                    return {
                        attribute: "Live ETA:",
                        time: DateTime.fromSeconds(x.arrival.time.low || x.arrival.time, { zone: "America/Toronto" })
                    }
                } else {
                    console.log("ERROR!", x)
                    return {
                        attribute: "Error",
                        time: DateTime.fromSeconds(0, { zone: "America/Toronto" })
                    }
                }
            }
            const tm = getTime(x)
            return {
                time: tm.time.toFormat("hh:mm:ss"),
                time_arr: tm.attribute,
                scheduleRelationship: x.scheduleRelationship,
            }
        })
    }
    const fdRes = []
    const ent = feed.entity
    for (const x of ent) {

        const fnarrv = getarrv(x.tripUpdate.stopTimeUpdate)[0]
        if (fnarrv) {
            const trip = cacheTrips(x.tripUpdate.trip.tripId)
            if (!trip) {
                console.log("Trip not found")
                console.log("tripId", x.tripUpdate.trip.tripId)
                continue
            }
            //console.log(trip)
            fdRes.push({
                route: x.tripUpdate.trip.routeId,
                service_id: trip.service_id,
                arrv: fnarrv.time,
                attribute: fnarrv.time_arr,
                trip_id: x.tripUpdate.trip.tripId,
                trip_headsign: trip.trip_headsign.replace(/\"/g, ""),
                dir: x.tripUpdate.trip.directionId,
                shape: trip.shape,
            })
        }
    }
    function getts(timest) {
        if (!timest) {
            return DateTime.now().setZone("America/Toronto").toFormat("HHmmss")
        } else {
            return DateTime.fromSeconds(feed.header.timestamp.low, { zone: "America/Toronto" }).toFormat("HHmmss")
        }
    }
    const query = {
        stop: stopId,
        realtime_support: true,
        realtime: true,
        accdays: ["today"],
        time: getts(feed.header.timestamp.low)
    }
    res.status(200).json({ query: query, stop: stop, schedule: fdRes })
    return
}