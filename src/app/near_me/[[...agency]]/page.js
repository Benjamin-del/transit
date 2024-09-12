"use client"

import React, { useRef, useEffect, useState, useContext } from 'react';
import Image from 'next/image';
import mapboxgl from 'mapbox-gl';
import nearme_css from '../../../styles/near_me.module.css'
import button_css from '../../../styles/button.module.css'
import 'mapbox-gl/dist/mapbox-gl.css';
import 'material-symbols';

const URL = process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : process.env.URL

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_KEY;

export default function Home({ params }) {

    const [ stops, setStops ] = useState([])

    const { agency } = params

    console.log(agency)

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                const nearby_stops = fetch("/api/geo/near_me?lat=" + position.coords.latitude + "&lon=" + position.coords.longitude + "&agency=" + agency + "&distance=400").then(res => res.json()).then(data => {
                    console.log(data)
                    setStops(data)
                }).catch(err => {
                    alert("Error: " + err)
                })
            }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
        }


    }, []);
    return (
        <div>
            <div className={nearme_css.header}>
                <h1>Stops Near Me</h1>
            </div>
            <div className={nearme_css.stop_parent}>
                {stops.map(stop => (
                    <a key={stop.stop_id} href={"/" + agency + "/stop/" + stop.stop_id}>
                        <div  className={nearme_css.stop}>
                            <h2>{stop.stop_name}</h2>
                            <p>{stop.distance}m away</p>
                        </div>
                    </a>
                ))}
            </div>
        </div >
    );
};