import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  try {
    // 1. Get the video file and thumbnail from the request body(frontend)
    // TODO: get video, upload to cloudinary, create video
    const { title, description } = req.body;
    if ([title, description].some((feild) => feild.trim() === "")) {
      throw new ApiError(400, "Please provide all details");
    }

    // 2. upload video and thumbnail to loacl storage and get the path
    const videoLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

    if (!videoLocalPath) {
      throw new ApiError(400, "Please upload video");
    }
    if (!thumbnailLocalPath) {
      throw new ApiError(400, "Please upload thumbnail");
    }

    // 3. upload video and thumbnail to cloudinary
    const videoOnCloudnary = await uploadOnCloudinary(videoLocalPath, "video");
    const thumbnailOnCloudnary = await uploadOnCloudinary(thumbnailLocalPath,"img");

    if (!videoOnCloudnary) {
      throw new ApiError(400, "video Uploading failed");
    }
    if (!thumbnailOnCloudnary) {
      throw new ApiError(400, "video Uploading failed");
    }

    // 4. create a video document in the database
    const video = await Video.create({
      title: title,
      description: description,
      thumbnail: thumbnailOnCloudnary?.url,
      videoFile: videoOnCloudnary?.url,
      duration: videoOnCloudnary?.duration,
      isPUblished: true,
      Owner: req.user?._id,
    });

    if (!video) {
      throw new ApiError(400, "video Uploading failed");
    }

    return res
      .status(200)
      .json(new ApiResponse(201, video, "Video Uploaded successfully"));
  } catch (error) {
    return res
      .status(501)
      .json(new ApiError(501, {}, "Problem in uploading video"));
  }
});

const getVideoById = asyncHandler(async (req, res) => {
//   const { videoId } = req.params;
  //TODO: get video by id
  try
  {
      // 1. Get the video id from the request params(frontend)  [http://localhost:8000/api/v1/video/get-video/:videoId]
      const { videoId } = req.params

      // 2. Check if the videoId id is valid
      if ( !isValidObjectId( videoId ) ) { throw new ApiError( 400, "Invalid VideoID" ) }

      // 3. Find the video in the database
      const video = await Video.findById( videoId )

      if ( !video ) { throw new ApiError( 400, "Failed to get Video details." ) }

      return res.status( 200 )
          .json( new ApiResponse( 200, video, "Video found " ) )

  } catch ( error )
  {
      res.status( 501 )
          .json( new ApiError( 501, {}, "Video not found" ) )
  }
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
