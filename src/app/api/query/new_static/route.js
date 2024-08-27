import agency from "../../../../../helpers/agency";
import { PrismaClient } from '@prisma/client/edge'
const prisma = new PrismaClient()

import * as turf from '@turf/helpers'

export const runtime = "edge"

export async function GET(req) {
    // Get URL parameters

    const allTables = ["routes", "calendar_dates", "calendar"]
    const params = new URL(req.url).searchParams
    const agencyId = params.get("agency")
    const table = params.get("table")
    const query = params.get("search")?.split(",") || [false]
    const row = params.get("row")
    const format = params.get("format") || "json"

    if (!agencyId || !table || !query /*|| (query.length === 1 && query[0] === "")*/ || !row) {
        console.log("GTFS/SCHEDULE: Missing required parameters")
        return new Response(JSON.stringify({ error: "Missing required parameters", results: [] }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    // Get agency info
    const agencyInfo = await agency.getAg(agencyId)

    if (!agencyInfo) {
        console.log("GTFS/SCHEDULE: Agency not found")
        return new Response(JSON.stringify({ error: "Agency not found", results: [] }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    // Check if table is valid

    if (!agencyInfo.db[table]) {
        console.log("GTFS/SCHEDULE: Table not found")
        return new Response(JSON.stringify({ error: "Table not found", results: [] }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    // Query the database
    var results = {}
    console.log()
    if (query[0] === "" && allTables.includes(table)) {
        var results = await prisma[agencyInfo.db[table]].findMany()
    } else if (query.length === 1 && query[0] === false) {
        var results = await prisma[agencyInfo.db[table]].findMany({
            take: 100
        })

    } else {
        var results = await prisma[agencyInfo.db[table]].findMany({
            where: {
                [row]: {
                    in: query
                }
            }
        })

    }

    if (format === "geojson" && table === "shapes") { /* Map to GeoJSON */

        const lineString = turf.lineString(results.sort((a, b) => {
            return a.shape_pt_sequence - b.shape_pt_sequence
        }).map((x) => {
            return [Number(x.shape_pt_lon), Number(x.shape_pt_lat)]
        }))
        const feature = turf.featureCollection([lineString])

        // Return GeoJSON
        return new Response(JSON.stringify(feature), {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    if (format === "geojson" && table === "stops") { /* Map to GeoJSON */

        const points = results.filter((x) => {
            return !isNaN(parseFloat(x.stop_lat)) && !isNaN(parseFloat(x.stop_lon))
        }).map((x) => {
            return turf.point([Number(x.stop_lon), Number(x.stop_lat)], x)
        })
        const feature = turf.featureCollection(points)

        // Return GeoJSON
        return new Response(JSON.stringify(feature), {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    // Return results

    if (format === "array" && results.length > 0) {
        var header = Object.keys(results[0])
        results = results.map((x) => {
            return Object.values(x)
        })
    }
    return new Response(JSON.stringify({ error: null, length: results.length, header: header || null, results: results }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });

}