import React, { useRef, useEffect, useState, updateState } from 'react';
import mapboxgl from 'mapbox-gl';
import map_css from '../styles/map.module.css'
import 'mapbox-gl/dist/mapbox-gl.css';
import Head from 'next/head';
import 'material-icons/iconfont/material-icons.css'

mapboxgl.accessToken =
    'pk.eyJ1IjoiYmVuamFtaW5tYWhlcmFsIiwiYSI6ImNrbGJnOW5hdzByMTcycHRrYW81cTRtaDMifQ.xowWxUTgoDkvBMmkE18BiQ';

export default function Home() {
    const mapContainerRef = useRef(null);

    /*const [lng, setLng] = useState(5);
    const [lat, setLat] = useState(34);
    const [zoom, setZoom] = useState(1.5);*/

    const [agency, setAgency] = useState()
    const [stop, setStop] = useState()
    const [data, setData] = useState("none")
    // Initialize map when component mounts
    useEffect(() => {
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/benjaminmaheral/clph1gexw008k01p8bwryhgd2',
            center: [-75.70893955298494, 45.34824731651693],
            zoom: 10,
            hash: true,
        });        
        // Add navigation control (the +/- zoom buttons)
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.on('load', () => {
            map.loadImage('/images/bus.png', (error, image) => {
                if (error) throw error;
                // Add the loaded image to the style's sprite with the ID 'kitten'.
                map.addImage('bus', image);
            });

            map.addSource('all_stops', {
                type: 'geojson',
                // Point to GeoJSON data. This example visualizes all M1.0+ earthquakes
                // from 12/22/15 to 1/21/16 as logged by USGS' Earthquake hazards program.
                data: '/api/geo/all_stops',
                cluster: true,
                clusterMaxZoom: 14, // Max zoom to cluster points on
                clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
            });

            map.addLayer({
                id: 'clusters',
                type: 'circle',
                source: 'all_stops',
                filter: ['has', 'point_count'],

                paint: {
                    // Use step expressions (https://docs.mapbox.com/style-spec/reference/expressions/#step)
                    // with three steps to implement three types of circles:
                    //   * Blue, 20px circles when point count is less than 100
                    //   * Yellow, 30px circles when point count is between 100 and 750
                    //   * Pink, 40px circles when point count is greater than or equal to 750
                    'circle-color': [
                        'step',
                        ['get', 'point_count'],
                        '#ffffff',
                        100,
                        '#004777',
                        750,
                        '#ff7700'
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

            map.addLayer({
                id: 'cluster-count',
                type: 'symbol',
                source: 'all_stops',
                filter: ['has', 'point_count'],
                layout: {
                    'text-field': ['get', 'point_count_abbreviated'],
                    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                    'text-size': 12
                }
            });

            // Use bus icon for bus stops
            map.addLayer({
                id: 'bus_stop',
                type: 'symbol',
                source: 'all_stops',
                filter: ['!', ['has', 'point_count']],
                layout: {
                    'icon-image': 'bus',
                    'icon-size': 0.2,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true
                }
            });
            map.addLayer({
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
            map.on('click', 'clusters', (e) => {
                const features = map.queryRenderedFeatures(e.point, {
                    layers: ['clusters']
                });
                const clusterId = features[0].properties.cluster_id;
                map.getSource('all_stops').getClusterExpansionZoom(
                    clusterId,
                    (err, zoom) => {
                        if (err) return;

                        map.easeTo({
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
            map.on('click', 'bus_stop', (e) => {
                const coordinates = e.features[0].geometry.coordinates.slice();
                setData("loading")
                setAgency(e.features[0].properties.agency)
                setStop(e.features[0].properties.stop_id)

                //forceUpdate()
                // Ensure that if the map is zoomed out such that
                // multiple copies of the feature are visible, the
                // popup appears over the copy being pointed to.
                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }
                //updateData(e.features[0].properties.agency,e.features[0].properties.stop_id)
                /*new mapboxgl.Popup()
                    .setLngLat(coordinates)
                    .setHTML((function () {
                        if (e.features[0].properties.agency === "oct") {
                            return `
                            <div>
                                <h3>${e.features[0].properties.stop_name}</h3>
                                <p>OC Transpo</p>
                                <button>Schedule</button>
                                <button>Realtime</button>
                            </div>`
                        } else if (e.features[0].properties.agency === "sto") {
                            return `
                            <div>
                                <h3>${e.features[0].properties.stop_name}</h3>
                                <p>STO</p>
                                <button>Schedule</button>
                                <button>Realtime</button>
                            </div>`
                        }
                    })())
                    .addTo(map);*/
            });

            map.on('mouseenter', 'clusters', () => {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', 'clusters', () => {
                map.getCanvas().style.cursor = '';
            });
        });

        // Clean up on unmount
        return () => map.remove();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!agency || !stop) return
        console.log("agency", agency)
        fetch("/api/gtfs/schedule/" + agency + "?stop=" + stop)
            .then((response) => response.json())
            .then((data) => {
                console.log("data", data)
                setData(data)
            })
    }, [agency, stop]);
    function parseData(data) {
        if (data === "loading") {
            return <div className={map_css.no_content}>
                <span className="material-icons-outlined" style={{ fontSize: "10vh" }}>pending</span>
                <p>Loading...</p>
            </div>

        } else if (data === "none") {
            return <div className={map_css.no_content}>
                <div>
                    <span className="material-icons-outlined" style={{ fontSize: "10vh" }}>departure_board</span>
                    <p>Click a stop to see the schedule</p>
                </div>
            </div>
        } else if (data) {
            const schedulemap = (function () {
                if (data.schedule.length === 0) {
                    return <div className={map_css.no_content_child}>
                        <div>
                            <span className="material-icons-outlined" style={{ fontSize: "10vh" }}>bus_alert</span>
                            <p>No Departures</p>
                        </div>
                    </div>
                } else {
                    return data.schedule.map((schedule) => {
                        return <div className={map_css.arrv_elem} key={schedule.trip_id}>
                            <span>{schedule.route}</span><p>{schedule.trip_headsign}</p>
                            <p>{schedule.attribute} {schedule.arrv}</p>
                        </div>
                    })
                }
            })()
            return <div className={map_css.arrv_parent}>
                <div className={map_css.heading_child}>
                    <h3 className={map_css.header}>{data.stop.stop_name}</h3>
                    {(function () {
                        if (data.schedule.length !== 0) {
                            return <a className={map_css.button} href={"/api/agRedir?ag=" + agency + "&stop=" + stop}>View Realtime</a>
                        } else {
                            return <a className={map_css.button} href={"/schedule/" + agency.replace("oct", "octranspo") + "/" + stop}>View Schedule</a>
                        }
                    })()}
                </div>
                <div className={map_css.arrv_scroll}>{schedulemap}
                </div>
            </div>
        }
    }
    return (
        <div>
            <Head>
                <title>TransiTrack | NCR Public Transit Tracker</title>
            </Head>
            <div>
                <div className={map_css.main_content}>
                    <div className={map_css.sidebar}>
                        <div className={map_css.sidebar_header}>
                            <h1>TransiTrack</h1>
                            <p>NCR Public Transit Tracker</p>
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
