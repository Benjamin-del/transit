import gtfs_static from "./fetch_gtfs"
export default {
    async get(tripId, ag) {
        const oc_trips = await gtfs_static.download("trips.txt", ag)
        return oc_trips/*.split("\n")*/.filter((x) => {
            return x.split(",")[2] === tripId
        }).map((x) => {
            //route_id,service_id,trip_id,trip_headsign,direction_id,shape_id
            return {
                route: x.split(",")[0],
                service_id: x.split(",")[1],
                trip_id: x.split(",")[2],
                trip_headsign: x.split(",")[3],
                dir: x.split(",")[4],
                shape: x.split(",")[5],
            }
        })[0]
    }
}