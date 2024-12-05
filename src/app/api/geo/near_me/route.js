
// NOTE: This API route is no longer in use, and is kept for reference purposes only.
// Description: This API fetches the stops within a certain distance of a given location.
// Usage: GET /api/geo/near_me?lat=:lat&lon=:lon&distance=:distance&agency=:agency

import { distance } from "@turf/distance";

import { point } from "@turf/helpers";

import agency from "../../../../../helpers/agency";
import { PrismaClient, sql } from '@prisma/client/edge'
const prisma = new PrismaClient()
export const runtime = "edge"

export async function GET(req) {
    const params = new URL(req.url).searchParams

    const currentLat = parseFloat(params.get("lat"))
    const currentLon = parseFloat(params.get("lon"))
    const distanceParam = parseFloat(params.get("distance")) || 100 
    const agencyId = params.get("agency")

    if (!currentLat || !currentLon || !agencyId) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    console.log("GEO/NEAR_ME:" + currentLat + " " + currentLon + " " + agencyId + " " + distanceParam)
    const agencyInfo = await agency.getAg(agencyId)

    const latRange = distanceParam / 111111;
    const lonRange = distanceParam / (111111 * Math.cos(currentLat * (Math.PI / 180)));

    const minLat = currentLat - latRange;
    const maxLat = currentLat + latRange;
    const minLon = currentLon - lonRange;
    const maxLon = currentLon + lonRange;

    const stops = await prisma[agencyInfo.db.stops].findMany({
        where: {
            stop_lat: {
                gte: minLat,
                lte: maxLat
            },
            stop_lon: {
                gte: minLon,
                lte: maxLon
            }
        }
    })
      
    const features = stops.map(stop => {
        return {
            ...stop,
            distance: Math.round(distance(point([currentLon, currentLat]), point([stop.stop_lon, stop.stop_lat]), { units: 'metres'}))
        }
    })
    return new Response(JSON.stringify(features), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });

}