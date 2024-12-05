import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import config from "../config.json"

export default {
    async rt_beta(file, ag) {

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
        }w
        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
            new Uint8Array(buffer)
        );
        return feed
    }
}