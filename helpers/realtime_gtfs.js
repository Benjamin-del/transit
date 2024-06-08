import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import config from "../config.json"

export default {
    async rt_beta(file, ag) {
        // Removing suport for STO during beta

        function addEnvString(url) {
            return url.replace(/\{([^}]+)\}/g, (match, key) => process.env[key] || match);
        }

        function addEnvObj(obj) {
            const processedObj = {};
            for (const key in obj) {
                const value = obj[key];
                // Replace bracketed placeholders in each header value
                processedObj[key] = value.replace(/\{([^}]+)\}/g, (match, envVar) => process.env[envVar] || match);
            }
            return processedObj;
        }
          
        if (!ag) {
            throw new Error("Helper (GTFS-REALTIME): No Agency Specified")
        }

        const refAg = config.agencies.filter((x) => {
            return x.id === ag
        })[0]
        if (!refAg) {
            throw new Error("Helper (GTFS-REALTIME): Invalid Agency")
        }

        const refFile = refAg.files.filter((x) => {
            return x.id === file 
        })[0]

        if (!refFile) {
            throw new Error("Helper (GTFS-REALTIME): Invalid File")
        }


        const processedUrl = addEnvString(refFile.url);
        const processedHeaders = addEnvObj(refFile.headers);

        const response = await fetch(processedUrl, {
            headers: processedHeaders
        });
        if (!response.ok) {
            console.log(response.status)
            console.log("GTFS-REALTIME: ERROR")
            return false
        }
        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer)
        );
        return feed
    },
    async realtime(file, ag) {
        const filePath = (function() {
            if (file === "VehiclePositions" && ag === "sto") {
                return "vehicule" // FRANCAIS
            } else if (file === "TripUpdates" && ag === "sto") {
                return "trip" // FRANCAIS
            } else {
                return file
            }
        }())
        console.log("filePath", filePath)
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
                console.log(response.status)
                console.log("https://nextrip-public-api.azure-api.net/octranspo/gtfs-rt-vp/beta/v1/" + file)
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