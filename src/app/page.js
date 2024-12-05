import map_css from '../styles/map.module.css'
import button_css from '../styles/button.module.css'
import 'mapbox-gl/dist/mapbox-gl.css';
import 'material-symbols';


export default async function Landing() {
    const data = await fetch(process.env.URL + '/api/config')
    const config = await data.json()


    return (
        <div>
            <div style={{ padding: "1vh" }}>
                <h1>Longitude Transit</h1>
                <p>Configured Agencies</p>
            </div>
            {config ? config.map((agency) => {
                return (
                    <div className={map_css.arrv_elem} key={agency.id}>
                        <div className={map_css.headsign}>
                            <span className="material-symbols-rounded" style={{ paddingBlock: "1vh" }}>directions_bus</span>
                            <p>{agency.name}</p>
                        </div>
                        <br />
                        <br />
                        <div className={button_css.flex_column} style={{ width: "100%", paddingTop: "1vh" }}>
                            <a className={button_css.large_txt} href={"/data/" + agency.id}>
                                <span className="material-symbols-rounded" style={{ paddingBlock: "1vh" }}>explore</span>
                                <p>Data Exporer</p>
                            </a>

                            <a className={button_css.large_txt} href={"/tracker/" + agency.id}>
                                <span className="material-symbols-rounded" style={{ paddingBlock: "1vh" }}>directions_bus</span>
                                <p>Transit Tracker</p>
                            </a>
                        </div>
                    </div>)
            }) : null}
        </div>
    )
}
