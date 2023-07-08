const Reservation = require('../models/new-reservation');
const Table = require('../models/new-table');

const ObjectId = require('mongodb').ObjectId;
const fs = require('fs');
const path = require('path');

exports.createReservation = (req, res, next) => {
    let location = req.body.location
    let size = parseInt(req.body.partySize)
    let date = new Date(req.body.date)
    let seatCost;
    date.setUTCHours(23, 59, 59, 999)
    date = new Date(date)
    let currDate = new Date()
    currDate.setUTCHours(0, 0, 0, 0)
    currDate = new Date(currDate)
    Table.find({
        $and: [{ location: location }, {
            date: {
                $gte: currDate,
                $lte: date
            }
        }]
    }).then(tablesDetails => {
        console.log(tablesDetails)
        date.setUTCHours(0, 0, 0, 0)
        if ((tablesDetails.filter(obj => obj.date.toDateString() == date.toDateString())).length > 0) {
            const table = tablesDetails.filter(obj => obj.date.toDateString() == date.toDateString())
            if (table[0].slots[req.body.time]) {
                console.log(table[0].slots)
                if (table[0].slots[req.body.time] >= size) {
                    table[0].slots[req.body.time] -= size
                    console.log(table[0].slots)
                    seatCost = table[0].seatCost
                    Table.findOneAndUpdate({ $and: [{ location: location }, { date: date }] }, { slots: table[0].slots }).then(() => { })
                } else {
                    return res.json({
                        msg: "Seats are not available for the given time slot"
                    })
                }
            }
            else {
                return res.json({
                    msg: "Entered slot doesn't exist"
                })
            }
        } else {
            let index;
            if (location == "Chennai") {
                index = 1
            } else if (location == "Bangalore") {
                index = 2
            } else {
                return res.json({
                    msg: "Restaurant not available at the given location"
                })
            }
            const tableName = 'loc' + index + '.json';
            const tablePath = path.join('data', 'new-table-details', tableName);
            if (fs.existsSync(tablePath)) {
                try {
                    data = fs.readFileSync(tablePath)
                    const newTable = JSON.parse(data);
                    const slotsPath = path.join('data', 'new-table-availability.json')
                    let d = fs.readFileSync(slotsPath)
                    let slots = JSON.parse(d);
                    if (slots[req.body.time]) {
                        if (slots[req.body.time] >= size) {
                            slots[req.body.time] -= size;
                        } else {
                            return res.json({
                                msg: "Seats are not available for the given time slot"
                            })
                        }
                    } else {
                        return res.json({
                            msg: "Given timeslot doesn't exist"
                        })
                    }
                    seatCost = newTable.costPerSeat
                    const table = new Table({ date: date, location: newTable.location, seatCost: newTable.costPerSeat, slots: slots });
                    console.log(newTable, table)
                    table.save().then(async () => {
                        slots[req.body.time] += parseInt(size);
                        let newDate = new Date();
                        newDate = newDate.setDate(date.getDate() - 1);
                        newDate = new Date(newDate);
                        newDate.setUTCHours(0, 0, 0, 0)
                        console.log(newDate, currDate)
                        while (newDate >= currDate) {
                            console.log(tablesDetails, tablesDetails.filter(obj => obj.date.toDateString() == newDate.toDateString()))
                            if (tablesDetails.filter(obj => obj.date.toDateString() == newDate.toDateString()).length === 0) {
                                const nTable = new Table({ date: newDate, location: newTable.location, seatCost: newTable.costPerSeat, slots: slots })
                                await nTable.save();
                                newDate = newDate.setDate(newDate.getDate() - 1);
                                newDate = new Date(newDate);
                                newDate.setUTCHours(0, 0, 0, 0)
                            } else {
                                break;
                            }
                        }
                    }).catch((err) => {
                        return res.json({
                            err: err.message,
                            msg: "Table creation failed"
                        })
                    })
                } catch (err) {
                    return res.json({
                        err: err.message,
                        msg: "Error occured during file read"
                    })
                }
            }
        }
        const reservation = new Reservation({ user_id: new ObjectId(req.user._id), num_seats: size, cost: size * seatCost, timeslot: req.body.time, date: date, location: location, cuisine: req.body.cuisine, details: req.body.details })
        reservation.save().then(booking => {
            req.user.bookings.push(new ObjectId(booking._id));
            req.user.save().then(() => {
                return res.json({
                    msg: "Reservation successfully created"
                })
            }).catch(err => {
                return res.json({
                    err: err.message,
                    msg: "Saving booking failed"
                })
            })
        }).catch(err => {
            return res.json({
                err: err.message,
                msg: "Reservation creation failed"
            })
        })
    }).catch(err => {
        return res.json({
            err: err.message,
            msg: "Error Occured"
        })
    })
};

