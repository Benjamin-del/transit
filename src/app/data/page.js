"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import { styled, alpha } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputBase from '@mui/material/InputBase';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import TableChartIcon from '@mui/icons-material/TableChart';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TroubleshootIcon from '@mui/icons-material/Troubleshoot';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import Backdrop from '@mui/material/Backdrop';
import CircularProgress from '@mui/material/CircularProgress';

const Search = styled('div')(({ theme }) => ({
    position: 'relative',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.white, 0.15),
    '&:hover': {
        backgroundColor: alpha(theme.palette.common.white, 0.25),
    },
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
        marginLeft: theme.spacing(1),
        width: 'auto',
    },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
    padding: theme.spacing(0, 2),
    height: '100%',
    position: 'absolute',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
    color: 'inherit',
    width: '100%',
    '& .MuiInputBase-input': {
        padding: theme.spacing(1, 1, 1, 0),
        // vertical padding + font size from searchIcon
        paddingLeft: `calc(1em + ${theme.spacing(4)})`,
        transition: theme.transitions.create('width'),
        [theme.breakpoints.up('sm')]: {
            width: '12ch',
            '&:focus': {
                width: '20ch',
            },
        },
    },
}));

export default function ExplorePage() {
    const [openDG, setOpenDG] = useState(false);
    const [table, setTable] = useState([]);
    const [tableData, setTableData] = useState([])
    const [openBD, setOpenBD] = useState(false);

  
    useEffect(() => {
        fetch(`/api/config`)
            .then((response) => response.json())
            .then((data) => {
                setTable(data);
            });
    }, []);
    const [query, setQuery] = useState({
        agency: "oct",
        table: "routes",
        search: "",
        row: "null",
        format: "array",
        ecx: true
    })
    const actions = [
        {
            table: "routes",
            column: 0,
            action: "Search for Trips",
            search_row: "route_id",
            search_table: "trips",
        },
        {
            table: "trips",
            column: 0,
            action: "Route",
            search_row: "route_id",
            search_table: "routes",
        },
        {
            table: "trips",
            column: 2,
            action: "Stop Times",
            search_row: "trip_id",
            search_table: "stop_times",
        },
        {
            table: "trips",
            column: 6,
            action: "Shape",
            search_row: "shape_id",
            search_table: "shapes",
            external: true
        },
        {
            table: "trips",
            column: 5,
            action: "View Block",
            search_row: "block_id",
            search_table: "block",

        },
        {
            table: "stop_times",
            column: 2,
            action: "Stop",
            search_row: "stop_id",
            search_table: "stops",
        },
        {
            table: "stops",
            column: 1,
            action: "Stops at Code",
            search_row: "stop_code",
            search_table: "stops"
        },
        {
            table: "block",
            column: 0,
            action: "View Trip",
            search_row: "trip_id",
            search_table: "trips"
        }
    ]

    useEffect(() => {
        if (query && query.ecx) {
            console.log(query)
            //document.getElementById("search").value = query.search

            if (query.table === "block") {
                fetch(`/api/query/block_explore?agency=${query.agency}&block=${query.search}&format=array`)
                    .then((res) => res.json())
                    .then((data) => {
                        data.table_actions = actions.filter((x) => {
                            return x.table === query.table
                        })
                        console.log(data)
                        setTableData(data)
                        setOpenBD(false)
                    })
                return
            }
            fetch(`/api/query/new_static?agency=${query.agency}&table=${query.table}&search=${query.search}&row=${query.row}&format=array`)
                .then((res) => res.json())
                .then((data) => {

                    data.table_actions = actions.filter((x) => {
                        return x.table === query.table
                    })
                    console.log(data.results)
                    console.log(data.table_actions)
                    setTableData(data)
                    setOpenBD(false)
                })
        }
    }, [query])

    const toggleDrawer = (newOpen) => () => {
        setOpenDG(newOpen);
    };

    const DrawerList = (
        <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
            <Typography variant="h6" component="div" sx={{ p: 2 }}>
                Tables
            </Typography>
            <FormControl sx={{ mx: 2 }}>
                <InputLabel id="demo-simple-select-label">Agency</InputLabel>
                <Select
                    labelId="demo-simple-select-label"
                    id="demo-simple-select"
                    label="Agency"
                    defaultValue={table.length > 0 ? table[0].name : null}
                >
                    {table.length > 0 ? table.map((text, index) => (
                        <MenuItem key={index} value={text.name}>{text.name}</MenuItem>
                    )) : null}
                </Select>
            </FormControl>
            <ListItem disablePadding>
                    <ListItemButton onClick={
                        () => {
                            setOpenBD(true)
                            setQuery({
                                ...query,
                                table: "routes",
                                search: "",
                                row: "null",
                                ecx: true
                            })
                        }
                    }>
                        <ListItemIcon>
                            <TableChartIcon />
                        </ListItemIcon>
                        <ListItemText primary={"Data Explorer"} />
                    </ListItemButton>
                </ListItem>
        </Box >
    );

    return (
        <Box sx={{ flexGrow: 1 }}>
            <Drawer open={openDG} onClose={toggleDrawer(false)}>
                {DrawerList}
            </Drawer>


            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="open drawer"
                        sx={{ mr: 2 }}
                        onClick={toggleDrawer(true)}
                    >
                        <MenuIcon />
                    </IconButton>
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
            <Backdrop
                sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
                open={openBD}
            >
                <CircularProgress color="inherit" />
            </Backdrop>

            <Box>
                <TableContainer >
                    {(tableData.results && tableData.length !== 0) ? (
                        <Table sx={{ minWidth: 650 }} aria-label="simple table">
                            <TableHead>
                                <TableRow>
                                    {tableData.header.map((text, index) => (
                                        <TableCell key={index}>{text}</TableCell>
                                    ))}
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tableData.results.slice(1).map((row, index) => (
                                    <TableRow
                                        key={index}
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        {row.map((text, index) => (
                                            <TableCell key={index}>{text}</TableCell>
                                        ))}
                                        <TableCell>

                                            <ButtonGroup>
                                                {tableData.table_actions.map((action, index) => (
                                                    <Button
                                                        key={index}
                                                        variant="contained"
                                                        onClick={() => {
                                                            setOpenBD(true)
                                                            setQuery({
                                                                ...query,
                                                                table: action.search_table,
                                                                search: row[action.column],
                                                                row: action.search_row,
                                                                ecx: true
                                                            })
                                                        }}
                                                    >
                                                        {action.action}
                                                    </Button>
                                                ))}
                                            </ButtonGroup>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Typography variant="h6" component="div" sx={{ p: 2 }}>
                            No Data
                        </Typography>
                    )}
                </TableContainer>
            </Box>
        </Box>
    );
}
