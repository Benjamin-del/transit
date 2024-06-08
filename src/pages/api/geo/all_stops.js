import * as turf from '@turf/helpers';

export const config = {
    runtime: 'edge', // this is a pre-requisite
};

import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()
import gtfsConfig from "../../../../config.json"

export default async function handler(req, res) {

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
    /*
    const params = new URL(req.url).searchParams   
        const agencies = config.gtfs_st
        console.log("GEO/ALL_STOPS:")
        
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
                //stop_id,stop_code,stop_name,stop_lat,stop_lon
                return {
                    stop_id: dts[0],
                    stop_code: dts[1],
                    stop_name: dts[2].replace(/\"/g, ""),
                    stop_lat: Number(dts[3]),
                    stop_lon: Number(dts[4]),
                    agency: x,
                }
            })
            return mp
        }))
        const mp = stops.flat()
        const fc = turf.featureCollection(mp.map((x) => {
            return turf.point([x.stop_lon, x.stop_lat], { stop_id: x.stop_id, stop_code: x.stop_code, stop_name: x.stop_name, agency: x.agency })
        }))
        console.log("GEO/ALL_STOPS: DONE")
        return new Response(JSON.stringify(fc), {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
        });*/
}