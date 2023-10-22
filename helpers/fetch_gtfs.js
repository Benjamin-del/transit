export default {
    async download(file) {
        console.log("HELPER (GTFS-STATIC): Fetching file: " + file)
        try {
            // Fetch the File file from the URL
            const response = await fetch("https://benjamin-del.github.io/TransitDB3/gtfs/oct/" + file);
            const txt = await response.text()
            return txt.split("\n")
        } catch (error) {
            console.error(error);
            return "ERROR"
        }
    },
}