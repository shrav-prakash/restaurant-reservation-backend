const express = require('express');
const router = express.Router();

const userController = require('../controllers/user');
const userValidator = require('../middleware/userValidator');

router.post('/login', userValidator.loginValidator, userController.loginUser);

router.post('/sign-up', userValidator.signUpValidator, userController.createUser);

router.post('/add-reservation', userController.createReservation);

module.exports = router;