import { DateTime } from "luxon";

import helper_stops from "../../../../helpers/stops"
import helper_days from "../../../../helpers/acc_days"
import gtfs from "../../../../helpers/fetch_gtfs"

// Using to parse dates and to ensure I don't have to deal with timezones
const zone = "America/Toronto"
export const config = {
    runtime: 'edge', // this is a pre-requisite
};
export default async function handler(req, res) {
    const params = new URL(req.url).searchParams
    const stopid = params.get("stop")
    if (!stopid) {
        return new Response(JSON.stringify({ error: "Missing required parameters" }), {
            status: 400,
            headers: {
                'content-type': 'application/json',
            },
        });
    }
    const stop = await helper_stops.get(stopid, "sto")
    if (!stop) {
        return new Response(JSON.stringify({ error: "404" }), {
            status: 404,
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    const now = DateTime.now().setZone(zone)
    //console.log("now:", now)
    const gtfsdt = (function () {
        if (params.get("date") && params.get("date") !== "undefined") {
            // If paramater is set, Return a date beased on that time (00:00:00)
            return Number(DateTime.fromFormat(params.get("date"), 'yyyyMMdd').setZone(zone).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toFormat('yyyyMMdd'))
        } else {
            // If not return today (00:00:00)
            return Number(DateTime.now().setZone(zone).set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toFormat('yyyyMMdd'))
        }
    })()
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
    const gtfsmx = Number(param_gtfshr.plus({ minutes: Number(params.get("plus")) || 180 /* 3 hours (default) */ }).toFormat('HHmmss'))

    //const list = await gtfs.download("calendar_dates.txt", "sto")

    function acceptabledate() {
        return list.filter((x) => {
            const dts = x.split(",")
            return dts[1] === gtfsdt.toString()
        }).map((x) => {
            const dts = x.split(",")
            return dts[0]
        })
    }

    // Load all of the files
    const tms = await gtfs.download("stop_times.txt", "sto")
    const tps = await gtfs.download("trips.txt", "sto")

    const accdays = await helper_days.cal_dates("sto", gtfsdt)
    console.log("days", accdays)
    const accrx = new RegExp(accdays.join("|"))
    const ftldtms = tms.filter((x) => {
        const dts = x.split(",")
        if (dts[2] === stopid) {
            const arrv = Number(dts[1].replace(/:/g, ""))
            //console.log(arrv > gtfshr, "-", arrv, gtfshr)
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

    ftldtms.forEach(async (x) => {
        tps.filter(async (y) => {
            const dts = y.split(",")
            if (dts[2] === x.id && accrx.test(dts[1])) {
                ftldtps.push({
                    route: dts[0],
                    service_id: dts[1],
                    arrv: x.arrv,
                    attribute: "Scheduled",
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
            accdays: accdays,
            gtfsmx: gtfsmx,
            realtime_support: true,
            realtime: false
        },
        stop: await helper_stops.get(stopid, "sto") || null,
        schedule: ftldtps.sort(compare) // Lets Sort!
    }), {
        status: 200,
        headers: {
            'content-type': 'application/json',
        },
    });
}