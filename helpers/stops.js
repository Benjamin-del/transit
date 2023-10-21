import gtfs_static from "./fetch_gtfs"

export default {
    async get(stopId) {
        const oc_stops = await gtfs_static.download("stops.txt")
        return oc_stops.filter((x) => {
            return x.split(",")[0] === stopId
        }).map((x) => {
            const dts = x.split(",")
            return {
                stop_id: dts[0],
                stop_code: dts[1],
                stop_name: dts[2].replace(/\"/g, ""),
                stop_lat: Number(dts[4]),
                stop_lon: Number(dts[5]),
            }
        })[0]
    },
    async byCode(stopCode) {
        const oc_stops = await gtfs_static.download("stops.txt")
        return oc_stops.split("\n").filter((x) => {
            return x.split(",")[1] === stopCode
        }).map((x) => {
            const dts = x.split(",")
            return {
                stop_id: dts[0],
                stop_code: dts[1],
                stop_name: dts[2].replace(/\"/g, ""),
                stop_desc: dts[3],
                stop_lat: Number(dts[4]),
                stop_lon: Number(dts[5]),
            }
        })[0]
    }
}