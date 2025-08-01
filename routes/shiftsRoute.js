import express from "express";
import mongoose from "mongoose";
import Shift from "../models/shiftsModel.js";
import User from "../models/userModel.js";
import Location from "../models/locationModel.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Shifts
 *   description: Retrieve and manage user shifts
 */

/**
 * @swagger
 * /api/shifts:
 *   post:
 *     summary: Create a new shift
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - role
 *               - user
 *               - startTime
 *               - finishTime
 *               - location
 *               - date
 *             properties:
 *               title:
 *                 type: string
 *                 example: Morning Shift
 *               role:
 *                 type: string
 *                 example: Support Worker
 *               typeOfShift:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Weekdays"]
 *               user:
 *                 type: string
 *                 description: ObjectId of the user
 *                 example: 6876ecb642df0376491dd254
 *               startTime:
 *                 type: string
 *                 example: "09:00"
 *               finishTime:
 *                 type: string
 *                 example: "17:00"
 *               numOfShiftsPerDay:
 *                 type: number
 *                 example: 1
 *               location:
 *                 type: string
 *                 description: ObjectId of the location
 *                 example: 6876ec09d260b087559e5fff
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-15"
 *     responses:
 *       201:
 *         description: Shift created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Shift created successfully
 *                 shift:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60f7a3e5b4dcb826d8fe1234
 *                     title:
 *                       type: string
 *                       example: Morning Shift
 *                     role:
 *                       type: string
 *                       example: Support Worker
 *                     typeOfShift:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Weekdays"]
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 6876ecb642df0376491dd254
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: john@example.com
 *                     location:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 6876ec09d260b087559e5fff
 *                         name:
 *                           type: string
 *                           example: Clippers House, Clippers Quay
 *                         postCode:
 *                           type: string
 *                           example: M50 3XP
 *                         distance:
 *                           type: number
 *                           example: 0
 *                         constituency:
 *                           type: string
 *                           example: Salford and Eccles
 *                         adminDistrict:
 *                           type: string
 *                           example: Salford
 *                         cordinates:
 *                           type: object
 *                           properties:
 *                             longitude:
 *                               type: number
 *                               example: -2.286226
 *                             latitude:
 *                               type: number
 *                               example: 53.466921
 *                             useRotaCloud:
 *                               type: boolean
 *                               example: true
 *                     startTime:
 *                       type: string
 *                       example: "09:00"
 *                     finishTime:
 *                       type: string
 *                       example: "17:00"
 *                     numOfShiftsPerDay:
 *                       type: number
 *                       example: 1
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2025-01-15"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - validation errors or missing required fields
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - user can only create shifts for themselves
 *       404:
 *         description: User or location not found
 *       500:
 *         description: Internal server error
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const {
      title,
      role,
      typeOfShift,
      user,
      startTime,
      finishTime,
      numOfShiftsPerDay,
      location,
      date,
    } = req.body;

    const tokenUserId = req.user.id;

    // Validate required fields
    if (!title || !role || !user || !startTime || !finishTime || !location || !date) {
      return res.status(400).json({
        message: "Missing required fields: title, role, user, startTime, finishTime, location, date"
      });
    }

    // Validate ObjectIds
    if (!mongoose.isValidObjectId(user)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!mongoose.isValidObjectId(location)) {
      return res.status(400).json({ message: "Invalid location ID" });
    }

    // Check if authenticated user can create shift for the specified user
    if (user !== tokenUserId) {
      return res.status(403).json({
        message: "Forbidden: You can only create shifts for yourself"
      });
    }

    // Verify user exists
    const userExists = await User.findById(user);
    if (!userExists) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify location exists
    const locationExists = await Location.findById(location);
    if (!locationExists) {
      return res.status(404).json({ message: "Location not found" });
    }

    // Validate date format
    const shiftDate = new Date(date);
    if (isNaN(shiftDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Validate time format (basic HH:MM validation)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(finishTime)) {
      return res.status(400).json({
        message: "Invalid time format. Use HH:MM format (e.g., 09:00, 17:30)"
      });
    }

    // Create new shift
    const newShift = new Shift({
      title,
      role,
      typeOfShift: typeOfShift || [],
      user,
      startTime,
      finishTime,
      numOfShiftsPerDay: numOfShiftsPerDay || 1,
      location,
      date: shiftDate,
    });

    const savedShift = await newShift.save();

    // Populate the saved shift with user and location details
    const populatedShift = await Shift.findById(savedShift._id)
      .populate("user", "name email")
      .populate("location");

    res.status(201).json({
      message: "Shift created successfully",
      shift: populatedShift,
    });
  } catch (err) {
    console.error("Error creating shift:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/shifts/{id}:
 *   put:
 *     summary: Update an existing shift
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ObjectId of the shift to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Morning Shift
 *               role:
 *                 type: string
 *                 example: Senior Support Worker
 *               typeOfShift:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Weekends"]
 *               startTime:
 *                 type: string
 *                 example: "10:00"
 *               finishTime:
 *                 type: string
 *                 example: "18:00"
 *               numOfShiftsPerDay:
 *                 type: number
 *                 example: 2
 *               location:
 *                 type: string
 *                 description: ObjectId of the location
 *                 example: 6876ec09d260b087559e5fff
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2025-01-20"
 *     responses:
 *       200:
 *         description: Shift updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Shift updated successfully
 *                 shift:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60f7a3e5b4dcb826d8fe1234
 *                     title:
 *                       type: string
 *                       example: Updated Morning Shift
 *                     role:
 *                       type: string
 *                       example: Senior Support Worker
 *                     typeOfShift:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Weekends"]
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 6876ecb642df0376491dd254
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: john@example.com
 *                     location:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 6876ec09d260b087559e5fff
 *                         name:
 *                           type: string
 *                           example: Clippers House, Clippers Quay
 *                         postCode:
 *                           type: string
 *                           example: M50 3XP
 *                         distance:
 *                           type: number
 *                           example: 0
 *                         constituency:
 *                           type: string
 *                           example: Salford and Eccles
 *                         adminDistrict:
 *                           type: string
 *                           example: Salford
 *                         cordinates:
 *                           type: object
 *                           properties:
 *                             longitude:
 *                               type: number
 *                               example: -2.286226
 *                             latitude:
 *                               type: number
 *                               example: 53.466921
 *                             useRotaCloud:
 *                               type: boolean
 *                               example: true
 *                     startTime:
 *                       type: string
 *                       example: "10:00"
 *                     finishTime:
 *                       type: string
 *                       example: "18:00"
 *                     numOfShiftsPerDay:
 *                       type: number
 *                       example: 2
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2025-01-20"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - invalid ID or validation errors
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - user can only update their own shifts
 *       404:
 *         description: Shift, user, or location not found
 *       500:
 *         description: Internal server error
 */
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      role,
      typeOfShift,
      startTime,
      finishTime,
      numOfShiftsPerDay,
      location,
      date,
    } = req.body;

    const tokenUserId = req.user.id;

    // Validate shift ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid shift ID" });
    }

    // Find the existing shift
    const existingShift = await Shift.findById(id);
    if (!existingShift) {
      return res.status(404).json({ message: "Shift not found" });
    }

    // Check if authenticated user owns this shift
    if (existingShift.user.toString() !== tokenUserId) {
      return res.status(403).json({
        message: "Forbidden: You can only update your own shifts"
      });
    }

    // Prepare update object with only provided fields
    const updateFields = {};

    if (title !== undefined) updateFields.title = title;
    if (role !== undefined) updateFields.role = role;
    if (typeOfShift !== undefined) updateFields.typeOfShift = typeOfShift;
    if (startTime !== undefined) {
      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(startTime)) {
        return res.status(400).json({
          message: "Invalid startTime format. Use HH:MM format (e.g., 09:00, 17:30)"
        });
      }
      updateFields.startTime = startTime;
    }
    if (finishTime !== undefined) {
      // Validate time format
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(finishTime)) {
        return res.status(400).json({
          message: "Invalid finishTime format. Use HH:MM format (e.g., 09:00, 17:30)"
        });
      }
      updateFields.finishTime = finishTime;
    }
    if (numOfShiftsPerDay !== undefined) updateFields.numOfShiftsPerDay = numOfShiftsPerDay;
    if (location !== undefined) {
      // Validate location ID
      if (!mongoose.isValidObjectId(location)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }
      // Verify location exists
      const locationExists = await Location.findById(location);
      if (!locationExists) {
        return res.status(404).json({ message: "Location not found" });
      }
      updateFields.location = location;
    }
    if (date !== undefined) {
      // Validate date format
      const shiftDate = new Date(date);
      if (isNaN(shiftDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      updateFields.date = shiftDate;
    }

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    // Update the shift
    const updatedShift = await Shift.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    )
      .populate("user", "name email")
      .populate("location");

    res.status(200).json({
      message: "Shift updated successfully",
      shift: updatedShift,
    });
  } catch (err) {
    console.error("Error updating shift:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/shifts:
 *   get:
 *     summary: Retrieve all shifts for a given user
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: ObjectId of the user whose shifts to fetch
 *     responses:
 *       200:
 *         description: A list of shifts, populated with user and location
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                     example: 60f7a3e5b4dcb826d8fe1234
 *                   title:
 *                     type: string
 *                     example: Short Day
 *                   role:
 *                     type: string
 *                     example: Support Worker
 *                   typeOfShift:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: [ "Weekdays" ]
 *                   user:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 6876ecb642df0376491dd254
 *                       name:
 *                         type: string
 *                         example: John Doe
 *                       email:
 *                         type: string
 *                         format: email
 *                         example: john@example.com
 *                   location:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 6876ec09d260b087559e5fff
 *                       name:
 *                         type: string
 *                         example: Clippers House, Clippers Quay
 *                       postCode:
 *                         type: string
 *                         example: M50 3XP
 *                       distance:
 *                         type: number
 *                         example: 0
 *                       constituency:
 *                         type: string
 *                         example: Salford and Eccles
 *                       adminDistrict:
 *                         type: string
 *                         example: Salford
 *                       cordinates:
 *                         type: object
 *                         properties:
 *                           longitude:
 *                             type: number
 *                             example: -2.286226
 *                           latitude:
 *                             type: number
 *                             example: 53.466921
 *                           useRotaCloud:
 *                             type: boolean
 *                             example: true
 *                   startTime:
 *                     type: string
 *                     example: "13:00"
 *                   finishTime:
 *                     type: string
 *                     example: "18:00"
 *                   numOfShiftsPerDay:
 *                     type: number
 *                     example: 1
 *                   date:
 *                     type: string
 *                     format: date
 *                     example: "2025-06-17"
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Bad request – userId missing or invalid
 *       403:
 *         description: Forbidden – userId does not match authenticated user
 *       500:
 *         description: Internal server error
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    const tokenUserId = req.user.id;

     if (!userId) {
      return res
        .status(400)
        .json({ message: "userId query parameter is required" });
    }

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    if (userId !== tokenUserId) {
      return res
        .status(403)
        .json({ message: "Forbidden: cannot fetch other users' shifts" });
    }

    const shifts = await Shift.find({ user: userId })
      .populate("user", "name email")
      .populate("location")
      .sort({ date: 1 });

    res.json(shifts);
  } catch (err) {
    console.error("Error fetching shifts:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * @swagger
 * /api/shifts/batch:
 *   post:
 *     summary: Bulk create or update shifts
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shifts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Shift ID for updates (optional for new shifts)
 *                     title:
 *                       type: string
 *                       description: The title of the shift
 *                     role:
 *                       type: string
 *                       description: The role for the shift
 *                     typeOfShift:
 *                       type: string
 *                       description: The type of shift
 *                     startTime:
 *                       type: string
 *                       format: time
 *                       description: Start time in HH:MM format
 *                     finishTime:
 *                       type: string
 *                       format: time
 *                       description: Finish time in HH:MM format
 *                     numOfShiftsPerDay:
 *                       type: number
 *                       description: Number of shifts per day
 *                     location:
 *                       type: string
 *                       description: Location ID (ObjectId)
 *                     date:
 *                       type: string
 *                       format: date
 *                       description: Date of the shift
 *                   required: []
 *             required: [shifts]
 *     responses:
 *       200:
 *         description: Bulk operation completed with partial or full success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Bulk operation completed
 *                 totalProcessed:
 *                   type: number
 *                   example: 5
 *                 successful:
 *                   type: number
 *                   example: 4
 *                 failed:
 *                   type: number
 *                   example: 1
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       index:
 *                         type: number
 *                         description: Index in the original array
 *                       success:
 *                         type: boolean
 *                         description: Whether the operation succeeded
 *                       shift:
 *                         type: object
 *                         description: The created/updated shift (if successful)
 *                       error:
 *                         type: string
 *                         description: Error message (if failed)
 *                       operation:
 *                         type: string
 *                         enum: [created, updated]
 *                         description: Type of operation performed
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 * /api/shifts/{id}:
 *   get:
 *     summary: Get a specific shift by ID
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ObjectId of the shift to retrieve
 *     responses:
 *       200:
 *         description: Shift retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: 60f7a3e5b4dcb826d8fe1234
 *                 title:
 *                   type: string
 *                   example: Morning Shift
 *                 role:
 *                   type: string
 *                   example: Support Worker
 *                 typeOfShift:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Weekdays"]
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6876ecb642df0376491dd254
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: john@example.com
 *                 location:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 6876ec09d260b087559e5fff
 *                     name:
 *                       type: string
 *                       example: Clippers House, Clippers Quay
 *                     postCode:
 *                       type: string
 *                       example: M50 3XP
 *                     distance:
 *                       type: number
 *                       example: 0
 *                     constituency:
 *                       type: string
 *                       example: Salford and Eccles
 *                     adminDistrict:
 *                       type: string
 *                       example: Salford
 *                     cordinates:
 *                       type: object
 *                       properties:
 *                         longitude:
 *                           type: number
 *                           example: -2.286226
 *                         latitude:
 *                           type: number
 *                           example: 53.466921
 *                         useRotaCloud:
 *                           type: boolean
 *                           example: true
 *                 startTime:
 *                   type: string
 *                   example: "09:00"
 *                 finishTime:
 *                   type: string
 *                   example: "17:00"
 *                 numOfShiftsPerDay:
 *                   type: number
 *                   example: 1
 *                 date:
 *                   type: string
 *                   format: date
 *                   example: "2025-01-15"
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - invalid shift ID
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - user can only view their own shifts
 *       404:
 *         description: Shift not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a shift
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ObjectId of the shift to delete
 *     responses:
 *       200:
 *         description: Shift deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Shift deleted successfully
 *                 deletedShift:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 60f7a3e5b4dcb826d8fe1234
 *                     title:
 *                       type: string
 *                       example: Morning Shift
 *                     role:
 *                       type: string
 *                       example: Support Worker
 *                     typeOfShift:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Weekdays"]
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 6876ecb642df0376491dd254
 *                         name:
 *                           type: string
 *                           example: John Doe
 *                         email:
 *                           type: string
 *                           format: email
 *                           example: john@example.com
 *                     location:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 6876ec09d260b087559e5fff
 *                         name:
 *                           type: string
 *                           example: Clippers House, Clippers Quay
 *                         postCode:
 *                           type: string
 *                           example: M50 3XP
 *                         distance:
 *                           type: number
 *                           example: 0
 *                         constituency:
 *                           type: string
 *                           example: Salford and Eccles
 *                         adminDistrict:
 *                           type: string
 *                           example: Salford
 *                         cordinates:
 *                           type: object
 *                           properties:
 *                             longitude:
 *                               type: number
 *                               example: -2.286226
 *                             latitude:
 *                               type: number
 *                               example: 53.466921
 *                             useRotaCloud:
 *                               type: boolean
 *                               example: true
 *                     startTime:
 *                       type: string
 *                       example: "09:00"
 *                     finishTime:
 *                       type: string
 *                       example: "17:00"
 *                     numOfShiftsPerDay:
 *                       type: number
 *                       example: 1
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: "2025-01-15"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - invalid shift ID
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - user can only delete their own shifts
 *       404:
 *         description: Shift not found
 *       500:
 *         description: Internal server error
 */
// GET /api/shifts/:id - Get a specific shift by ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const userId = req.user.id;

    // Validate shift ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid shift ID' });
    }

    // Find the shift and populate user and location details
    const shift = await Shift.findById(id)
      .populate('user', 'name email')
      .populate('location');

    if (!shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Check if the shift has a valid user reference
    if (!shift.user || !shift.user._id) {
      return res.status(500).json({ error: 'Shift data is corrupted - missing user reference' });
    }

    // Check if the authenticated user owns this shift
    if (shift.user._id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'You can only view your own shifts' });
    }

    res.status(200).json(shift);
  } catch (error) {
    console.error('Error retrieving shift:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/shifts/batch - Bulk create or update shifts
router.post('/batch', requireAuth, async (req, res) => {
  try {
    const { shifts } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!Array.isArray(shifts) || shifts.length === 0) {
      return res.status(400).json({ error: 'Shifts array is required and cannot be empty' });
    }

    if (shifts.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 shifts allowed per batch operation' });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    // Process each shift
    for (let i = 0; i < shifts.length; i++) {
      const shiftData = shifts[i];
      const result = { index: i, success: false };

      try {
        const { id, title, role, typeOfShift, startTime, finishTime, numOfShiftsPerDay, location, date } = shiftData;

        // Determine if this is an update or create operation
        const isUpdate = id && mongoose.Types.ObjectId.isValid(id);
        
        if (isUpdate) {
          // UPDATE OPERATION
          const existingShift = await Shift.findById(id);
          if (!existingShift) {
            result.error = 'Shift not found';
            failed++;
            results.push(result);
            continue;
          }

          // Check ownership
          if (existingShift.user.toString() !== userId.toString()) {
            result.error = 'You can only update your own shifts';
            failed++;
            results.push(result);
            continue;
          }

          // Prepare update fields
          const updateFields = {};
          if (title !== undefined) updateFields.title = title;
          if (role !== undefined) updateFields.role = role;
          if (typeOfShift !== undefined) updateFields.typeOfShift = typeOfShift;
          if (numOfShiftsPerDay !== undefined) updateFields.numOfShiftsPerDay = numOfShiftsPerDay;
          
          // Validate and set time fields
          if (startTime !== undefined) {
            if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
              result.error = 'Start time must be in HH:MM format';
              failed++;
              results.push(result);
              continue;
            }
            updateFields.startTime = startTime;
          }
          
          if (finishTime !== undefined) {
            if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(finishTime)) {
              result.error = 'Finish time must be in HH:MM format';
              failed++;
              results.push(result);
              continue;
            }
            updateFields.finishTime = finishTime;
          }
          
          // Validate and set location
          if (location !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(location)) {
              result.error = 'Invalid location ID';
              failed++;
              results.push(result);
              continue;
            }
            
            const locationExists = await Location.findById(location);
            if (!locationExists) {
              result.error = 'Location not found';
              failed++;
              results.push(result);
              continue;
            }
            updateFields.location = location;
          }
          
          // Validate and set date
          if (date !== undefined) {
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
              result.error = 'Invalid date format';
              failed++;
              results.push(result);
              continue;
            }
            updateFields.date = parsedDate;
          }

          // Update the shift
          const updatedShift = await Shift.findByIdAndUpdate(
            id,
            updateFields,
            { new: true, runValidators: true }
          ).populate('user', 'name email').populate('location');

          result.success = true;
          result.shift = updatedShift;
          result.operation = 'updated';
          successful++;
        } else {
          // CREATE OPERATION
          // Validate required fields for creation
          if (!title || !role || !startTime || !finishTime || !location || !date) {
            result.error = 'Missing required fields: title, role, startTime, finishTime, location, date';
            failed++;
            results.push(result);
            continue;
          }

          // Validate time format
          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(startTime)) {
            result.error = 'Start time must be in HH:MM format';
            failed++;
            results.push(result);
            continue;
          }
          
          if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(finishTime)) {
            result.error = 'Finish time must be in HH:MM format';
            failed++;
            results.push(result);
            continue;
          }

          // Validate location
          if (!mongoose.Types.ObjectId.isValid(location)) {
            result.error = 'Invalid location ID';
            failed++;
            results.push(result);
            continue;
          }

          const locationExists = await Location.findById(location);
          if (!locationExists) {
            result.error = 'Location not found';
            failed++;
            results.push(result);
            continue;
          }

          // Validate date
          const parsedDate = new Date(date);
          if (isNaN(parsedDate.getTime())) {
            result.error = 'Invalid date format';
            failed++;
            results.push(result);
            continue;
          }

          // Create new shift
          const newShift = new Shift({
            title,
            role,
            typeOfShift: typeOfShift || [],
            user: userId,
            startTime,
            finishTime,
            numOfShiftsPerDay: numOfShiftsPerDay || 1,
            location,
            date: parsedDate
          });

          const savedShift = await newShift.save();
          const populatedShift = await Shift.findById(savedShift._id)
            .populate('user', 'name email')
            .populate('location');

          result.success = true;
          result.shift = populatedShift;
          result.operation = 'created';
          successful++;
        }

        results.push(result);
      } catch (error) {
        result.error = error.message || 'Unknown error occurred';
        failed++;
        results.push(result);
      }
    }

    res.status(200).json({
      message: 'Bulk operation completed',
      totalProcessed: shifts.length,
      successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Error in bulk shift operation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const tokenUserId = req.user.id;

    // Validate shift ID
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid shift ID" });
    }

    // Find the shift and check if it belongs to the authenticated user
    const existingShift = await Shift.findById(id)
      .populate("user", "name email")
      .populate("location");
    
    if (!existingShift) {
      return res.status(404).json({ message: "Shift not found" });
    }

    // Check if authenticated user owns this shift
    if (existingShift.user._id.toString() !== tokenUserId) {
      return res.status(403).json({
        message: "Forbidden: You can only delete your own shifts"
      });
    }

    // Delete the shift
    await Shift.findByIdAndDelete(id);

    res.status(200).json({
      message: "Shift deleted successfully",
      deletedShift: existingShift,
    });
  } catch (err) {
    console.error("Error deleting shift:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
