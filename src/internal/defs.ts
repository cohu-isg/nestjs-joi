import * as Joi from 'joi';
import { DEFAULT } from '@cohu-isg/joi-class-decorators';

export const JoiValidationGroups = {
  DEFAULT,
  CREATE: Symbol('CREATE'),
  UPDATE: Symbol('UPDATE'),
};

// Convenient & consistency export
export { DEFAULT };
export const CREATE = JoiValidationGroups.CREATE;
export const UPDATE = JoiValidationGroups.UPDATE;

export interface Constructor<T = unknown> {
  new (...args: unknown[]): T;
}

export const JOIPIPE_OPTIONS = Symbol('JOIPIPE_OPTIONS');
export class JoiPipeValidationException extends Error {
  constructor(
    message: string,
    readonly joiValidationError: Joi.ValidationError,
  ) {
    super(message);
  }
}
