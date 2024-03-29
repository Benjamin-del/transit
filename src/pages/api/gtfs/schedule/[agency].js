import { DateTime } from "luxon";

import helper_stops from "../../../../../helpers/stops"
import helper_days from "../../../../../helpers/acc_days"
import gtfs from "../../../../../helpers/fetch_gtfs"
import gtfs_config from "../../../../../config.json"

// Using to parse dates and to ensure I don't have to deal with timezones
const zone = "America/Toronto"
export const config = {
    runtime: 'edge', // this is a pre-requisite
};
export default async function handler(req, res) {
    const params = new URL(req.url).searchParams
    const pathname = new URL(req.url).pathname
    const stopid = params.get("stop")
    const ag = pathname.split("/")[4]

    if (!stopid || !ag) {
        console.log("GTFS/SCHEDULE: Missing required parameters")
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    console.log("GTFS/SCHEDULE:" + stopid + " " + ag)
    const stop = await helper_stops.get(stopid, ag)
    if (!stop) {
        return new Response(JSON.stringify({ error: "404" }), {
            status: 404,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    const eod = DateTime.now().setZone(zone).endOf('day')
    //console.log("now:", now)
    const gtfsdt_lx = (function () {
        if (params.get("date") && params.get("date") !== "undefined") {
            // If paramater is set, Return a date beased on that time (00:00:00)
            return DateTime.fromFormat(params.get("date"), 'yyyyMMdd').setZone(zone).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        } else {
            // If not return today (00:00:00)
            return DateTime.now().setZone(zone).set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
        }
    })()
    const gtfsdt = Number(gtfsdt_lx.toFormat('yyyyMMdd'))

    const param_gtfshr = (function () {
        // I am going to refrence it later so I will return the full DateTime object
        if (params.get("time") && params.get("time") !== "undefined") {
            const paramSplit = params.get("time").split(":")
            return DateTime.now().setZone(zone).set({ hour: paramSplit[0], minute: paramSplit[1], second: 0, millisecond: 0 })
        } else {
            return DateTime.now().setZone(zone)
        }
    })()
    const gtfshr = Number(param_gtfshr.toFormat('HHmmss'))
    // Saving it as this format so I can use it later

    const gtfsmx = (function () {
        const defPlus = 180 || params.get("plus") // 3 hours (default)
        
        const eodDiff = eod.diff(param_gtfshr).as('minutes')
        console.log("defPlus", defPlus)
        console.log("eodDiff", eodDiff)
        if (eodDiff < defPlus) {
            return Number(eod.toFormat('HHmmss'))
        } else {
            return Number(param_gtfshr.plus({ minutes: Number(defPlus) }).toFormat('HHmmss'))
        }
    })()

    async function acceptabledate() {
        if (ag === "oct" || ag === "via") {
            return await helper_days.cal(ag, gtfsdt_lx)
        } else if (ag === "sto") {
            return await helper_days.cal_dates(ag, gtfsdt_lx)
        }
    }

    // Load all of the files
    const tms = await gtfs.download("stop_times.txt", ag)
    const tps = await gtfs.download("trips.txt", ag)

    const accdays = await acceptabledate()
    console.log("days", accdays)
    const accrx = new RegExp(accdays.join("|"))
    const ftldtms = tms.filter((x) => {
        const dts = x.split(",")
        if (dts[2] === stopid) {
            const arrv = Number(dts[1].replace(/:/g, ""))

            if (arrv > gtfshr && arrv < gtfsmx) {
                return true
            }
            //return true
        }
    }).map(x => {
        return { id: x.split(",")[0], arrv: x.split(",")[1] }
    })
    const ftldtps = []
    function compare(a, b) {
        if (Number(a.arrv.replace(/:/g, "")) < Number(b.arrv.replace(/:/g, ""))) {
            return -1;
        }
        if (Number(a.arrv.replace(/:/g, "")) > Number(b.arrv.replace(/:/g, ""))) {
            return 1;
        }
        return 0;
    }
    console.log(ftldtms)
    console.log(accrx)
    ftldtms.forEach(async (x) => {
        // Filter Times
        tps.filter(async (y) => {
            //Filter Trips
            const dts = y.split(",")
            //console.log(accdays.includes(dts[1]))

            if (dts[2] === x.id && accdays.includes(dts[1])) {

                ftldtps.push({
                    route: dts[0],
                    service_id: dts[1],
                    arrv: x.arrv,
                    attribute: "Scheduled at:",
                    trip_id: dts[2],
                    trip_headsign: dts[3].replace(/\"/g, ""),
                    dir: dts[4],
                    shape: dts[5].replace("\r", ""),
                    //gtfs: await routes(dts[0])
                })
            }
        })
    })


    return new Response(JSON.stringify({
        query: {
            time: gtfshr,
            date: gtfsdt,
            stop: stopid,
            agency: ag.replace("oct", "OC Transpo"),
            accdays: accdays,
            gtfsmx: gtfsmx,
            realtime_support: (function () {
                if (ag.includes(gtfs_config.gtfs_rt)) {
                    return true
                } else {
                    return false
                }
            })(),
            realtime: false
        },
        stop: await helper_stops.get(stopid, ag) || null,
        schedule: ftldtps.sort(compare) // Lets Sort!
    }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}