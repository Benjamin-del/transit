# Benja Transit

A simple easy to deploy transit tracker app for OC Transpo, and STO (Coming soon).

## Database
The database is a postgres database, seperate from the main application. The database is used to store the data from the transit api's. The database is every sunday.

## Search
This application includes a search feature that wllows users to query the database for specific buses, trips, etc..

## Deployment
This application uses next.js and is deployed on vercel. The application is deployed on every push to the main branch.