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
import { DataGrid } from '@mui/x-data-grid';
import Paper from '@mui/material/Paper';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

export default function Page({ params }) {


    const [data, setData] = useState(null);
    //const [loading, setLoading] = useState(true);  

    const [direction, setDirection] = useState(0);

    const { agency, block_id } = React.use(params)
    useEffect(() => {
        fetch(`/api/data/${agency}/block/${block_id}`)
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
                                <Paper sx={{ /*height: "100vh", */ width: '100%' }}>
                                    <DataGrid
                                        rows={data ? data.results/*.filter((trip) => trip.direction_id === direction) */: []}
                                        columns={[
                                            { field: 'id', headerName: 'Trip ID', width: 200 },
                                            { field: 'trip_headsign', headerName: 'Trip Headsign', width: 200 },
                                            //{ field: 'direction_id', headerName: 'Direction ID', width: 200 },
                                            //{ field: 'block_id', headerName: 'Block ID', width: 200 },
                                            { field: 'first_stop', headerName: 'First Stop', width: 200 },
                                            { field: 'last_stop', headerName: 'Last Stop', width: 200 },
                                            { field: 'trip_start', headerName: 'Trip Start', width: 200 },
                                            { field: 'trip_end', headerName: 'Trip End', width: 200 },

                                        ]}
                                        initialState={{ pagination: { page: 0, pageSize: 5 } }}
                                        pageSizeOptions={[5, 10]}
                                        //checkboxSelection
                                        sx={{ border: 0 }}
                                        onRowClick={(row) => {
                                            window.location.href = `/data/${agency}/trips/${row.row.id}`
                                        }
                                        }
                                    />
                                </Paper>

                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
        </Box >
    );
}
