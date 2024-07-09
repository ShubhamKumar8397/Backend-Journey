import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnClodinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId) => {
    try {
       const user = await User.findById(userId)
       const accessToken = user.generateAccessToken()
       const refreshToken = user.refreshAccessToken()
       user.refreshToken = refreshToken;
       await user.save({validateBeforeSave: false})

       return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something Went Wrong while Generating Refresh and access token")
    }
}

const registerUser = asyncHandler( async(req,res,) => {
    // get user details from frontend -------- 
    // validation - non empty
    // check if user already exits - check by email or username
    // check for images - check for avatar
    // agar hai to upload them to cloudinary, it successfully uploaded or not
    // create user object - create entry in db
    // remove password at refresh token field from response
    // check for user creation 
    // if successfully return response 

    const {fullName, email, username, password} = req.body
    
    console.log(fullName,email,username,password)

    if(
        [fullName, email, username, password].some((field) => 
        field?.trim() === 0 )
    ){
        throw new ApiError(400, "All Fields are Required")
    }

    
    const existedUser =  await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User With Email Or Username Already Existed")
    }

    console.log(req.files)

    const avatarLocalPath =  req.files?.avatar[0]?.path;
    // const coverImageLocalPath =  req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) &&  
        req.files.coverImage.length > 0 ){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath) throw new ApiError(400, "Avatar file is Required")

    const avatar = await uploadOnClodinary(avatarLocalPath)
    const coverImage = await uploadOnClodinary(coverImageLocalPath)


    console.log("avatar", avatar)

    if(!avatar) throw new ApiError(400, "Avatar file is Required")

    const user =  await User.create({
        fullName,
        coverImage : coverImage?.url || "",
        email,
        password,
        username,
        avatar: avatar.url,
    })

    const createdUser =  await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Something Went Wrong While Registering User")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )

})

const loginUser  = asyncHandler( async(req,res) => {
    // get data from req body
    // username or email 
    // find the user
    // password check
    // access and refresh token generate
    // send cookies
    // response succesfully login

    const {email, username, password} = req.body

    if(!(username || email)) {
        throw new ApiError(400, "Username or Email is Required")
    }

    const user =  await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404, "User Don't Exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid User Crdentials")
    }

   const{accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

   const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )

//    for safety purpose not modify on frontend
   const options = {
    httpOnly : true,
    secure :true,
   }
   
   return res
   .status(200)
   .cookie("accessToken",accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
    new ApiResponse(
        200,
        {
            user : loggedInUser, accessToken, refreshToken

        },
        "User Logged in Successfully"
    )
   )

})

//  for logout

const logoutUser = asyncHandler(async(req,res) => {
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200, {}, "User Logout Successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Req")
    }

    try {
        const decodedToken =  jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    
       const user = await User.findById(decodedToken._id)
    
       if(!user){
        throw new ApiError(401, "invalid Refresh Token")
       }
    
       if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401, "Refresh Token is Expired Or used")
       }
    
       const options = {
        httpOnly: true,
        secure: true,
       }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res.status(200)
                .cookie("accessToken", accessToken, options)
                .cookie("refreshToken", newRefreshToken, options)
                .json(
                    new ApiResponse(
                        {accessToken, newRefreshToken}
                    ),
                    201,
                    "Access Token Refreshed"
                )
                
    
    } catch (error) {
        throw new ApiError(
            401,
            error?.message || "invalid Refresh Token",
        )
    }


})


export {registerUser, loginUser, logoutUser, refreshAccessToken}