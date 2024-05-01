import * as turf from '@turf/helpers'
import bbox from '@turf/bbox';

import gtfs from "../../../../helpers/fetch_gtfs"
export const config = {
    runtime: 'edge', // this is a pre-requisite
};
export default async function handler(req, res) {
    const params = new URL(req.url).searchParams
    const ag = params.get("agency")
    const tripIds = params.get("id").split(",")
    if (!tripIds || !ag) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    console.log("GEO/SHAPEBYTRIPS:" + tripIds + " " + ag)
    const sps = await gtfs.download("shapes.txt", ag)
    const tps = await gtfs.download("trips.txt", ag)
    const fts = []
    
    function cachedTrips(tripId) {
        return tps.filter((x) => {
            //route_id,service_id,trip_id,trip_headsign,direction_id,block_id,shape_id
            return x.split(",")[2] === tripId
        }).map((x) => {
            const dts = x.split(",")
            return {
                route: dts[0],
                service_id: dts[1],
                trip_id: dts[2],
                trip_headsign: dts[3].replace(/\"/g, ""),
                dir: dts[4],
                block: dts[5],
                shape: dts[6].replace("\r", "")
            }
        })[0]
    }
    for (const trip of tripIds) {
        const trip_details = cachedTrips(trip)
        if (!trip_details) {
            continue
        }

        //console.log("trip", trip_details)
        const shape = trip_details.shape
        const sqs = sps.filter((x) => {
            const dts = x.split(",")
            if (dts[0] === shape) {
                return true
            }
        }).map((x) => {
            return [Number(x.split(",")[2]), Number(x.split(",")[1])]
        })
        console.log(sqs)
        const ls = turf.lineString(sqs, trip_details)
        ls.properties.bbox = bbox(ls)
        fts.push(ls)
    }
    //console.log(fts)
    return new Response(JSON.stringify(turf.featureCollection(fts)), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}
