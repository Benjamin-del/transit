import ipt from "../../styles/input.module.css";

export default function Home({ stops }) {

  function stop_res() {
    const query = document.getElementById("stp_query")
    const res = document.getElementById("stop_res")
    const dt = stops.stops
    console.log(dt)

    if (query.value === "" || query.length < 3) {
      console.log("Not enough Information")
      res.innerHTML = "<p>Enter more Information</p>"
      return
    } else {
      res.innerHTML = ""
      dt.filter((x) => {
        return x.stop_name.toUpperCase().includes(query.value.toUpperCase())
      }).forEach((x) => {
        const span = document.createElement("span")
        span.setAttribute("class", "span-stop-code")
        span.textContent = x.stop_code

        const p = document.createElement("p")
        p.innerHTML = x.stop_name
        p.setAttribute("class", "text-inl")

        const div = document.createElement("a")
        div.setAttribute("class", "flex flex-row items-center w-full")
        div.setAttribute("href", "/octranspo/" + x.stop_id)
        div.appendChild(span)
        div.appendChild(p)

        res.appendChild(div)
      })

    }
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Benja Transit</h1>
      <input id="stp_query" placeholder='Search for Stops' className={ipt.src} onKeyDown={() => stop_res()}></input>
      <div id="stop_res" className="stop-res-def">
      </div>
    </main>
  )
}

export async function getServerSideProps(context) {
  // Fetch data from external API

  const url = process.env.URL
  
  const res = await fetch(url + "/api/geo/stops?agency=" + context.params.agency)
  const stops = await res.json()
  // Pass data to the page via props
  return { props: { stops } }
}
