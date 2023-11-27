import * as turf from '@turf/helpers';

export const config = {
    runtime: 'edge', // this is a pre-requisite
};
import APIconfig from "../../../../config.json"
import gtfs from "../../../../helpers/fetch_gtfs"
export default async function handler(req,res) {
    const params = new URL(req.url).searchParams   
        const agencies = APIconfig.gtfs_st
        console.log(agencies)
        const stops = await Promise.all(agencies.map(async (x) => {
            const stops = await gtfs.download("stops.txt", x)
            const mp = stops.filter((y) => {
                const dts = y.split(",")

                if (dts[0] === "stop_id" || dts[0] === "" || dts[4] === "" || dts[5] === "") {
                    return false
                } else {
                    return true
                }
            }).map((y) => {
                const dts = y.split(",")
                return {
                    stop_id: dts[0],
                    stop_code: dts[1],
                    stop_name: dts[2].replace(/\"/g, ""),
                    stop_lat: Number(dts[4]),
                    stop_lon: Number(dts[5]),
                    agency: x,
                }
            })
            return mp
        }))
        const mp = stops.flat()
        const fc = turf.featureCollection(mp.map((x) => {
            return turf.point([x.stop_lon, x.stop_lat], { stop_id: x.stop_id, stop_code: x.stop_code, stop_name: x.stop_name, agency: x.agency })
        }))
        return new Response(JSON.stringify(fc), {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
        });
}