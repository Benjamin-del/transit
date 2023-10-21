import * as turf from '@turf/helpers'

import gtfs from "../../../../helpers/fetch_gtfs"
export const config = {
    runtime: 'edge', // this is a pre-requisite
};
export default async function handler(req, res) {
    const params = new URL(req.url).searchParams

		const shapeid = params.get("id")
		if (!shapeid) {
			return new Response(JSON.stringify({ error: "Missing required parameters" }), {
                status: 400,
                headers: {
                    'content-type': 'application/json',
                },
            });
		}
        const oc_rtid = shapeid.slice(0, -4);

		const sps = await gtfs.download("shapes.txt")
		const fts = []
		const sqs = sps.filter((x) => {
			const dts = x.split(",")
			if (dts[0] === shapeid) {
				return true
			}
		}).map((x) => {
			return [Number(x.split(",")[2]), Number(x.split(",")[1])]
		})
        if (sqs.length === 0) {
            return new Response(JSON.stringify({ error: "No shape found" }), {
                status: 404,
                headers: {
                    'content-type': 'application/json',
                },
            });
        }
		fts.push(turf.lineString(sqs, {route: oc_rtid}))

        return new Response(JSON.stringify(turf.featureCollection(fts)), {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
        });
}
