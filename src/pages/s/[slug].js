import { redirect } from "next/dist/server/api-utils"

export default function handler() {
    return (
        <div>
            <h1>Agency</h1>
        </div>
    )
}


export async function getServerSideProps(context) {
    // Get URL params

    function base64URLdecode(str) {
        const base64Encoded = str.replace(/-/g, '+').replace(/_/g, '/');
        const padding = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
        const base64WithPadding = base64Encoded + padding;
        return atob(base64WithPadding)
            .split('')
            .map(char => String.fromCharCode(char.charCodeAt(0)))
            .join('');
    }

    const { params } = context
    const data = base64URLdecode(params.slug)
    //ag-query-data_stream
    const spl = data.split("-")
    return {
        redirect: {
            destination: '/search#agency=' + spl[0] + '&query=' + spl[1] + '&data_stream=' + spl[2],
            permanent: false,
        }

    }
}