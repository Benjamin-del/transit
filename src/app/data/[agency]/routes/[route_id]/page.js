"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import Button from '@mui/material/Button';

export default function Page({ params }) {


    const [data, setData] = useState(null);
    //const [loading, setLoading] = useState(true);  

    useEffect(() => {
        fetch(`/api/data/${params.agency}/trips?search=${params.route_id}&row=route_id`)
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                //setLoading(false);
            });
    }, []);

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }}
                    >
                        Transit Data Explorer
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box>
                <Grid container spacing={2} sx={{ p: 2 }}>
                    <Grid size={12}>
                        <Grid container spacing={2}>
                            <Grid size={12}>
                                <Typography variant="h5" component="div">
                                    Route Headsigns
                                </Typography>
                            </Grid>
                            {data && data.results && data.results.length > 0 ? (
                                data.results
                                    //.map(route => route.trip_headsign)
                                    .reduce((unique, item) => {
                                        return unique.some(route => route.trip_headsign === item.trip_headsign)
                                            ? unique
                                            : [...unique, item];
                                    }, [])
                                    .map(route => (
                                        <Grid key={route.trip_headsign + "-" + route.direction_id} size={4}>
                                            <Card>
                                                <CardContent>
                                                    <Typography variant="h5" component="div" key={route.trip_id}>
                                                        {route.route_id} {route.trip_headsign}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Direction: {route.direction_id}
                                                    </Typography>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))
                            ) : null}
                        </Grid>
                    </Grid>
                    <Grid size={12}>
                        <Grid container spacing={2}>
                            <Grid size={12}>
                                <Typography variant="h5" component="div">
                                    Route Paths
                                </Typography>
                            </Grid>
                            {data && data.results && data.results.length > 0 ? (
                                data.results
                                    .reduce((unique, item) => {
                                        return unique.some(route => route.trip_headsign === item.trip_headsign && route.shape_id === item.shape_id)
                                            ? unique
                                            : [...unique, item];
                                    }, []).map(route => (
                                        <Grid key={route.trip_headsign + "-" + route.shape_id} size={4}>
                                            <Card>
                                                <CardContent>
                                                    <Typography variant="h5" component="div" key={route.trip_id}>
                                                        {route.shape_id}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        To: {route.trip_headsign}, Direction: {route.direction_id}
                                                    </Typography>
                                                </CardContent>
                                                <CardActions>
                                                    <Button size="small" href={`../shape/${route.shape_id}`}>View</Button>
                                                </CardActions>
                                            </Card>
                                        </Grid>
                                    ))
                            ) : null}
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
        </Box >
    );
}
