
// Description: Returns all stops for a given agency
// Usage: GET /api/geo/stops?agency=:agency

import * as turf from '@turf/helpers';

export const runtime = "edge"

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()
import agency from '../../../../../helpers/agency';

export async function GET(req) {

    const params = new URL(req.url).searchParams
    const agencyId = params.get("agency")

    if (!agencyId) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const agencyInfo = await agency.getAg(agencyId)

    const stopDb = await prisma[agencyInfo.db.stops].findMany();

    const stopInformation = stopDb.filter((stop) => {
        return !isNaN(parseFloat(stop.stop_lat)) && !isNaN(parseFloat(stop.stop_lon))
    }).map((stop) => {
        return turf.point([parseFloat(stop.stop_lon), parseFloat(stop.stop_lat)], {
            stop_id: stop.stop_id,
            stop_code: stop.stop_code,
            stop_name: stop.stop_name,
            agency: agencyId
        })
    });

    return new Response(JSON.stringify(turf.featureCollection(stopInformation)), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}