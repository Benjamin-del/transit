import { DateTime } from "luxon";
// Using to parse dates and to ensure I don't have to deal with timezones
const zone = "America/Toronto"
// Ottawa is using Toronto's timezone, so I'm using that as the default. I could also use NYC's timezone.
import gtfs from "../../../../helpers/fetch_gtfs"
import oc_alerts from "../../../../helpers/oc_alerts";

// This fetched our file and returns it.


export const config = {
	runtime: 'edge', // this is a pre-requisite
};

export default async function handler(req, res) {
	const params = new URL(req.url).searchParams
	const cancelations = await oc_alerts.allCancels()

	//console.log("cancels", cancelations)
	const stopid = params.get("stop")
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
	console.log("DYNAMIC/OCT_REALTIME:" + stopid + " oct")
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

	function objToArray(objorarr) {
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

	async function fetchData(code) {
		try {
			const data = await fetch("https://api.octranspo1.com/v2.0/GetNextTripsForStopAllRoutes?appID=87c88940&apiKey=6ef18ce1eff8c5741812b6814766b7e0&format=JSON&stopNo=" + code)
			// The content-type header on the OC API is set to HTML. This parses the data as text, and then converts it to JSON.
			const response = await data.text()
			//console.log(response)
			if (response.includes("<h4>") || response.includes("<html>")) {
				console.log(response)
				console.error("OC Transpo API Error")
				return { error: "500", message: "Error: OC Transpo API Error" }
			}
			const json = JSON.parse(response)
			if (json.error) {
				return { error: 500, message: "Error: OC Transpo API Error" }
			}
			return json
		} catch (e) {
			console.error(e)
			return { error: 500, message: "Error: Server Connection Error!" }
		}
	}
	async function createAPIResponse() {
		const stp_inf = await code2id(stopid)
		if (!stp_inf) {
			return { status: 404, message: "Error: Stop not found" }
		}

		console.log("Loading code:" + stp_inf.code)
		const response = await fetchData(stp_inf.code)
		if (response.error) {
			return response

		} else {
			
			const json = response
			const rt = json.GetRouteSummaryForStopResult.Routes.Route
			const route = objToArray(rt)
			const tm_arr = []
			//console.log(route)
			for (var i = 0; i < route.length; i++) {
				// For each route, get the trips.
				tm_arr.push(await geoJsonCollect(route[i]))
			}
			//Flatten the array of arrays & Sort by arrival time
			const tmSt = tm_arr.flat().sort((a, b) => {
				return a.time.adjustedTime - b.time.adjustedTime
			})
			
			return { arrivals: tmSt, stop: stp_inf, /*cancelations: cancelations */};
		}
	}
	async function geoJsonCollect(obj) {
		// When there is only one trip/route/value, the API returns an object, not an array. This makes sure that it's always an array.
		const trips = objToArray(obj.Trips)
		
		
		return trips.map((trip) => {
			console.log(trip)
			// Logic to decide if the trip has a high likleyhood of being canceled.
			const route_cancl = cancelations.filter((cancelation) => {
				if (trip.TripStartTime) {
					const number = Number(trip.TripStartTime.replace(/:/g, "")) - Number(cancelation.trip_start.replace(/:/g, ""))
					if (cancelation.route === obj.RouteNo && (number >= 0 && number < 5)) {
						return true
					}
				}
			}).length
			
			return {
				no: obj.RouteNo,
				heading: obj.RouteHeading,
				destination: trip.TripDestination,
				time: {
					hhmm: DateTime.now().setZone(zone).plus({ minutes: trip.AdjustedScheduleTime }).toFormat("HH:mm"),
					adjustedStopTime: Number(trip.AdjustedScheduleTime),
					variation: Number(trip.AdjustmentAge),
					tripStartTime: trip.TripStartTime,
				},
				direction: obj.DirectionID,
				canceled: (function () {
					return route_cancl !== 0
				})(),
				geo: (trip.Latitude !== undefined && trip.Latitude !== ""),
				longitude: trip.Longitude,
				latitude: trip.Latitude,
				lastTrip: trip.LastTripOfSchedule,
			}
		})
	}
	const rt = await createAPIResponse()
	console.log("error", rt.error)
	
	return new Response(
		JSON.stringify(rt),
		{
			status: rt.error || 200,
			headers: {
				'content-type': 'application/json',
			},
		},
	);
};