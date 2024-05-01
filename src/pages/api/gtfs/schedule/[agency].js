import { DateTime } from "luxon";

import gtfs from "../../../../../helpers/fetch_gtfs"
import helper_days from "../../../../../helpers/acc_days"
import helper_stops from "../../../../../helpers/stops"

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

    const eod = DateTime.now().setZone(zone).endOf('day')

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
    /*const stop = await helper_stops.get(stopid, ag)
    if (!stop) {
        return new Response(JSON.stringify({ error: "404" }), {
            status: 404,
            headers: {
                'content-type': 'application/json',
            },
        });
    }*/
    //console.log("now:", now)
    const currentDateParam = params.get("date");
    const currentTimeParam = params.get("time");
    const currentDateTime = DateTime.now().setZone(zone);

    const gtfsdt_lx = currentDateParam && currentDateParam !== "undefined"
        ? DateTime.fromFormat(currentDateParam, 'yyyyMMdd').setZone(zone).startOf('day')
        : currentDateTime.startOf('day');
    const gtfsdt = Number(gtfsdt_lx.toFormat('yyyyMMdd'));

    const param_gtfshr = currentTimeParam && currentTimeParam !== "undefined"
        ? currentDateTime.set({ hour: currentTimeParam.split(":")[0], minute: currentTimeParam.split(":")[1], second: 0, millisecond: 0 })
        : currentDateTime;
    const gtfshr = Number(param_gtfshr.toFormat('HHmmss'));

    const defPlus = params.get("plus") || 180; // 3 hours (default)
    const eodDiff = eod.diff(param_gtfshr).as('minutes');
    const gtfsmx = Number((eodDiff < defPlus ? eod : param_gtfshr.plus({ minutes: Number(defPlus) })).toFormat('HHmmss'));

    async function acceptabledate(ag) {
        if (ag === "oct") {
            return await helper_days.cal(ag, gtfsdt_lx)
        } else if (ag === "sto") {
            return await helper_days.cal_dates(ag, gtfsdt_lx)
        }
    }
    // Load all of the files
    const [tms, tps, accdays] = await Promise.all([
        gtfs.download("stop_times.txt", ag),
        gtfs.download("trips.txt", ag),
        acceptabledate(ag)
    ]);

    const accdaysSet = new Set(accdays);

    //console.log("days", accdays)
    //const accrx = new RegExp(accdays.join("|"))

    const ftldtms = tms.filter((x) => {
        const dts = x.split(",")
        if (dts[2] === stopid) {
            const arrv = Number(dts[1].replace(/:/g, ""))
            //console.log(dts)
            if (arrv > gtfshr && arrv < gtfsmx) {
                // Return if the time is between the start and end time
                return true
            }
            //return true
        }
    }).map(x => {
        const split = x.split(",");
        return { id: split[0], arrv: split[1] };
    });
    
    const ftldtps = []
    function compare(a, b) {
        const aArrv = Number(a.arrv.replace(/:/g, ""));
        const bArrv = Number(b.arrv.replace(/:/g, ""));

        return aArrv - bArrv;
    }
    //console.log("1", ftldtms)
    //console.log("2", accrx)
    // Convert tps into a map
    const tpsMap = new Map();
    tps.forEach((y) => {
        const dts = y.split(",");
        tpsMap.set(dts[2], dts);
    });

    // Use the map in the ftldtms loop
    ftldtms.forEach((x) => {
        const dts = tpsMap.get(x.id);
        if (dts && accdaysSet.has(dts[1])) {
            //route_id,service_id,trip_id,trip_headsign,direction_id,block_id,shape_id
            ftldtps.push({
                route: dts[0],
                service_id: dts[1],
                arrv: x.arrv,
                attribute: "Scheduled at:",
                trip_id: dts[2],
                trip_headsign: dts[3].replace(/\"/g, ""),
                dir: dts[4],
                block: dts[5],
                shape_id: dts[6].replace("\r", ""),
            });
        }
    });

    return new Response(JSON.stringify({
        query: {
            time: gtfshr,
            date: gtfsdt,
            stop: stopid,
            agency: ag.replace("oct", "OC Transpo"),
            accdays: accdays,
            gtfsmx: gtfsmx,
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