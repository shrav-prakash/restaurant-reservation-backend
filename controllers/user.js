const User = require('../models/user');
const Table = require('../models/table');

const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

exports.loginUser = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array(),
            msg: "Validation Failed"
        })
    }
    User.findOne({ email: req.body.email }).then(user => {
        bcrypt.compare(req.body.password, user.password).then(result => {
            if (!result) {
                return res.status(400).json({
                    msg: "Incorrect Password"
                })
            }
            req.session.user = user
            req.session.isLoggedIn = true
            req.session.save(() => {
                return res.status(200).json({
                    msg: "User successfully logged in"
                })
            });

        })
    }).catch(err => {
        return res.status(400).json({
            err: err.message,
            msg: "Error occured"
        })
    })
}

exports.createUser = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
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
            return res.status(200).json({
                msg: "User Created"
            })
        })
    }).catch(err => {
        return res.status(400).json({
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



exports.logoutUser = (req, res, next) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(400).json({
                err: err.message,
                msg: "Error Occured"
            })
        }
        return res.status(200).json({
            msg: "User successfully logged out"
        })
    })
}