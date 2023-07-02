const Reservation = require('../models/reservation');
const User = require('../models/user');
const Table = require('../models/table');

const ObjectId = require('mongodb').ObjectId;
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

exports.loginUser = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({
            errors: errors.array(),
            msg: "Validation Failed"
        })
    }
    User.findOne({ email: req.body.email }).then(user => {
        bcrypt.compare(req.body.password, user.password).then(result => {
            if (!result) {
                return res.json({
                    msg: "Incorrect Password"
                })
            }
            req.session.user = user
            req.session.isLoggedIn = true
            return res.json({
                msg: "User successfully logged in"
            })
        })
    }).catch(err => {
        return res.json({
            err: err.message,
            msg: "Error occured"
        })
    })
}

exports.createUser = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.json({
            errors: errors.array(),
            msg: "Validation Failed"
        })
    }
    bcrypt.hash(req.body.password, 12).then(hashedPw => {
        const newUser = new User({
            email: req.body.email,
            password: hashedPw
        })
        newUser.save().then(response => {
            return res.json({
                msg: "User Created"
            })
        })
    }).catch(err => {
        return res.json({
            err: err.message,
            msg: "Creation failed"
        })
    })
};

exports.getTables = (req, res, next) => {
    Table.find().then(tables => {
        res.json({
            tables: tables
        })
    }).catch(err => {
        return res.json({
            err: err.message,
            msg: "Error Occured"
        })
    })
}

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
            return res.json({
                msg: "Reservation successfully created"
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

exports.logoutUser = (req, res, next) => {
    req.session.destroy(err => {
        if (err) {
            return res.json({
                err: err.message,
                msg: "Error Occured"
            })
        }
        return res.json({
            msg: "User successfully logged out"
        })
    })
}