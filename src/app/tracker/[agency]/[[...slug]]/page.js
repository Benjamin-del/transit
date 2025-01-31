"use client"
// Current TASK, MOVE OVER TO NEW API ENDPOINT (/api/gtfs/unified/ag)
import React, { useRef, useEffect, useState } from 'react';

import mapboxgl from 'mapbox-gl';
import map_css from '../../../../styles/map.module.css'
import button_css from '../../../../styles/button.module.css'
import 'mapbox-gl/dist/mapbox-gl.css';
import 'material-symbols';


mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY;

export default function Home({ params }) {

    const { slug, agency} = React.use(params)

    console.log(slug, agency)
    const mapContainerRef = useRef(null);
    const map = useRef(null);

    const [content, setContent] = useState({ type: "splash", data: null }) // Content to display in sidebar
    const [request, setRequest] = useState({ stop: null, agency: "oct", type: null }) // Trigger API Requests

    const [marker, setMarker] = useState(null)

    // Create Control for custom button
    class MapboxGLButtonControl {
        constructor({
            className = "",
            title = "",
            eventHandler = evtHndlr
        }) {
            this._className = className;
            this._title = title;
            this._eventHandler = eventHandler;
        }

        onAdd(map) {
            this._btn = document.createElement("button");
            this._btn.className = "mapboxgl-ctrl-icon" + " " + this._className;
            this._btn.type = "button";
            this._btn.title = this._title;
            this._btn.onclick = this._eventHandler;

            this._container = document.createElement("div");
            this._container.className = "mapboxgl-ctrl-group mapboxgl-ctrl";
            this._container.appendChild(this._btn);

            return this._container;
        }

        onRemove() {
            this._container.parentNode.removeChild(this._container);
            this._map = undefined;
        }
    }

    // Initialize map when component mounts
    useEffect(() => {

        map.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/standard",
            center: [-75.70893955298494, 45.34824731651693],
            zoom: 10,
            attributionControl: false
        });
        // Add navigation control (the +/- zoom buttons)
        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        // Add geolocate control to the map.
        map.current.addControl(new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }), 'top-right');

        map.current.on('load', () => {
            map.current.setConfigProperty('basemap', 'showTransitLabels', false);
        })

        map.current.on('style.load', () => {
            map.current.loadImage('/images/bus.png', (error, image) => {
                if (error) throw error;
                // Add the loaded image to the style's sprite with the ID 'bus'.
                map.current.addImage('bus-01', image);
            });
            mapLoad()
        })
        // Add Custom Layer control

        const layerButton = new MapboxGLButtonControl({
            className: "mapbox-gl-layer fa",
            title: "Change Layers",
            eventHandler: changelayer
        });
        map.current.addControl(layerButton, 'top-right');

        function changelayer() {
            console.log(map.current.getStyle())
            if (!map.current.getStyle().name) {
                map.current.setStyle("mapbox://styles/mapbox/satellite-streets-v12")
            } else {
                map.current.setStyle("mapbox://styles/mapbox/standard")
            }
        }

        //If  Params (stop, agency, and type) are present, load the data
        navHndlr(slug)


        // Add Event Listener for Popstate
        window.addEventListener('popstate', (event) => { // for some reason with won't fire when window.history.back() is called, take a look at refreshURLParams for the logic on that
            // Get the updated URL
            const params = window.location.pathname.split("/").filter((x) => x !== "")
            //console.log(params)
            navHndlr(params)
        })
        // Clean up on unmount
        return () => map.current.remove();
    }, []);

    function navHndlr(slug) { // Function to handle the URL Params
        //console.log("nh", slug)
        if (slug && (slug[0] === "stop" || slug[0] === "route" || slug[0] === "arrival")) {
            setRequest({ stop: slug[1], type: slug[0], route: slug[1] })
        }

    }
    useEffect(() => { // When the Request Object is updated, fetch the data from the API
        if (request.type === "splash") {
            setContent({ type: "splash", data: null })
            resetMarkers()
            removeRoute()
            window.history.pushState({ path: "/tracker/" }, '', "/tracker/")
            return
        }
        if (/*!request.agency || */!request.type) return // Ignore if no request, Agency should be a constant, so no need to check
        setContent({ type: "loading", data: null })
        resetMarkers()

        if (/*request.stop &&  request.agency && */ request.type) {
            if (request.type === "stop" /* Replacing Realtime & Static info stop, will query for both */) {
                console.log("Requesting Schedule Data")
                configStatSched(request.stop, (request.time || undefined), (request.date || undefined), false) // Static Data, if undefined, will default to current time
            } else if (request.type === "arrival") {
                console.log("Requesting Realtime Data")
                configStatSched(request.stop, undefined, undefined, true) // Realtime Data, undefineds hold order
            } else if (request.type === "route") {
                console.log("Requesting Trip Data")
                getTripInfo(request.route, (request.stop || undefined)) // User requests to see bus route/shape on map.
            } else {
                console.log("Unknown Request Type", request.type)
            }
        }
    }, [request])

    async function configStatSched(stop, time, date, realtime) { // Main function to fetch data from the API, including RT data

        window.history.pushState({ path: "/tracker/" + agency + "/" + (realtime ? "arrival" : "stop") + "/" + stop }, '', "/tracker/" + agency + "/" + (realtime ? "arrival" : "stop") + "/" + stop)

        const staticData = await fetch("/api/gtfs/" + (function () {
            if (realtime) {
                return "unified" // Move to Unified API endpoint
            }
            return "schedule"
        }()) + "/" + agency + "?stop=" + stop + "&time=" + time + "&date=" + date) // Fetch Static Data
            .then((response) => response.json())
            .then((data) => {
                console.log("Static Data", data)
                if (data.error) {
                    data.schedule = []
                    console.log("Error")
                    setContent({
                        type: "error",
                        data: data.error,
                        dsc: {
                            code: "ERR",
                            text: "Oops... Something went wrong!"
                        }
                    })
                    return
                }
                // Set data, Tell them it is a static schedule
                console.log("query", data.query)
                setContent({
                    type: realtime ? "arrival" : "stop",
                    data: data.schedule || data.arrivals || [],
                    query: data.query,
                    dsc: {
                        code: data.stop.stop_code,
                        text: data.stop.stop_name,
                    }
                })
                resetMarkers()
                removeRoute()
                console.log(data.stop)
                if (data.stop) {
                    map.current.flyTo({
                        center: [data.stop.stop_lon, data.stop.stop_lat],
                        zoom: 16,
                        essential: true // this animation is considered essential with respect to prefers-reduced-motion
                    });
                }
                return { data: data, type: "static" }
            })
        /*const uniqueRoutes = [...new Set(staticData.data.schedule.map((x) => x.trip_id))].join(",")
        console.log(uniqueRoutes) // Instead of going by trips param, I am going to go by route and have an ioption to view the trip on the sidebar (Implement Later)
        if (uniqueRoutes === "") {
            console.log("No Routes")
            return
        }*/
        console.log("realtime", realtime)

        if (realtime && content.data) {
            const gpsPositions = content.data?.filter((x) =>{ 
                console.log(x.assigned)
                return x.assigned.vehicle === true && x.position
            }) // Filter out buses that are not assigned
            resetMarkers()

            const newMarkers = []
            console.log("positions", gpsPositions)
            gpsPositions.forEach((x) => {
                // Render React to String to add to popup

                // Create Markers

                const popup = new mapboxgl.Popup()
                    .setLngLat([x.position.lon, x.position.lat])
                    .setHTML(('<div><h3>' + x.trip.route_id + " " + (x.trip.trip_headsign || "No Headsign") + '</h3><p>Bus: ' + x.position.id + '</p></div>'))
                    .addTo(map.current);    

                
                const el = document.createElement('div');
                el.className = map_css.marker;
                el.innerHTML = "<span class='material-symbols-rounded' style='font-size: 5vh; color: #004777'>directions_bus</span>";
                el.addEventListener('click', () => {
                    if (!x.trip) return // Ignore if no trip
                    //addRoute(x.trip.shape_id, agency)
                    setRequest({ stop: x.stop_id, type: "route", route: x.trip.trip_id })
                });
                newMarkers.push(new mapboxgl.Marker(el).setLngLat([x.position.lon, x.position.lat]).setPopup(popup).addTo(map.current))

            })
            setMarker(newMarkers)
            console.log("Realtime Data added to map!")
        }
        /*if (realtime) { // Tempoairly remove Realtime Data, in order to move over to the Unified API endpoint
            await fetch("/api/gtfs/vehicle/" + agency + "?trip=" + uniqueRoutes)
                .then((response) => response.json())
                .then((data) => {
                    console.log("Realtime Data", data)
                    if (data.error) {
                        console.log("Error")
                        alert("We are unable to fetch real-time data at this time.")
                        return
                    }
                    resetMarkers()
                    const newMarkers = []
                    data.arrivals.forEach((x) => {
                        // Render React to String to add to popup

                        // Create Markers

                        const popup = new mapboxgl.Popup()
                            .setLngLat([x.longitude, x.latitude])
                            .setHTML(('<div><h3>' + x.route + " " + (x.trip?.trip_headsign || "No Headsign") + '</h3><p>Bus: ' + x.vehicle.id + '</p></div>'))
                            .addTo(map.current);

                        const el = document.createElement('div');
                        el.className = map_css.marker;
                        el.innerHTML = "<span class='material-symbols-rounded' style='font-size: 5vh; color: #004777'>directions_bus</span>";
                        el.addEventListener('click', () => {
                            if (!x.trip) return // Ignore if no trip
                            //addRoute(x.trip.shape_id, agency)
                            setRequest({ stop: x.stop_id, type: "route", route: x.trip.trip_id })
                        });
                        newMarkers.push(new mapboxgl.Marker(el).setLngLat([x.longitude, x.latitude]).setPopup(popup).addTo(map.current))
                    })

                    setMarker(newMarkers)
                    console.log("Realtime Data added to map!")
                })
        }*/
    }
    function mapLoad() { // When the map is loaded, add the sources and layers

        console.log("Loaded Map!")
        map.current.addSource('all_stops', {
            type: 'geojson',
            // Point to GeoJSON data for stops
            data: '/api/geo/stops/?agency=' + agency,
            cluster: true,
            clusterMaxZoom: 14, // Max zoom to cluster points on
            clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
        });

        map.current.addLayer({ // Add a layer for the stops' clusters (circles)
            id: 'clusters',
            type: 'circle',
            source: 'all_stops',
            filter: ['has', 'point_count'],

            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#ff7700',
                    100,
                    '#004777',
                    750,
                    '#81a4cd'
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    100,
                    30,
                    750,
                    40
                ]
            }
        });

        map.current.addLayer({ // Add a layer for the stops' count (text)
            id: 'cluster-count',
            type: 'symbol',
            source: 'all_stops',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': ['get', 'point_count_abbreviated'],
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12,
            },
            paint: {
                'text-color': "#fff"
            }
        });

        map.current.addLayer({ // Add a layer for the stops (using bus icon)
            id: 'bus_stop',
            type: 'symbol',
            source: 'all_stops',
            filter: ['!', ['has', 'point_count']],
            layout: {
                'icon-image': 'bus-01',
                'icon-size': 0.2,
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            }
        });
        map.current.addLayer({ // Add a layer for the stops' names
            id: "stop_labels",
            type: "symbol",
            source: "all_stops",
            layout: {
                "symbol-placement": "point",
                "text-offset": [0, 2.5],
                "text-font": ["Open Sans Regular"],
                "text-field": '{stop_name}',
                "text-size": 12,
            }, "paint": {
                "text-color": "#FF7700",
                "text-halo-color": "#fff",
                "text-halo-width": 2
            }

        })

        map.current.on('click', 'clusters', (e) => { // When a cluster is clicked, zoom in
            const features = map.current.queryRenderedFeatures(e.point, {
                layers: ['clusters']
            });
            const clusterId = features[0].properties.cluster_id;
            map.current.getSource('all_stops').getClusterExpansionZoom(
                clusterId,
                (err, zoom) => {
                    if (err) return;

                    map.current.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom: zoom
                    });
                }
            );
        });

        map.current.on('click', 'bus_stop', (e) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
            setRequest({ stop: e.features[0].properties.stop_id, type: "arrival", route: null })

            resetMarkers()
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }
        });

        map.current.on('mouseenter', 'clusters', () => {
            map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'clusters', () => {
            map.current.getCanvas().style.cursor = '';
        });
    }

    async function search() { // When the Search bar is used, geolocate the location and fly to it (using osm nominatim)

        const request = await fetch("/api/geo/geolocate?q=" + document.getElementById("geolocate").value)

        const response = await request.json()

        if (response.status === 200) {
            map.current.flyTo({
                center: [response.osm.lon, response.osm.lat],
                zoom: 14,
                essential: true // this animation is considered essential with respect to prefers-reduced-motion
            });
        } else {
            alert("Sorry, We could not find that location.")
        }
    }

    function refreshURLParams(window) { // When Back Arrow is used, bring the user back 1 increment in history, and update the Request Object with the new 
        console.log("Refresh")
        window.history.back()    
        const params = window.location.pathname.split("/").filter((x) => x !== "" && x !== "tracker")

        setRequest({ stop: slug[1], type: slug[0], route: slug[1] })

    }
    function qryrf() {
        const fts = map.current.queryRenderedFeatures({ layers: ['bus_stop'] }).filter((x) => {
            return x.properties.stop_name.toLowerCase().includes(document.getElementById("geolocate").value.toLowerCase()) || x.properties.stop_code.toLowerCase().includes(document.getElementById("geolocate").value.toLowerCase())
        })

        console.log(fts)
    }

    async function getTripInfo(trip, stop) {
        console.log("Loading Trip Info")

        window.history.pushState({ path: "/tracker/" + agency + "/route/" + trip }, '', "/tracker/" + agency + "/route/" + trip)

        const request = await fetch("/api/gtfs/trips/" + agency + "?trip=" + trip + "&stop=" + stop)
        const response = await request.json()
        console.log(response)
        if (response.error) {
            setContent({
                type: "error",
                data: response.error,
                dsc: {
                    code: "ERR",
                    text: "Oops... Something went wrong!"
                }
            })
            return
        } else {
            setContent({
                type: "route",
                data: response.trip,
                dsc: {
                    code: response.tripInfo.route_id,
                    text: response.tripInfo.trip_headsign
                }
            })

            addRoute(response.tripInfo.shape_id)
        }
    }
    function redirStop(stop) {
        // Replace with setRequest
        setRequest({ stop: stop, type: "stop", route: null })
        //setAgency(agency)
        //setStop(stop)

        resetMarkers()
        removeRoute()

    }

    function resetMarkers() {
        console.log("Resetting Markers")
        console.log(marker)
        if (marker) {
            // Remove Markers if they exist
            marker.forEach((x) => {
                x.remove()
            })
            //console.log("removed")
            // Set Marker to null
            setMarker(null)
        }

        console.log("Markers Reset!")
        return
    }

    function removeRoute() {
        if (map.current.getLayer("context_rt_lyr")) {
            console.log("Existing layer found")
            map.current.removeLayer("context_rt_lyr");
        }
        if (map.current.getLayer("context_rt_sym")) {
            console.log("Existing layer found")
            map.current.removeLayer("context_rt_sym");
        }
        if (map.current.getSource("context_rt_src")) {
            console.log("Existing source found")
            map.current.removeSource("context_rt_src");
        }
        console.log("Removed Route!")
    }
    function addRoute(shape_id) {
        removeRoute()

        map.current.addSource('context_rt_src', {
            type: 'geojson',
            // Use a URL for the value for the `data` property.
            data: '/api/geo/shape?agency=' + agency + '&id=' + shape_id
        });

        map.current.addLayer({
            'id': 'context_rt_lyr',
            'type': 'line',
            'source': 'context_rt_src',
            'paint': {
                'line-color': '#004777',
                'line-width': 3
            },
        },
            'clusters'
        );

        map.current.addLayer({
            "id": "context_rt_sym",
            "type": "symbol",
            "source": "context_rt_src",
            "layout": {
                "symbol-placement": "line",
                "text-offset": [0, 0.5],
                "text-font": ["Open Sans Regular"],
                "text-field": '{route}',
                "text-size": 18,
            }, "paint": {
                "text-color": "#004777",
                "text-halo-color": "#fff",
                "text-halo-width": 2
            }
        });
    }
    return (
        <div>
            <div>
                <div className={map_css.main_content}>
                    <div className={map_css.sidebar}>
                        <div className={map_css.sidebar_header}>
                            {/*content?.type === "splash" ? (
                                <h1>Benja Transit</h1>
                            ) : null
                            */}
                            <div className={map_css.heading_child}>
                                {(content.type !== "splash" || content.type !== "loading" ) /*&& window?.history.length > 1*/  ? (
                                    <div className={button_css.icon_flex}>
                                        <button onClick={() => {
                                            refreshURLParams(window)
                                        }} className={button_css.icon_btn}>
                                            <span className="material-symbols-rounded">arrow_back</span>
                                        </button>
                                    </div>
                                ) : null}
                                <input
                                    id="geolocate"
                                    placeholder='Search by Location'
                                    onKeyUp={() => qryrf()}
                                    className={map_css.search_ipt}
                                />
                                <div className={button_css.icon_flex}>
                                    <button onClick={() => search()} className={button_css.icon_btn}>
                                        <span className="material-symbols-rounded">search</span>
                                    </button>
                                    {content.type !== "splash" ? (
                                        <button onClick={() => setRequest({ type: "splash" })} className={button_css.icon_btn}>
                                            <span className="material-symbols-rounded">close</span>
                                        </button>
                                    ) : null}

                                </div>

                            </div>

                        </div>

                        <div className={map_css.arrv_parent}>
                            {
                                content.type === "loading" ? (
                                    <div className={map_css.no_content}>
                                        <span className="material-symbols-rounded" style={{ fontSize: "10vh" }}>move</span>
                                        <p>Loading...</p>
                                    </div>
                                ) : !content.type === "error" ? (
                                    <div className={map_css.no_content}>
                                        <span className="material-symbols-rounded" style={{ fontSize: "10vh" }}>error</span>
                                        <p>Whoops! We have run into a problem</p>
                                        <p>Error Details: {content.data}</p>
                                    </div>
                                ) : content.data?.length === 0 ? (
                                    <div className={map_css.no_content}>
                                        <span className="material-symbols-rounded" style={{ fontSize: "10vh" }}>error</span>
                                        <p>{content.type === "arrival" ? "No Arrivals Found" : content.type === "stop" ? "No Departures Found" : ""}</p>
                                    </div>
                                ) : content.data ? (
                                    <div className={map_css.grow_parent}>
                                        <div className={map_css.arrv_title}>
                                            <span className={map_css.route_span}>
                                                <div className={map_css.schedIfSp}>
                                                    <span className='material-symbols-rounded' style={{ paddingBlock: "1vh" }}>{
                                                        content.type === "stop" ? "schedule" : content.type === "arrival" ? "sensors" : "route"
                                                    }</span>
                                                    {content.dsc?.code}
                                                </div>
                                            </span>
                                            <p>{content.dsc?.text}</p>
                                        </div>
                                        <div className={map_css.arrv_scroll}>
                                            {
                                                content.data.map((x) => {
                                                    return (
                                                        <div key={Math.random()}>
                                                            {(content.type === "stop" || content.type === "arrival") && content.data ? (
                                                                <a onClick={() => {
                                                                    setRequest({ stop: x.stop_id, type: "route", route: x.id })
                                                                    //addRoute(x.shape_id, request.agency)
                                                                }}>
                                                                    <div className={map_css.arrv_elem}>
                                                                        <div className={map_css.headsign}>
                                                                            <div>
                                                                                <span className="material-symbols-rounded" style={{ paddingBlock: "1vh" }}>directions_bus</span>
                                                                                <span className={map_css.route_span}>{x.trip.route_id}</span>
                                                                                <p>{x.trip.trip_headsign}</p>
                                                                            </div>
                                                                            <p>{x.arrival_time}</p>
                                                                        </div>
                                                                        <br />
                                                                        <p>
                                                                            Status: { !x.delay ? "Unavailable" : x.delay?.actual === 0 ? "On Time" : x.delay?.actual > 0 ? "Delayed by " + x.delay?.actual + " minutes" : "Early by " + Math.abs(x.delay?.actual) + " minutes"}
                                                                            <br />
                                                                            Bus: {x.assigned.vehicle ? x.position.id : "Not Assigned"}
                                                                        </p>
                                                                    </div>
                                                                </a>
                                                            ) : content.type === "route" && content.data ? (
                                                                <a onClick={() => {
                                                                    redirStop(x.stop.id)

                                                                }}>
                                                                    <div className={map_css.arrv_elem}>
                                                                        <div className={map_css.headsign}>
                                                                            <div>
                                                                                <span className="material-symbols-rounded" style={{ paddingBlock: "1vh" }}>room</span>
                                                                                <span className={map_css.route_span}>{x.stop.code}</span>
                                                                            </div>
                                                                            <p>{x.stop.name}</p>
                                                                        </div>
                                                                        <br />
                                                                        <p>Scheduled at: {x.arrival_time}</p>
                                                                    </div>
                                                                </a>
                                                            ) : null}
                                                        </div>
                                                    )
                                                })
                                            }
                                            {content.type === "stop" ? (
                                                <div className={map_css.adv_src}>
                                                    <input
                                                        className={map_css.no_bg} type="time" id="adv_time" defaultValue={(() => {
                                                            const timeStr = content.query.time?.toString() || '';
                                                            const hh = timeStr.slice(0, 2);
                                                            const mm = timeStr.slice(2, 4);
                                                            return `${hh}:${mm}`;
                                                        })()}
                                                        onBlur={() => {
                                                            console.log("Time Changed")
                                                            setRequest({
                                                                stop: content.query.stop,
                                                                type: "stop",
                                                                time: document.getElementById("adv_time").value || undefined,
                                                            })
                                                        }}
                                                    />
                                                    <button onClick={() => {
                                                        setRequest({
                                                            stop: content.query.stop,
                                                            type: "arrival",
                                                            time: undefined,
                                                        })
                                                    }}>Current Arrivals</button>

                                                </div>

                                            ) : content.type === "arrival" ? (
                                                <div className={map_css.adv_src}>
                                                    <button onClick={() => {
                                                        setRequest({
                                                            stop: slug[1],
                                                            type: "stop",
                                                            time: undefined,
                                                        })
                                                    }}>View Schedule</button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={map_css.no_content}>
                                        <div>
                                            <p>Select a Stop or Search To Get Started</p>
                                        </div>
                                        <div>
                                            <a href='https://github.com/Benjamin-Del/transit'><p>LongitudeTransit v3.8</p></a>
                                        </div>
                                    </div>
                                )}
                            {(content.data && content.type !== "loading") ? (
                                <div className={button_css.flex}>
                                    {/*}
                                    <a className={button_css.large} onClick={() => gotoHighlight()}>
                                        <span className="material-symbols-rounded" style={{ paddingBlock: "1vh" }}>pin_drop</span>
                                    </a>
                                    */}
                                    <a className={button_css.large} onClick={() => {
                                        // Copy Curent URL to Clipboard
                                        navigator.clipboard.writeText(window.location.href)
                                        alert("URL Copied to Clipboard!")
                                    }}>
                                        <span className="material-symbols-rounded" style={{ paddingBlock: "1vh" }}>share</span>
                                    </a>

                                </div>
                            ) : !content.data && content.type !== "loading" ? (
                                <div className={button_css.flex_column}>
                                    <a className={button_css.large_txt} href="/explore">
                                        <span className="material-symbols-rounded" style={{ paddingBlock: "1vh" }}>explore</span>
                                        <p>Data Explorer</p>
                                    </a>
                                    <a className={button_css.large_txt} href="/notices">
                                        <span className="material-symbols-rounded" style={{ paddingBlock: "1vh" }}>info</span>
                                        <p>Data Feed Status</p>
                                    </a>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    <div className={map_css.map_container} ref={mapContainerRef} />
                </div>
            </div>
        </div >
    );
};