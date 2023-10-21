import gtfs_static from "./fetch_gtfs"
export default {
    async octranspo(tripId) {
        const oc_trips = await gtfs_static.download("trips.txt")
        return oc_trips.split("\n").filter((x) => {
            return x.split(",")[2] === tripId
        }).map((x) => {
            return {
                route: x.split(",")[0],
                service_id: x.split(",")[1],
                trip_id: x.split(",")[2],
                dir: x.split(",")[4],
                shape: x.split(",")[6],
            }
        })[0]
    }
}