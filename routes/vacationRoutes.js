const express = require('express');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const {
    listVacations,
    previewImport,
    importVacations,
    downloadTemplate,
    exportVacations,
    getImportLogs,
} = require('../controllers/vacationController');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No autorizado.' });
    }

    jwt.verify(token, 'secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido.' });
        }
        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Solo los administradores pueden realizar esta acción.' });
    }
    next();
}

router.get('/', authenticateToken, listVacations);
router.get('/export', authenticateToken, exportVacations);
router.get('/template', authenticateToken, requireAdmin, downloadTemplate);
router.get('/import-logs', authenticateToken, requireAdmin, getImportLogs);
router.post('/preview-import', authenticateToken, requireAdmin, upload.single('file'), previewImport);
router.post('/import', authenticateToken, requireAdmin, upload.single('file'), importVacations);

module.exports = router;
