import express from "express";
import { protect } from '../middleware/authMiddleware.js'
import { authorizeRoles } from '../middleware/roleMiddleware.js'
import {
  addBlood,
  getInventory,
  updateInventory,
  deleteInventory
} from "../controllers/InventoryController.js";


const router = express.Router();
router.post("/", protect, authorizeRoles('admin', 'hospital'), addBlood);
router.get("/", protect, authorizeRoles('admin', 'hospital'), getInventory);
router.put("/:id", protect, authorizeRoles('admin', 'hospital'), updateInventory);
router.delete("/:id", protect, authorizeRoles('admin', 'hospital'), deleteInventory);


export default router;