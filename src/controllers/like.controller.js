import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "invalid video id");
  }
  const userId = req.user._id;
  const likedVideo = await Like.findOne({
    $and: [{ video: videoId }, { likedBy: userId }],
  });
  if (!likedVideo) {
    const like = await Like.create({
      video: videoId,
      likedBy: userId,
    });
    if (!like) {
      throw new ApiError(400, "Failed to like video");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, like, "Video liked successfully"));
  }
  const unlikeVideo = await Like.findByIdAndDelete(likedVideo._id);
  if (!unlikeVideo) {
    throw new ApiError(400, "Failed to unlike video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, unlikeVideo, "Video unliked successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "invalid comment id");
  }
  const userId = req.user._id;
  const likedComment = await Like.findOne({
    $and: [{ comment: commentId }, { likedBy: userId }],
  });
  if (!likedComment) {
    const like = await Like.create({
      comment: commentId,
      likedBy: userId,
    });
    if (!like) {
      throw new ApiError(400, "Failed to like comment");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, like, "Comment liked successfully"));
  }
  const unlikeComment = await Like.findByIdAndDelete(likedComment._id);
  if (!unlikeComment) {
    throw new ApiError(400, "Failed to unlike comment");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, unlikeComment, "Comment unliked successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    avatar: 1,
                    username: 1,
                    fullName: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
          {
            $project: {
              videoFile: 1,
              thumbnail: 1,
              title: 1,
              duration: 1,
              views: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
    {
      $project: {
        video: 1,
        likedBy: 1,
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
