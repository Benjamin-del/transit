import gtfs from "../../../../helpers/fetch_gtfs"

export const config = {
    runtime: 'edge', // this is a pre-requisite
};

export default async function handler(req, res) {

    const stops = await gtfs.download("stops.txt")
    const mp = stops.filter((x) => {
        const dts = x.split(",")

        if (dts[0] === "stop_id" || dts[0] === "") {
            return false
        } else {
            return true
        }
    }).map((x) => {
        const dts = x.split(",")
        return {
            stop_id: dts[0],
            stop_code: dts[1],
            stop_name: dts[2].replace(/\"/g, ""),
            stop_lat: Number(dts[4]),
            stop_lon: Number(dts[5]),
        }
})
return new Response(JSON.stringify({stops: mp}), {
    status: 200,
    headers: {
        'content-type': 'application/json',
    },
});
}3