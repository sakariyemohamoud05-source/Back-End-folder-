import BloodInventory from "../models/BloodInventory.js";
import Hospital from "../models/Hospital.js";
import User from "../models/User.js";

export const addBlood = async (req, res) => {
  try {
    const body = { ...req.body }
    if (body.hospital && typeof body.hospital === 'object') {
      body.hospital = body.hospital._id
    }
    if (req.user?.role === 'hospital' && !body.hospital) {
      body.hospital = req.user.id || req.user._id
    }

    const blood = await BloodInventory.create(body);

    res.status(201).json({
      message: "Blood added successfully",
      blood,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getInventory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id
    const filter = req.user?.role === 'hospital' ? { hospital: userId } : {}
    const inventory = await BloodInventory.find(filter).lean();

    const hospitalIds = inventory.map(i => i.hospital).filter(Boolean);
    const hospitals = await Hospital.find({ _id: { $in: hospitalIds } }).lean();
    const users = await User.find({ _id: { $in: hospitalIds } }).lean();

    const hospitalMap = {};
    hospitals.forEach(h => { hospitalMap[h._id.toString()] = h; });
    users.forEach(u => {
      hospitalMap[u._id.toString()] = {
        _id: u._id,
        name: u.name || u.username || u.email,
        email: u.email
      };
    });

    const populatedInventory = inventory.map(item => {
      const hId = item.hospital ? item.hospital.toString() : null;
      return {
        ...item,
        hospital: hospitalMap[hId] || (item.hospital ? { _id: item.hospital, name: 'Hospital' } : null)
      };
    });

    res.status(200).json(populatedInventory);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateInventory = async (req, res) => {
  try {
    const inventoryItem = await BloodInventory.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const body = { ...req.body };
    if (body.hospital && typeof body.hospital === 'object') {
      body.hospital = body.hospital._id;
    }

    const blood = await BloodInventory.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true }
    );

    res.status(200).json({
      message: "Inventory updated successfully",
      blood,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteInventory = async (req, res) => {
  try {
    const inventoryItem = await BloodInventory.findById(req.params.id);
    if (!inventoryItem) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    await BloodInventory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Blood inventory deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};