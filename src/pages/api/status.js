export const config = {
    runtime: 'edge', // this is a pre-requisite
};

export default async function handler(req, res) {

    try {
        const request = await fetch("https://api.github.com/repos/Benjamin-Del/TransitDB3/actions/runs")
        const data = await request.json()

        const runs = data.workflow_runs.splice(0, 5) // get the first 5 runs

        const transformed = runs.map((x) => {
            return {
                id: x.id,
                status: x.status,
                conclusion: x.conclusion,
                created: x.created_at,
            }
        })

        return new Response(JSON.stringify({
            last_run: transformed[0].created.split("T")[0],
            runs: transformed
        }), {
            headers: {
                "content-type": "application/json",
            },
        });

    } catch (e) {
        return new Response(JSON.stringify({
            error: e.message,
            last_run: "N/A",
            runs: []
        }), {
            headers: {
                "content-type": "application/json",
            },
        });
    }
}