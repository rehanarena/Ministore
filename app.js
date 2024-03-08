require('dotenv').config()
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require("connect-flash")
const MongoStore = require("connect-mongo");
const multer = require('multer');
const nocache = require('nocache');
const { v4: uuidv4} = require("uuid")
const expressLayouts=require('express-ejs-layouts')
const authRouter = require('./src/routes/auth');
const usersRouter = require('./src/routes/users');
const shopRouter =  require('./src/routes/shop');
const adminRouter =  require('./src/routes/admin');

// const {}=require('./src/config/db');
const connectDB = require('./src/config/db');
const passport = require('./src/config/passport-config');
const { checkBlockedUser } = require('./src/middlewares/authMiddleware');



const app = express();
connectDB()


// view engine setup
app.use(expressLayouts)
app.set('layout','./layouts/main.ejs')
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Configure session middleware
app.use(
  session({
    secret: "rena",
    resave: false,
    saveUninitialized: false,
    store:MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(flash());
app.use(nocache());



// passport session
app.use(passport.initialize());
app.use(passport.session())

//custom middleware to expose flash messages to views
app.use(checkBlockedUser,(req,res,next)=>{
  if(req.user){
    res.locals.user =req.user;
    // console.log(req.session);
  }
  res.locals.success=req.flash('success');
  res.locals.error = req.flash('error');
  next();
})
 
app.use('/', authRouter);
app.use('/users', usersRouter);
app.use('/', shopRouter);
app.use("/admin", adminRouter);




// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});














module.exports = app;
