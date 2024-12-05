# Longitude Transit

A Simple and User-Friendly User Interface for tracking the location of busses in realtime via the GTFS-RT Feed, and is "lite" enough to fit in the free teir of all services used by the application. The entire application is built using Next.js, React, Prisma ORM and Prisma Accelerate (DB Proxy). The application is designed to be easy to modify and customize, to fit the needs of any transit agency or user.

## Features

- Well designed and user-friendly interface, that works on the go (mobile friendly) or on a desktop.
- GTFS Schedule data explorer, Explore relationships between routes and stops in a simple and intuitive way.
- Realtime tracking of busses on the map, With features to search by address
- URL Param embeded information, allowing sharing of specific routes and stops with ease. (Realtime data is not shared)
- Easy to modify agencies to further customize the experience for users. (BYOF - Bring your own feed)
- Open Source, MIT License. Feel free to fork and modify to your hearts content. The only requirement is to bring your own GTFS-RT Feed and database.

## Data Sources

Use a GTFS Compliant Feed to provide schedule data, and a GTFS-RT Feed to provide realtime data. Reach out to your local transit agency to see if they provide this data, most major transit networks do. If in the case that the agency provides a custom API, you may need to build a "bridge" to convert the data to GTFS-RT format. Before OC Transpo provided a GTFS-RT feed, I built a bridge to convert their custom API to GTFS-RT format. [See it Here](https://github.com/Benjamin-del/transit/blob/bebd2520b7f912cfa0e1b19e6ae8752545ab2f02/src/pages/api/dynamic/oct_realtime.js)

### Database

I built the project to use Prisma ORM with a PostgreSQL database. You can modify the database to use any other database that Prisma supports. [See Prisma Docs](https://www.prisma.io/docs/orm)

To ensure that the database is up to date, you can use pgAdmin to update it manually, by dowloading the GTFS file (.zip) and importing it into the database by the CSV import tool. You can also automate this process by using a CI/CD pipeline to update the database on a schedule. I decided to build a tool that does this for me, [TransitDB3](https://github.com/benjamin-del/TransitDB3). (Originally built to upload the data to Github Pages, and have this project fetch the data from there)

## Getting Started

I used Vercel to deploy the project, but you can use any other hosting provider that supports Node.js. To get started, you will need to clone the repository and install the dependencies. Before setting up the project you should modify `config.json` to match your agency's data. 

### Agency Configuration 
Create an ID Key for every agency that you add to the application. This can be an acronym to represent the agency Ex: OC Transpo becomes `oct`. Inside of the agency object, you should structure the data as follows.

```json
        {
            "id": "oct",
            "name": "OC Transpo (BETA)",
            "rt": true,
            "st": true,
            "files": [ 
                {
                    "id":"pos",
                    "url":"https://example.com/api/positions",
                    "headers": {
                        "token_name": "{SECRET TOKEN}"
                    }
                },
                {
                    "id":"trip",
                    "url":"https://example.com/api/trips",
                    "headers": {
                        "token_name": "{SECRET TOKEN}"
                    }
                }
            ],
            "db": {
                "stop_times": "ag_stop_times",
                "trips": "ag_trips",
                "stops": "ag_stops",
                "routes": "ag_routes",
                "shapes": "ag_shapes",
                "calendar": "ag_calendar",
                "calendar_dates": "ag_calendar_dates"
            },
            "table_headers": {
                "stop_times": ["trip_id", "arrival_time", "stop_id", "stop_sequence"],
                "trips": ["route_id","service_id", "trip_id",  "trip_headsign", "direction_id", "block_id", "shape_id"],
                "stops": ["stop_id", "stop_code", "stop_name", "stop_lat", "stop_lon"],
                "routes": ["route_id", "route_short_name", "route_long_name", "route_color", "route_text_color"],
                "shapes": ["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence"],
                "calendar": ["service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "start_date", "end_date"],
                "calendar_dates": ["service_id", "date", "exception_type"]
            }
        }    
```

If you need to hide some tokens, based on the Terms of Use of your API Key, or you just want to keep it secret, you can use the `.env` file to store the tokens, and refrence it in the `config.json` file, by adding curly braces around the token name. `{SECRET TOKEN}` will be replaced with the actual token from the `.env` file, but `Secret Token` will be displayed as is. *See `Secret Stuff...` for more information.*

If you dont understand how to work the `config.json` file, I have included my own `config.json` file in the repository, you can use it as a reference. 
### Secret Stuff...

You will also need to create a `.env` file with the following variables, to store the API Keys and other sensitive information. Some parts of the application require a Mapbox API Key, and a Prisma Accelerate Database API Key. You can get a Mapbox API Key [here](https://www.mapbox.com/), and a Prisma Accelerate Database API Key [here](https://www.prisma.io/accelerate).

The URL variable is used to set the URL of the application, this is used to refrence API routes when the host name is not passed in the request, if you are running the application on vercel, VERCEL_URL will be used to override this variable.  

```
DATABASE_URL="PRISMA ACCELERATE DATABASE API KEY"
URL="http://localhost:3000"
NEXT_PUBLIC_MAPBOX_KEY="pk.abc"
```

## Transit Data

Certian agencies require attribution to use their data, or prohibit the data from being re-distributed. It is the responsibility of the user to ensure that they are in compliance with the terms of use of the data. A common requirement is to provide information on when the data was last updated, and where the data came from. You may be required to design logic to ensure that the data is up to date, and that the last update date is current.


Please note: If the data provider prohibits the re-distribution of the data (eg. proxing), you should take steps to secure API routes, that this application uses. 

***No assurances are provided by the author or any contributor(s) of this project that this application is an acceptable use of the data provided by a Transit Agency or Data Provider.***

## License

Licensed under the MIT License. See [LICENSE](https://github.com/Benjamin-del/transit/blob/main/LICENSE) for more information.

## Contributing

**Contributions are welcome!** Feel free to open an issue or submit a pull request if you see something that could be improved. Requests to add agencies to the public version of the application will be considered, but the agency must provide a GTFS-RT feed, and the data must be publically available.