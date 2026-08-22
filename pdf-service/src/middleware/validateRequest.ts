import { Request, Response, NextFunction } from 'express';
import { AnySchema } from 'yup';
import { PayloadType } from '../util/enum/common.enum';
import { HttpStatusCode } from '../util/enum/httpStatusCode.enum';

export function validateRequest({
  schema,
  type = PayloadType.BODY,
}: {
  schema: AnySchema;
  type?: PayloadType;
}) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const payload = (req as any)[type];
      (req as any)[type] = await schema.validate(payload, { abortEarly: false });
      next();
    } catch (err: any) {
      return next({
        statusCode: HttpStatusCode.BAD_REQUEST,
        message: err.errors ? err.errors.join(', ') : 'Invalid request payload',
      });
    }
  };
}
