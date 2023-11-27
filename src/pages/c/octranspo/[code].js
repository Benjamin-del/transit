import React, { useRef, useEffect, useState, updateState } from 'react';
import mapboxgl from 'mapbox-gl';
import map_css from '../../../styles/map.module.css'
import 'mapbox-gl/dist/mapbox-gl.css';
import Head from 'next/head';
import 'material-icons/iconfont/material-icons.css'

mapboxgl.accessToken =
    'pk.eyJ1IjoiYmVuamFtaW5tYWhlcmFsIiwiYSI6ImNrbGJnOW5hdzByMTcycHRrYW81cTRtaDMifQ.xowWxUTgoDkvBMmkE18BiQ';

export default function Home(rtData) {
    const mapContainerRef = useRef(null);
    const [mapHook, setMap] = useState(null)
    // Initialize map when component mounts
    useEffect(() => {
        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/benjaminmaheral/clph1gexw008k01p8bwryhgd2',
            center: [rtData.realtime.stop.lon, rtData.realtime.stop.lat],
            zoom: 15,
            hash: true,
        });
        // Add navigation control (the +/- zoom buttons)
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');

        map.on('load', () => {
            setMap(map)
            // Lets's Go Global!
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

            rtData.realtime.arrivals.forEach((x) => {
                if (x.geo) {
                    // If GPS is on, add a marker
                    console.log("geo", x)
                    const el = document.createElement('div');
                    el.className = map_css.marker;
                    el.innerHTML = "<span class='material-icons-outlined' style='font-size: 5vh;'>directions_bus</span>";
                    const ctnstring = "?startTime=" + x.time.tripStartTime + "&route=" + x.no + "&direction=" + x.direction
                    el.addEventListener('click', () => {
                        putRoute(ctnstring, el, map)
                    });
                    //LngLatLike
                    // make a marker for each feature and add to the map
                    new mapboxgl.Marker(el).setLngLat([x.longitude, x.latitude]).addTo(map);
                }
            })
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
    function parseData(data) {
        console.log(data)
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
                if (data.arrivals.length === 0) {
                    return <div className={map_css.no_content_child}>
                        <div>
                            <span className="material-icons-outlined" style={{ fontSize: "10vh" }}>bus_alert</span>
                            <p>No Departures</p>
                        </div>
                    </div>
                } else {
                    return data.arrivals.map((arrivals) => {
                        return <div className={map_css.arrv_elem} key={arrivals.no + "_" + arrivals.time.hhmm}>
                            <span>{arrivals.no}</span><p>{arrivals.destination}</p>
                            <p>Scheduled at: {arrivals.time.hhmm}</p>
                        </div>
                    })
                }
            })()
            return <div className={map_css.arrv_parent}>
                <div className={map_css.heading_child}>
                    <h3 className={map_css.header}>{data.stop.name}</h3>
                </div>
                <div className={map_css.arrv_scroll_5}>{schedulemap}
                </div>
            </div>
        }
    }
    async function putRoute(ctnstring, ele, map) {
        if (!ele.outerHTML) {
          console.log("ID STRING")
          var ftm_ele = document.getElementById(ele)
        } else {
          console.log("ELEMENT")
          var ftm_ele = ele
        }
        if (ctnstring) {
          var tripAttr = ftm_ele.getAttribute("shape")
          console.log(tripAttr)
          if (!tripAttr) {
            console.log("Shape donsent exist, getting it")
            const ctnRequest = await fetch("/api/dynamic/context" + ctnstring)
            const ctnResponse = await ctnRequest.json()
    
            if (ctnRequest.status !== 200) {
              console.log("Error getting context")
              alert("Error getting context. Shape can not be displayed.\nCode: 40C")
              return
            }
            console.log(ctnResponse.results)
            var tripAttr = ctnResponse.results.map((x) => {
              console.log(x)
              return x.trip_id
            }).join(",")
            console.log(tripAttr)
            ftm_ele.setAttribute("shape", tripAttr)
          } else {
            ftm_ele.setAttribute("shape", tripAttr)
            console.log("Shape exists")
          }
          //const map = mapRef.current.getMap();
    
          if (map.getLayer("context_rt_lyr")) {
            console.log("Existing layer found")
            map.removeLayer("context_rt_lyr");
          }
          if (map.getLayer("context_rt_sym")) {
            console.log("Existing layer found")
            map.removeLayer("context_rt_sym");
          }
          if (map.getSource("context_rt_src")) {
            console.log("Existing source found")
            map.removeSource("context_rt_src");
          }
    
          map.addSource('context_rt_src', {
            type: 'geojson',
            // Use a URL for the value for the `data` property.
            data: '/api/geo/shapesByTrips?agency=oct&id=' + tripAttr
          });
    
          map.addLayer({
            'id': 'context_rt_lyr',
            'type': 'line',
            'source': 'context_rt_src',
            'paint': {
              'line-color': '#004777',
              'line-width': 3
            }
          });
    
          map.addLayer({
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
      }
    return (
        <div>
            <Head>
                <title>Benja Transit | Departures at: {rtData.realtime.stop.name}</title>
            </Head>
            <div>
                <div className={map_css.main_content}>
                    <div className={map_css.sidebar}>
                        <div className={map_css.sidebar_header}>
                            <h1>Benja Transit</h1>
                            <p>NCR Public Transit Tracker</p>
                        </div>
                        <div>
                            {parseData(rtData.realtime)}
                        </div>
                    </div>
                    <div className={map_css.map_container} ref={mapContainerRef} />
                </div>
            </div>
        </div>
    );
};
export async function getServerSideProps(context) {
    //console.log(context.params.code)
    const url = process.env.URL
    const request = await fetch(url + "/api/dynamic/oct_realtime?stop=" + context.params.code)
    const response = await request.json()
    console.log("response", response)
    var layer = "mapbox://styles/benjaminmaheral/ckzn82c2f001414mnvmkdaybw"
    if (context.query.layer === "sat") {
        var layer = "mapbox://styles/benjaminmaheral/ckzn82c2f001414mnvmkdaybw"
    }
    return {
        props: {
            realtime: response,
            code: context.params.code,
            layer: layer,
            url: url
        }
    }
}
