// React stuff
import * as React from 'react';
import { useState, useRef } from 'react';
import helper_stops from "../../../helpers/stops"
import 'material-icons/iconfont/material-icons.css'

import route_css from '../../styles/routes.module.css'
import stop_css from '../../styles/stops.module.css'
import error_css from "../../styles/error.module.css"

import Head from "next/head"
import Map, {
  Popup,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl,
  Marker
} from 'react-map-gl';

import 'mapbox-gl/dist/mapbox-gl.css';
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmVuamFtaW5tYWhlcmFsIiwiYSI6ImNrbGJnOW5hdzByMTcycHRrYW81cTRtaDMifQ.xowWxUTgoDkvBMmkE18BiQ'; // Set your mapbox token here

export default function Page(data) {
  const [popupInfo, setPopupInfo] = useState(null);
  const mapRef = useRef();
  function flymap(tripID) {
    const map = mapRef.current.getMap();
    const rt = data.realtime.arrivals.filter((x) => {
      return x.trip.trip_id === tripID
    })[0]
    map.flyTo({
      center: [rt.longitude, rt.latitude],
      zoom: 16,
      essential: true // this animation is considered essential with respect to prefers-reduced-motion
    });
    displayRoute(tripID)
  }
  function displayRoute(tripID) {
    if (tripID) {
      const map = mapRef.current.getMap();

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
        data: '/api/geo/shapesByTrips?agency=' + data.agency + '&id=' + tripID
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

  const pins = data.realtime.arrivals.map((data, index) => {
    return (
      <Marker
        key={`marker-${index}`}
        id={`marker-${index}`}
        element={"div"}
        longitude={data.longitude}
        latitude={data.latitude}
        anchor="bottom"
        onClick={(e) => {
          //putRoute(ctnstring, ele)
          displayRoute(data.trip.trip_id)
          e.originalEvent.stopPropagation();
          setPopupInfo({ data: data });
        }}
      >
        <span className="material-icons-round" style={{ color: "#004777", fontSize: "36px" }}>directions_bus</span>
      </Marker>
    )
  })
  function showmap() {
    if (data.realtime.arrivals.length === 0) {
      window.location.href = "/"
      return (
        <div className={stop_css.gps_err}>
        <span className="material-icons-outlined" style={{color: "#ff7700", fontSize:"10vh"}}>location_off</span>
        <h1>GPS not available</h1>
        <p>Unfortunatly, We do not have any more information about the arrivals.</p>
        <br />
        <p>Please try again at the schedule</p>
        <button onClick={() => window.location.href = "/schedule/octranspo/" + data.code}>See Stop Schedule?</button>

      </div>

      )
    } else {
      return (
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: data.stop.stop_lat,
            longitude: data.stop.stop_lon,
            zoom: 10,
          }}
          //, 
          style={{ position: 'absolute', width: '100%', height: '80%' }}
          mapStyle="mapbox://styles/benjaminmaheral/ckya716p90ezc15o6b5fox2a0"
          mapboxAccessToken={MAPBOX_TOKEN}
        >
          <GeolocateControl position="top-left" />
          <FullscreenControl position="top-left" />
          <NavigationControl position="top-left" />
          <ScaleControl />
          <Marker
            longitude={data.stop.stop_lon}
            latitude={data.stop.stop_lat}
            anchor="bottom"
          >
            <span className="material-icons-outlined" style={{ color: "#004777", fontSize: "36px" }}>sports_score</span>
          </Marker>
          {pins}
          {pins}

          {popupInfo && (
            <Popup
              anchor="top"
              longitude={Number(popupInfo.data.longitude)}
              latitude={Number(popupInfo.data.latitude)}
              onClose={() => setPopupInfo(null)}
            >
              <div>
                <h3>{popupInfo.data.trip.route}</h3>
                <p>{popupInfo.data.trip.trip_headsign}</p>
                <p>Vehicle: {popupInfo.data.vehicle.label}</p>
              </div>
            </Popup>
          )}

        </Map>
      )
    }
  }
  const arrivals = data.realtime.arrivals
  return (
    <div>
      <Head>
        <title>{`Benja Transit`}</title>
      </Head>
      <main className="flex min-h-screen flex-col">
        <div className={stop_css.time_cont_sm}>
          <h1 className={stop_css.header}>Arrivals for stop</h1>
          <div className={stop_css.arrival_elem_sm}>
            {arrivals.map((x, index) => {
              return (
                <div className={stop_css.arrival_cld} key={"arrv-" + index} id={"arrv-" + index}>
                  <a onClick={() => flymap(x.trip.trip_id)}><span className={route_css.route_spn}>{x.trip.route}</span><p className={stop_css.p_inline}>{x.trip.trip_headsign}</p></a>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          {showmap()}
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  const url = process.env.URL
  if (!context.query.stop || !context.params.slug[1]) {
    return {
      notFound: true,
    }
  }
  const result = await fetch(url + "/api/gtfs/vehicle/" + context.params.slug[0] + "?trip=" + atob(context.params.slug[1]))
  console.log(url + "/api/gtfs/vehicle" + context.params.slug[0] + "?trip=" + atob(context.params.slug[1]))
  //console.log("result", result)
  const response = await result.json()
  const stop = await helper_stops.get(context.query.stop, context.params.slug[0])
  return {
    props: {
      realtime: response,
      stop: stop,
      agency: context.params.slug[0]
    }
  }
}