exports.dispReservations = (req, res, next) => {
    Reservation.find({ user_id: req.user._id }).then(reservations => {
        return res.json({
            reservations: reservations,
            msg: "Users reservations fetched"
        })
    }).catch(err => {
        return res.json({
            err: err.message,
            msg: "Error occured"
        })
    })
}

exports.deleteReservation = (req, res, next) => {
    const deleteId = new ObjectId(req.body.res_id)
    if (req.body.res_id) {
        Reservation.findById(deleteId).then(res_doc => {
            if (res_doc === null) {
                return res.json({
                    msg: "Reservation with given ID does not exist"
                })
            }
            if (res_doc.user_id.toString() !== req.user._id.toString()) {
                return res.json({
                    msg: "Cannot delete another users reservation"
                })
            }
            Reservation.deleteOne({ _id: deleteId }).then(delete_res => {
                if (delete_res.acknowledged === true) {
                    req.user.bookings = req.user.bookings.filter(obj => obj.toString() !== deleteId.toString())
                    let num_seats = res_doc.num_seats
                    req.user.save().then(() => {
                        Table.updateMany({ $and: [{ location: res_doc.location }, { date: res_doc.date }] }, {
                            $inc: { [`slots.${res_doc.timeslot}`]: num_seats }
                        }).then(() => {
                            return res.json({
                                amt: res_doc.cost,
                                msg: "Reservation successfully deleted, refund of " + res_doc.cost + " rupees initiated"
                            })
                        })
                    })
                } else {
                    return res.json({
                        msg: "Deletion failed"
                    })
                }
            })
        }).catch(err => {
            return res.json({
                err: err.message,
                msg: "Error occured"
            })
        })
    } else {
        return res.json({
            msg: "Please provide a reservation ID"
        })
    }
}

