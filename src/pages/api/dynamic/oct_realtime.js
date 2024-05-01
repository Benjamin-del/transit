/*
OCTRANSPO API v2.0 - DEPRICATED
*/


import { DateTime } from "luxon";
// Using to parse dates and to ensure I don't have to deal with timezones
const zone = "America/Toronto"
// Ottawa is using Toronto's timezone, so I'm using that as the default. I could also use NYC's timezone.
import gtfs from "../../../../helpers/fetch_gtfs"
import oc_alerts from "../../../../helpers/oc_alerts";

export const config = {
	runtime: 'edge', 
};

export default async function handler(req, res) {
	const params = new URL(req.url).searchParams
	// This is going to get all of the bus cancelations in the city, so that it can guess if it will be canceled.
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
		// Why couldn't they just use the same ID?
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
		// Convert ID (GTFS) To Code (OC API)
		try {
			const data = await fetch("https://api.octranspo1.com/v2.0/GetNextTripsForStopAllRoutes?appID=87c88940&apiKey=6ef18ce1eff8c5741812b6814766b7e0&format=JSON&stopNo=" + code)
			// The content-type header on the OC API is set to text/html, so it means that response.json() won't work.
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
				return a.time.adjustedStopTime - b.time.adjustedStopTime
			})

			return { arrivals: tmSt, stop: stp_inf, /*cancelations: cancelations */ };
			// Let's not return all cancelations, as it's not needed.
		}
	}
	async function geoJsonCollect(obj) {
		// Let's make sure that the data is in a stable and usable format... How hard should it be?
		// If there is only one route that serves the stop, the api returns {Trips: {Trip: [array]}}, but if there is multiple routes it returns {Trips: [array]} or {Trips: Object}
		// This behavior is not documented in the API documentation, and is very annoying It should also not be happening on a production server!.
		const multiTrip = (function () {
			//console.log("tripsObj", obj.Trips)
			if (Array.isArray(obj.Trips)) {
				console.log("Array")
				return obj.Trips
				// This is what it should be doing
			} else {
				console.log("Object")
				if (obj.Trips.Trip) {
					return obj.Trips.Trip
				} else {
					return [obj.Trips]
					// This happens when there is only one route and the API returns {trips: {OBJECT}} instead of {trips: {Trip: [ARRAY], 
				}
				// This is not OK! This should be OC's Side, not mine!
			}
			// I am going to use this instead of objToArray, as sometimes it can mess up. 
		})()
		return multiTrip.map((trip) => {
			//console.log(trip)
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
		}).flat()
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