const exp = require('express');
const router = exp.Router();
const { isAuthenticated } = require('../MiddleWares/auth.js')
const {
    getAllDivisions,
    createDivision,
    getDivisionById,
    updateDivision,
    deleteDivision
} = require('../Controllers/division.controller.js');

router.use(isAuthenticated);

router.route('/division').get(getAllDivisions);
router.route('/create-division').post(createDivision);
router.route('/division/:id').get(getDivisionById)
    .put(updateDivision)
    .delete(deleteDivision);

module.exports = router;