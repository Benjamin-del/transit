import Head from "next/head";
import search_css from "../../styles/search.module.css"
import React, { useRef, useEffect, useState } from 'react';

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import 'material-icons/iconfont/material-icons.css'

export default function Query({ }) {
    const [query, setQuery] = useState([])
    const [data, setData] = useState({
        type: "none",
        agency: "",
    })
    const [markers, setMarkers] = useState([]);
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY;

    // Map
    const mapContainerRef = useRef(null);
    const map = useRef();

    useEffect(() => {
        const hash = window.location.hash.substring(1); // Remove the leading '#'
        const params = new URLSearchParams(hash);

        const query = params.get("query");
        const agency = params.get("agency");
        const data_stream = params.get("data_stream");

        if (query && agency && data_stream) {
            document.getElementById("data_stream").value = data_stream
            document.getElementById("agency").value = agency

            setQuery(query.split(","))
            search(query, data_stream)
        }
    }, []);
    useEffect(() => {

        map.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/standard",
            center: [-75.70893955298494, 45.34824731651693],
            zoom: 10,
            hash: "position",
            attributionControl: false
        });

        map.current.on("load", () => {
            // Add reusable Layers & Source
            map.current.addSource("routes", {
                type: "geojson",
                data: {
                    type: "FeatureCollection",
                    features: []
                }
            });
            map.current.addLayer({
                'id': 'routes',
                'type': 'line',
                'source': 'routes',
                'paint': {
                    'line-color': '#004777',
                    'line-width': 3
                },
            });
        });
        return () => map.current.remove();
    }, []);


    useEffect(() => {
        markers.forEach(marker => marker.remove());
        setMarkers([]); // Clear the markers state
    }, [data]);

    function searchKey(e) {
        const val = document.getElementById("searchbar").value
        if (e.key === "Enter" && val !== "") {
            setQuery([...query, val])
            document.getElementById("searchbar").value = ""
        }
    }

    async function search(param_query, param_data_stream) { /* By passing data_stream we can modify the stream */
        setData({
            type: "loading",
            agency: document.getElementById("agency").value,
            results: []
        })

        if (param_data_stream !== document.getElementById("data_stream").value && param_data_stream) {
            // Make nice and clean
            document.getElementById("data_stream").value = param_data_stream
        }

        const val = param_query || query.join(",")
        const agency = document.getElementById("agency").value
        const data_stream = param_data_stream || document.getElementById("data_stream").value

        const request = await fetch(`/api/query/${data_stream}?agency=${agency}&search=${val}`)
        const response = await request.json()
        console.log(response)
        setData({
            type: data_stream,
            results: response.results,
            agency: agency,
            error: response.error || false
        })
        /*markers.forEach(marker => marker.remove());
        setMarkers([]); // Clear the markers state*/

    }


    async function addShape(shape, ele) {
        // Get Source routes and update it
        ele.textContent = "Loading..."

        const request = await fetch("/api/geo/shape?agency=" + data.agency + "&id=" + shape)
        const response = await request.json()
        map.current.getSource("routes").setData(response)
        ele.textContent = shape
    }

    async function modifySearch(data, ele, realtime) {
        const element = ele.currentTarget;
        element.textContent = "Loading..."

        setQuery(data) // It should be an array already
        search(data.join(","), realtime ? "realtime" : "static")

        element.textContent = data[0]

    }

    useEffect(() => {
        if (data.type === "realtime") {
            const { results } = data

            if (results) {

                results.forEach((x) => {
                    const popup = new mapboxgl.Popup({ offset: 25 }).setText(`Bus #${x.vehicle}`);

                    const el = document.createElement('div');
                    el.className = 'marker';
                    el.innerHTML = "<span class='material-icons-round' style='font-size: 5vh; color: #004777'>directions_bus</span>";

                    const marker = new mapboxgl.Marker(el)
                        .setLngLat([x.geo[0], x.geo[1]])
                        .setPopup(popup)
                        .addTo(map.current);

                    setMarkers(prevMarkers => [...prevMarkers, marker]);
                });
            }
        }
    }, [data]); // dependencies ensure this runs when data or x changes

    function parseTrip(trip) {

    }
    function mapData(data) {
        console.log(data)
        const { results } = data
        console.log(results)
        if (data.error) {
            return (
                <p className={search_css.msg_p}>Error: {data.error || "Unexpected Error"}</p>
            )
        }
        if (!results) {
            return (
                <p className={search_css.msg_p}>Results will show up here! Use Enter to seperate tags!</p>
            )
        }
        if (data.type === "loading") {
            return (
                <p className={search_css.msg_p}>Loading...</p>
            )
        }
        if (results.length === 0) {
            return (
                <p className={search_css.msg_p}>No Results Found</p>
            )
        }

        return results.map((x) => {
            return (
                <div key={Math.random()} className={search_css.resultchild}>
                    <div>
                        <h3>Trip Information</h3>
                        {function () {
                            if (!x.trip) {
                                return (
                                    <p>No Trip Information Available</p>
                                )
                            }
                            return (
                                <table>
                                    <thead>
                                        <tr>
                                            <td>Detail</td>
                                            <td>Value</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Route</td>
                                            <td><a onClick={(event) => modifySearch([x.trip.route], event, true)}>{x.trip.route}</a></td>
                                        </tr>
                                        <tr>
                                            <td>Service ID</td>
                                            <td>{x.trip.service_id}</td>
                                        </tr>
                                        <tr>
                                            <td>Trip ID</td>
                                            <td><a onClick={(event) => modifySearch([x.trip.trip_id], event, false)}>{x.trip.trip_id}</a></td>

                                        </tr>
                                        <tr>
                                            <td>Headsign</td>
                                            <td><a onClick={(event) => modifySearch([x.trip.trip_headsign], event, false)}>{x.trip.trip_headsign}</a></td>
                                        </tr>
                                        <tr>
                                            <td>Direction</td>
                                            <td>{x.trip.dir}</td>
                                        </tr>
                                        <tr>
                                            <td>Block ID</td>
                                            <td><a onClick={(event) => modifySearch([x.trip.block_id], event, false)}>{x.trip.block_id}</a></td>
                                        </tr>
                                        <tr>
                                            <td>Shape ID</td>
                                            <td><a onClick={(event) => addShape(x.trip.shape, event.currentTarget)}>{x.trip.shape}</a></td>
                                        </tr>
                                    </tbody>
                                </table>
                            )
                        }()}
                    </div>
                    {function () {
                        if (data.type === "realtime") {
                            return (
                                <div>
                                    <h3>Realtime Information</h3>
                                    <table>
                                        <thead>
                                            <tr>
                                                <td>Detail</td>
                                                <td>Value</td>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>Longitude</td>
                                                <td>{x.geo[0]}</td>
                                            </tr>
                                            <tr>
                                                <td>Latitude</td>
                                                <td>{x.geo[1]}</td>
                                            </tr>
                                            <tr>
                                                <td>Speed</td>
                                                <td>{x.details.speed}</td>
                                            </tr>
                                            <tr>
                                                <td>Bearing</td>
                                                <td>{x.details.bearing}</td>
                                            </tr>
                                            <tr>
                                                <td>Bus #</td>
                                                <td><a onClick={(event) => modifySearch([x.vehicle], event, true)}>{x.vehicle}</a></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )
                        } else {
                            return (
                                <div>
                                    <p>No Realtime Information Available</p>
                                </div>
                            )
                        }
                    }()}
                    <p>Relation: {x.query.relation} ({x.query.search})</p>
                </div>
            )
        })
    }

    function base64URLencode(str) {
        const utf8Arr = new TextEncoder().encode(str);
        const base64Encoded = btoa(utf8Arr);
        return base64Encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function genB64() {
        const agency = document.getElementById("agency").value
        const data_stream = document.getElementById("data_stream").value
        const b64 = agency + "-" + query + "-" + data_stream

        console.log(agency, query, data_stream, b64)

        const data = btoa(b64)
        window.navigator.clipboard.writeText(window.location.protocol + "//" + window.location.host + "/s/" + data)

        alert("Link Copied!")
    }
    return (
        <div>
            <Head>
                <title>Benja Transit Query</title>
            </Head>
            <h1 className={search_css.header}>Benja Transit Query</h1>
            <div className={search_css.searchparent}>
                <div className={search_css.searchbar}>
                    <select id="agency">
                        <option value="oct">OC Transpo</option>
                        <option value="sto">STO</option>
                    </select>
                    <select id="data_stream">
                        <option value="realtime">Realtime</option>
                        <option value="static">Static</option>
                    </select>
                    <div className={search_css.searchele}>
                        {query.map((x) => {
                            return <div key={Math.random()} className={search_css.searchelechild}>{x}</div>
                        })}
                    </div>
                    <input id="searchbar" onKeyDown={(event) => searchKey(event)} placeholder="Search"></input>
                    <button onClick={() => search()}>Search</button>
                    <button onClick={() => setQuery([])}>Clear</button>
                </div>
            </div>
            <div className={search_css.resultparent}>
                {mapData(data)}
            </div>
            <a className={search_css.msg_p} onClick={() => genB64()}>Share</a>
            <div>
                <div className={search_css.mapcont} ref={mapContainerRef} />
            </div>
        </div>
    )
}
