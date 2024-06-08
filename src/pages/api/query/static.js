export const config = {
    runtime: "edge",
}
import agency from "../../../../helpers/agency";
import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()

export default async function handler(req, res) {
    const params = new URL(req.url).searchParams

    const agencyId = params.get("agency")
    const query = params.get("search").split(",")
    console.log(query.length)
    
    if (!agencyId || !query || (query.length === 1 && query[0] === "")) {
        console.log("GTFS/SCHEDULE: Missing required parameters")
        return new Response(JSON.stringify({ error: "Missing required parameters" , results: []}), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const agencyInfo = await agency.getAg(agencyId)

    const trips = await prisma[agencyInfo.db.trips].findMany({
        where: {
            OR: [
                {
                    route_id: {
                        in: query
                    }
                },
                {
                    service_id: {
                        in: query
                    }
                },
                {
                    trip_id: {
                        in: query
                    }
                },
                {
                    trip_headsign: {
                        in: query
                    }
                },
                {
                    direction_id: {
                        in: query
                    }
                },
                {
                    block_id: {
                        in: query
                    }
                },
                {
                    shape_id: {
                        in: query
                    }
                }
            ]
        }
    })

    const tripInfo = trips.map((x) => {
        return {
            trip: x,
            query: {
                relation: query.includes(x.route_id) ? "Route" : query.includes(x.service_id) ? "Service" : query.includes(x.trip_id) ? "Trip" : query.includes(x.trip_headsign) ? "Headsign" : query.includes(x.direction_id) ? "Direction" : query.includes(x.block_id) ? "Block" : query.includes(x.shape_id) ? "Shape" : "Unknown",
                search: query.includes(x.route_id) ? x.route_id : query.includes(x.service_id) ? x.service_id : query.includes(x.trip_id) ? x.trip_id : query.includes(x.trip_headsign) ? x.trip_headsign : query.includes(x.direction_id) ? x.direction_id : query.includes(x.block_id) ? x.block_id : query.includes(x.shape_id) ? x.shape_id : "Unknown"
            }
        }
    })
    return new Response(JSON.stringify({ error: false, status: 200, count: tripInfo.length, results: tripInfo }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}