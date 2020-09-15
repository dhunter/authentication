const express = require('express');
const body_parser = require('body-parser');
const dotenv = require('dotenv').config();
const ejs = require('ejs');
const mongoose = require('mongoose');
const lodash = require('lodash');
const bcrypt = require('bcrypt');

// Express
const app = express();
app.set('view engine', 'ejs');
app.use(body_parser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));

// Mongoose
let deprecation_warning_items = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}
// Mongodb databases - uncomment appropriate line
// Dev
mongoose.connect(process.env.MONGODB_DEV, deprecation_warning_items);

// Mongoose - Force Mongoose to use MongoDB's findOneAndUpdate() function.
mongoose.set('useFindAndModify', false);

// Bcrypt - Number of salt rounds to use.
const salt_rounds = 10;

const user_schema = new mongoose.Schema({
    email: String,
    password: String
});

const User = new mongoose.model('User', user_schema);

let user_notification = "";

app.get('/', function(req, res) {
    res.render('home');
});

app.route('/login')
    .get(function(req, res) {
        res.render('login', {
            user_notification: user_notification
        });
    })
    .post(function(req, res) {
        User.findOne({email: req.body.username}, function(err, found_user) {  
            if (found_user != null) {
                bcrypt.compare(req.body.password, found_user.password, function(err, result) {
                    if (result === true) {
                        res.render('secrets', {
                            user_email: found_user.email
                        });
                    } else {
                        res.render('login', {
                            user_notification: "Sorry, wrong password.  Try again."
                        });
                    }
                });
            } else {
                res.render('login', {
                    user_notification: "Sorry, no such user.  Try again."
                });
            }
        });
    });

app.route('/register')
    .get(function(req, res) {
        res.render('register');
    })
    .post(function(req, res) {
        bcrypt.hash(req.body.password, salt_rounds, function(err, hash) {
            const new_user = new User({
                email: req.body.username,
                password: hash
            });
            new_user.save(function(err) {
                if (err) {
                    console.log(err);
                } else {
                    res.render('secrets', {
                        user_email: new_user.email
                    });
                }
            });
        });
    });

app.get('/logout', function(req, res) {
    res.redirect('/');
});

app.listen(process.env.PORT, function() {
    console.log("Server started on port " + process.env.PORT);
});