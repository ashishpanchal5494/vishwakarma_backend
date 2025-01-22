const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Coupon = require("../models/couponModel");
const Order = require("../models/orderModel");
const uniqid = require("uniqid");

const asyncHandler = require("express-async-handler");
const { generateToken } = require("../config/jwtToken");
const validateMongoDbId = require("../utils/validateMongodbId");
const { generateRefreshToken } = require("../config/refreshtoken");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const sendEmail = require("./emailCtrl");
const { log } = require("console");

// Create a User ----------------------------------------------

const createUser = asyncHandler(async (req, res) => {
  /**
   * TODO:Get the email from req.body
   */
  const email = req.body.email;
  /**
   * TODO:With the help of email find the user exists or not
   */
  const findUser = await User.findOne({ email: email });

  if (!findUser) {
    /**
     * TODO:if user not found user create a new user
     */
    const newUser = await User.create(req.body);
    res.json(newUser);
  } else {
    /**
     * TODO:if user found then thow an error: User already exists
     */
    throw new Error("User Already Exists");
  }
});

// Login a user
const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // check if user exists or not
  const findUser = await User.findOne({ email });
  if (findUser && (await findUser.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findUser?._id);
    const updateuser = await User.findByIdAndUpdate(
      findUser.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findUser?._id,
      firstname: findUser?.firstname,
      lastname: findUser?.lastname,
      email: findUser?.email,
      mobile: findUser?.mobile,
      token: generateToken(findUser?._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});

// admin login

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // check if user exists or not
  const findAdmin = await User.findOne({ email });
  if (findAdmin.role !== "admin") throw new Error("Not Authorised");
  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findAdmin?._id);
    const updateuser = await User.findByIdAndUpdate(
      findAdmin.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findAdmin?._id,
      firstname: findAdmin?.firstname,
      lastname: findAdmin?.lastname,
      email: findAdmin?.email,
      mobile: findAdmin?.mobile,
      token: generateToken(findAdmin?._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});

// handle refresh token

const handleRefreshToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) throw new Error(" No Refresh token present in db or not matched");
  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user.id !== decoded.id) {
      throw new Error("There is something wrong with refresh token");
    }
    const accessToken = generateToken(user?._id);
    res.json({ accessToken });
  });
});

// logout functionality

const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });
  if (!user) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    return res.sendStatus(204); // forbidden
  }
  await User.findOneAndUpdate(refreshToken, {
    refreshToken: "",
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  res.sendStatus(204); // forbidden
});

// Update a user

const updatedUser = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        firstname: req?.body?.firstname,
        lastname: req?.body?.lastname,
        email: req?.body?.email,
        mobile: req?.body?.mobile,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// save user Address

const saveAddress = asyncHandler(async (req, res, next) => {
  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        address: req?.body?.address,
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// Get all users

const getallUser = asyncHandler(async (req, res) => {
  try {
    const getUsers = await User.find().populate("wishlist");
    res.json(getUsers);
  } catch (error) {
    throw new Error(error);
  }
});

// Get a single user

const getaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const getaUser = await User.findById(id);
    res.json({
      getaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// Get a single user

const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const blockusr = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: true,
      },
      {
        new: true,
      }
    );
    res.json(blockusr);
  } catch (error) {
    throw new Error(error);
  }
});

const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const unblock = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: false,
      },
      {
        new: true,
      }
    );
    res.json({
      message: "User UnBlocked",
    });
  } catch (error) {
    throw new Error(error);
  }
});

const updatePassword = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { password } = req.body;
  validateMongoDbId(_id);
  const user = await User.findById(_id);
  if (password) {
    user.password = password;
    const updatedPassword = await user.save();
    res.json(updatedPassword);
  } else {
    res.json(user);
  }
});

const forgotPasswordToken = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found with this email");
  try {
    const token = await user.createPasswordResetToken();
    await user.save();
    const resetURL = `Hi, Please follow this link to reset Your Password. This link is valid till 10 minutes from now. <a href='https://mern-e-commerce-frontend-steel.vercel.app/reset-password/${token}'>Click Here</>`;
    const data = {
      to: email,
      text: "Hey User",
      subject: "Forgot Password Link",
      htm: resetURL,
    };
    sendEmail(data);
    res.json(token);
  } catch (error) {
    throw new Error(error);
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new Error(" Token Expired, Please try again later");
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json(user);
});

