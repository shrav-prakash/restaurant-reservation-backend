const { check } = require('express-validator');
const User = require('../models/user');

exports.loginValidator = [
    check('email').isEmail().withMessage('Please enter a valid email address').custom(async val => {
        return User.findOne({ email: val }).then(user => {
            if (user == null) {
                return Promise.reject("User with the given email does not exist")
            }
        })
    }),
    check('password').trim().isLength({ min: 8 }).withMessage("Password must be atleast 8 characters long")
];

exports.signUpValidator = [
    check('email').isEmail().withMessage('Please enter a valid email address').custom(async val => {
        return User.findOne({ email: val }).then(user => {
            if (user) {
                return Promise.reject("User with the given email already exists")
            }
        })
    }),
    check('password').trim().isLength({ min: 8 }).withMessage("Password must be atleast 8 characters long"),
    check('repassword').trim().custom((value, { req }) => {
        if (value != req.body.password) {
            throw new Error('Passwords must match!');
        }
        return true;
    })
]