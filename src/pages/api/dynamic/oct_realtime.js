import { DateTime } from "luxon";
// Using to parse dates and to ensure I don't have to deal with timezones
const zone = "America/Toronto"
// Ottawa is using Toronto's timezone, so I'm using that as the default. I could also use NYC's timezone.
import gtfs from "../../../../helpers/fetch_gtfs"
import route_helper from "../../../../helpers/routes"
// This fetched our file and returns it.


export const config = {
    runtime: 'edge', // this is a pre-requisite
};

export default async function handler(req, res) {
        const params = new URL(req.url).searchParams

		const stopid = params.get("stop")
		
		async function code2id(code) {
			// Transforms GTFS stop ID to OCTranspo stop ID (used in 560-560)
			const list = await gtfs.download("stops.txt", "oct")
			//console.log(list)
			for (var i = 0; i < list.length; i++) {
				const dts = list[i].split(",")
				if (dts[0] === code) {
					return {
						id: dts[0],
						code: dts[1],
						name: dts[2].replace(/\"/g, ""),
						lat: Number(dts[4]),
						lon: Number(dts[5]),
					}
					// More information can be sent to the API
				}
			}
			return null
		}

		if (!stopid) {
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
		function arrayobj(objorarr) {
			// OCtranspo API is weird, sometimes it returns an array, sometimes it returns an object???
			if (JSON.stringify(objorarr).split("")[0] === "{") {
				//Cheating, but typeof returns object for both arrays and objects
				return [objorarr]
				// It's an object, so I'm going to make it an array
			} else {
				return objorarr
				// Yay! It's an array!
			}
			// This is a very hacky way of doing it, but it works.
			// I took this part straight from v2 of the API. 
		}
		const tm_arr = []
		async function ocrealtime() {
			const stp_inf = await code2id(stopid)
			if (!stp_inf) {
				return { error: "404" }
			}
			const data = await fetch("https://api.octranspo1.com/v2.0/GetNextTripsForStopAllRoutes?appID=87c88940&apiKey=6ef18ce1eff8c5741812b6814766b7e0&format=JSON&stopNo=" + stp_inf.code)
			
			console.log("Loading code:" + stp_inf.code)

			const response = await data.text()
			if (response.includes("<h4>")) {
				console.log(response)
				console.error("OC Transpo API Error")
				return { error: "500" }
			} else {
				// Why did you send JSON as HTML???
				const json = JSON.parse(response)
				const rt = json.GetRouteSummaryForStopResult.Routes.Route
				const route = arrayobj(rt)
				for (var i = 0; i < route.length; i++) {
					await geoJsonCollect(route[i])
				}
				return {arrivals: tm_arr, stop: stp_inf};
			}
		}
		async function geoJsonCollect(obj) {
			//console.log("data-2", obj.Trips)
			// Sometimes it returns an array, sometimes it returns an object. This makes sure it is an Object
			// I will return this array 

			const trips = arrayobj(obj.Trips)
			for (var i = 0; i < trips.length; i++) {
				// Push to array of all trips (GPS or not)
				tm_arr.push({
					no: obj.RouteNo,
					heading: obj.RouteHeading,
					destination: trips[i].TripDestination,
					time: {
						mins: trips[i].AdjustedScheduleTime,
						hhmm: DateTime.now().setZone(zone).plus({ minutes: trips[i].AdjustedScheduleTime }).toFormat("HH:mm"),
						adjustedTime: trips[i].AdjustedScheduleTime,
						adjustmentAge: trips[i].AdjustmentAge,
						tripStartTime: trips[i].TripStartTime,
					},
					direction: obj.DirectionID,
					geo: (trips[i].Latitude !== undefined && trips[i].Latitude !== ""),
					longitude: trips[i].Longitude,
					latitude: trips[i].Latitude,
					lastTrip: trips[i].LastTripOfSchedule,
					//gtfs: await route_helper.get(obj.RouteNo, "oct"),
				})
			}
			return
		}

		// STATIC MOVED TO SHAPE
        return new Response(
            JSON.stringify(await ocrealtime()),
            {
                status: 200,
                headers: {
                    'content-type': 'application/json',
                },
            },
        );
};