
// Description: This file is used to get the shape of a route.
// Usage: GET /api/geo/shape?id=:shape_id&agency=:agency_id
import * as turf from '@turf/helpers'
//import centroid from '@turf/centroid'

/* Remove Centroid for now, it's not working */
import agency from "../../../../../helpers/agency";

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()

export const runtime = "edge"

export async function GET(req) {
    const params = new URL(req.url).searchParams
    const ag = params.get("agency")
    const shapeid = params.get("id")

    if (!shapeid || !ag) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    const agencyInfo = await agency.getAg(ag)

    if (!agencyInfo) {
        return new Response(JSON.stringify({ error: "Agency not found" }), {
            status: 404,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    const shapePoints = await prisma[agencyInfo.db.shapes].findMany({
        where: {
            shape_id: {
                equals: shapeid
            }
        }
    })

    const turfCollection = turf.featureCollection([
        turf.lineString(shapePoints.sort((a, b) => {
            return a.shape_pt_sequence - b.shape_pt_sequence
        }).map((x) => {
            return [Number(x.shape_pt_lon), Number(x.shape_pt_lat)]
        }), {
            shape_id: shapeid
        }
    )])

    return new Response(JSON.stringify(turfCollection), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },

    })
}
