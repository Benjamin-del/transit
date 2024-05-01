import gtfs_static from "./fetch_gtfs"
export default {
    async get(tripId, ag) {
        const oc_trips = await gtfs_static.download("trips.txt", ag)
        return oc_trips/*.split("\n")*/.filter((x) => {
            return x.split(",")[2] === tripId
        }).map((x) => {
            //route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
            const dts = x.split(",")
            return {
                route: dts[0],
                service_id: dts[1],
                trip_id: dts[2],
                trip_headsign: dts[3].replace(/\"/g, ""),
                dir: dts[4],
                block_id: dts[5],
                shape: dts[6]
            }
        })[0]
    }
}