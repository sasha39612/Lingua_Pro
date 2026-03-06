import { body, param } from 'express-validator';

export const validateStatsRequest = [
    body('language')
        .isString()
        .withMessage('Language must be a string')
        .notEmpty()
        .withMessage('Language is required'),
    body('period')
        .isIn(['week', 'month', 'all'])
        .withMessage('Period must be one of the following: week, month, all')
        .notEmpty()
        .withMessage('Period is required')
];