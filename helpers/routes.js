import gtfs_static from "./fetch_gtfs"

export default {
    async get(routeId,ag) {

        const oc_routes = await gtfs_static.download("routes.txt", ag)
        try {
            return oc_routes.filter((x) => {
                console
                return x.split(",")[0] === routeId || x.split(",")[0].split("-")[0] === routeId
            }).map((x) => {
                const dts = x.split(",")
                return {
                    route_id: dts[0].split("-")[0],
                    route_short_name: dts[2],
                    route_long_name: dts[3].replace(/\"/g, ""),
                    route_type: dts[5],
                    route_color: ("#" + dts[6]),
                    route_text_color: ("#" + dts[7]).replace("\r", ""),
                }
            })[0]
        } catch (err) {
            console.log("ERROR!")
            return {}
        }
    }
}