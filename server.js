const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const session = require('express-session');
const mongoStore = require('connect-mongodb-session')(session);
const cors = require('cors');

dotenv.config();

const userRoutes = require('./routes/user');

const User = require('./models/user');

const app = express();

const store = new mongoStore({ uri: process.env.mongoURL, collection: 'sessions' });
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: process.env.secret, resave: false, saveUninitialized: false, store: store }));

app.use(cors());

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id).then(user => {
        req.user = user;
        return next();
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error)
    })
})

app.use(userRoutes);

app.use('*', (req, res, next) => {
    return res.status(404).json({
        msg: "Error Code 404 - Route Not Found"
    })
})

app.use((err, req, res, next) => {
    return res.status(500).json({
        err: err.message,
        msg: "Error Code 500 - Internal Server Error"
    })
})

mongoose.connect(process.env.mongoURL).then(() => {
    console.log("App is currently running on port 8080");
    app.listen(8080);
}).catch(err => {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
})