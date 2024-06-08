import config from "../config.json"

export default {
    async getAg(ag) {
        if (!ag) {
            throw new Error("Helper (AGENCY): No Agency Specified")
        }
        const refAg = config.agencies.filter((x) => {
            return x.id === ag
        })[0]
        return refAg || false
    }
}
