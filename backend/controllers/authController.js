const jwt = require("jsonwebtoken")

const catchAsync = require("../utils/catchAsync")
const AppError = require("../utils/appError")

const User = require("../models/userModel")

const signAndSendToken = (user, statusCode, res) => {
  // signing the jwt token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  })

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: "strict",
  }

  // passwords should not show up even if its hashed
  user.password = undefined

  res
    .status(statusCode)
    .cookie("jwt", token, cookieOptions) // sending jwt token via cookie
    .json({
      status: "success",
      message: `Welcome ${user.fullName}!`,
      token,
      data: {
        user,
      },
    })
}

exports.register = catchAsync(async (req, res, next) => {
  const { fullName, email, password, passwordConfirm, phoneNumber, role } =
    req.body

  const newUser = await User.create({
    fullName,
    email,
    password, // password is hashed in mongoose middleware
    passwordConfirm,
    phoneNumber,
    role,
  })

  signAndSendToken(newUser, 201, res)
})

exports.login = catchAsync(async (req, res, next) => {
  const { email, password, role } = req.body

  if (!email || !password || !role) {
    return next(new AppError("Please provide email, password and role", 400))
  }

  const user = await User.findOne({ email }).select("+password")

  if (
    !user ||
    !(await user.correctPassword(password, user.password)) || // method on a user instance
    role !== user.role
  ) {
    return next(new AppError("Incorrect email, password or role", 401))
  }

  signAndSendToken(user, 200, res)
})
