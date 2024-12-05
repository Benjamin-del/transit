
// Description: This file is used to query a stop by its ID and agency ID.
// Usage: GET /api/geo/query_stop?id=:stop_id&agency=:agency_id

import * as turf from '@turf/helpers'

import agency from "../../../../../helpers/agency";
import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()
export const runtime = "edge"

export async function GET(req) {
    const params = new URL(req.url).searchParams
    const id = params.get("id")
    const agencyId = params.get("agency")
    if (!id || !agencyId) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const agencyInfo = await agency.getAg(agencyId)
    console.log("GEO/STOP:" + id + " " + agencyId)
    const stop = await prisma[agencyInfo.db.stops].findUnique({
        where: {
            stop_id: id
        }
    })
    if (!stop) {
        return new Response(JSON.stringify({ error: "Stop not found" }), {
            status: 404,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const pt = turf.point([Number(stop.stop_lon), Number(stop.stop_lat)], {id: stop.stop_id, code: stop.stop_code, name: stop.stop_name})
    return new Response(JSON.stringify(turf.featureCollection(pt)), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}