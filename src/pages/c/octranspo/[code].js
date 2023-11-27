// React stuff
import * as React from 'react';
import { useState, useRef } from 'react';

import 'material-icons/iconfont/material-icons.css'

import Head from 'next/head';
import Map, {
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl,
} from 'react-map-gl';

import route_css from '../../../styles/routes.module.css'
import stop_css from '../../../styles/stops.module.css'
import error_css from "../../../styles/error.module.css"

import 'mapbox-gl/dist/mapbox-gl.css';
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmVuamFtaW5tYWhlcmFsIiwiYSI6ImNrbGJnOW5hdzByMTcycHRrYW81cTRtaDMifQ.xowWxUTgoDkvBMmkE18BiQ'; // Set your mapbox token here

export default function Home(data) {
  const [popupInfo, setPopupInfo] = useState(null);
  //console.log(data)
  const mapRef = useRef();

  if (data.realtime.error === "500") {
    return (
      <div>
        <Head>
          <title>ERROR</title>
        </Head>
        <main className="flex min-h-screen flex-col">
        <div className={error_css.par_elem}>
          <div className={error_css.cld_elem}>
          <span className="material-icons-outlined" style={{color: "#ff7700", fontSize:"10vh"}}>bus_alert</span>

            <h1>ERROR</h1>
            <p>Sorry, The busses might be moving, but they aren&apos;t telling us where they are. Please Try again later</p>
            <br />
            <code>Error: 50C</code>
            <br />
            <button onClick={() => window.location.href = "/stop/schedule/" + data.code}>See Stop Schedule?</button>
          </div>
        </div>
        </main>
      </div>
    )
  } else if (data.realtime.error === "404") {
    return (      
    <div>
      <Head>
        <title>ERROR</title>
      </Head>
      <main className="flex min-h-screen flex-col">
      <div className={error_css.par_elem}>
        <div className={error_css.cld_elem}>
        <span className="material-icons-outlined" style={{color: "#ff7700", fontSize:"10vh"}}>bus_alert</span>

          <h1>ERROR</h1>
          <p>Sorry, We searched all of the city, but we didn&apos;t find this stop.</p>
          <br />
          <code>Error: 404</code>
          <br />
          <button onClick={() => window.location.href = "/"}>Go Home?</button>
        </div>
      </div>
      </main>
    </div>
)

  }
  const arrivals = data.realtime.arrivals.sort(compare)
  const gps = data.realtime.arrivals.filter((x) => {
    return x.geo === true
  })
  console.log(gps)
  function compare(a, b) {
    if (Number(a.time.mins) < Number(b.time.mins)) {
      return -1;
    }
    if (Number(a.time.mins) > Number(b.time.mins)) {
      return 1;
    }
    return 0;
  }


  async function putRoute(ctnstring, ele) {
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
        data: data.url + '/api/geo/shapesByTrips?agency=oct&id=' + tripAttr
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
      const features = map.querySourceFeatures('your-source-id', {
        sourceLayer: 'your-source-layer'
        });
            }
  }
  const pins = gps.map((data, index) => {
        return (
          <Marker
            key={`marker-${index}`}
            id={`marker-${index}`}
            element={"div"}
            longitude={data.longitude}
            latitude={data.latitude}
            anchor="bottom"
            onClick={(e) => {
              // If we let the click event propagates to the map, it will immediately close the popup
              // with `closeOnClick: true`
              const ele = e.target._element

              const ctnstring = "?startTime=" + data.time.tripStartTime + "&route=" + data.no + "&direction=" + data.direction
              putRoute(ctnstring, ele)
              e.originalEvent.stopPropagation();
              setPopupInfo({ data: data });
            }}
          >
                  <span className="material-icons-round" style={{color: "#004777", fontSize:"36px"}}>directions_bus</span>
          </Marker>
        )
      })

  function showmap(stop) {
    //console.log("stop", stop)
    if (gps.length !== 0) {
      return (
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: stop.lat,
            longitude: stop.lon,
            zoom: 15,
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
            longitude={stop.lon}
            latitude={stop.lat}
            anchor="bottom"
          >
            <span className="material-icons-outlined" style={{color: "#004777", fontSize:"36px"}}>sports_score</span>
          </Marker>

          {pins}

          {popupInfo && (
            <Popup
              anchor="top"
              longitude={Number(popupInfo.data.longitude)}
              latitude={Number(popupInfo.data.latitude)}
              onClose={() => setPopupInfo(null)}
            >
              <div>
                <h3>{popupInfo.data.no}</h3>
                <p>{popupInfo.data.heading}</p>
                <p>{popupInfo.data.context}</p>
                <p>{JSON.stringify(popupInfo.context)}</p>
              </div>
            </Popup>
          )}
        </Map>
      )
    } else {
      return (
        <div className={stop_css.gps_err}>
          <span className="material-icons-outlined" style={{color: "#ff7700", fontSize:"10vh"}}>location_off</span>
          <h1>GPS not available</h1>
          <p>Busses will come, (eventually) but none have their GPS on right now. Check back later?</p>
          <br />
          <p>FYI, LRT trains won&apos;t tell us where they are. (We asked)</p>
          <button onClick={() => window.location.href = "/schedule/octranspo/" + data.code}>See Stop Schedule?</button>

        </div>
      )
    }
  }

  function dynamclass(elem) {
    if (elem === "arival_elem") {
      if (gps.length !== 0) {
        return stop_css.arrival_elem_sm
      } else {
        return stop_css.arrival_elem_lg
      }
    } else if (elem === "time_cont") {
      if (gps.length !== 0) {
        return stop_css.time_cont_sm
      } else {
        return stop_css.time_cont_lg
      }
    }
  }
  //console.log("data:", data)
  return (
    <div>
      <Head>
        <title>{`Benja Transit | ${data.realtime.stop.name}`}</title>

      </Head>
      <main className="flex min-h-screen flex-col">
        <div className={dynamclass("time_cont")}>
          <h1 className={stop_css.header}>Arrivals for stop</h1>
          <div className={dynamclass("arival_elem")}>
            {arrivals.map((x, index) => {
              const ctnstring = "?startTime=" + x.time.tripStartTime + "&route=" + x.no + "&direction=" + x.direction
              return (
                <div className={stop_css.arrival_cld} key={"arrv-" + index} id={"arrv-" + index}>
                  <a onClick={() => putRoute(ctnstring, "arrv-" + index)}><span className={route_css.route_spn}>{x.no}</span><p className={stop_css.p_inline}>{x.heading}</p></a>
                  <p>Arriving in {x.time.mins} mins ({x.time.hhmm})</p>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          {showmap(data.realtime.stop)}
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps(context) {
  //console.log(context.params.code)
  const url = process.env.URL
  const request = await fetch(url + "/api/dynamic/oct_realtime?stop=" + context.params.code)
  const response = await request.json()
  console.log(response)
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
