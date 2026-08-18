import User from '../models/User.js';
import EmergencyRequest from '../models/EmergencyRequest.js';
import BloodInventory from '../models/BloodInventory.js';
import Hospital from '../models/Hospital.js';

export const generateSystemReport = async (req, res) => {
    try {
        const { startDate, endDate } = req.query
        const hospitalId = req.query.hospitalId || (req.user?.role === 'hospital' ? req.user.id : undefined)
        const dateFilter = {}
        const hospitalFilter = hospitalId ? { hospital: hospitalId } : {}

        if (startDate || endDate) {
            dateFilter.createdAt = {}
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate)
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate)
        }

        const requestFilter = { ...dateFilter, ...hospitalFilter }

        const totalDonors = hospitalId
            ? await EmergencyRequest.aggregate([
                { $match: { hospital: hospitalId, ...dateFilter } },
                { $unwind: { path: '$matchedDonors', preserveNullAndEmptyArrays: true } },
                { $group: { _id: '$matchedDonors' } },
                { $count: 'count' },
              ]).then((result) => (result[0] ? result[0].count : 0))
            : await User.countDocuments({ role: 'donor' });
        const totalRequests = await EmergencyRequest.countDocuments(requestFilter);
        const pendingRequests = await EmergencyRequest.countDocuments({ ...requestFilter, status: 'Pending' });
        const totalHospitals = hospitalId ? 1 : await Hospital.countDocuments();
        const hospitalsList = hospitalId ? [] : await Hospital.find().select('name district address phone email status').sort({ createdAt: -1 }).lean();

        const inventoryItems = await BloodInventory.find(hospitalFilter);
        const totalUnits = inventoryItems.reduce((acc, item) => acc + (item.quantity || 0), 0);

        const groupMap = inventoryItems.reduce((map, item) => {
            const type = item.bloodType || item.bloodType?.toUpperCase?.() || 'UNKNOWN'
            map[type] = (map[type] || 0) + (item.quantity || 0)
            return map
        }, {})

        const bloodGroupStats = Object.keys(groupMap).map((bloodGroup) => ({ bloodGroup, units: groupMap[bloodGroup] }))

        const recentRequests = await EmergencyRequest.find(requestFilter).sort({ createdAt: -1 }).limit(6).populate('hospital', 'name location')

        const reportData = {
            generatedAt: new Date(),
            totalDonors,
            totalRequests,
            pendingRequests,
            totalHospitals,
            hospitalsList,
            totalUnits,
            bloodGroupStats,
            inventoryDetails: inventoryItems,
            recentRequests,
        }

        return res.status(200).json({
            success: true,
            message: "System report generated successfully",
            data: reportData
        });
    } catch (error) {
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Error generating system report",
                error: error.message
            });
        }
    }
};