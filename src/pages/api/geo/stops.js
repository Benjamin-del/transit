import * as turf from '@turf/helpers'
import gtfs from "../../../../helpers/fetch_gtfs"

export const config = {
    runtime: 'edge', // this is a pre-requisite
};
export default async function handler(req, res) {
		const list = await gtfs.download("stops.txt")
		const stps = []
		for (var i = 0; i < list.length; i++) {
			const dts = list[i].split(",")
			if (dts[0] === "stop_id" || dts[0] === "") {
				continue
			}
			const pt = turf.point([Number(dts[5]), Number(dts[4])], {id: dts[0], code: dts[1], name: dts[2].replace(/\"/g, "")})
			stps.push(pt)
		}
		return new Response(JSON.stringify(turf.featureCollection(stps)), {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
        });
	}
