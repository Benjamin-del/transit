export const config = {
    runtime: 'edge', // this is a pre-requisite
};

    
export default async function handler(req, res) {
const params = new URL(req.url).searchParams
const url = process.env.URL
const ag = params.get("ag")
const stp = params.get("stop")
if (ag === "oct") {
    return new Response(null, {
        status: 307, // Use 308 for a permanent redirect, 307 for a temporary redirect
        headers: {
          Location: url + '/c/octranspo/' + stp,
          'Cache-Control': 'public, max-age=1200, must-revalidate',
        },
      });    
} else if (ag === "sto") {
    return new Response(null, {
        status: 307, // Use 308 for a permanent redirect, 307 for a temporary redirect
        headers: {
          Location: url + '/schedule/sto/' + stp + '?realtime=true',
          'Cache-Control': 'public, max-age=1200, must-revalidate',
        },
    });
} else if (ag === "via") {
    return new Response(null, {
        status: 307, // Use 308 for a permanent redirect, 307 for a temporary redirect
        headers: {
          Location: url + '/schedule/via/' + stp ,
          'Cache-Control': 'public, max-age=1200, must-revalidate',
        },
    });
} else {
    return new Response(JSON.stringify({message: "Invalid agency"}), {
        status: 404,
        headers: {
            'content-type': 'application/json',
        },
    });
}
}