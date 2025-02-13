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
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Tweet ID");
  }
  const user = req.user._id;
  const likeTweet = await Like.findOne({
    $and: [{ tweet: tweetId }, { likedBy: user }],
  });
  if (!likeTweet) {
    const like = await Like.create({
      tweet: tweetId,
      likedBy: user,
    });
    if (!like) {
      throw new ApiError(500, "Error while Liking the Tweet");
    }
    return res.status(200).json(new ApiResponse(200, like, "Tweet Liked"));
  }
  const unlikeTweet = await Like.findByIdAndDelete(likeTweet._id);
  if (!unlikeTweet) {
    throw new ApiError(500, "Error while unliking the Tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, unlikeTweet, "Tweet Unliked"));
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

const getVideoLikeStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const likeInfo = await Like.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $group: {
        _id: null,
        likeCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        isLiked: {
          $in: [
            req.user?._id,
            {
              $map: {
                input: "$likes",
                as: "like",
                in: "$$like.likedBy",
              },
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        likeCount: 1,
        isLiked: 1,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        likeCount: likeInfo[0]?.likeCount || 0,
        isLiked: likeInfo[0]?.isLiked || false,
      },
      "Video like info fetched successfully"
    )
  );
});

const getCommentLikeStatus = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const likeInfo = await Like.aggregate([
    {
      $match: {
        comment: new mongoose.Types.ObjectId(commentId),
      },
    },
    {
      $group: {
        _id: null,
        likeCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        isLiked: {
          $in: [
            req.user?._id,
            {
              $map: {
                input: "$likes",
                as: "like",
                in: "$$like.likedBy",
              },
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        likeCount: 1,
        isLiked: 1,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        likeCount: likeInfo[0]?.likeCount || 0,
        isLiked: likeInfo[0]?.isLiked || false,
      },
      "Comment like info fetched successfully"
    )
  );
});

const getTweetLikeStatus = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const likeInfo = await Like.aggregate([
    {
      $match: {
        tweet: new mongoose.Types.ObjectId(tweetId),
      },
    },
    {
      $group: {
        _id: null,
        likeCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        isLiked: {
          $in: [
            req.user?._id,
            {
              $map: {
                input: "$likes",
                as: "like",
                in: "$$like.likedBy",
              },
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 0,
        likeCount: 1,
        isLiked: 1,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        likeCount: likeInfo[0]?.likeCount || 0,
        isLiked: likeInfo[0]?.isLiked || false,
      },
      "Tweet like info fetched successfully"
    )
  );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
  getVideoLikeStatus,
  getCommentLikeStatus,
  getTweetLikeStatus,
};
