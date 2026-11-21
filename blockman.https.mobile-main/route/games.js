const express = require('express');
const router = express.Router();

const gamesJson = require('../config/games');
const announcement = require('../config/announcement');
const stopAnnouncementJson = require('../config/stop-announcement');

router.get('/api/v1/games/announcement/info', (req, res) => {
    res.status(200).json({ code: 1, message: 'SUCCESS', data: announcement });
});

router.get('/api/v1/games/stop/announcement/info', (req, res) => {
    res.status(200).json({ code: 1, message: 'SUCCESS', data: stopAnnouncementJson });
});

router.get('/api/v1/games', async (req, res) => {
    const pageNo = parseInt(req.query.pageNo) || 0;
    const pageSize = parseInt(req.query.pageSize) || 10;
    try {
        if (pageNo !== 0) {
            return res.status(200).json({
                code: 1,
                message: 'SUCCESS',
                data: {
                    pageNo,
                    pageSize,
                    totalPage: 0,
                    totalSize: 0,
                    data: []
                }
            });
        }

        res.status(200).json({
            code: 1,
            message: 'SUCCESS',
            data: {
                pageNo,
                pageSize: gamesJson.length,
                totalPage: 1,
                totalSize: gamesJson.length,
                data: gamesJson,
                other: null
            }
        });
    } catch (error) {
        console.error('Error searching for recommended games:', error);
        res.status(500).json({ message: 'Error searching for recommended games.' });
    }
});

module.exports = router;
