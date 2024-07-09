import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async ( req, _, next) => {
   try {
    const token =  req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
 
    if(!token) {
     throw new ApiError(401, "unauthorized request")
    }
 
    const decodeToken =  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET )
 
    const user =  await User.findById(decodeToken._id).select(
     "-password -refreshToken"
    )
 
    if(!user){
     // NEXT_VIDEO : discuss hone wala hai kuch
     throw new ApiError(401, "Invalid Access Token")
    }
 
    req.user = user;    // ----------------------------return to kra hi nahi ise
    next()
   } catch (error) {
        throw new ApiError(401 , error?.message || "invalid Access Token" )
   }

})