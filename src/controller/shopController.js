module.exports = {
    getproductList:async(req,res)=>{
        res.render('shop/ProductList')
    },
    getproductDetails:async(req,res)=>{
        res.render('shop/ProductDetails')
    },
    
}