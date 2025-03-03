import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = 1,
    userId = "",
  } = req.query;

  // Convert sortType to number since it comes as string from query params
  const sortValue = parseInt(sortType) || 1;

  let pipeline = [
    {
      $match: {
        $and: [
          {
            $or: [
              { title: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
            ],
          },
          {
            $or: [
              { isPublished: true },
              { owner: req.user?._id } // Show unpublished videos only to their owner
            ]
          },
          ...(userId ? [{ owner: new mongoose.Types.ObjectId(userId) }] : []),
        ],
      },
    },
    // 3. lookup the owner field of video and get the user details
    {
      // from user it match the _id of user with owner field of video and saved as owner
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          // project the fields of user in owner
          {
            $project: {
              _id: 1,
              fullName: 1,
              avatar: "$avatar.url",
              username: 1,
            },
          },
        ],
      },
    },
    {
      // 4. addFields just add the owner field to the video document
      $addFields: {
        owner: {
          $first: "$owner", // $first: is used to get the first element of owner array
        },
      },
    },
    // Add this new stage to project isPublished
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        owner: 1,
        createdAt: 1,
        isPublished: 1
      }
    },
    {
      $sort: { [sortBy]: sortValue }, // Modified this line to use the parsed number
    },
  ];

  try {
    // 5. set options for pagination
    const options = {
      // options for pagination
      page: parseInt(page),
      limit: parseInt(limit),
      customLabels: {
        // custom labels for pagination
        totalDocs: "totalVideos",
        docs: "videos",
      },
    };

    // 6. get the videos based on pipeline and options
    const result = await Video.aggregatePaginate(
      Video.aggregate(pipeline),
      options
    ); // Video.aggregate( pipeline ) find the videos based on pipeline(query, sortBy, sortType, userId). // aggregatePaginate is used for pagination (page, limit)

    if (result?.videos?.length === 0) {
      return res.status(404).json(new ApiResponse(404, {}, "No Videos Found"));
    }

    // result contain all pipeline videos and pagination details
    return res
      .status(200)
      .json(new ApiResponse(200, result, "Videos fetched successfully"));
  } catch (error) {
    console.error(error.message);
    return res
      .status(500)
      .json(
        new ApiError(500, {}, "Internal server error in video aggregation")
      );
  }
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
    const thumbnailOnCloudnary = await uploadOnCloudinary(
      thumbnailLocalPath,
      "img"
    );

    if (!videoOnCloudnary) {
      throw new ApiError(400, "video Uploading failed");
    }
    if (!thumbnailOnCloudnary) {
      throw new ApiError(400, "video Uploading failed");
    }
    // console.log(req.user);

    // 4. create a video document in the database
    const video = await Video.create({
      title: title,
      description: description,
      thumbnail: thumbnailOnCloudnary?.url,
      videoFile: videoOnCloudnary?.url,
      duration: videoOnCloudnary?.duration,
      isPublished: true,
      owner: req.user?._id,
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
  try {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid VideoID");
    }

    const video = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(videoId)
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
              }
            },
            {
              $addFields: {
                subscribersCount: { $size: "$subscribers" }
              }
            },
            {
              $project: {
                username: 1,
                avatar: 1,
                subscribersCount: 1
              }
            }
          ]
        }
      },
      {
        $addFields: {
          owner: { $first: "$owner" }
        }
      },
      {
        $set: {
          views: { $add: ["$views", 1] }
        }
      }
    ]);

    if (!video?.length) {
      throw new ApiError(404, "Video not found");
    }

    // Save the updated view count
    await Video.findByIdAndUpdate(
      videoId,
      {
        $set: { views: video[0].views }
      }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, video[0], "Video fetched successfully"));

  } catch (error) {
    throw new ApiError(500, error?.message || "Error while fetching video");
  }
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  const { title, description } = req.body;
  const thumbnailLocalPath = req.file?.path;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }
  if ([title, description].some((field) => field.trim() === "")) {
    throw new ApiError(400, "title or description cannot be empty");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Incorrect VideoId");
  }
  if (!video.owner.equals(req.user._id)) {
    throw new ApiError(400, "Unauthorized access");
  }
  if (thumbnailLocalPath) {
    const thumbnailOnCloudnary = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnailOnCloudnary) {
      throw new ApiError(400, "Failed to upload thumbnail");
    }
    const isThumbnailDeletedFromCloudinary = await deleteFromCloudinary(
      video.thumbnail,
      "image"
    );
    if (!isThumbnailDeletedFromCloudinary) {
      throw new ApiError(400, "Failed to delete thumbnail from cloudinary");
    }
    video.thumbnail = thumbnailOnCloudnary.url;
  }
  video.title = title;
  video.description = description;
  await video.save();
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  // const { videoId } = req.params;
  //TODO: delete video
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Incorrect VideoId");
  }
  if (!video.owner.equals(req.user._id)) {
    throw new ApiError(400, "Unauthorized access");
  }
  const isVideoDeletedFromCloudinary = await deleteFromCloudinary(
    video.videoFile,
    "video"
  );
  const isThumbnailDeletedFromCloudinary = await deleteFromCloudinary(
    video.thumbnail,
    "image"
  );
  if (!isVideoDeletedFromCloudinary || !isThumbnailDeletedFromCloudinary) {
    throw new ApiError(
      400,
      "Failed to delete videoFile or thumbnail from cloudinary"
    );
  }
  await video.deleteOne();
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id");
  }
  const toggleisPublished = await Video.findOne({
    _id: videoId,
    owner: req.user._id,
  });
  // console.log(req.user._id);

  if (!toggleisPublished) {
    throw new ApiError(400, "Incorrect VideoId or owner");
  }
  toggleisPublished.isPublished = !toggleisPublished.isPublished;
  await toggleisPublished.save();
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        toggleisPublished.isPublished,
        "Video Published Status toggled successfully"
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
