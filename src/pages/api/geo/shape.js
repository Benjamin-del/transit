import * as turf from '@turf/helpers'
//import centroid from '@turf/centroid'

/* Remove Centroid for now, it's not working */
import gtfs from "../../../../helpers/fetch_gtfs"
export const config = {
    runtime: 'edge', // this is a pre-requisite
};
export default async function handler(req, res) {
    const params = new URL(req.url).searchParams
    const ag = params.get("agency")
    const shapeid = params.get("id").split(",")
    if (!shapeid || !ag) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    console.log("GEO/SHAPE:" + shapeid + " " + ag)
    const sps = await gtfs.download("shapes.txt", ag)
    const tps = await gtfs.download("trips.txt", ag)
    const fts = []

    function tripsByShapeC(shapeId) {
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
    });
}
