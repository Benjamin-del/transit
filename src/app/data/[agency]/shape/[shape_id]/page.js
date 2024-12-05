"use client";

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import Button from '@mui/material/Button';

import React, { useRef, useEffect, useState, useContext } from 'react';

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'material-symbols';

export default function Page({ params }) {


    /*const [data, setData] = useState(null);
    //const [loading, setLoading] = useState(true);  

    useEffect(() => {
        fetch(`/api/geo/shape?agency=${params.agency}&id=${params.shape_id}`)
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                //setLoading(false);
            });
    }, []);*/

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY;

    const mapContainerRef = useRef(null);
    const map = useRef(null);

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

            // Add GEOJSON data, directly from the source URL

            map.current.addSource('shape_src', {
                type: 'geojson',
                data: `/api/geo/shape?agency=${params.agency}&id=${params.shape_id}`
            });

            map.current.addLayer({
                'id': 'shape_lyr',
                'type': 'line',
                'source': 'shape_src',
                'paint': {
                    'line-color': '#004777',
                    'line-width': 3
                },
            },
            );

        })
        return () => map.current.remove();
    }, []);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
                    >
                        Transit Data Explorer | Shape: {params.shape_id}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box sx={{ flexGrow: 1 }}>
                <Box ref={mapContainerRef} sx={{ width: '100%', height: '100%' }} />
            </Box>
        </Box>
    );
}
