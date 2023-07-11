const Review = require('../models/review');
const user = require('../models/user');
const ObjectId = require('mongodb').ObjectId

exports.postReview = (req, res, next) => {
    if (req.user.review_id) {
        return res.status(400).json({
            msg: "User has already placed a review"
        })
    }
    const rating = parseInt(req.body.rating)
    if (isNaN(rating)) {
        return res.status(400).json({
            msg: "Rating must be a number"
        })
    }
    if (rating > 5 || rating < 1) {
        return res.status(400).json({
            msg: "Rating must be between 1 to 5"
        })
    }

    const review = new Review({ user_id: req.user._id, rating: rating, food: req.body.food, booking: req.body.food, hospitality: req.body.hospitality, suggestions: req.body.suggestions });
    review.save().then(rev => {
        req.user.review_id = new ObjectId(rev._id)
        req.user.save().then(() => {
            return res.status(200).json({
                review: rev,
                msg: "Review sucessfully placed"
            })
        })
    })
}

exports.getReviews = (req, res, next) => {
    Review.find().then(reviews => {
        return res.json({
            reviews: reviews,
            msg: "Reviews fetched"
        })
    })
}