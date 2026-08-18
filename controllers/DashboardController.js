import User from '../models/User.js';
import EmergencyRequest from '../models/EmergencyRequest.js';
import BloodInventory from '../models/BloodInventory.js';
import Hospital from '../models/Hospital.js';

export const getDashboardStats = async (req, res) => {
    try {
        const hospitalId = req.user?.role === 'hospital'
            ? req.user.id
            : req.query.hospitalId
        const filter = hospitalId ? { hospital: hospitalId } : {}

        const totalRequests = await EmergencyRequest.countDocuments(filter)
        const inventoryItems = await BloodInventory.find(filter)
        const totalBloodUnitsAvailable = inventoryItems.reduce((acc, item) => acc + (item.quantity || 0), 0)
        const lowStockCount = await BloodInventory.countDocuments({ ...filter, quantity: { $lte: 50 } })
        const expirySoonCount = await BloodInventory.countDocuments({
            ...filter,
            expiryDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
        })

        const bloodTypeCounts = inventoryItems.reduce((counts, item) => {
            const type = item.bloodType || 'Unknown'
            counts[type] = (counts[type] || 0) + (item.quantity || 0)
            return counts
        }, {})

        const roleCounts = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
        ])

        const userRoles = roleCounts.reduce((acc, role) => {
            acc[role._id] = role.count
            return acc
        }, {})

        const totalDonors = hospitalId
            ? await EmergencyRequest.aggregate([
                { $match: { hospital: hospitalId } },
                { $unwind: '$matchedDonors' },
                { $group: { _id: '$matchedDonors' } },
                { $count: 'count' },
              ]).then((result) => (result[0] ? result[0].count : 0))
            : await User.countDocuments({ role: 'donor' })

        const totalHospitals = hospitalId ? 1 : await Hospital.countDocuments()
        const hospitalsList = hospitalId ? [] : await Hospital.find().select('name district address phone email status').sort({ createdAt: -1 }).lean()

        const recentActivities = hospitalId
            ? [`Hospital has ${totalRequests} emergency request${totalRequests === 1 ? '' : 's'}`]
            : [
                `Tracked ${await User.countDocuments()} system users`,
                `Logged ${totalRequests} emergency requests`,
                `Registered ${totalHospitals} partner hospitals`,
                `Detected ${lowStockCount} low-stock item${lowStockCount === 1 ? '' : 's'}`,
              ]

        const hospitalEmergencies = hospitalId
            ? await EmergencyRequest.find({ hospital: hospitalId }).sort({ createdAt: -1 }).limit(6).populate('hospital')
            : []

        const hospitalInventory = hospitalId
            ? inventoryItems
            : []

        return res.status(200).json({
            success: true,
            message: 'Dashboard data fetched successfully',
            data: {
                totalDonors,
                totalRequests,
                totalHospitals,
                hospitalsList,
                totalUsers: hospitalId ? undefined : await User.countDocuments(),
                totalBloodUnitsAvailable,
                lowStockCount,
                expirySoonCount,
                bloodTypeCounts,
                userRoles,
                recentActivities,
                hospitalEmergencies,
                hospitalInventory,
            }
        })
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        })
    }
};