const getWishlist = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  try {
    const findUser = await User.findById(_id).populate("wishlist");
    res.json(findUser);
  } catch (error) {
    throw new Error(error);
  }
});

const addToWishlist = asyncHandler(async (req, res) => {
  const { _id } = req.user; // Get the user ID from the authenticated user
  const { productId } = req.body; // Get the product ID from the request body

  try {
    // Find the user by ID
    const user = await User.findById(_id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Check if the product is already in the wishlist
    if (user.wishlist.includes(productId)) {
      res.status(400);
      throw new Error("Product already in wishlist");
    }

    // Add the product to the wishlist
    user.wishlist.push(productId);
    await user.save();

    res.status(200).json({
      message: "Product added to wishlist successfully",
      wishlist: user.wishlist, // Return the updated wishlist
    });
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
});

const deleteProductFromWishlist = asyncHandler(async (req, res) => {
  const { _id } = req.user; // Authenticated user's ID
  const { productId } = req.body; // Product ID from request params

  console.log("Product ID:", productId); // Log for debugging
  validateMongoDbId(_id); // Ensure the user ID is a valid MongoDB ObjectId

  try {
    // Update the user document to remove the product from the wishlist
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      { $pull: { wishlist: productId } }, // Use `$pull` to remove the product ID
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      res.status(404);
      throw new Error("User not found");
    }

    res.status(200).json({
      message: "Product removed from wishlist successfully",
      wishlist: updatedUser.wishlist, // Return the updated wishlist
    });
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  }
});

const userCart = asyncHandler(async (req, res) => {
  const { productId, color, quantity, price } = req.body;
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    let newCart = await new Cart({
      userId: _id,
      productId,
      color,
      price,
      quantity,
    }).save();
    res.json(newCart);
  } catch (error) {
    throw new Error(error);
  }
});

const getUserCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const cart = await Cart.find({ userId: _id })
      .populate("productId")
      .populate("color");
    res.json(cart);
  } catch (error) {
    throw new Error(error);
  }
});

const emptyCart = async (req, res) => {
  const { _id } = req.user; // Get the authenticated user's ID
  validateMongoDbId(_id); // Validate the user ID
  try {
    // Assuming the user's ID is available in req.user

    // Remove all cart items for the user
    const result = await Cart.deleteMany({ userId: _id });

    res.status(200).json({
      message: "Cart emptied successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Error emptying cart", error });
  }
};

const removeProductFromCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { cartItemId } = req.params;
  console.log(cartItemId);
  validateMongoDbId(_id);
  try {
    const deleteProductFromCart = await Cart.deleteOne({
      userId: _id,
      _id: cartItemId,
    });
    res.json(deleteProductFromCart);
  } catch (error) {
    throw new Error(error);
  }
});

const updateProductQuantityFromCart = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { cartItemId, newQuantiy } = req.params;
  console.log(cartItemId);
  validateMongoDbId(_id);
  try {
    const cartItem = await Cart.findOne({ userId: _id, _id: cartItemId });
    cartItem.quantity = newQuantiy;
    cartItem.save();
    res.json(cartItem);
  } catch (error) {
    throw new Error(error);
  }
});
const createOrder = asyncHandler(async (req, res) => {
  const {
    shippingInfo,
    orderItems,
    totalPrice,
    totalPriceAfterDiscount,
    paymentInfo,
  } = req.body;

  const { _id: userId, email } = req.user;

  // Validate required fields
  if (!shippingInfo) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: shippingInfo",
    });
  }
  if (!orderItems) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: orderItems",
    });
  }
  if (!totalPrice) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: totalPrice",
    });
  }
  if (!totalPriceAfterDiscount) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: totalPriceAfterDiscount",
    });
  }
  if (!paymentInfo) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: paymentInfo",
    });
  }

  try {
    // Create the order
    const order = await Order.create({
      shippingInfo,
      orderItems,
      totalPrice,
      totalPriceAfterDiscount,
      paymentInfo,
      user: userId,
    });

    const emailData = {
      to: email,
      subject: "Order Confirmation and Details",
      text: `Thank you for your order! Here are your order details:
      
Shipping Information:
${shippingInfo.address}, ${shippingInfo.city}, ${shippingInfo.state}, ${
        shippingInfo.pincode
      }

Order Items:
${orderItems
  .map((item) => `${item.product} (Quantity: ${item.quantity})`)
  .join("\n")}

Total Price: $${totalPrice}
Discounted Price: $${totalPriceAfterDiscount}

Payment Information:
Payment Status: Payment Successfully
Transaction ID: ${paymentInfo.transactionId}

Thank you for shopping with us!`,
      htm: `
        <p>Thank you for your order! Here are your order details:</p>
        <h3>Shipping Information:</h3>
        <p>${shippingInfo.address}, ${shippingInfo.city}, ${
        shippingInfo.state
      }, ${shippingInfo.pincode}</p>
        <h3>Order Items:</h3>
        <ul>
          ${orderItems
            .map(
              (item) =>
                `<li>${item.product} (Quantity: ${item.quantity}) -₹ ${item.price}</li>`
            )
            .join("")}
        </ul>
        <h3>Total Price:</h3>
        <p><strong>₹${totalPrice}</strong></p>
        <h3>Discounted Price:</h3>
        <p><strong>₹${totalPriceAfterDiscount}</strong></p>
        <h3>Payment Information:</h3>
        <p>Payment Status: <strong> Payment Successfully </strong></p>
        <p>Transaction ID: <strong>${paymentInfo.razorpayOrderId}</strong></p>
        <p>Thank you for shopping with us!</p>
      `,
    };

    await sendEmail(emailData);

    // Respond with the created order
    res.status(201).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order. Please try again later.",
    });
  }
});

