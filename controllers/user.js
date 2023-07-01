const Reservation = require('../models/reservation');
const User = require('../models/user');
const Table = require('../models/table');

const ObjectId = require('mongodb').ObjectId;
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

exports.loginUser = (req, res, next) => {
    console.log(req.body)

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
    console.log(req.body)
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
            console.log(response);
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
    console.log(req.body)
    Table.find({
        '_id': { $in: req.body.tables }
    }).then(tableDetails => {
        console.log(tableDetails);
        return res.json({})
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