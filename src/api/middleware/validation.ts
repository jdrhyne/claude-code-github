import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const webhookSchema = Joi.object({
  url: Joi.string().uri().required(),
  events: Joi.array().items(Joi.string()).optional(),
  project: Joi.string().optional()
});

export function validateWebhook(req: Request, res: Response, next: NextFunction) {
  const { error } = webhookSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }
  
  next();
}