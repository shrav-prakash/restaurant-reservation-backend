const Reservation = require('../models/reservation');
const Table = require('../models/table');

const ObjectId = require('mongodb').ObjectId;
const fs = require('fs');
const path = require('path');

exports.createReservation = (req, res, next) => {
    let date = new Date(req.body.date)
    date.setUTCHours(23, 59, 59, 999)
    date = new Date(date)
    let currDate = new Date()
    currDate.setUTCHours(0, 0, 0, 0)
    currDate = new Date(currDate)
    let indices;
    if (typeof (req.body.tables) === "object") {
        indices = req.body.tables.map(index => parseInt(index))
    } else {
        indices = [parseInt(req.body.tables)]
    }
    Table.find({
        $and: [{ index: { $in: indices } }, {
            date: {
                $gte: currDate,
                $lte: date
            }
        }]
    }).then(tablesDetails => {
        date.setUTCHours(0, 0, 0, 0)
        const availabilityCheck = tablesDetails.filter(obj => obj.date.toDateString() == date.toDateString())
        for (const i in availabilityCheck) {
            if (availabilityCheck[i].slots[req.body.time] === false) {
                return res.json({
                    msg: "Table " + availabilityCheck[i].index + " not available for the given time slot"
                })
            }
        }
        for (const i in indices) {
            const index = indices[i];
            const tableDeets = tablesDetails.filter(obj => obj.index == index)
            if ((tableDeets.filter(obj => obj.date.toDateString() == date.toDateString())).length > 0) {
                const table = tableDeets.filter(obj => obj.date.toDateString() == date.toDateString())
                if (table[0].slots[req.body.time]) {
                    table[0].slots[req.body.time] = false
                    Table.findOneAndUpdate({ $and: [{ index: index }, { date: date }] }, { slots: table[0].slots }).then(() => { })
                } else {
                    return res.json({
                        msg: "Entered slot doesn't exist"
                    })
                }
            } else {
                const tableName = 't' + index + '.json';
                const tablePath = path.join('data', 'table-details', tableName);
                if (fs.existsSync(tablePath)) {
                    try {
                        data = fs.readFileSync(tablePath)
                        const newTable = JSON.parse(data);
                        const slotsPath = path.join('data', 'table-availability.json')
                        let d = fs.readFileSync(slotsPath)
                        let slots = JSON.parse(d);
                        if (slots[req.body.time]) {
                            slots[req.body.time] = false;
                        } else {
                            return res.json({
                                msg: "Given timeslot doesn't exist"
                            })
                        }
                        const table = new Table({ date: date, num_seats: newTable.num_seats, cost: newTable.cost, index: index, slots: slots });
                        table.save().then(async () => {
                            slots[req.body.time] = true;
                            let newDate = new Date();
                            newDate = newDate.setDate(date.getDate() - 1);
                            newDate = new Date(newDate);
                            newDate.setUTCHours(0, 0, 0, 0)
                            while (newDate >= currDate) {
                                if (tableDeets.filter(obj => obj.date == date).length === 0) {
                                    const nTable = new Table({ date: newDate, num_seats: newTable.num_seats, cost: newTable.cost, index: index, slots: slots })
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
                } else {
                    return res.json({
                        msg: "Table of given index does not exist"
                    })
                }
            }
        }
        const reservation = new Reservation({ user_id: new ObjectId(req.user._id), tables: indices, timeslot: req.body.time, date: date, location: req.body.location, cuisine: req.body.cuisine, details: req.body.details })
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
                    req.user.save().then(() => {
                        Table.updateMany({ $and: [{ index: { $in: res_doc.tables } }, { date: res_doc.date }] }, {
                            [`slots.${res_doc.timeslot}`]: true
                        }).then(() => {
                            return res.json({
                                msg: "Reservation successfully deleted"
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
            return res.json({
                msg: "Cannot modify reservation details of another user"
            })
        }
        let date = new Date(req.body.date)
        date.setUTCHours(23, 59, 59, 999)
        date = new Date(date)
        let currDate = new Date()
        currDate.setUTCHours(0, 0, 0, 0)
        currDate = new Date(currDate)
        let indices;
        if (typeof (req.body.tables) === "object") {
            indices = req.body.tables.map(index => parseInt(index))
        } else {
            indices = [parseInt(req.body.tables)]
        }
        Table.find({
            $and: [{ index: { $in: indices } }, {
                date: {
                    $gte: currDate,
                    $lte: date
                }
            }]
        }).then(tablesDetails => {
            date.setUTCHours(0, 0, 0, 0)
            const availabilityCheck = tablesDetails.filter(obj => obj.date.toDateString() == date.toDateString())
            for (const i in availabilityCheck) {
                if (availabilityCheck[i].slots[req.body.time] === false && (req.body.time !== res_doc.timeslot && date !== res_doc.date && !res_doc.tables.includes(availabilityCheck[i].index))) {
                    return res.json({
                        msg: "Table " + availabilityCheck[i].index + " not available for the given time slot"
                    })
                }
            }
            for (const i in indices) {
                const index = indices[i];
                const tableDeets = tablesDetails.filter(obj => obj.index == index)
                if ((tableDeets.filter(obj => obj.date.toDateString() == date.toDateString())).length > 0) {
                    const table = tableDeets.filter(obj => obj.date.toDateString() == date.toDateString())
                    if (req.body.time === res_doc.timeslot && date.toDateString() === res_doc.date.toDateString() && res_doc.tables.includes(index)) {
                        continue;
                    }
                    if (table[0].slots[req.body.time]) {
                        table[0].slots[req.body.time] = false
                        Table.findOneAndUpdate({ $and: [{ index: index }, { date: date }] }, { slots: table[0].slots }).then(() => { })
                    } else {
                        return res.json({
                            index: index,
                            msg: "Entered slot doesn't exist"
                        })
                    }
                } else {
                    const tableName = 't' + index + '.json';
                    const tablePath = path.join('data', 'table-details', tableName);
                    if (fs.existsSync(tablePath)) {
                        try {
                            data = fs.readFileSync(tablePath)
                            const newTable = JSON.parse(data);
                            const slotsPath = path.join('data', 'table-availability.json')
                            let d = fs.readFileSync(slotsPath)
                            let slots = JSON.parse(d);
                            if (slots[req.body.time]) {
                                slots[req.body.time] = false;
                            } else {
                                return res.json({
                                    msg: "Given timeslot doesn't exist"
                                })
                            }
                            const table = new Table({ date: date, num_seats: newTable.num_seats, cost: newTable.cost, index: index, slots: slots });
                            table.save().then(async () => {
                                slots[req.body.time] = true;
                                let newDate = new Date();
                                newDate = newDate.setDate(date.getDate() - 1);
                                newDate = new Date(newDate);
                                newDate.setUTCHours(0, 0, 0, 0)
                                while (newDate >= currDate) {
                                    if (tableDeets.filter(obj => obj.date == date).length === 0) {
                                        const nTable = new Table({ date: newDate, num_seats: newTable.num_seats, cost: newTable.cost, index: index, slots: slots })
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
                    } else {
                        return res.json({
                            msg: "Table of given index does not exist"
                        })
                    }
                }
            }
            const reservation = new Reservation({ user_id: new ObjectId(req.user._id), tables: indices, timeslot: req.body.time, date: date, location: req.body.location, cuisine: req.body.cuisine, details: req.body.details })
            reservation.save().then(booking => {
                req.user.bookings.push(new ObjectId(booking._id));
                req.user.bookings = req.user.bookings.filter(obj => obj.toString() !== modifyId.toString())
                req.user.save().then(() => {
                    Reservation.deleteOne({ _id: modifyId }).then(delete_res => {
                        if (delete_res.acknowledged === true) {
                            if (res_doc.timeslot === reservation.timeslot) {
                                Table.updateMany({ $and: [{ index: { $in: res_doc.tables } }, { date: res_doc.date }, { $or: [{ index: { $nin: reservation.tables } }, { date: { $ne: reservation.date } }] }] }, {
                                    [`slots.${res_doc.timeslot}`]: true
                                }).then(() => {
                                    return res.json({
                                        msg: "Reservation successfully modified"
                                    })
                                })
                            } else {
                                Table.updateMany({ $and: [{ index: { $in: res_doc.tables } }, { date: res_doc.date }] }, {
                                    [`slots.${res_doc.timeslot}`]: true
                                }).then(() => {
                                    return res.json({
                                        msg: "Reservation successfully modified"
                                    })
                                })
                            }
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