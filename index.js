const express = require('express');
const body_parser = require('body-parser');
const dotenv = require('dotenv').config();
const ejs = require('ejs');
const mongoose = require('mongoose');
const lodash = require('lodash');
const session = require('express-session');
const passport = require('passport');
const passport_local_mongoose = require('passport-local-mongoose');
const Google_Strategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

// Express
const app = express();
app.set('view engine', 'ejs');
app.use(body_parser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/public'));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

// Mongoose
let deprecation_warning_items = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
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
    password: String,
    googleId: String,
    secret: String
});
user_schema.plugin(passport_local_mongoose);
user_schema.plugin(findOrCreate);

const User = new mongoose.model('User', user_schema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
    done(null, user.id);
});
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new Google_Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.BASE_URL_DEV + process.env.PORT + '/auth/google/secrets'   // Swap to BASE_URL_PROD when releasing
    }, 
    function(accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

let user_notification = "";
let users_with_secrets = "";

app.get('/', function(req, res) {
    res.render('home');
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile'] })
);

app.get('/auth/google/secrets', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect('/secrets');
    }
);
  
app.route('/login')
    .get(function(req, res) {
        res.render('login', {
            user_notification: user_notification
        });
    })
    .post(function(req, res) {
        const login_user = new User({
            username: req.body.username,
            password: req.body.password
        });
        req.login(login_user, function(err) {
            if (err) {
                console.log(err);
                res.redirect('/login');
            } else {
                passport.authenticate('local')(req, res, function() {
                    res.redirect('/secrets');
                });
            }
        });
    });

app.route('/register')
    .get(function(req, res) {
        res.render('register');
    })
    .post(function(req, res) {
        User.register({username: req.body.username}, req.body.password, function(err, user) {
            if (err) {
                console.log(err);
                res.redirect('/register');
            } else {
                passport.authenticate('local')(req, res, function() {
                    res.redirect('/secrets');
                });
            }
        });
    });

app.get('/secrets', function(req, res) {
    User.find({"secret": {$ne: null}}, function(err, found_users) {
        if (err) {
            console.log(err);
        } else {
            if (found_users) {
                res.render('secrets', {
                    users_with_secrets: found_users
                });   
            }
        }
    });
});

app.route('/submit')
    .get(function(req, res) {
        if(req.isAuthenticated()) {
            res.render('submit');
        } else {
            res.redirect('/login');
        }
    })
    .post(function(req, res) {
        User.findById(req.user.id, function(err, found_user) {
            if (err) {
                console.log(err);
            } else {
                if (found_user) {
                    found_user.secret = req.body.secret;
                    found_user.save(function() {
                        res.redirect('/secrets');
                    });
                }
            }
        });
    });

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

app.listen(process.env.PORT, function() {
    console.log("Server started on port " + process.env.PORT);
});