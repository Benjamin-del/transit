import agency from "../../../../../../helpers/agency";
import { PrismaClient } from '@prisma/client/edge'

import { DateTime } from "luxon";
const prisma = new PrismaClient()

export const runtime = "edge"

export async function GET(req) {
    const params = new URL(req.url).searchParams

    const pathname = new URL(req.url).pathname

    const agency_id = pathname.split("/")[3]
    const route_id = params.get("route")
    const agencyInfo = await agency.getAg(agency_id)

    if (!agencyInfo) {
        console.log("GTFS/SCHEDULE: Agency not found", agency_id)
        return new Response(JSON.stringify({ error: "Agency not found", results: [] }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }


    const todayDate = DateTime.now().setZone("America/Toronto")
    const gtfsdt = Number(todayDate.toFormat('yyyyMMdd'));

    const serviceCalander = await prisma[agencyInfo.db.calendar].findMany()
    const serviceExceptions = await prisma[agencyInfo.db.calendar_dates].findMany()

    const dayOfWeek = DateTime.now().setZone("America/Toronto").toFormat("EEEE").toLowerCase()
    const accDays = serviceCalander.filter(x => x[dayOfWeek] === "1" && x.start_date <= gtfsdt && x.end_date >= gtfsdt).map(x => x.service_id)
    // Calander_dates is a list of exceptions, 1 = added, 2 = removed
    const serviceRemoved = serviceExceptions.filter(x => x.date === String(gtfsdt) && x.exception_type === "2" /* STRING */).map(x => x.service_id)
    const serviceAdded = serviceExceptions.filter(x => x.date === String(gtfsdt) && x.exception_type === "1" /* STRING */).map(x => x.service_id)

    const todaysService = accDays.filter(x => !serviceRemoved.includes(x)).concat(serviceAdded) /* Remove the removed services and add the added services */

    const servicedTrips = await prisma[agencyInfo.db.trips].findMany({
        where: {
            route_id: route_id,
            service_id: {
                in: todaysService
            }
        }
    })

    const firstStops = await prisma.$transaction(servicedTrips.map((x) => {
        return prisma[agencyInfo.db.stop_times].findFirst({
            where: {
                trip_id: x.trip_id
            },
            orderBy: {
                stop_sequence: "asc"
            }
        })
    }))

    const lastStops = await prisma.$transaction(servicedTrips.map((x) => {
        return prisma[agencyInfo.db.stop_times].findFirst({
            where: {
                trip_id: x.trip_id
            },
            orderBy: {
                stop_sequence: "desc"
            }
        })
    }))

    const routeTrips = servicedTrips.map((x, index) => {
        const lastStop = lastStops[index];
        return {
            id: x.trip_id,
            route_id: x.route_id,
            service_id: x.service_id,
            trip_headsign: x.trip_headsign,
            direction_id: x.direction_id,
            block_id: x.block_id,
            first_stop_id: firstStops[index].stop_id,
            last_stop_id: lastStop ? lastStop.stop_id : null,
            trip_start: firstStops[index].arrival_time,
            trip_end: lastStop ? lastStop.arrival_time : null,
        }
    })


    return new Response(JSON.stringify({
        query: {
            route_id: route_id,
            agency: agency_id,
            x_gtfsdt: gtfsdt
        },
        results: routeTrips

    }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    }
    )
}