import agConfig from "../../../config.json"

export const config = {
    runtime: 'edge', // this is a pre-requisite
};

export default async function handler(req,res) {

    const agencies = agConfig.agencies

    function transformConfig(input) {
        const entries = Object.entries(input);
        const transformed = entries.map(([key, value]) => ({
            name: key,
            table: value
        }));
        return transformed ;
    }

    console.log(agencies)
    const ag = agencies.map((x) => {
        return {
            name: x.name,
            id: x.id,
            db: transformConfig(x.db),
            tables: x.table_headers
        }
    })


    return new Response(JSON.stringify(ag), {
        headers: {
            "content-type": "application/json",
        },
    });
}