const getMyOrders = asyncHandler(async (req, res) => {
  const { _id } = req.user;

  try {
    const orders = await Order.find({ user: _id });
    res.json({
      orders,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const getAllOrders = asyncHandler(async (req, res) => {
  try {
    const orders = await Order.find().populate("user");
    res.json({
      orders,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const getSingleOrders = asyncHandler(async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const orders = await Order.findOne({ _id: id })
      .populate("orderItems.product")
      .populate("orderItems.color");
    res.json({
      orders,
    });
  } catch (error) {
    throw new Error(error);
  }
});

const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, email } = req.body;
  console.log(id);

  try {
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.orderStatus = status;
    await order.save();

    const emailData = {
      to: email,
      subject: "Your Order Status Has Been Updated",
      text: `Hello, your order status is now: ${order.orderStatus}`,
      htm: `<p>Hello,</p><p>Your order status is now: <strong>${order.orderStatus}</strong>.</p>`,
    };

    await sendEmail(emailData);

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const getMonthWiseOrderIncome = asyncHandler(async (req, res) => {
  try {
    let monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    let d = new Date();
    let endDate = "";
    d.setDate(1);
    for (let index = 0; index < 11; index++) {
      d.setMonth(d.getMonth() - 1);
      endDate = monthNames[d.getMonth()] + " " + d.getFullYear();
    }
    const data = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $lte: new Date(),
            $gte: new Date(endDate),
          },
        },
      },
      {
        $group: {
          _id: {
            month: "$month",
          },
          amount: { $sum: "$totalPriceAfterDiscount" },
          count: { $sum: 1 },
        },
      },
    ]);
    res.json(data);
  } catch (error) {
    throw new Error(error);
  }
});

const getYearlyTotalOrders = asyncHandler(async (req, res) => {
  try {
    let monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    let d = new Date();
    let endDate = "";
    d.setDate(1);
    for (let index = 0; index < 11; index++) {
      d.setMonth(d.getMonth() - 1);
      endDate = monthNames[d.getMonth()] + " " + d.getFullYear();
    }
    const data = await Order.aggregate([
      {
        $match: {
          createdAt: {
            $lte: new Date(),
            $gte: new Date(endDate),
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          amount: { $sum: "$totalPriceAfterDiscount" },
        },
      },
    ]);
    res.json(data);
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  createUser,
  loginUserCtrl,
  getallUser,
  getaUser,
  deleteaUser,
  updatedUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
  updatePassword,
  forgotPasswordToken,
  resetPassword,
  loginAdmin,
  getWishlist,
  addToWishlist,
  deleteProductFromWishlist,
  saveAddress,
  userCart,
  getUserCart,
  createOrder,
  emptyCart,
  removeProductFromCart,
  updateProductQuantityFromCart,
  getMyOrders,
  getMonthWiseOrderIncome,
  getYearlyTotalOrders,
  getAllOrders,
  getSingleOrders,
  updateOrder,
};
