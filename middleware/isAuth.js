exports.isLoggedIn = (req, res, next) => {
    if (req.session.isLoggedIn) {
        return res.status(400).json({
            msg: "User is already logged in"
        })
    }
    next();
}

exports.notLoggedIn = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.json({
            msg: "User is not logged in"
        })
    }
    next();
}