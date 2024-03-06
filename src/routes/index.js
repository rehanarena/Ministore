// var express = require('express');
// var router = express.Router();

// const userController = require('../controller/userController.js')

// /* GET home page. */
// router.get('/', function(req, res, next) {
//   res.render('index', { title: 'ministore' });
// });


// /* GET cart page. */
// router.get('/cart', function(req, res, next) {
//   res.render('cart', { title: 'cart' });
// });
// module.exports = router;


// /* GET login page. */
// router
//   .route("/login")
//   .get( userController.getLogin)
//   .post( userController.userLogin);



//   /* GET SignUp page. */
// router
//   .route("/signup")
//   .get( userController.getsignup)
//   .post( userController.usersignup);




const express = require('express');
const router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;