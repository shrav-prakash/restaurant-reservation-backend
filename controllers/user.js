const Reservation = require('../models/reservation');
const User = require('../models/user');
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
    if (req.session.isLoggedIn) {
        return res.json({
            msg: "User is already logged in"
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

exports.createReservation = (req, res, next) => {
    const newRes = new Reservation({
        user_id: req.body.user_id,
        tables: req.body.tables,
        timeslot: req.body.timeslot,
        location: req.body.location,
        cuisine: req.body.cuisine,
        details: req.body.details
    })
    newRes.save().then(response => {
        console.log(response);
        return res.json({
            msg: "Success"
        }).catch(err => {
            return res.json({
                err: err,
                msg: "Error occured"
            })
        })
    })
};