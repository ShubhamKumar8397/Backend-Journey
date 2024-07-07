import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnClodinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

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


export {registerUser}