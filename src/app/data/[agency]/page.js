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
    const { agency } = React.use(params)

    useEffect(() => {
        fetch(`/api/data/${agency}/routes?search=&row=null`)
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
                {data ? (
                    <Grid container spacing={2} sx={{p: 2}}>
                        {data.results.filter((route) => route.route_short_name !== "route_short_name").map((route) => (
                            <Grid item key={route.route_id} size={4}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h5" component="div">
                                            {route.route_short_name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {route.route_long_name}
                                        </Typography>
                                    </CardContent>
                                    <CardActions>
                                        <Button size="small" href={`${agency}/routes/${route.route_id}`}>View</Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                ) : (
                    <Typography>Loading...</Typography>
                )}
            </Box>
        </Box>
    );
}
