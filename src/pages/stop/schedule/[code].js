import Head from "next/head"
import error_css from "../../../styles/error.module.css"
import route_css from "../../../styles/routes.module.css"
import schedule_css from "../../../styles/schedule.module.css"
import 'material-icons/iconfont/material-icons.css'

export default function Home(data) {
    console.log(data)
    if (data.schedule.error === "404") {
        return (
            <div>
                <Head>
                    <title>Error - Benja Transit3</title>
                </Head>
                <main className="flex min-h-screen flex-col">
                    <div className={error_css.par_elem}>
                        <div className={error_css.cld_elem}>
                            <span className="material-icons-outlined" style={{ color: "#ff7700", fontSize: "10vh" }}>bus_alert</span>

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
    function rvfmdr(dt) {
        console.log(dt.toString().length)
        if (dt.toString().length === 5) {
            return "0" + dt.toString()
        } else {
            return dt
        }
    }
    const schedule = data.schedule.schedule
    console.log(schedule)
    const tmarr = rvfmdr(data.schedule.query.time).toString().match(/.{1,2}/g)
    console.log(tmarr)
    const htmltime = tmarr[0] + ":" + tmarr[1]

    function updateTime() {
        const tm = document.getElementById("gtfshr").value
        console.log(tm)
        const date = new Date()
        date.setHours(tm.split(":")[0])
        date.setMinutes(tm.split(":")[1])
        date.setHours(date.getHours() + 3);
        window.location.href = "?time=" + tm + ":00"
    }

    function mapsched() {
        if (schedule.length === 0) {
            return (
                <div className={schedule_css.sched_err}>
                    <span className="material-icons-outlined" style={{ color: "#ff7700", fontSize: "10vh" }}>event_busy</span>
                    <h1>No Departures</h1>
                    <p>Even Busses need to sleep.</p>
                    <br />
                    <p>No busses are scheduled during this time</p>
                    <button onClick={() => window.location.href = "/" + data.code}>Go Home?</button>
                </div>
            )
        } else {
            return schedule.map((x, index) => {
                return (
                    <div className={schedule_css.arrv} key={"index-" + index}>
                        <span className={route_css.route_spn}>{x.route}</span> <p className={schedule_css.arrv_txt}>{x.trip_headsign}</p>
                        <p>Arriving at: {x.arrv}</p>
                    </div>
                )
            })

        }
    }
    return (
        <div>
            <Head>
                <title>{`Benja Transit | Schedule @ ${data.schedule.stop.stop_name}`}</title>
            </Head>
            <main className="flex min-h-screen flex-col">
                <div className={schedule_css.hed}>
                    <h1 className={schedule_css.hed_h1}>Scheduled Arrivals</h1>
                    <p>Stop: {data.schedule.stop.stop_name}</p>
                </div>
                <div className={schedule_css.arrv_par}>
                    {mapsched()}
                </div>
                <div className={schedule_css.opt}>
                    <input type="time" id="gtfshr" onChange={() => updateTime()} defaultValue={htmltime} />
                </div>
            </main>
        </div>
    )
}

export async function getServerSideProps(context) {
    const url = process.env.URL
    const request = await fetch(url + "/api/dynamic/schedule?stop=" + context.params.code + "&time=" + context.query.time + "&max=" + context.query.max)
    const response = await request.json()
    console.log(response)
    return {
        props: {
            schedule: response
        }
    }

}