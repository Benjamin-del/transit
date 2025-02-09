
// Description: Returns the schedule for a specific stop. 'date' and 'time' query parameters are optional, used to filter results. 'plus' query parameter is optional, used to extend the search window
// Usage: GET /api/gtfs/schedule/:agency?stop=:stop_id&date=:date&time=:time&plus=:plus

import { DateTime } from "luxon";

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()
import agency from '../../../../../../helpers/agency'

// Using to parse dates and to ensure I don't have to deal with timezones
//const zone = "America/Toronto"
export const runtime = "edge"

export async function GET(req) {
    const params = new URL(req.url).searchParams
    const pathname = new URL(req.url).pathname
    const stopid = params.get("stop")
    const agency_id = pathname.split("/")[4]

    const eod = DateTime.now().setZone(agencyInfo.timezone).endOf('day')

    if (!stopid || !agency_id) {
        console.log("GTFS/SCHEDULE: Missing required parameters")
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

        const agencyInfo = await agency.getAg(agency_id)
    
        if (!agencyInfo) {
            console.log("GTFS/SCHEDULE: Agency not found")
            return new Response(JSON.stringify({ error: "Agency not found", results: [] }), {
                status: 400,
                headers: {
                    'content-type': 'application/json',
                },
            });
        }
    
    
    console.log("GTFS/SCHEDULE:" + stopid + " " + agency_id)
    const currentDateParam = params.get("date");
    const currentTimeParam = params.get("time");
    const currentDateTime = DateTime.now().setZone(agencyInfo.timezone);

    const gtfsdt_lx = currentDateParam && currentDateParam !== "undefined"
        ? DateTime.fromFormat(currentDateParam, 'yyyyMMdd').setZone(agencyInfo.timezone).startOf('day')
        : currentDateTime.startOf('day');
    const gtfsdt = Number(gtfsdt_lx.toFormat('yyyyMMdd'));

    const param_gtfshr = currentTimeParam && currentTimeParam !== "undefined"
        ? currentDateTime.set({ hour: currentTimeParam.split(":")[0], minute: currentTimeParam.split(":")[1], second: 0, millisecond: 0 })
        : currentDateTime;
    const gtfshr = Number(param_gtfshr.toFormat('HHmmss'));

    const defPlus = params.get("plus") || 180; // 3 hours (default)
    const eodDiff = eod.diff(param_gtfshr).as('minutes');
    const gtfsmx = Number((eodDiff < defPlus ? eod : param_gtfshr.plus({ minutes: Number(defPlus) })).toFormat('HHmmss'));


    // Get all service days, and then filter out the ones that are not in the acceptable days
    const serviceCalander = await prisma[agencyInfo.db.calendar].findMany()
    const serviceExceptions = await prisma[agencyInfo.db.calendar_dates].findMany()

    const dayOfWeek = gtfsdt_lx.toFormat("EEEE").toLowerCase()
    const accDays = serviceCalander.filter(x => x[dayOfWeek] === "1" && x.start_date <= gtfsdt && x.end_date >= gtfsdt).map(x => x.service_id)
    // Calander_dates is a list of exceptions, 1 = added, 2 = removed
    console.log(String(gtfsdt))
    const serviceRemoved = serviceExceptions.filter(x => x.date === String(gtfsdt) && x.exception_type === "2" /* STRING */).map(x => x.service_id)
    const serviceAdded = serviceExceptions.filter(x => x.date === String(gtfsdt) && x.exception_type === "1" /* STRING */).map(x => x.service_id)

    const todaysService = accDays.filter(x => !serviceRemoved.includes(x)).concat(serviceAdded) /* Remove the removed services and add the added services */

    const stopTimes = await prisma[agencyInfo.db.stop_times].findMany({
        where: {
            stop_id: stopid,
        }
    })
    const tripId = stopTimes.map(x => x.trip_id)

    const trips = await prisma[agencyInfo.db.trips].findMany({
        where: {
            trip_id: {
                in: tripId
            }
        }
    })

    const activeTrips = trips.filter(x => todaysService.includes(x.service_id))

    const recentTimes = stopTimes.filter((x) => {
        return gtfshr <= Number(x.arrival_time.replace(/:/g, "")) && gtfsmx >= Number(x.arrival_time.replace(/:/g, ""))
    }).filter((x) => {
        return activeTrips.find(y => y.trip_id === x.trip_id)
    }).map((x) => {
        const trip = trips.find(y => y.trip_id === x.trip_id)
        /*return {
            route: trip.route_id,
            service_id: trip.service_id,
            arrv: x.arrival_time,
            attribute: "Scheduled at:",
            trip_id: trip.trip_id,
            trip_headsign: trip.trip_headsign.replace(/\"/g, "") || "N/A",
            dir: trip.direction_id,
            block: trip.block_id,
            shape_id: trip.shape_id.replace("\r", ""),
        }*/

        return {
            id: trip.trip_id,
            assigned: {
                trip: true,
                vehicle: false,
                arrival: true
            },
            position: null,
            schedule_relationship: null,
            arrival_time: DateTime.fromFormat(x.arrival_time, "HH:mm:ss").toFormat("hh:mm a"),
            delay: false,
            sequence: x.stop_sequence,
            trip: trip
        }
    })

    const stop = await prisma[agencyInfo.db.stops].findUnique({
        where: {
            stop_id: stopid
        }
    })
    return new Response(JSON.stringify({
        query: {
            time: gtfshr,
            date: gtfsdt,
            stop: stopid,
            agency: agency_id,
            service: {
                added: serviceAdded,
                removed: serviceRemoved,
                active: todaysService
            },
            gtfsmx: gtfsmx,
            realtime: false
        },
        stop: stop || null,
        schedule: recentTimes
    }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}