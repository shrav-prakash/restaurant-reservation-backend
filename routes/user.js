const express = require('express');
const router = express.Router();

const isAuth = require('../middleware/isAuth');
const userController = require('../controllers/user');
const resController = require('../controllers/new-reservation');
const userValidator = require('../middleware/userValidator');

router.post('/login', isAuth.isLoggedIn, userValidator.loginValidator, userController.loginUser);

router.post('/sign-up', isAuth.isLoggedIn, userValidator.signUpValidator, userController.createUser);

router.get('/get-tables', isAuth.notLoggedIn, userController.getTables);

router.post('/add-reservation', isAuth.notLoggedIn, resController.createReservation);

router.get('/get-reservations', isAuth.notLoggedIn, resController.dispReservations)

router.post('/delete-reservation', isAuth.notLoggedIn, resController.deleteReservation)

router.post('/update-reservation', isAuth.notLoggedIn, resController.updateReservation);

router.get('/logout', isAuth.notLoggedIn, userController.logoutUser);

module.exports = router;