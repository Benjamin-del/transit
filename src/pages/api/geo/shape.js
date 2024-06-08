import * as turf from '@turf/helpers'
//import centroid from '@turf/centroid'

/* Remove Centroid for now, it's not working */
import agency from '../../../../helpers/agency'

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()


export const config = {
    runtime: 'edge', // this is a pre-requisite
};
export default async function handler(req, res) {
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


    /*function tripsByShapeC(shapeId) {
        //route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
        return tps.filter((x) => {
            return x.split(",")[5] === shapeId
        }).map((x) => {
            const dts = x.split(",")
            return {
                route: dts[0],
                trip_headsign: dts[3],
                dir: dts[4],
            }
        })[0]
    }

    for (const shape of shapeid) {
        const trip = tripsByShapeC(shape)
        const sqs = sps.filter((x) => {
            const dts = x.split(",")
            if (dts[0] === shape) {
                return true
            }
        }).map((x) => {
            return [Number(x.split(",")[2]), Number(x.split(",")[1])]
        })
        fts.push(turf.lineString(sqs, trip))
    }
    if (fts.length === 0) {
        return new Response(JSON.stringify({ error: "No shapes found" }), {
            status: 404,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    //fts.push(centroid(turf.featureCollection(fts)))
    return new Response(JSON.stringify(turf.featureCollection(fts)), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });*/
}
