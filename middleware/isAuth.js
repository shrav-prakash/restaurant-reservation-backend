exports.isLoggedIn = (req, res, next) => {
    console.log(req.session);
    if (req.session.isLoggedIn) {
        return res.status(400).json({
            msg: "User is already logged in"
        })
    }
    next();
}

exports.notLoggedIn = (req, res, next) => {
    if (!req.session.isLoggedIn) {
        return res.status(400).json({
            msg: "User is not logged in"
        })
    }
    next();
}