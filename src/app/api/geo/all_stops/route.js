/* 
    Route not in use! Replaced by GET /api/geo/stops
*/

import * as turf from '@turf/helpers';

export const runtime = "edge"

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()
import gtfsConfig from "../../../../../config.json"

export async function GET() {

    const agStopDb = gtfsConfig.agencies.filter((x) => {
        return x.st && x.db
    }).map((x) => {
        return {
            data: x.db.stops,
            id: x.id
        }
    })

    const allStops = await Promise.all(agStopDb.map(async (x) => {
        const stopDb = await prisma[x.data].findMany();
        const stopInformation = stopDb.filter(stop => 
            !isNaN(parseFloat(stop.stop_lat)) && !isNaN(parseFloat(stop.stop_lon))
        );    

        return stopInformation.map((stop) => {
            return turf.point([parseFloat(stop.stop_lon), parseFloat(stop.stop_lat)], {
                stop_id: stop.stop_id,
                stop_code: stop.stop_code,
                stop_name: stop.stop_name,
                agency: x.id
            })
        })
    }));

    return new Response(JSON.stringify(turf.featureCollection(allStops.flat())), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}