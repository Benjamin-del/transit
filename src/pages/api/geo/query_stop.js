import * as turf from '@turf/helpers'
import stop_helper from "../../../../helpers/stops"
export const config = {
    runtime: 'edge', // this is a pre-requisite
};

export default async function handler(req,res) {
    const params = new URL(req.url).searchParams
    const id = params.get("id")
    const agency = params.get("agency")
    if (!id || !agency) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    console.log("GEO/STOP:" + id + " " + agency)
    const stop = await stop_helper.get(id, agency)
    if (!stop) {
        return new Response(JSON.stringify({ error: "No stop found" }), {
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