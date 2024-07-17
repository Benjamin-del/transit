import Head from "next/head"
import error_css from "../../styles/error.module.css"
import route_css from "../../styles/routes.module.css"
import schedule_css from "../../styles/schedule.module.css"
import 'material-symbols';
import config from "../../../config.json"
const gtfs_rt = config.gtfs_rt

export default function Home(data) {
    //console.log("data", data)

    if (data.error) {
        return (
            <div>
                <Head>
                    <title>Error - Benja Transit3</title>
                </Head>
                <main className="flex min-h-screen flex-col">
                    <div className={error_css.par_elem}>
                        <div className={error_css.cld_elem}>
                            <span className="material-symbols-outlined" style={{ color: "#ff7700", fontSize: "10vh" }}>bus_alert</span>

                            <h1>ERROR</h1>
                            <p>There was a Server Error.</p>
                            <br />
                            <code>Error: 500</code>
                            <br />
                            <button onClick={() => window.location.href = "/"}>Go Home?</button>
                        </div>
                    </div>
                </main>
            </div>
        )
    } if (data.schedule.error === "404") {
        return (
            <div>
                <Head>
                    <title>Error - Benja Transit3</title>
                </Head>
                <main className="flex min-h-screen flex-col">
                    <div className={error_css.par_elem}>
                        <div className={error_css.cld_elem}>
                            <span className="material-symbols-outlined" style={{ color: cag(data.agency).styles.primary, fontSize: "10vh" }}>bus_alert</span>

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
    function cag(ag) {
        if (ag === "octranspo" || ag === "oct") {
            return config.styles.oct
        } else if (ag === "sto") {
            return config.styles.sto
        } else if (ag === "via") {
            return config.styles.via
        } else {
            return ""
        }
    }
    function rvfmdr(dt) {
        //console.log(dt.toString().length)
        if (dt.toString().length === 5) {
            return "0" + dt.toString()
        } else {
            return dt
        }
    }
    const schedule = data.schedule.schedule
    //console.log(schedule)

    function updateTime() {
        const tm = document.getElementById("gtfshr").value
        //console.log(tm)
        const date = new Date()
        date.setHours(tm.split(":")[0])
        date.setMinutes(tm.split(":")[1])
        date.setHours(date.getHours() + 3);
        window.location.href = "?time=" + tm + ":00"
    }

    function mapsched() {
        onload()
        if (schedule.length === 0) {
            return (
                <div className={schedule_css.sched_err}>
                    <span className="material-symbols-outlined" style={{ color: cag(data.agency).styles.primary, fontSize: "10vh" }}>event_busy</span>
                    <h1 style={{ color: cag(data.agency).styles.primary }} >No Departures</h1>
                    <p>Even Busses need to sleep.</p>
                    <br />
                    <p>No busses are scheduled during this time</p>
                    <button onClick={() => window.location.href = "/"}>Go Home?</button>
                </div>
            )
        } else {

            return schedule.map((x, index) => {
                //console.log(x)
                return (

                    <div className={schedule_css.arrv} id={"tp-arrv_" + x.trip_id} key={"index-" + index}>
                        <span className={route_css.route_spn} /*style={{ backgroundColor: cag(data.agency).styles.primary }}*/>{x.route}</span> <p className={schedule_css.arrv_txt}>{x.trip_headsign}</p>
                        <p id={"tp-p_" + x.trip_id}>{x.attribute} {x.arrv}</p>
                    </div>
                )
            })

        }
    }
    function checkRealTime() {
        const tmarr = rvfmdr(data.schedule.query.time).toString().match(/.{1,2}/g)
        const htmltime = tmarr[0] + ":" + tmarr[1]

        if (data.schedule.query.realtime == true) {
            // Render if realtime.
            const rtqr = btoa(data.schedule.schedule.map((x) => {
                return x.trip_id
            }).join(","))
            //console.log(rtqr)
            return (<div className={schedule_css.realtime_msg}><span className="material-symbols-outlined">departure_board</span><p>Last updated at: {htmltime}</p><p>|</p><button onClick={() => window.location.href = "?realtime=false"}>View Schedule</button></div>)
        } else if (data.schedule.query.realtime_support) {
            return <div className={schedule_css.realtime_msg}><input type="time" id="gtfshr" onChange={() => updateTime()} defaultValue={htmltime} /><button onClick={() => window.location.href = "?realtime=true"}>View Updates</button></div>
        } else {
            return (<div className={schedule_css.realtime_msg}><input type="time" id="gtfshr" onChange={() => updateTime()} defaultValue={htmltime} /><p>Updates Unavailable</p></div>)
        }
    }

    function onload() {
        if (process.browser) {
            const r = document.querySelector(":root")
            r.style.setProperty("--primary", cag(data.agency).styles.primary)
            r.style.setProperty("--secondary", cag(data.agency).styles.secondary)
            r.style.setProperty("--text", cag(data.agency).styles.text)
        } else {
            console.log("Server")
        }
    }
    return (
        <div>
            <Head>
                <title>{`Benja Transit | Schedule @ ${data.schedule.stop.stop_name}`}</title>
            </Head>
            <main className="flex min-h-screen flex-col bg" style={{ background: `url(${cag(data.agency).bg})` }}>
                <div className={schedule_css.hed}>
                    <h1 style={{ color: cag(data.agency).styles.primary }} className={schedule_css.hed_h1}>Scheduled Arrivals</h1>
                    <p>Stop: {data.schedule.stop.stop_name}</p>
                </div>
                <div className={schedule_css.arrv_par}>
                    {mapsched()}
                </div>
                <div className={schedule_css.opt} /*style={{ backgroundColor: cag(data.agency).styles.primary }}*/>
                    {checkRealTime()}
                </div>
            </main>
        </div>
    )

}

export async function getServerSideProps(context) {
    const url = process.env.URL
    //console.log(context.params)
    //console.log("query", context.query)
    async function getrequest() {
        const ag = context.params.slug[0].replace("octranspo", "oct")

        if (config.gtfs_st.includes(ag) || config.gtfs_rt.includes(ag)) {
            if (gtfs_rt.includes(ag) && context.query.realtime === "true") {
                console.log("REALTIME")
                const ftcUrl = url + "/api/gtfs/updates/" + ag + "?stop=" + context.params.slug[1]
                console.log(ftcUrl)
                return await fetch(ftcUrl)
            } else {
                console.log("STATIC")
                const ftcUrl = url + "/api/gtfs/schedule/" + ag + "?stop=" + context.params.slug[1] + "&time=" + context.query.time
                console.log(ftcUrl)
                return await fetch(ftcUrl)
            }
        } else {
            console.log("Invalid agency")
            return "404"
        }
    }
    const request = await getrequest()
    if (request === "404") {
        return {
            notFound: true,
        }
    }
    if (request.status !== 200) {
        console.log("ERROR")
        console.log(request.status)
        return {
            props: {
                schedule: [],
                agency: "",
                error: request.status
            },
        }

    }
    const response = await request.json()
    //console.log(response)
    return {
        props: {
            schedule: response,
            agency: context.params.slug[0]
        },
    }
}