exports.updateReservation = (req, res, next) => {
    const modifyId = new ObjectId(req.body.res_id)
    if (!req.body.res_id) {
        return res.json({
            msg: "Please provide a reservation ID"
        })
    }
    Reservation.findById(modifyId).then(res_doc => {
        if (res_doc === null) {
            return res.json({
                msg: "Reservation with given ID does not exist"
            })
        }
        if (res_doc.user_id.toString() !== req.user._id.toString()) {
            console.log(res_doc.user_id.toString(), req.user._id.toString())
            return res.json({
                msg: "Cannot modify reservation details of another user"
            })
        }
        let location = req.body.location
        let size = parseInt(req.body.partySize)
        let seatCost;
        let date = new Date(req.body.date)
        date.setUTCHours(23, 59, 59, 999)
        date = new Date(date)
        let currDate = new Date()
        currDate.setUTCHours(0, 0, 0, 0)
        currDate = new Date(currDate)
        Table.find({
            $and: [{ location: location }, {
                date: {
                    $gte: currDate,
                    $lte: date
                }
            }]
        }).then(tablesDetails => {
            date.setUTCHours(0, 0, 0, 0)
            if ((tablesDetails.filter(obj => obj.date.toDateString() == date.toDateString())).length > 0) {
                const table = tablesDetails.filter(obj => obj.date.toDateString() == date.toDateString())
                if (req.body.time === res_doc.timeslot && date.toDateString() === res_doc.date.toDateString() && location === res_doc.location) {
                    return res.json({
                        msg: "No change made to reservation"
                    })
                }
                if (table[0].slots[req.body.time]) {
                    console.log(table[0].slots)
                    if (table[0].slots[req.body.time] >= size) {
                        table[0].slots[req.body.time] -= size
                        console.log(table[0].slots)
                        seatCost = table[0].seatCost
                        Table.findOneAndUpdate({ $and: [{ location: location }, { date: date }] }, { slots: table[0].slots }).then(() => { })
                    } else {
                        return res.json({
                            msg: "Seats are not available for the given time slot"
                        })
                    }
                }
                else {
                    return res.json({
                        msg: "Entered slot doesn't exist"
                    })
                }
            } else {
                let index;
                if (location == "Chennai") {
                    index = 1
                } else if (location == "Bangalore") {
                    index = 2
                } else {
                    return res.json({
                        msg: "Restaurant not available at the given location"
                    })
                }
                const tableName = 'loc' + index + '.json';
                const tablePath = path.join('data', 'new-table-details', tableName);
                if (fs.existsSync(tablePath)) {
                    try {
                        data = fs.readFileSync(tablePath)
                        const newTable = JSON.parse(data);
                        const slotsPath = path.join('data', 'new-table-availability.json')
                        let d = fs.readFileSync(slotsPath)
                        let slots = JSON.parse(d);
                        if (slots[req.body.time]) {
                            if (slots[req.body.time] >= size) {
                                slots[req.body.time] -= size;
                            } else {
                                return res.json({
                                    msg: "Seats are not available for the given time slot"
                                })
                            }
                        } else {
                            return res.json({
                                msg: "Given timeslot doesn't exist"
                            })
                        }
                        seatCost = newTable.costPerSeat
                        const table = new Table({ date: date, location: newTable.location, seatCost: newTable.costPerSeat, slots: slots });
                        console.log(newTable, table)
                        table.save().then(async () => {
                            slots[req.body.time] += parseInt(size);
                            let newDate = new Date();
                            newDate = newDate.setDate(date.getDate() - 1);
                            newDate = new Date(newDate);
                            newDate.setUTCHours(0, 0, 0, 0)
                            while (newDate >= currDate) {
                                if (tablesDetails.filter(obj => obj.date.toDateString() == newDate.toDateString()).length === 0) {
                                    const nTable = new Table({ date: newDate, location: newTable.location, seatCost: newTable.costPerSeat, slots: slots })
                                    await nTable.save();
                                    newDate = newDate.setDate(newDate.getDate() - 1);
                                    newDate = new Date(newDate);
                                    newDate.setUTCHours(0, 0, 0, 0)
                                } else {
                                    break;
                                }
                            }
                        }).catch((err) => {
                            return res.json({
                                err: err.message,
                                msg: "Table creation failed"
                            })
                        })
                    } catch (err) {
                        return res.json({
                            err: err.message,
                            msg: "Error occured during file read"
                        })
                    }
                }
            }
            const reservation = new Reservation({ user_id: new ObjectId(req.user._id), num_seats: size, cost: size * seatCost, timeslot: req.body.time, date: date, location: location, cuisine: req.body.cuisine, details: req.body.details })
            reservation.save().then(booking => {
                req.user.bookings.push(new ObjectId(booking._id));
                req.user.bookings = req.user.bookings.filter(obj => obj.toString() !== modifyId.toString())
                req.user.save().then(() => {
                    Reservation.deleteOne({ _id: modifyId }).then(delete_res => {
                        if (delete_res.acknowledged === true) {
                            Table.updateOne({ $and: [{ location: res_doc.location }, { date: res_doc.date }] }, {
                                $inc: { [`slots.${res_doc.timeslot}`]: res_doc.num_seats }
                            }).then(() => {
                                if (res_doc.cost > reservation.cost) {
                                    let msg = "Reservation successfully modified, refund of " + (res_doc.cost - reservation.cost) + " rupees initiated"
                                    return res.json({
                                        amt: res_doc.cost - reservation.cost,
                                        msg: msg
                                    })
                                } else if (res_doc.cost < reservation.cost) {
                                    let msg = "Reservation successfully modified, remaining amount to be paid: " + (reservation.cost - res_doc.cost) + " rupees"
                                    return res.json({
                                        amt: reservation.cost - res_doc.cost,
                                        msg: msg
                                    })
                                } else {
                                    return res.json({
                                        msg: "Reservation successfully modified"
                                    })
                                }
                            })
                        } else {
                            return res.json({
                                msg: "New reservation created but old reservation deletion failed"
                            })
                        }
                    })
                }).catch(err => {
                    return res.json({
                        err: err.message,
                        msg: "Saving booking failed"
                    })
                })
            }).catch(err => {
                return res.json({
                    err: err.message,
                    msg: "Reservation creation failed"
                })
            })
        }).catch(err => {
            return res.json({
                err: err.message,
                msg: "Error Occured"
            })
        })

    })
}