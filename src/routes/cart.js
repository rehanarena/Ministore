const express = require('express');
const router = express.Router();

const Cart = require("../model/cartSchema");
const { isLoggedIn } = require('../middlewares/authMiddleware');
const cartController = require('../controller/cartController');

router.use(isLoggedIn)

router.get("/cart",cartController.getCart)

router.post("/add-to-cart/:id",cartController.addToCart)

router.post('/update-quantity/:productId',cartController.updateQuantity);





module.exports = router