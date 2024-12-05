
// Description: This is a simple API that uses the OpenStreetMap Nominatim API to get the location of a given query.
// Usage: GET /api/geo/geolocate?q=:query

export const runtime = "edge"

export async function GET(req) {

    
    const params = new URL(req.url).searchParams
    const query = params.get("q")
    if (!query) {
        return new Response(JSON.stringify({ status: 400, error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    console.log("DYNAMIC/QUERY:" + query)
    // Use Notamin API to get the location of the Input
    const response = await fetch("https://nominatim.openstreetmap.org/search?q=" + query  + "&format=jsonv2&limit=1")
    const result = await response.json()

    // If the result is empty, return a 404
    if (result.length === 0) {
        return new Response(JSON.stringify({ status: 404, error: "NOT FOUND", osm: {}}), {
            status: 404,
            headers: {
                'content-type': 'application/json',
            },
        });
    } else {        
        // If not, return the first result
        return new Response(JSON.stringify({status: 200, error: "", osm: result[0]}), {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

}