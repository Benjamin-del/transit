import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import map_css from '../styles/map.module.css'
import 'mapbox-gl/dist/mapbox-gl.css';
import Head from 'next/head';
import 'material-icons/iconfont/material-icons.css'
import { DateTime } from 'luxon';
import Link from 'next/link'
import { renderToString } from 'react-dom/server';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY;

export default function Home({ update }) {
    const day = DateTime.fromISO(update)
    const mapContainerRef = useRef(null);
    const map = useRef();

    const [data, setData] = useState({ data: null, type: null })
    const [request, setRequest] = useState({stop: null, agency: null, type: null})

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
            hash: "position",
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
        // Add attribution control
        map.current.addControl(new mapboxgl.AttributionControl({
            customAttribution: 'Last GTFS Update: ' + day.toFormat("yyyy-MM-dd") + " <a href='/notices'>Data Sources</a>"
        }));
        // Configure Mapbox Standard Styles

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

        //If Hash Params (stop, agency, and type) are present, load the data
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.has('type') && hashParams.has('agency') && hashParams.has('stop')) {
            setRequest({ stop: hashParams.get('stop'), agency: hashParams.get('agency'), type: hashParams.get('type'), route: hashParams.get('route')})
        }

        // Clean up on unmount
        return () => map.current.remove();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!request.agency || !request.type) return // Ignore if no request

        // Get Hash paramaters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        setData({ data: "loading", type: null })
        console.log("Request", request)
        if (/*request.stop && */ request.agency && request.type) {
            if (request.type === "stop" /* Replacing Realtime & Static info stop, will query for both */) {
                console.log("Requesting Schedule/Realtime Data")
                configStatSched(request.agency, request.stop)
            } else if (request.type === "route") {
                console.log("Requesting Trip Data")
                getTripInfo(request.agency, request.route, (request.stop || hashParams.get('stop') || undefined))
            } else {
                console.log("Unknown Request Type", request.type)
                setData({ data: "Unknown Request Type", type: error })
            }
        }
    }, [request])

    async function configStatSched(agency, stop) {
        // Add to URL hash Stop ID & Ageny
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        // Update agency and stop parameters
        hashParams.set('agency', agency);
        hashParams.set('stop', stop);
        hashParams.delete('route') /* Remove Route ID, if provided*/
        hashParams.set('type', "stop");

        // Manually construct the hash string
        let hashString = '';
        for (let [key, value] of hashParams) {
            if (hashString !== '') hashString += '&';
            hashString += `${key}=${value}`;
        }

        // Set the hash with the updated parameters
        window.location.hash = hashString;

        // Replacing this with async function
        
       const staticData = await fetch("/api/gtfs/schedule/" + agency + "?stop=" + stop) // Fetch Static Data
            .then((response) => response.json())
            .then((data) => {
                console.log("Static Data", data)
                if (data.error) {
                    data.schedule = []
                    console.log("Error")
                    setData({ data: data, type: "error" })
                    return
                }
                // Set data, Tell them it is a static schedule
                setData({ data: data, type: "static" })
                resetMarkers()
                console.log(data.stop)
                map.current.flyTo({
                    center: [data.stop.stop_lon, data.stop.stop_lat],
                    zoom: 16,
                    essential: true // this animation is considered essential with respect to prefers-reduced-motion
                });
                return { data: data, type: "static" }
            })
        const uniqueRoutes = [...new Set(staticData.data.schedule.map((x) => x.route))].join(",")
        console.log(uniqueRoutes) // Instead of going by trips param, I am going to go by route and have an ioption to view the trip on the sidebar (Implement Later)
        if (uniqueRoutes === "") {
            console.log("No Routes")
            return
        }
        const realtimeData = await fetch("/api/gtfs/vehicle/" + agency + "?route=" + uniqueRoutes)
            .then((response) => response.json())
            .then((data) => {
                console.log("Realtime Data", data)
                if (data.error) {
                    console.log("Error")
                    return
                }
                resetMarkers()
                const newMarkers = []
                data.arrivals.forEach((x) => {
                    // Render React to String to add to popup

                    // Create Markers

                    const popup = new mapboxgl.Popup()
                        .setLngLat([x.longitude, x.latitude])
                        .setHTML(('<div><h3>' + x.route + " " + x.trip.trip_headsign + '</h3><p>Bus: ' + x.vehicle.id + '</p></div>'))
                        .addTo(map.current);

                    const el = document.createElement('div');
                    el.className = map_css.marker;
                    el.innerHTML = "<span class='material-icons-round' style='font-size: 5vh; color: #004777'>directions_bus</span>";
                    el.addEventListener('click', () => {
                        console.log(x)
                        addRoute(x.trip.shape_id, agency)
                        setRequest({ stop: x.stop_id, agency: agency, type: "route", route: x.trip.trip_id })
                    });
                    newMarkers.push(new mapboxgl.Marker(el).setLngLat([x.longitude, x.latitude]).setPopup(popup).addTo(map.current))
                })
                console.log("Realtime Data added to map!")
            })
            
    }
    function mapLoad() {

        console.log("Loaded Map!")
        map.current.addSource('all_stops', {
            type: 'geojson',
            // Point to GeoJSON data for stops
            data: '/api/geo/all_stops',
            cluster: true,
            clusterMaxZoom: 14, // Max zoom to cluster points on
            clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
        });

        map.current.addLayer({
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

        map.current.addLayer({
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

        // Use bus icon for bus stops
        map.current.addLayer({
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
        // Add a layer for the stops' names
        map.current.addLayer({
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

        map.current.on('click', 'clusters', (e) => {
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

        // When a click event occurs on a feature in
        // the unclustered-point layer, open a popup at
        // the location of the feature, with
        // description HTML from its properties.
        map.current.on('click', 'bus_stop', (e) => {
            const coordinates = e.features[0].geometry.coordinates.slice();
            //redirStop(e.features[0].properties.stop_id, e.features[0].properties.agency)
            setRequest({ stop: e.features[0].properties.stop_id, agency: e.features[0].properties.agency, type: "stop", route: null })
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

    async function search() {

        const request = await fetch("/api/dynamic/geolocate?q=" + document.getElementById("geolocate").value)

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

    function qryrf() {
        const fts = map.current.queryRenderedFeatures({ layers: ['bus_stop'] }).filter((x) => {
            return x.properties.stop_name.toLowerCase().includes(document.getElementById("geolocate").value.toLowerCase()) || x.properties.stop_code.toLowerCase().includes(document.getElementById("geolocate").value.toLowerCase())
        })

        console.log(fts)
    }

    function flyTo(lat, lng) {
        map.current.flyTo({
            center: [lng, lat],
            zoom: 16,
            essential: true // this animation is considered essential with respect to prefers-reduced-motion
        });
    }
    function parseData(info) {
        console.log("data", info)
        const data = info.data
        
        const agency = request.agency
        console.log("Agency", agency)
        // If data is loading, show loading screen
        if (data === "loading") {
            return <div className={map_css.no_content}>
                <span className="material-icons-outlined" style={{ fontSize: "10vh" }}>pending</span>
                <p>Loading...</p>
            </div>
            // If data is none, show no content screen
        } else if (data === "none" || data === null) {
            return splash()
            // If data is error, show error screen
        } else if (info.type === "error") {
            console.log("Error!")
            return splashError(message)
        } else if (info.type === "route") {
            console.log("Data:", data)
            return mapTripInfo(data)

        } else {
            const schedulemap = (function () {

                if (data.schedule.length === 0) {
                    return <div className={map_css.no_content_child}>
                        <div>
                            <span className="material-icons-outlined" style={{ fontSize: "10vh" }}>bus_alert</span>
                            {function () {
                                if (info.type === "realtime") {
                                    return <div style={{ display: 'inline' }}><p>No Realtime Information</p></div>
                                } else {
                                    return <p>No Departures Available</p>
                                }
                            }()}
                        </div>
                    </div>
                } else if (data.schedule) {
                    return data.schedule.map((schedule) => {
                        const styleArr = [map_css.arrv_elem]
                        if (schedule.canceled === true) {
                            styleArr.push(map_css.canceled)
                        }
                        return <a className={map_css.schd_a} onClick={(event) => {
                            console.log(event)

                            if (info.type === "realtime") {
                                console.log("Fly")
                                if (schedule.geo_status) {
                                    map.current.flyTo({
                                        center: [schedule.geo.lng, schedule.geo.lat],
                                        zoom: 14,
                                        essential: true // this animation is considered essential with respect to prefers-reduced-motion
                                    });
                                }
                                /*if (agency === "oct") {
                                    // Special Context to guess Trip ID (OC Transpo RT ONLY)
                                    getContext(schedule.tripStartTime, schedule.route, schedule.dir)
                                    // This will call addRoute() when it is done
                                } else {
                                    addRoute(schedule.shape_id, agency)
                                }*/
                                // GTFS-RT Yay!
                                addRoute(schedule.shape_id, agency)
                            } else {
                                // Add Route Directly since we have the Trip ID already
                                //addRoute(schedule.trip_id, agency)
                                console.log("schedule", schedule)
                                //getTripInfo(agency, schedule.trip_id, stop) 
                                /* Replace with new setRequest Method */
                                setRequest({ stop: stop, agency: agency, type: "route", route: schedule.trip_id })
                                addRoute(schedule.shape_id, agency)
                            }
                        }} key={schedule.trip_id || "NOKEY_" + Math.random()}><div className={styleArr.join(" ")} >
                                <div className={map_css.headsign}>
                                    <span className="material-icons-outlined" style={{ paddingBlock: "1vh" }}>directions_bus</span>
                                    <span className={map_css.route_span}>{schedule.route}</span>
                                    <p>{schedule.trip_headsign}</p>
                                </div>
                                <br />
                                <p>
                                    {(function () {
                                        console.log(schedule)
                                        if (schedule.canceled === true) {
                                            return "Likley Canceled | Scheduled at: "
                                        } else {
                                            return schedule.attribute + " "
                                        }
                                    }())}
                                    {schedule.arrv}
                                </p>

                            </div></a>
                    })
                }
            })()
            return <div className={map_css.arrv_parent}>
                <div className={map_css.heading_child}>
                    <a onClick={() => flyTo(data.stop.stop_lat, data.stop.stop_lon)}><h3 className={map_css.header}>{data.stop.stop_name}</h3></a>
                </div>
                <div className={map_css.arrv_scroll}>{schedulemap}</div>

                {(function () {
                    if (data.schedule.length !== 0) {
                        return <div className={map_css.button_flex}>
                            <a className={map_css.share_sm} onClick={() => closeArrivals(info)}>
                                <span className="material-icons-outlined" style={{ paddingBlock: "1vh" }}>{function () {
                                    if (info.type === "realtime") {
                                        return "arrow_back"
                                    } else {
                                        return "close"
                                    }
                                }()}</span>
                            </a>
                            <a className={map_css.share} href={"/schedule/sto/" + data.stop.stop_id + "?realtime=true"}>
                                <span className="material-icons-outlined" style={{ paddingBlock: "1vh" }}>departure_board</span>
                            </a>
                            <a className={map_css.share} onClick={() => {
                                // Copy Curent URL to Clipboard
                                navigator.clipboard.writeText(window.location.href)
                                alert("URL Copied to Clipboard!")
                                }
                            }> 
                                <span className="material-icons-outlined" style={{ paddingBlock: "1vh" }}>share</span>
                            </a>

                        </div>
                    } else /*if (info.type === "realtime")*/ {
                        return <div className={map_css.button_flex}>
                            <a className={map_css.share_sm} onClick={() => resetData()}>
                                <span className="material-icons-outlined" style={{ paddingBlock: "1vh" }}>clear</span>
                            </a>
                            <a className={map_css.button} href={"/schedule/" + agency.replace("oct", "octranspo") + "/" + stop}>View Schedule</a></div>
                    }
                })()}
            </div>
        }
    }
    async function getTripInfo(agency, trip, stop) {
        console.log("Loading Trip Info")
        setData({ data: "loading", type: null })

        // Set URL Hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        hashParams.set('type', "route");
        hashParams.set('route', trip);

        
        // Manually construct the hash string
        let hashString = '';
        for (let [key, value] of hashParams) {
            if (hashString !== '') hashString += '&';
            hashString += `${key}=${value}`;
        }

        // Set the hash with the updated parameters
        window.location.hash = hashString;

        const request = await fetch("/api/gtfs/trips/" + agency + "?trip=" + trip + "&stop=" + stop)
        const response = await request.json()
        console.log(response)
        if (response.error) {
            setData({ data: response.error, type: "error" })
            return
        } else {
            setData({ data: response, type: "route" })
        }
    }
    function redirStop(stop, agency) {
        // Replace with setRequest
        setData({ data: "loading", type: null })
        setRequest({ stop: stop, agency: agency, type: "stop", route: null })
        //setAgency(agency)
        //setStop(stop)

        resetMarkers()
        removeRoute()

    }
    function mapTripInfo(data) {
        console.log(data)
        return <div className={map_css.arrv_parent}>
            <div className={map_css.heading_child}>
                <h3 className={map_css.header}>{data.tripInfo.route + " " + data.tripInfo.trip_headsign}</h3>
            </div>

            <div className={map_css.arrv_scroll}>
                {data.trip.map((x) => {
                    const opacity = (function () {
                        if (x.location.passed) {
                            return "0.5"
                        } else {
                            return "1"
                        }
                    })()
                    const uuid = Math.random() + "_" + x.stop.id

                    return <a className={map_css.schd_a} key={uuid} id={uuid} stopref={x.stop.currentStop.toString()} onClick={() => redirStop(x.stop.id, agency)}>
                        <div className={map_css.arrv_elem} style={{ opacity: opacity }}>
                            <div className={map_css.headsign}>
                                <span className="material-icons-outlined" style={{ paddingBlock: "1vh" }}>room</span>
                                <span className={map_css.route_span}>{x.stop.code}</span>
                                <p>{x.stop.name}</p>
                            </div>
                            <br />
                            <p>Scheduled at: {x.arrival_time}</p>
                        </div>
                    </a>
                })}
            </div>
            <div className={map_css.button_flex}>
                <a className={map_css.share_sm} onClick={() => closeArrivals({ type: "route" })}>
                    <span className="material-icons-outlined" style={{ paddingBlock: "1vh" }}>arrow_back</span>
                </a>
                <a className={map_css.share} onClick={() => gotoHighlight()}>
                    <span className="material-icons-outlined" style={{ paddingBlock: "1vh" }}>pin_drop</span>
                </a>
                <a className={map_css.share} onClick={() => {
                    // Copy Curent URL to Clipboard
                    navigator.clipboard.writeText(window.location.href)
                    alert("URL Copied to Clipboard!")
                }}>
                    <span className="material-icons-outlined" style={{ paddingBlock: "1vh" }}>share</span>
                </a>
            </div>
        </div>
    }
    function gotoHighlight() {
        console.log("gotoHighlight")
        const element = document.querySelector('[stopref="true"]');
        if (element) {
            console.log("Found")
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }
    function splash() {
        return <div className={map_css.no_content}>
            <div>
                <p>Click a stop to see the schedule</p>
                <input id="geolocate" placeholder='Search by Location' onKeyUp={() => qryrf()} className={map_css.search_ipt}></input>
                <button onClick={() => search()} className={map_css.search_btn}>Search</button>
            </div>
            <div>
                <a href='https://github.com/Benjamin-Del/transit'><p>Benja Transit v3.1</p></a>
                <Link href="/notices"><p>Open Data</p></Link>
                <Link href="/search"><p>GTFS Query</p></Link>
            </div>
        </div>
    }
    function splashError(message) {
        return <div className={map_css.no_content}>
            <div>
                <span className="material-icons-outlined" style={{ fontSize: "10vh" }}>error</span>
                <p>{message || "Error: Unexpected Error!"}</p>
                <a className={map_css.share_pad} onClick={() => resetData()}><span className='material-icons-outlined' style={{ paddingBlock: "1vh" }}>clear</span></a>
            </div>
        </div>
    }
    function resetData() {
        setData({ data: null, type: null })
        //setAgency(agency)
        //setStop(stop)
        resetMarkers()
        removeRoute()
        console.log(data)
    }

    function closeArrivals(info) {
        if (info.type === "realtime" || info.type === "route") {
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            resetData()
            setRequest({ stop: hashParams.get('stop'), agency: hashParams.get('agency'), type: "stop", route: null })
        } else {
            resetData()
        }
    }
    function resetMarkers() {
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
    function addRoute(shape_id, agency) {
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
            <Head>
                <title>Benja Transit | NCR Public Transit Tracker</title>
            </Head>
            <div>
                <div className={map_css.main_content}>
                    <div className={map_css.sidebar}>
                        <div className={map_css.sidebar_header}>
                            <h1>Benja Transit</h1>
                        </div>
                        <div>
                            {parseData(data)}
                        </div>
                    </div>
                    <div className={map_css.map_container} ref={mapContainerRef} />
                </div>
            </div>
        </div>
    );
};

export async function getServerSideProps() {
    const request = await fetch("https://benjamin-del.github.io/TransitDB3/update.json")
    const response = await request.json()

    return {
        props: {
            update: response.update
        }
    }
}