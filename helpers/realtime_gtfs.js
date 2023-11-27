import GtfsRealtimeBindings from "gtfs-realtime-bindings";

export default {
    async realtime(file, ag) {
        console.log("ag", ag)
        if (!ag) {
            throw new Error("Helper (GTFS-REALTIME): No Agency Specified")
        }
        if (ag === "sto") {
            const response = await fetch("https://gtfs.sto.ca/download.php?hash=" + process.env.STO_API_HASH + "&file=" + file + "&key=" + process.env.STO_API_KEY );
            if (!response.ok) {
                console.log("STO ERROR")
                console.log(response)
                return false
            }
            const buffer = await response.arrayBuffer();
            const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
                new Uint8Array(buffer)
            );
            return feed
        }
    }

}