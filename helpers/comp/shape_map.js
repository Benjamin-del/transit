import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useRef, useEffect, useState, updateState } from 'react';
import rate_css from "../../src/styles/rate.module.css"
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY;

export default function Map(props) {
    const mapContainerRef = useRef(null);
    const map = useRef();
    console.log("props", props)

    useEffect(() => {
        map.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: "mapbox://styles/mapbox/streets-v12",
            center: [-75.70893955298494, 45.34824731651693],
            zoom: 10,
            //hash: "position",
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
            customAttribution: "<a href='/notices'>Data Sources</a>"
        }));
        // Add Mapbox Layer Source
        map.current.on('load', () => {
            map.current.addSource('context_rt_src', {
                type: 'geojson',
                // Use a URL for the value for the `data` property.
                data: '/api/geo/shape?agency=' + props.agency + '&id=' + props.shapeid,
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
        });

        return () => map.current.remove();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return <div>
        <div className={rate_css.map_container} ref={mapContainerRef} />
    </div>

}