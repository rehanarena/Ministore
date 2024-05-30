const puppeteer = require("puppeteer");
const excelJS = require("exceljs");
const layout = "./layouts/adminLayout.ejs";
const path = require("path");

const fs = require("fs");

const Order = require("../model/orderSchema");
const Product = require("../model/productSchema");

module.exports = {
  getSalesReport: async (req, res) => {
    let startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date();

    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();


    startDate.setUTCHours(0, 0, 0, 0);
    // endDate.setUTCHours(23, 59, 59, 999);

    // Check if start date is less tahn than end date
     if ( new Date(startDate) < new Date(endDate)) {
      req.flash("error", "Start date cannot be less than end date");
      
      }
      


    console.log(startDate, endDate);

    const locals = { title: "Ministore - Reports" };

    const orders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["Cancelled", "Failed"] },
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $lookup: {
          from: "coupons",
          localField: "coupon",
          foreignField: "_id",
          as: "coupon",
        },
      },
      { $unwind: "$items" },

      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "items.productDetails",
        },
      },

      {
        $group: {
          _id: "$_id",
          userID: { $first: "$customer" },

          paymentMethod: { $first: "$paymentMethod" },
          status: { $first: "$status" },
          totalAmount: { $first: "$totalPrice" },

          payable: { $first: "$payable" },
          coupon: { $first: "$coupon" },
          couponDiscount: { $first: "$couponDiscount" },
          createdAt: { $first: "$createdAt" },
          orderedItems: {
            $push: {
              productDetails: {
                product_name: "$items.productDetails.product_name",
                price: "$items.price",
              },
              quantity: "$items.quantity",
              itemTotal: { $multiply: ["$items.price", "$items.quantity"] },
            },
          },
        },
      },
    ]);

    startDate =
      startDate.getFullYear() +
      "-" +
      ("0" + (startDate.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + startDate.getUTCDate()).slice(-2);

    endDate =
      endDate.getFullYear() +
      "-" +
      ("0" + (endDate.getMonth() + 1)).slice(-2) +
      "-" +
      ("0" + endDate.getUTCDate()).slice(-2);

    res.render("admin/reports/salesreport", {
      startDate,
      endDate,
      orders,
      locals,
      layout,
    });
  },
  salesReportExcel: async (req, res) => {
    let startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : new Date();
    let endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    endDate.setUTCHours(23, 59, 59, 999);

    console.log(startDate, endDate);
    const orders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ["Cancelled", "Failed"] },
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "customer_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      {
        $lookup: {
          from: "coupons",
          localField: "coupon",
          foreignField: "_id",
          as: "coupon",
        },
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "items.productDetails",
        },
      },

      {
        $group: {
          _id: "$_id",
          userID: { $first: "$customer" },

          paymentMethod: { $first: "$paymentMethod" },
          status: { $first: "$status" },
          totalAmount: { $first: "$totalPrice" },

          payable: { $first: "$payable" },
          coupon: { $first: "$coupon" },
          couponDiscount: { $first: "$couponDiscount" },
          createdAt: { $first: "$createdAt" },
          orderedItems: {
            $push: {
              productDetails: {
                productName: "$items.productDetails.productName",
                price: "$items.price",
              },
              quantity: "$items.quantity",

              itemTotal: { $multiply: ["$items.price", "$items.quantity"] },
            },
          },
        },
      },
    ]);

    const workBook = new excelJS.Workbook();
    const worksheet = workBook.addWorksheet("Sales Report");

    worksheet.columns = [
      { header: "Order ID", key: "_id" },
      { header: "Customer ID", key: "userID.userId" },
      { header: "Payment Method", key: "paymentMethod" },
      { header: "Payment Status", key: "status" },
      { header: "Total Amount", key: "totalAmount" },
      { header: "Final Price", key: "payable" },
      { header: "Discount Amount", key: "couponDiscount" },
      { header: "Order Date", key: "createdAt" },
      {
        header: "Ordered Items",
        key: "orderedItems",
        style: {
          font: { bold: true },
        },
      },
    ];

    orders.forEach((order) => {
      worksheet.addRow(order);
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
    });

    res.setHeader(
      "content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheatml.sheet"
    );
    res.setHeader(
      "content-Disposition",
      "attachment; filename=sales-report_.xlsx"
    );

    return workBook.xlsx.write(res).then(() => {
      res.status(200);
    });
  },
  getSalesReportPdf: async (req, res) => {
    try {
      let startDate = req.query.startDate
        ? new Date(req.query.startDate)
        : new Date();
      let endDate = req.query.endDate
        ? new Date(req.query.endDate)
        : new Date();
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);

      console.log(startDate, endDate);

      const locals = {
        title: "Ministore - Reports",
        filename: `Ministore- Sales Reports ${startDate.toDateString()} - ${endDate.toDateString()}`,
      };

      const orders = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $nin: ["Cancelled", "Failed"] },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "customer_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        {
          $lookup: {
            from: "coupons",
            localField: "coupon",
            foreignField: "_id",
            as: "coupon",
          },
        },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            localField: "items.product_id",
            foreignField: "_id",
            as: "items.productDetails",
          },
        },

        {
          $group: {
            _id: "$_id",
            userID: { $first: "$customer" },

            paymentMethod: { $first: "$paymentMethod" },
            status: { $first: "$status" },
            totalAmount: { $first: "$totalPrice" },
            coupon: { $first: "$coupon" },
            couponDiscount: { $first: "$couponDiscount" },
            payable: { $first: "$payable" },

            createdAt: { $first: "$createdAt" },
            orderedItems: { $push: "$items" },
          },
        },
      ]);

      // Ordered Item details
      orders.forEach((order) => {
        order.orderedItems = order.orderedItems.map((item) => ({
          productDetails: {
            productName: item.productDetails[0].productName,
            price: item.price,
          },
          quantity: item.quantity,

          itemTotal: item.price * item.quantity,
        }));
      });

      startDate =
        startDate.getFullYear() +
        "-" +
        ("0" + (startDate.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + startDate.getUTCDate()).slice(-2);

      endDate =
        endDate.getFullYear() +
        "-" +
        ("0" + (endDate.getMonth() + 1)).slice(-2) +
        "-" +
        ("0" + endDate.getUTCDate()).slice(-2);

      // endDate = endDate + " 23:59:59";

      res.render("admin/reports/pdf", {
        startDate,
        endDate,
        orders,
        locals,
        layout: "./layouts/docs/sales-report.ejs",
      });
    } catch (error) {
      console.log(error);
    }
  },
};