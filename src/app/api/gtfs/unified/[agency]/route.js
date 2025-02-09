
// Description: Returns the real-time vehicle positions for a given route or trip. Either 'trip' or 'route' query parameters are required
// Usage: GET /api/gtfs/vehicle/:agency?trip=:trip_id&route=:route_id

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()

import agency from "../../../../../../helpers/agency"
import { DateTime } from "luxon";

export const runtime = "edge"

export async function GET(req) {

    const params = new URL(req.url).searchParams
    const pathname = new URL(req.url).pathname


    const stop = params.get("stop") // Unified queries by stop_id

    const agencyID = pathname.split("/")[4]

    const agencyInfo = await agency.getAg(agencyID)

    if (!stop || !agencyID || !agencyInfo || agencyInfo.rt == false) {
        return new Response(JSON.stringify({ error: "Malformed Request - Missing Parameters OR Agency not found" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const stopInfo = await prisma[agencyInfo.db.stops].findUnique({
        where: {
            stop_id: stop
        }
    })

    if (!stopInfo) {
        return new Response(JSON.stringify({ error: "Stop not found" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const tripUpdates = await fetch(agencyInfo.files.filter(x => x.id === "js-updates")[0].url)
    const tripData = await tripUpdates.json() // tripData is a mofidied version of the GTFS-RT spec, as it is being cached from a database
    
    if (!tripData) {
        return new Response(JSON.stringify({ error: "Error fetching GTFS-RT data FILE:UPDATE" }), {
            status: 500,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    // Filter by stop_id

    const stopData = tripData.data.filter(x => x.stop_id === stop)
    const tripIds = stopData.map(x => x.trip_id)

    const tripGTFS = await prisma[agencyInfo.db.trips].findMany({
        where: {
            trip_id: {
                in: tripIds
            }
        }
    })

    const arrivalTimes = await prisma[agencyInfo.db.stop_times].findMany({ // Looking for the scheduled arrival time for the stop
        where: {
            AND: [
                {
                    stop_id: stop
                },
                {
                    trip_id: {
                        in: tripIds
                    }
                }
            ]
        }
    })

    const vehicleData = await fetch(agencyInfo.files.filter(x => x.id === "js-pos")[0].url)
    const positionData = await vehicleData.json() // positionData is a mofidied version of the GTFS-RT spec, as it is being cached from a database

    const stopArrivals = tripData.data.filter(x => tripIds.includes(x.trip_id) && x.stop_id === stop).map(x => {
        // Filter Other Data Sources
        const thisVehicle = positionData.data.filter(y => y.trip_id === x.trip_id)[0]
        const thisTrip = tripGTFS.filter(y => y.trip_id === x.trip_id)[0]
        const thisArrival = arrivalTimes.filter(y => y.trip_id === x.trip_id)[0]

        const delay = function () {
            if (!thisArrival || !x.arrival_time) {
                return null
            }
            //console.log(typeof x.arrival_time)
            const scheduledTime = DateTime.fromFormat(thisArrival.arrival_time, "HH:mm:ss").setZone(agencyInfo.timezone, { keepLocalTime: true })
            const actualTime = DateTime.fromSeconds(x.arrival_time).setZone(agencyInfo.timezone/*, { keepLocalTime: true }*/);

            return {
                estimated: x.delay,
                actual: Math.round(actualTime.diff(scheduledTime, "minutes").toObject().minutes)
            }
        }()
        return {
            id: x.trip_id,
            assigned: { // Sent to Front end to detemine cause of errors. Assigned means there was data found for the specific data source. 
                trip: thisTrip ? true : false, // GTFS Static Trip Information (Headsign, etc...)
                vehicle: thisVehicle ? true : false, // Real time position
                arrival: thisArrival ? true : false // Scheduled Arrival Time. Usualy found when trip is assigned
            },
            position: thisVehicle ? { // Simplify Realtime Information. 
                lat: thisVehicle.lat,
                lon: thisVehicle.lon,
                speed: thisVehicle.speed,
                status: thisVehicle.status,
                id: thisVehicle.vehicle_id,
            } : null, 
            schedule_relationship: x.schedule_relationship, // GTFS-RT Schedule Relationship, currenty not used, but will be in place for update.
            arrival_time: x.arrival_time ? DateTime.fromSeconds(x.arrival_time).setZone(agencyInfo.timezone).toFormat("hh:mm a") : null, // Real Time Arrival Time
            //attribute: "Scheduled", // Attribute is used to determine the status of the trip, working on removing this
            delay: delay, // Delay in minutes, if the trip is delayed. If Arrival Time is not found, delay is null. 
            sequence: x.sequence, // Order of stop in the trip
            trip: thisTrip ? thisTrip : null, // Static GTFS Trip information, usualy found
            arrival: thisArrival ? thisArrival : null // Scheduled Arrival Time. thisArrival.stop_sequence is the same as x.sequence, should match, if not, there is an error
        }
    }
    )

    console.log("tz", agencyInfo.timezone)

    return new Response(JSON.stringify({
        query: { // Query Information. 
            stop: stop,
            agTz: agencyInfo.timezone // Agency Timezone
        }, 
        stop: stopInfo, // Send Stop Information, for reference
        arrivals: stopArrivals,
    }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}