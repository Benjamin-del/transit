
export default {
    async download(file, ag) {
        if (!ag) {
            throw new Error("Helper (GTFS-STATIC): No Agency Specified")
        }
        console.log("HELPER (GTFS-STATIC): Fetching file: " + file)
        try {
            // Fetch the File file from the URL
            const response = await fetch("https://benjamin-del.github.io/TransitDB3/gtfs/" + ag + "/" + file);
            const txt = await response.text()
            return txt.split("\n")
        } catch (error) {
            console.error(error);
            return "ERROR"
        }
    }
}