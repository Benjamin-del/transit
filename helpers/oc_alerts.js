import { XMLParser } from 'fast-xml-parser';

const options = {
    ignoreAttributes:false
}
const parser = new XMLParser(options);

export default {
    async getAll() {
        const req = await fetch('https://www.octranspo.com/en/feeds/updates-en/');
        const xmlData = await req.text();
        const data = parser.parse(xmlData);

        return data.rss.channel.item
    },
    async byCatag(catagory) {
        const req = await fetch('https://www.octranspo.com/en/feeds/updates-en/');
        const xmlData = await req.text();
        const data = parser.parse(xmlData);
        //console.log(data)
        return data.rss.channel.item.filter((item) => {
            //console.log(item.category)
            return item.category.includes(catagory)
        })
    },
    async allCancels() {
        const req = await fetch('https://www.octranspo.com/en/feeds/updates-en/');
        const xmlData = await req.text();
        const data = parser.parse(xmlData);
        //console.log(data)

        const regexp = /\b\d{1,2}:\d{2}\b|\b\d{1,2}h\d{2}\b/gm;
     
        //console.log(route)
        const dt = data.rss.channel.item.filter((item) => {
            return item.category.includes("Cancelled trips") /*&& route.includes(item.title.split(" ")[0])*/
        }).map((item) => {
            const times = [...item.description.matchAll(regexp)]
            //console.log("Times", times)
           return {
                route: item.title.split(" ")[0],
                trip_start: times[0][0] || undefined,
                //link: link,
           }
        })
        console.log("dt", dt)
        return dt

    },
    async byRoute(routes) {
        const req = await fetch('https://www.octranspo.com/en/feeds/updates-en/');
        const xmlData = await req.text();
        const data = parser.parse(xmlData);
        //console.log(data)
        return data.rss.channel.item.filter((item) => {
            const routes = item.category.filter((ctg) => {
                return ctg.includes("affectedRoutes-")
            })[0].map((ctg) => {
                return ctg.replace("affectedRoutes-", "").split(", ")
            })
            return routes.includes(routes)
        })
    },
    async cancledByRoute(route) {
        const req = await fetch('https://www.octranspo.com/en/feeds/updates-en/');
        const xmlData = await req.text();
        const data = parser.parse(xmlData);
        //console.log(data)

        const regexp = /\b\d{1,2}:\d{2}\b/gm;
     
        console.log(route)
        return data.rss.channel.item.filter((item) => {
            return item.category.includes("Cancelled trips") && route.includes(item.title.split(" ")[0])
        }).map((item) => {
            const times = [...item.description.matchAll(regexp)]
           return {
                route: item.title.split(" ")[0],
                trip_start: times[0],
                trip_end: times[1],
           }
        })


    }
}