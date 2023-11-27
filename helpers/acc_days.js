import gtfs from "./fetch_gtfs"
export default {
    async cal(ag, gtfsdt_lx) {

            const list = await gtfs.download("calendar.txt", ag)
            const day = gtfsdt_lx.weekday
            const gtfsdt = Number(gtfsdt_lx.toFormat("yyyyMMdd"))
        
            // Reusable function that returns an array of days that are acceptable
            // I HATE CSV/TXT FILES!!!
            const accarr = []
            //console.log(list)
            // Empty array that I will return
            list.forEach((x) => {
                const dts = x.split(",")
                const aday = ocIsTodayBetweenDates(dts, day, gtfsdt)
                //console.log(aday)
                if (aday) {
                    accarr.push(dts[0])
                }
            })
            return accarr
        
        function ocIsTodayBetweenDates(obj, day, gtfsdt) {
            
            const startDate = Number(obj[8])
            const endDate = Number(obj[9])
            
            //console.log("gtfs", gtfsdt)
            // Monday is 1, Sunday is 7 This works well with the split line as it matches with the index of the array
            if (startDate === "start_date" || !startDate || !endDate || !obj[day] || !gtfsdt || endDate === "end_date") {
                //console.log("Inavlid date")
                // Use that for debugging. 
                return false
            }
            // Ensure I have valid dates, I Cant send Malformed dates
            const comp = gtfsdt
            // For testing I can change the date above to a specific date.
            // obj[day] corisponds to the array 0 = no service on the day, 1 = service on the day
            return comp === startDate || comp === endDate || (comp > startDate && comp < endDate) && obj[day] === "1"
        }
    
    },
    async cal_dates(ag, gtfsdt_lx) {
        const gtfsdt = Number(gtfsdt_lx.toFormat("yyyyMMdd"))
            const list = await gtfs.download("calendar_dates.txt", ag)
            return list.filter((x) => {
                const dts = x.split(",")
                return dts[1] === gtfsdt.toString()
            }).map((x) => {
                const dts = x.split(",")
                return dts[0]
            })
    

    }
}