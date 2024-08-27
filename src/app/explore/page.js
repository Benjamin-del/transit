"use client"
import Head from "next/head";
import search_css from "../../styles/search.module.css"
import explore_css from "../../styles/explore.module.css"
import React, { useRef, useEffect, useState } from 'react';

import 'material-symbols';

export default function Search() {

    const [agencies, setAgencies] = useState([])

    const [tableData, setTableData] = useState([])
    const [query, setQuery] = useState({
        agency: "oct",
        table: "routes",
        search: "",
        row: "null",
        format: "array",
        ecx: true
    })

    useEffect(() => {
        fetch("/api/config")
            .then((res) => res.json())
            .then((data) => {
                console.log(data)
                setAgencies(data)
            })
    }, [])
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
            document.getElementById("search").value = query.search

            if (query.table === "block") {
                fetch(`/api/query/block_explore?agency=${query.agency}&block=${query.search}&format=array`)
                    .then((res) => res.json())
                    .then((data) => {
                        data.table_actions = actions.filter((x) => {
                            return x.table === query.table
                        })
                        console.log(data)
                        setTableData(data)
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
                })
        }
    }, [query])


    function sortData(param) {
        const results = tableData.results

        setTableData({
            header: tableData.header,
            results: results.sort((a, b) => {
                if (isNaN(parseFloat(a[param]))) {
                    return a[param].localeCompare(b[param])
                } else {
                    return parseFloat(a[param]) - parseFloat(b[param])
                }
            }),
            table_actions: tableData.table_actions
        })
    }
    return (
        <div>
            <div>
                <Head>
                    <title>Search</title>
                </Head>
            </div>
            <div>
                {agencies ? (
                    <div className={explore_css.bottom_bar}>
                        <div className={explore_css.top_bar}>
                            <span className="material-symbols-rounded">search</span>
                            <input placeholder="Search..." id="search" className={explore_css.grow}></input>
                            <select id="agency" >
                                {agencies.map((x) => {
                                    return <option key={x.id} value={x.id}>{x.name}</option>
                                })}
                            </select>

                            <select id="table" onChange={() => {
                                setQuery({
                                    agency: document.getElementById("agency").value,
                                    table: document.getElementById("table").value,
                                    search: "",
                                    row: "null",
                                    format: "array",
                                    ecx: false
                                })
                            }} value={query.table}>
                                <option value="routes">Routes</option>
                                <option value="stop_times">Stop Times</option>
                                <option value="stops">Stops</option>
                                <option value="trips">Trips</option>
                                <option value="calendar">Calendar</option>
                                <option value="calendar_dates">Calendar Dates</option>
                                <option value="shapes">Shapes</option>
                                <option value="block">Block</option>
                            </select>
                            {query.table !== "block" ? (
                                <select id="row">
                                    {agencies.filter((x) => {
                                        return document.getElementById("agency").value === x.id
                                    })[0]?.tables[query.table].map((x) => {
                                        return <option key={x} selected={query.row === x} value={x}>{x}</option>
                                    })}
                                </select>
                            ) : null}
                            <button onClick={() => {
                                setQuery({
                                    agency: document.getElementById("agency").value,
                                    table: document.getElementById("table").value,
                                    search: document.getElementById("search").value,
                                    row: document.getElementById("row")?.value,
                                    format: "array",
                                    ecx: true
                                })
                            }}>
                                Search
                            </button>
                        </div>
                    </div>
                ) : null}
                <div>
                    {(tableData.results && tableData.length !== 0) ? (
                        <table className={explore_css.table_wide}>
                            <thead>
                                <tr>
                                    {tableData.header.map((x, idx) => {
                                        return <th key={x}><a onClick={() => {
                                            sortData(idx)
                                        }}>{x}</a></th>
                                    })}
                                    <th>actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.results.map((x, xidx) => {
                                    return (
                                        <tr key={xidx}>
                                            {x.map((y, yidx) => {
                                                return <td key={yidx}>
                                                    {y}
                                                </td>
                                            })}
                                            <td>
                                                <div className={explore_css.actions_parent}>
                                                    {tableData.table_actions.map((action) => {
                                                        return (
                                                            <button key={action.action} className={explore_css.action} onClick={() => {
                                                                if (action.external) {
                                                                    window.open(`/api/query/new_static?agency=${query.agency}&table=${action.search_table}&search=${x[action.column]}&row=${action.search_row}&format=geojson`, "_blank")
                                                                    return
                                                                }
                                                                setQuery({
                                                                    agency: query.agency,
                                                                    table: action.search_table,
                                                                    search: x[action.column],
                                                                    row: action.search_row,
                                                                    format: "array",
                                                                    ecx: true
                                                                })

                                                            }}>
                                                                {action.action}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div>
                            <p>No Data Found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}