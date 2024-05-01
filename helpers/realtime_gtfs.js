import GtfsRealtimeBindings from "gtfs-realtime-bindings";

export default {
    async realtime(file, ag) {
        const filePath = (function() {
            if (file === "VehiclePositions") {
                return "vehicule" // FRANCAIS
            } else if (file === "TripUpdates") {
                return "trip" // FRANCAIS
            } else {
                return file
            }
        }())
        console.log("ag", ag)
        if (!ag) {
            throw new Error("Helper (GTFS-REALTIME): No Agency Specified")
        }
        if (ag === "sto") {
            const response = await fetch("https://gtfs.sto.ca/download.php?hash=" + process.env.STO_API_HASH + "&file=" + filePath + "&key=" + process.env.STO_API_KEY );
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
        } else if (ag === "oct") {
            
            const response = await fetch("https://nextrip-public-api.azure-api.net/octranspo/gtfs-rt-vp/beta/v1/" + file, {
                headers: {
                    "Ocp-Apim-Subscription-Key": process.env.OCT_BETA_KEY,
                },
            });
            if (!response.ok) {
                console.log("OCT API ERROR")
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