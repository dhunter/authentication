const express = require('express');
const body_parser = require('body-parser');
const dotenv = require('dotenv').config();
const ejs = require('ejs');
const mongoose = require('mongoose');
const lodash = require('lodash');
const md5 = require('md5');

const app = express();
app.set('view engine', 'ejs');
app.use(body_parser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));

let deprecation_warning_items = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}
// Mongodb databases - uncomment appropriate line
// Dev
mongoose.connect(process.env.MONGODB_DEV, deprecation_warning_items);

// Force Mongoose to use MongoDB's findOneAndUpdate() function.
mongoose.set('useFindAndModify', false);

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
        User.findOne({email: req.body.username, password: md5(req.body.password)}, function(err, found_user) {  
            if (found_user != null) {
                res.render('secrets', {
                    user_email: found_user.email
                });
            } else {
                res.render('login', {
                    user_notification: "Sorry, wrong username or password.  Try again."
                });
            }
        });
    });

app.route('/register')
    .get(function(req, res) {
        res.render('register');
    })
    .post(function(req, res) {
        const new_user = new User({
            email: req.body.username,
            password: md5(req.body.password)
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

app.get('/logout', function(req, res) {
    res.redirect('/');
});

app.listen(process.env.PORT, function() {
    console.log("Server started on port " + process.env.PORT);
});