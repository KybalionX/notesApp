const express = require('express');
const app = express();
const colors = require('colors');
const routes = require('./routes');
const path = require('path');
const passport = require('passport');
const passportLocal = require('passport-local').Strategy;
const cookieParser = require('cookie-parser');
const session = require('express-session');
var expressValidator = require('express-validator');

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(routes);
app.use(cookieParser('ultra secreto de la NASA'));
app.set("Port", "8080");
app.set('views', path.join(__dirname+"/views"));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname+"/public")));

routes.post("/login", passport.authenticate({
    successRedirect: '/',
    failureRedirect: '/login'
}))


app.listen(app.get("Port"), ()=>{
    console.log(colors.inverse(`Server listen in port ${app.get("Port")}`));
});