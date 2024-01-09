import { DateTime } from "luxon";

import gtfs from "../../../../helpers/fetch_gtfs"
import route_helper from "../../../../helpers/routes"
const zone = "America/Toronto"

export const config = {
    runtime: 'edge', // this is a pre-requisite
};
export default async function handler(req, res) {
    const params = new URL(req.url).searchParams
    const time = params.get("startTime")
    const route = params.get("route");
    const dirid = params.get("direction");

    if (!time || !route || !dirid) {
        return new Response(
            JSON.stringify({ message: 'Missing required parameters' }),
            {
                status: 400,
                headers: {
                    'content-type': 'application/json',
                },
            },
        );
    }
    console.log("DYNAMIC/CONTEXT:" + time + " " + route + " " + dirid + "oct")
    const now = DateTime.now().setZone(zone)
    const gtfsdt = Number(now.toFormat('yyyyMMdd'))
    // Trasforming the current date to the format of yyyyMMdd, and converting to a number so I can do math with it and the dates


    const list = await gtfs.download("calendar.txt", "oct")
    function acceptabledate() {
        // Reusable function that returns an array of days that are acceptable
        // I HATE CSV/TXT FILES!!!
        const accarr = []
        // Empty array that I will return
        list.forEach((x) => {
            const dts = x.split(",")
            if (isTodayBetweenDates(Number(dts[8]), Number(dts[9]), dts)) {
                accarr.push(dts[0])
            }
        })
        return accarr
    }
    function isTodayBetweenDates(startDate, endDate, obj) {
        const day = now.weekday
        // Monday is 1, Sunday is 7 This works well with the split line as it matches with the index of the array
        if (startDate === "start_date" || !startDate || !endDate || !obj[day] || !gtfsdt || endDate === "end_date") {
            /*console.log("Inavlid date")*/
            // Use that for debugging. 
            return false
        }
        // Ensure I have valid dates, I Cant send Malformed dates
        const comp = gtfsdt
        // For testing I can change the date above to a specific date.
        // obj[day] corisponds to the array 0 = no service on the day, 1 = service on the day
        return comp === startDate || comp === endDate || (comp > startDate && comp < endDate) && obj[day] === "1"
    }

    async function getContext() {
        const tps = await gtfs.download("trips.txt", "oct")
        const tms = await gtfs.download("stop_times.txt", "oct")

        const accdays = acceptabledate()
        //console.log("Acceptable days:", accdays)

        const ftld = tms.filter((x) => {
            const dts = x.split(",")
            //const accrx = new RegExp(accdays.join("|")).test(dts[0])
            // Remove Acceptable Days function from filtering trips here as the mimified version of the file dosen't provide the shortcut I used.
            // Mimified file dosn't have the arrival time.
            if (dts[0]) {
                if (/*accrx && */(dts[1].includes(time) /*|| dts[2].includes(time)*/) && dts[3] === "1") {
                    return true
                }
            } else {
                return false
            }
        }).map((x) => {
            // Only return the trip id.
            return x.split(",")[0]
        })
        // Trips.txt
        const ftldtps = tps.filter((x) => {
            const dts = x.split(",")
            const accrx = new RegExp(accdays.join("|")).test(dts[1])
            if (accrx && ftld.includes(dts[2]) && dts[0] === route && dts[4] === dirid) {
                return true
            }
        })

        return await Promise.all(ftldtps.map(async (x) => {
            const dts = x.split(",")
            return {
                route: dts[0],
                service_id: dts[1],
                trip_id: dts[2],
                headsign: dts[3].replace(/\"/g, ""),
                dir: dts[4],
                shape: dts[5].replace("\r", ""),
                gtfs: await route_helper.get(dts[0], "oct")
            }
        }))
    }
    const data = await getContext()
    //console.log("data", data)
    return new Response(
        JSON.stringify({
            query: {
                time: time,
                route: route,
                direction: dirid,
            },
            results:data,
            int: {
                date: gtfsdt,
            }
        }),
        {
            status: 200,
            headers: {
                'content-type': 'application/json',
            },
        },
    );
}