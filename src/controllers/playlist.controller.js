import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if (!name || !description) {
        throw new ApiError(400, "All Fields are required");
      }
    
      const existingPlaylist = await Playlist.findOne({
        $and: [{ name: name }, { owner: req.user._id }],
      });
    
      if (existingPlaylist) {
        throw new ApiError(400, "Playlist with this name already exists");
      }
    
      const playlist = await Playlist.create({
        name,
        description,
        owner: req.user._id,
      });
    
      if (!playlist) {
        throw new ApiError(500, "Error while creating playlist");
      }
    
      return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist Created"));
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
      }
    
      const userPlaylists = await Playlist.aggregate([
        {
          $match: {
            owner: new mongoose.Types.ObjectId(userId),
          },
        },
        {
          $lookup: {
            from: "videos",
            localField: "videos",
            foreignField: "_id",
            as: "videos",
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
                        fullName: 1,
                        username: 1,
                        avatar: 1,
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
                  title: 1,
                  thumbnail: 1,
                  description: 1,
                  owner: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "createdBy",
            pipeline: [
              {
                $project: {
                  avatar: 1,
                  fullName: 1,
                  username: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            createdBy: {
              $first: "$createdBy",
            },
          },
        },
        {
          $project: {
            videos: 1,
            createdBy: 1,
            name: 1,
            description: 1,
          },
        },
      ]).toArray();
      if (userPlaylists.length === 0) {
        throw new ApiError(504, "No Playlists found");
      }
    
      return res
        .status(200)
        .json(new ApiResponse(200, userPlaylists, "Playlists Fetched"));
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist ID");
      }
    
      const playlist = await Playlist.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(playlistId),
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "createdBy",
            pipeline: [
              {
                $project: {
                  fullName: 1,
                  username: 1,
                  avatar: 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            createdBy: {
              $first: "$createdBy",
            },
          },
        },
        {
          $lookup: {
            from: "videos",
            localField: "videos",
            foreignField: "_id",
            as: "videos",
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
                        fullName: 1,
                        username: 1,
                        avatar: 1,
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
                  thumbnail: 1,
                  title: 1,
                  duration: 1,
                  views: 1,
                  owner: 1,
                  createdAt: 1,
                  updatedAt: 1,
                },
              },
            ],
          },
        },
        {
          $project: {
            videos: 1,
            description: 1,
            name: 1,
            createdBy: 1,
          },
        },
      ]);
    
      if (!playlist) {
        throw new ApiError(500, "Error fetching playlist");
      }
    
      return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist Fetched"));
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
